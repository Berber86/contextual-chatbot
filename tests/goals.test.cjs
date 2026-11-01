const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const goals = fs.readFileSync('goals.js', 'utf8');
const analytics = fs.readFileSync('analytics.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const dashboard = fs.readFileSync('dashboard.js', 'utf8');

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    storage: {
      getItem: key => (values.has(key) ? values.get(key) : null),
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key),
    },
  };
}

// Слой данных: только app.js, как в реальной загрузке (он идёт первым).
function appHarness(initial = {}) {
  const { values, storage } = createStorage(initial);
  const events = [];
  const context = vm.createContext({
    console: { log() {}, error() {} },
    window: { dispatchEvent: event => events.push(event.type) },
    localStorage: storage,
    Event,
    document: { createElement: () => ({ textContent: '', innerHTML: '' }) },
  });
  vm.runInContext(app, context);
  return { context, values, events };
}

// Слой данных + UI модуль: проверяем связки, а не только хранение.
function uiHarness() {
  const { values, storage } = createStorage();
  const elements = new Map();
  const toasts = [];

  const makeElement = id => ({
    id,
    innerHTML: '',
    value: '',
    style: {},
    classList: {
      _set: new Set(),
      contains(name) { return this._set.has(name); },
      add(name) { this._set.add(name); },
      remove(name) { this._set.delete(name); },
    },
  });

  const getElement = id => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };

  const context = vm.createContext({
    console: { log() {}, error() {} },
    localStorage: storage,
    Event,
    window: {
      dispatchEvent() {},
      addEventListener() {},
      prompt: () => '',
    },
    document: {
      getElementById: getElement,
      createElement: () => ({ textContent: '', innerHTML: '' }),
      body: { appendChild() {}, classList: { add() {}, remove() {} } },
    },
    escapeHtml: text => String(text == null ? '' : text),
    youShowToast: (message, type) => toasts.push({ message, type }),
    setTimeout: () => 0,
  });

  vm.runInContext(app, context);
  vm.runInContext(goals, context);
  return { context, values, elements, toasts, getElement };
}

const read = (context, expression) => vm.runInContext(expression, context);
// Массивы из vm-контекста имеют чужой прототип — сравниваем склеенный текст.
const errs = value => Array.from(value).join(',');
// Константы app.js не становятся свойствами контекста, читаем через vm.
const goalConfig = context => read(context, 'GOALS_CONFIG');

test('цель требует названия, «зачем» и критерия готовности', () => {
  const { context } = appHarness();

  assert.equal(errs(context.createGoal({}).errors), 'title_required,why_required,success_required');
  assert.equal(errs(context.createGoal({ title: 'Бегать по утрам' }).errors), 'why_required,success_required');
  assert.equal(
    errs(context.createGoal({ title: 'Бегать по утрам', why: 'Хочу больше энергии' }).errors),
    'success_required'
  );
  assert.equal(context.getGoals().length, 0, 'невалидные цели не сохраняются');
});

test('созданная цель получает корректное состояние по умолчанию', () => {
  const { context, events } = appHarness();
  const result = context.createGoal({
    title: '  Выучить испанский  ',
    why: '  Хочу говорить с семьёй жены  ',
    success: '  Держу разговор 15 минут  ',
  });

  assert.equal(result.ok, true);
  const goal = result.goal;
  assert.equal(goal.title, 'Выучить испанский', 'текст обрезается по краям');
  assert.equal(goal.why, 'Хочу говорить с семьёй жены');
  assert.equal(goal.success, 'Держу разговор 15 минут');
  assert.equal(goal.status, 'active');
  assert.equal(goal.nextStep, null);
  assert.equal(goal.doneSteps.length, 0);
  assert.equal(goal.horizon, 'open', 'по умолчанию цель без срока');
  assert.equal(goal.source, 'user');
  assert.ok(events.includes('goals-updated'), 'интерфейс получает событие об изменении');
  assert.equal(context.getGoalsData().version, goalConfig(context).version);
});

test('дубликаты и лимит целей не проходят', () => {
  const { context } = appHarness();
  context.createGoal({ title: 'Выучить испанский', why: 'Хочу говорить', success: 'Разговор 15 минут' });

  assert.equal(
    errs(context.createGoal({ title: 'выучить ИСПАНСКИЙ!', why: 'другая причина', success: 'другой признак' }).errors),
    'duplicate_title',
    'регистр и пунктуация не помогают создать дубль'
  );

  const { maxGoals } = goalConfig(context);
  for (let i = context.getGoals().length; i < maxGoals; i++) {
    context.createGoal({ title: `Цель ${i}`, why: 'зачем', success: 'признак' });
  }
  assert.equal(context.getGoals().length, maxGoals);
  assert.equal(errs(context.createGoal({ title: 'Ещё одна', why: 'з', success: 'п' }).errors), 'limit_reached');
});

test('завершённую цель можно поставить заново — дубль мешает только живой', () => {
  const { context } = appHarness();
  const { goal } = context.createGoal({ title: 'Пробежать полумарафон', why: 'Проверить себя', success: 'Финиш' });

  context.setGoalStatus(goal.id, 'done', 'Получилось');
  const again = context.createGoal({ title: 'Пробежать полумарафон', why: 'Хочу быстрее', success: 'Финиш за 2 часа' });

  assert.equal(again.ok, true, 'после завершения цель можно начать снова');
  assert.equal(context.getGoals().length, 2, 'история сохраняется');

  context.setGoalStatus(again.goal.id, 'paused');
  assert.equal(
    errs(context.createGoal({ title: 'пробежать полумарафон', why: 'з', success: 'п' }).errors),
    'duplicate_title',
    'пока цель живая, дубль не создаётся'
  );
});

test('следующий шаг хранится один и уходит в историю по кнопке «сделал»', () => {
  const { context } = appHarness();
  const { goal } = context.createGoal({
    title: 'Собрать портфолио',
    why: 'Хочу сменить работу',
    success: 'Три кейса опубликованы',
  });

  assert.equal(
    errs(context.completeGoalNextStep(goal.id).errors),
    'no_next_step',
    'без шага завершать нечего'
  );

  context.setGoalNextStep(goal.id, '  Написать первый кейс  ');
  assert.equal(context.getGoalById(goal.id).nextStep.text, 'Написать первый кейс');

  const done = context.completeGoalNextStep(goal.id);
  assert.equal(done.ok, true);
  const updated = context.getGoalById(goal.id);
  assert.equal(updated.nextStep, null);
  assert.equal(updated.doneSteps.length, 1);
  assert.equal(updated.doneSteps[0].text, 'Написать первый кейс');
  assert.ok(updated.doneSteps[0].at > 0);

  context.setGoalNextStep(goal.id, '   ');
  assert.equal(context.getGoalById(goal.id).nextStep, null, 'пустой текст убирает шаг');
});

test('чек-ины фиксируют самоотчёт, а не проценты', () => {
  const { context } = appHarness();
  const { goal } = context.createGoal({ title: 'Наладить сон', why: 'Устал', success: 'Сплю 7 часов' });

  assert.equal(errs(context.addGoalCheckin('goal_missing', 'moved').errors), 'not_found');
  assert.equal(errs(context.addGoalCheckin(goal.id, 'progress', '').errors), 'bad_state');

  const first = context.addGoalCheckin(goal.id, 'stuck', '  Поздно ложусь из-за работы  ');
  assert.equal(first.ok, true);
  assert.equal(first.checkin.note, 'Поздно ложусь из-за работы');
  assert.equal(context.getGoalStuckStreak(goal.id), 1);

  context.addGoalCheckin(goal.id, 'stuck', '');
  assert.equal(context.getGoalStuckStreak(goal.id), 2, 'два застревания подряд считаются');

  context.addGoalCheckin(goal.id, 'moved', '');
  assert.equal(context.getGoalStuckStreak(goal.id), 0, 'движение сбрасывает серию');

  const stored = JSON.stringify(context.getGoalCheckins(goal.id));
  assert.doesNotMatch(stored, /progress|percent|score|weight/i, 'в данных нет процентов и оценок');
  assert.doesNotMatch(stored, /"streak"/, 'серия считается на лету, а не хранится');
});

test('история чек-инов ограничена и хранит последние записи', () => {
  const { context } = appHarness();
  const { goal } = context.createGoal({ title: 'Учить слова', why: 'Для поездки', success: 'Знаю 500 слов' });
  const { checkinsCap } = goalConfig(context);

  for (let i = 0; i < checkinsCap + 5; i++) context.addGoalCheckin(goal.id, 'moved', `заметка ${i}`);

  const stored = context.getGoalCheckins(goal.id);
  assert.equal(stored.length, checkinsCap, 'история не растёт бесконечно');
  assert.equal(stored[stored.length - 1].note, `заметка ${checkinsCap + 4}`, 'новые записи вытесняют старые');
});

test('статусы: пауза, завершение и снятие — с причиной, без оценки пользователя', () => {
  const { context } = appHarness();
  const { goal } = context.createGoal({ title: 'Сменить работу', why: 'Выгорел', success: 'Оффер на руках' });

  assert.equal(errs(context.setGoalStatus(goal.id, 'failed').errors), 'bad_status');

  context.setGoalStatus(goal.id, 'paused');
  assert.equal(context.getGoalById(goal.id).status, 'paused');
  assert.equal(context.getGoalById(goal.id).archivedReason, '');

  context.setGoalStatus(goal.id, 'done', 'Помогло расписание по утрам');
  const closed = context.getGoalById(goal.id);
  assert.equal(closed.status, 'done');
  assert.equal(closed.archivedReason, 'Помогло расписание по утрам');
  assert.equal(context.getActiveGoals().length, 0);
});

test('старый формат хранения мигрирует один раз и не теряет цели', () => {
  const legacyGoal = {
    id: 'goal_legacy_1',
    title: 'Старая цель',
    why: 'Причина',
    success: 'Признак',
    status: 'active',
  };
  const { context, values } = appHarness();
  values.set(read(context, 'STORAGE_KEYS').goals, JSON.stringify([legacyGoal]));

  assert.equal(context.getGoals().length, 1, 'массив без версии читается');
  assert.equal(context.migrateGoalsData(), true, 'первый запуск мигрирует');
  assert.equal(context.migrateGoalsData(), false, 'повторная миграция не нужна');

  const stored = JSON.parse(values.get(read(context, 'STORAGE_KEYS').goals));
  assert.equal(stored.version, goalConfig(context).version);
  assert.equal(stored.goals[0].title, 'Старая цель');
});

test('повреждённое хранилище не роняет приложение и не удаляет данные', () => {
  const { context, values } = appHarness();
  const key = read(context, 'STORAGE_KEYS').goals;
  values.set(key, '{broken json');

  assert.equal(context.getGoals().length, 0);
  assert.equal(context.migrateGoalsData(), false);
  assert.equal(values.get(key), '{broken json', 'повреждённые данные остаются для ручного восстановления');
});

test('экспорт и импорт сохраняют цели и чек-ины, повторный импорт безопасен', () => {
  const { context } = appHarness();
  const { goal } = context.createGoal({ title: 'Написать книгу', why: 'Хочу высказаться', success: 'Первая глава' });
  context.addGoalCheckin(goal.id, 'moved', 'Написал план');
  const payload = context.exportGoalsPackage();

  const target = appHarness();
  const imported = target.context.importGoalsPackage(payload);
  assert.equal(imported.ok, true);
  assert.equal(imported.imported, 1);
  assert.equal(imported.checkins, 1);
  assert.equal(target.context.getGoals()[0].title, 'Написать книгу');
  assert.equal(target.context.getGoalCheckins(goal.id).length, 1);

  const again = target.context.importGoalsPackage(payload);
  assert.equal(again.imported, 0, 'повторный импорт не создаёт дублей');
  assert.equal(again.checkins, 0);
});

test('импорт не выходит за лимит целей и не теряет уже имеющиеся', () => {
  const source = appHarness();
  const { maxGoals } = goalConfig(source.context);
  const many = { app: 'memory-chatbot', kind: 'goals', version: 1, goals: [], checkins: [] };
  for (let i = 0; i < maxGoals + 5; i++) {
    many.goals.push({ id: `goal_imported_${i}`, title: `Импорт ${i}`, why: 'з', success: 'п', status: 'active' });
  }

  const target = appHarness();
  target.context.createGoal({ title: 'Своя цель', why: 'з', success: 'п' });
  const result = target.context.importGoalsPackage(JSON.stringify(many));

  assert.equal(result.ok, true);
  assert.equal(result.imported, maxGoals - 1, 'добираем до лимита, лишнее пропускаем');
  assert.equal(target.context.getGoals().length, maxGoals);
  assert.ok(target.context.getGoals().some(goal => goal.title === 'Своя цель'), 'своя цель не вытесняется');
});

test('битый файл импорта отклоняется с понятной ошибкой', () => {
  const { context } = appHarness();
  assert.equal(errs(context.importGoalsPackage('{oops').errors), 'bad_json');
  assert.equal(errs(context.importGoalsPackage(JSON.stringify({ hello: 1 })).errors), 'bad_shape');
  assert.equal(context.getGoals().length, 0);
});

test('цели не создаются фоновой аналитикой памяти', () => {
  assert.doesNotMatch(
    analytics,
    /createGoal\(|setGoalsData\(|addGoalCheckin\(/,
    'аналитика памяти не имеет права трогать цели'
  );
});

test('модуль целей подключён в интерфейс и экран доступен с клавиатуры', () => {
  assert.match(html, /onclick="openGoalsModal\(\)"/, 'пункт навигации');
  assert.match(html, /id="goalsModal"[^>]*data-workspace-dialog/);
  assert.match(html, /styles\/goals\.css/);
  assert.match(html, /<script src="goals\.js">/);
  assert.match(html, /data-i18n="navGoals"/);
  assert.match(html, /<symbol id="i-target"/);
  assert.match(dashboard, /goalsModal: closeGoalsModal/, 'Escape закрывает окно целей');
  assert.match(dashboard, /\.goals-close-btn/, 'фокус попадает на кнопку закрытия');
});

test('в интерфейсе нет процентов, стриков и прогресс-баров', () => {
  assert.doesNotMatch(goals, /%/, 'в модуле нет ни одного процента');
  assert.doesNotMatch(goals, /class="[^"]*(progress|percent|bar-fill)/i, 'нет прогресс-баров');
  assert.doesNotMatch(html, /goal-progress|goals-progress/);

  const { context, getElement } = uiHarness();
  const { goal } = context.createGoal({ title: 'Собрать портфолио', why: 'Сменить работу', success: 'Три кейса' });
  context.addGoalCheckin(goal.id, 'moved', 'Первый кейс');
  context.setGoalNextStep(goal.id, 'Второй кейс');

  context.openGoalsModal();
  assert.doesNotMatch(getElement('goalsBody').innerHTML, /\d\s*%/, 'в списке нет процентов');
  context.goalsOpenGoal(goal.id);
  assert.doesNotMatch(getElement('goalsBody').innerHTML, /\d\s*%/, 'в карточке нет процентов');
});

test('чек-ин отмечается в один тап прямо из списка', () => {
  const { context, toasts, getElement } = uiHarness();
  const { goal } = context.createGoal({ title: 'Учить слова', why: 'Для поездки', success: '500 слов' });

  context.openGoalsModal();
  assert.match(getElement('goalsBody').innerHTML, /Учить слова/);

  context.goalsQuickCheckin(goal.id, 'moved');

  const stored = context.getGoalCheckins(goal.id);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].state, 'moved');
  assert.equal(stored[0].note, '', 'быстрый чек-ин не требует заметки');
  assert.equal(toasts.length, 1);
  assert.match(getElement('goalsBody').innerHTML, /Сдвинулось/, 'список обновляется сразу');
});

test('пустой экран подсказывает поставить первую цель и создание доводит до карточки', () => {
  const { context, getElement } = uiHarness();

  context.openGoalsModal();
  assert.match(getElement('goalsBody').innerHTML, /Пока ни одной цели/);

  context.goalsStartCreate();
  const form = getElement('goalsBody').innerHTML;
  assert.match(form, /id="goalTitleInput"/);
  assert.match(form, /id="goalWhyInput"/);
  assert.match(form, /id="goalSuccessInput"/);
  assert.match(form, /Мне это важно, потому что/, 'подсказка для формулировки «зачем»');

  getElement('goalTitleInput').value = 'Выучить испанский';
  getElement('goalWhyInput').value = 'Хочу говорить с семьёй';
  getElement('goalSuccessInput').value = 'Держу разговор 15 минут';
  getElement('goalHorizonInput').value = 'month';
  context.goalsCreateFromForm();

  const goal = context.getGoals()[0];
  assert.equal(goal.title, 'Выучить испанский');
  assert.equal(goal.horizon, 'month');
  assert.equal(read(context, 'goalsState').view, 'goal', 'после создания открывается карточка цели');
  assert.match(getElement('goalsBody').innerHTML, /Следующий шаг/);
});

test('ошибка в форме не теряет введённый текст и показывает причину', () => {
  const { context, getElement } = uiHarness();
  context.goalsStartCreate();

  getElement('goalTitleInput').value = 'Цель без «зачем»';
  getElement('goalSuccessInput').value = 'Признак';
  context.goalsCreateFromForm();

  assert.equal(context.getGoals().length, 0);
  const markup = getElement('goalsBody').innerHTML;
  assert.match(markup, /Без «зачем» цель превращается в пункт списка/);
  assert.equal(getElement('goalTitleInput').value, 'Цель без «зачем»', 'введённое сохраняется');
});

test('карточка цели показывает следующий шаг и историю', () => {
  const { context, getElement } = uiHarness();
  const { goal } = context.createGoal({ title: 'Собрать портфолио', why: 'Сменить работу', success: 'Три кейса' });
  context.setGoalNextStep(goal.id, 'Выбрать первый проект');
  context.addGoalCheckin(goal.id, 'stuck', 'Нет времени вечером');

  context.openGoalsModal();
  const list = getElement('goalsBody').innerHTML;
  assert.match(list, /Выбрать первый проект/);
  assert.match(list, /Два чек-ина без движения|Застряло/);

  context.goalsOpenGoal(goal.id);
  const details = getElement('goalsBody').innerHTML;
  assert.match(details, /Зачем/);
  assert.match(details, /Как пойму, что получилось/);
  assert.match(details, /Нет времени вечером/);
});
