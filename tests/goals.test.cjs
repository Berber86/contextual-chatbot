const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const goals = fs.readFileSync('goals.js', 'utf8');
const analytics = fs.readFileSync('analytics.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const dashboard = fs.readFileSync('dashboard.js', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');

// Срез коучингового блока: он не зависит от остального ui.js и проверяется отдельно.
const coachStart = '// ==================== GOAL COACHING BLOCK (🎯) ====================';
const coachEnd = '// ==================== END GOAL COACHING BLOCK ====================';
const coachSource = (() => {
  const from = ui.indexOf(coachStart);
  const to = ui.indexOf(coachEnd, from);
  assert.ok(from >= 0 && to > from, 'в ui.js должен быть коучинговый блок');
  return ui.slice(from, to);
})();

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
      confirm: () => true,
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

// app.js + коучинговый блок ui.js: проверяем, что именно увидит модель.
function coachHarness() {
  const { values, storage } = createStorage();
  const events = [];
  const context = vm.createContext({
    console: { log() {}, error() {} },
    localStorage: storage,
    Event,
    window: { dispatchEvent: event => events.push(event.type) },
    document: { createElement: () => ({ textContent: '', innerHTML: '' }) },
  });
  vm.runInContext(app, context);
  vm.runInContext(coachSource, context);
  return { context, values, events };
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

  context.addGoalCheckin(goal.id, 'no_time', '');
  assert.equal(context.getGoalStuckStreak(goal.id), 3, '«не было времени» тоже не движение');

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

// ==================== ИНКРЕМЕНТ 2: КОУЧИНГ В ЧАТЕ ====================

test('цель, «зачем» и следующий шаг попадают в системный промпт', () => {
  const { context } = coachHarness();
  const { goal } = context.createGoal({
    title: 'Выучить испанский',
    why: 'Хочу говорить с семьёй жены',
    success: 'Держу разговор 15 минут',
  });
  context.setGoalNextStep(goal.id, 'Записаться на первый урок');

  const block = context.buildCoachingBlock('Как продвигается?', []);

  assert.match(block, /Выучить испанский/);
  assert.match(block, /Хочу говорить с семьёй жены/, '«зачем» — словами пользователя');
  assert.match(block, /Держу разговор 15 минут/);
  assert.match(block, /Записаться на первый урок/);
  assert.match(block, /не больше ОДНОЙ коучинговой реплики/);
  assert.match(block, /Коучинг важнее образа/);
  assert.doesNotMatch(block, /%/, 'в промпте нет процентов');
});

test('без активных целей коучинговый блок не появляется', () => {
  const { context } = coachHarness();
  assert.equal(context.buildCoachingBlock('Привет', []), '');

  const { goal } = context.createGoal({ title: 'Цель', why: 'Зачем', success: 'Признак' });
  context.setGoalStatus(goal.id, 'paused');
  assert.equal(context.buildCoachingBlock('Привет', []), '', 'на паузе цель не коучится');
});

test('выключатель убирает цели из разговора и сохраняется', () => {
  const { context, events } = coachHarness();
  context.createGoal({ title: 'Наладить сон', why: 'Устал', success: 'Сплю 7 часов' });

  assert.equal(context.isCoachingEnabled(), true, 'по умолчанию коучинг включён');
  assert.notEqual(context.buildCoachingBlock('Привет', []), '');

  context.setCoachingEnabled(false);
  assert.equal(context.isCoachingEnabled(), false);
  assert.equal(context.buildCoachingBlock('Привет', []), '', 'выключили — бот цели не видит');
  assert.ok(events.filter(e => e === 'goals-updated').length >= 1, 'интерфейс узнаёт об изменении');

  context.setCoachingEnabled(true);
  assert.notEqual(context.buildCoachingBlock('Привет', []), '');
});

test('в интерфейсе есть понятный выключатель коучинга', () => {
  const { context, toasts, getElement } = uiHarness();
  context.createGoal({ title: 'Наладить сон', why: 'Устал', success: 'Сплю 7 часов' });
  context.openGoalsModal();

  assert.match(getElement('goalsBody').innerHTML, /🎯 В разговоре: вкл/);
  assert.match(getElement('goalsBody').innerHTML, /aria-pressed="true"/);

  context.goalsToggleCoaching();
  assert.equal(context.isCoachingEnabled(), false);
  assert.match(getElement('goalsBody').innerHTML, /🎯 В разговоре: выкл/);
  assert.match(getElement('goalsBody').innerHTML, /Коучинг в разговоре выключен/, 'есть объяснение');
  assert.equal(toasts.length, 1);
});

test('при тяжёлом состоянии коучинг выключается кодом, а не просьбой в промпте', () => {
  const { context } = coachHarness();
  const { goal } = context.createGoal({ title: 'Сменить работу', why: 'Выгорел', success: 'Оффер' });
  context.setGoalNextStep(goal.id, 'Обновить резюме');

  const block = context.buildCoachingBlock('Я выгорел, нет сил вообще ни на что', []);

  assert.match(block, /ПОДДЕРЖКА ВАЖНЕЕ КОУЧИНГА/);
  assert.doesNotMatch(block, /ПРАВИЛА КОУЧИНГА/, 'правила коучинга не подмешиваются');
  assert.doesNotMatch(block, /Следующий шаг:/, 'шаг не показывается модели');
  assert.doesNotMatch(block, /Обновить резюме/);
});

test('при кризисе добавляется мягкая рекомендация специалиста', () => {
  const { context } = coachHarness();
  context.createGoal({ title: 'Сменить работу', why: 'Тяжело', success: 'Оффер' });

  const block = context.buildCoachingBlock('Я не хочу жить дальше, всё бессмысленно', []);

  assert.match(block, /ПОДДЕРЖКА ВАЖНЕЕ КОУЧИНГА/);
  assert.match(block, /специалист/);
  assert.doesNotMatch(block, /ПРАВИЛА КОУЧИНГА/);
  assert.equal(context.detectUserDistress('Хорошая погода, пошли гулять').level, 'none');
});

test('вопрос о цели не повторяется чаще разрешённого правила', () => {
  const { context } = coachHarness();
  context.createGoal({ title: 'Выучить испанский', why: 'Хочу говорить', success: 'Разговор 15 минут' });

  const fresh = context.buildCoachingBlock('Привет', []);
  assert.match(fresh, /не больше ОДНОГО вопроса/);

  const askedBefore = [
    { role: 'user', content: 'привет' },
    { role: 'assistant', content: 'Как продвигается «Выучить испанский»?' },
    { role: 'user', content: 'нормально' },
  ];
  const blocked = context.buildCoachingBlock('нормально', askedBefore);
  assert.match(blocked, /НЕ спрашивай/, 'второй вопрос подряд запрещён');
  assert.doesNotMatch(blocked, /не больше ОДНОГО вопроса/);
});

test('вопрос о другом не мешает спросить про цель', () => {
  const { context } = coachHarness();
  context.createGoal({ title: 'Выучить испанский', why: 'Хочу говорить', success: 'Разговор 15 минут' });

  const history = [
    { role: 'assistant', content: 'Как прошёл день?' },
    { role: 'user', content: 'нормально' },
  ];
  assert.equal(context.isGoalQuestionAllowed(history), true);
  assert.match(context.buildCoachingBlock('нормально', history), /не больше ОДНОГО вопроса/);
});

test('при внешнем препятствии триаж предлагает уменьшить шаг', () => {
  const { context } = coachHarness();
  const { goal } = context.createGoal({ title: 'Написать книгу', why: 'Хочу высказаться', success: 'Первая глава' });
  context.setGoalNextStep(goal.id, 'Написать 500 слов');
  context.addGoalCheckin(goal.id, 'stuck', 'Не хватило времени, завал на работе');
  context.addGoalCheckin(goal.id, 'stuck', 'Опять работа до ночи');

  assert.equal(context.classifyGoalObstacle(goal.id), 'external');
  const block = context.buildCoachingBlock('ничего не выходит', []);
  assert.match(block, /ТРИАЖ ЗАСТРЕВАНИЯ/);
  assert.match(block, /уменьшенный шаг/);
  assert.doesNotMatch(block, /ты опять|сколько можно|не подведи/i, 'нет давления и стыда по существу');
});

test('при сомнении в цели триаж возвращает к «зачем»', () => {
  const { context } = coachHarness();
  const { goal } = context.createGoal({ title: 'Пойти на курсы', why: 'Для роста', success: 'Сертификат' });
  context.addGoalCheckin(goal.id, 'stuck', 'Это не моё, не вижу смысла');
  context.addGoalCheckin(goal.id, 'stuck', 'Не хочу продолжать');

  assert.equal(context.classifyGoalObstacle(goal.id), 'doubt');
  const block = context.buildCoachingBlock('не знаю', []);
  assert.match(block, /сомнение в самой цели/);
  assert.match(block, /«зачем»/);
});

test('без данных о причине застревания бот спрашивает, а не догадывается', () => {
  const hey = coachHarness();
  const { goal } = hey.context.createGoal({ title: 'Бегать', why: 'Здоровье', success: '5 км' });
  hey.context.addGoalCheckin(goal.id, 'stuck', '');
  hey.context.addGoalCheckin(goal.id, 'no_time', '');

  assert.equal(hey.context.classifyGoalObstacle(goal.id), 'mixed');
  assert.match(hey.context.buildCoachingBlock('хм', []), /не додумывай/);
});

test('коучинг идёт после образа личности в промпте', () => {
  const personaIndex = ui.indexOf('const personaBlock = getPersonaPromptBlock();');
  const coachingIndex = ui.indexOf('const coachingBlock = typeof buildCoachingBlock');
  const injection = ui.indexOf('${personaBlock}\n${coachingBlock}');

  assert.ok(personaIndex > 0 && coachingIndex > personaIndex, 'коучинг вычисляется после образа');
  assert.ok(injection > coachingIndex, 'в шаблоне коучинг стоит сразу после образа');
});

test('инструмент get_user_goals только читает и отдаёт цели', () => {
  const { context } = coachHarness();
  context.createGoal({ title: 'Собрать портфолио', why: 'Сменить работу', success: 'Три кейса' });

  const tools = context.getToolDefinitions();
  const names = tools.map(tool => tool.function.name);
  assert.ok(names.includes('get_user_goals'), 'инструмент объявлен');

  const writeTools = names.filter(name => /create|update|delete|set_|complete|archive|drop/i.test(name));
  assert.equal(writeTools.length, 0, 'инструментов записи целей нет: ' + writeTools.join(','));

  const answer = context.executeTool('get_user_goals', { reason: 'нужно понять шаг' });
  assert.match(answer, /Собрать портфолио/);
  assert.match(answer, /Сменить работу/);
});

test('реальный запрос в чат уносит цель в системный промпт', async () => {
  const slice = (() => {
    const from = ui.indexOf('async function processMessageWithTwoStages(userMessage)');
    const to = ui.indexOf('function buildSystemPromptLegacy()', from);
    assert.ok(from >= 0 && to > from);
    return ui.slice(from, to);
  })();

  async function runTurn(message) {
    const sent = [];
    const { storage } = createStorage();
    const context = vm.createContext({
      console: { log() {}, error() {} },
      localStorage: storage,
      Event,
      window: {},
      document: { createElement: () => ({ textContent: '', innerHTML: '' }) },
      getChatHistory: () => [{ role: 'user', content: 'привет' }],
      updateThinkingMessage() {},
      removeThinkingMessage() {},
      findRelevantContext: async () => ({ compressed: false, facts: 'факты', traits: 'черты' }),
      createStreamingMessage: () => ({ remove() {} }),
      updateStreamingMessage() {},
      finalizeStreamingMessage() {},
      getLanguageName: () => 'Russian',
      pickResponseArchetype: () => 'answer-first',
      decideQuestionPolicyForThisTurn: () => ({ shouldAsk: false }),
      insightMode: true,
      getPersonaPromptBlock: () => '\n=== 🎭 ЭМУЛЯЦИЯ ЛИЧНОСТИ: ВКЛЮЧЕНА ===\nОБРАЗ: Шерлок',
      streamResponse: async (messages, onChunk, onComplete) => {
        sent.push(messages);
        onComplete('<answer>Ответ</answer>');
      },
    });
    vm.runInContext(app, context);
    vm.runInContext(coachSource, context);
    vm.runInContext(slice, context);

    const { goal } = context.createGoal({ title: 'Выучить испанский', why: 'Хочу говорить с семьёй', success: 'Разговор 15 минут' });
    context.setGoalNextStep(goal.id, 'Записаться на первый урок');
    await context.processMessageWithTwoStages(message);
    return { system: sent[0][0].content, context, goal };
  }

  const normal = await runTurn('Как продвигается с испанским?');
  assert.match(normal.system, /КОУЧИНГ ЦЕЛЕЙ ПОЛЬЗОВАТЕЛЯ/);
  assert.match(normal.system, /Записаться на первый урок/);
  assert.ok(
    normal.system.indexOf('ЭМУЛЯЦИЯ ЛИЧНОСТИ') < normal.system.indexOf('КОУЧИНГ ЦЕЛЕЙ'),
    'коучинг идёт после образа и не вытесняется им'
  );
  assert.doesNotMatch(normal.system, /ПОДДЕРЖКА ВАЖНЕЕ КОУЧИНГА/);

  const hard = await runTurn('Я выгорел и нет сил, ничего не могу больше');
  assert.match(hard.system, /ПОДДЕРЖКА ВАЖНЕЕ КОУЧИНГА/, 'в тяжёлом состоянии включается поддержка');
  assert.doesNotMatch(hard.system, /Записаться на первый урок/, 'шаг цели не показывается модели');
});

// ==================== ИНКРЕМЕНТ 3: ПРОФИЛЬ И ОБЗОР ====================

test('профиль по умолчанию нейтрален и объясним по каждому параметру', () => {
  const { context } = coachHarness();
  const profile = context.getCoachProfileData();

  assert.equal(profile.enabled, true);
  assert.equal(profile.params.directness, 'neutral', 'прямота не меняется сама');
  assert.equal(profile.changelog.length, 0);

  const text = context.getCoachProfileForPrompt();
  ['Прямота', 'Структура', 'Размер шага', 'Глубина рефлексии', 'Ритм касаний', 'Обратная связь']
    .forEach(label => assert.match(text, new RegExp(label), `в профиле есть ${label}`));

  const evidence = context.getCoachParamEvidence('directness');
  assert.equal(evidence.source, 'manual', 'прямота описана как ручная настройка');
  assert.match(evidence.text, /не меняет/, 'видно, что авто-подстройка её не трогает');
});

test('ручное изменение параметра пишется в журнал с причиной', () => {
  const { context } = coachHarness();

  assert.equal(context.setCoachParam('directness', 'очень прямо', 'x').errors.join(','), 'bad_param');
  assert.equal(context.setCoachParam('unknown', 'x').errors.join(','), 'bad_param');

  const result = context.setCoachParam('directness', 'direct', 'хочу без обёрток');
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(context.getCoachProfileData().params.directness, 'direct');

  const entry = context.getCoachProfileData().changelog[0];
  assert.equal(entry.source, 'user');
  assert.equal(entry.reason, 'хочу без обёрток');
  assert.equal(entry.from, 'neutral');
  assert.equal(entry.to, 'direct');
  assert.ok(entry.at > 0, 'у записи есть дата');

  assert.equal(context.setCoachParam('directness', 'direct').changed, false, 'то же значение не пишется');
  assert.equal(context.getCoachProfileData().changelog.length, 1);
});

test('тихий дрейф идёт только на одну ступень и никогда не трогает прямоту', () => {
  const { context } = coachHarness();

  assert.equal(context.applyCoachDrift([{ param: 'directness', from: 'neutral', to: 'direct' }], 'тест').length, 0,
    'прямота дрейфом не меняется');
  assert.equal(context.getCoachProfileData().params.directness, 'neutral');

  assert.equal(context.applyCoachDrift([{ param: 'stepSize', from: 'normal', to: 'large' }], 'шаг вверх').length, 1);
  assert.equal(context.applyCoachProfileData === undefined, true);
  assert.equal(context.getCoachProfileData().params.stepSize, 'large');

  assert.equal(context.applyCoachDrift([{ param: 'stepSize', from: 'large', to: 'micro' }], 'через две ступени').length, 0,
    'прыжок через ступень запрещён');
  assert.equal(context.getCoachProfileData().params.stepSize, 'large');

  assert.equal(context.applyCoachDrift([{ param: 'stepSize', from: 'normal', to: 'large' }], 'устаревшие данные').length, 0,
    'from должен совпадать с текущим значением');
});

test('дрейф случается не чаще раза в неделю и опирается на чек-ины', () => {
  const { context } = coachHarness();
  const { goal } = context.createGoal({ title: 'Бегать', why: 'Здоровье', success: '5 км' });
  context.addGoalCheckin(goal.id, 'stuck', 'Не хватило времени');
  context.addGoalCheckin(goal.id, 'no_time', 'Завал');

  const applied = context.maybeApplyCoachDrift();
  assert.equal(applied.length >= 1, true, 'после двух чек-инов без движения шаг уменьшается');
  assert.equal(context.getCoachProfileData().params.stepSize, 'micro');

  const entry = context.getCoachProfileData().changelog.find(item => item.param === 'stepSize');
  assert.equal(entry.source, 'auto');
  assert.match(entry.reason, /без движения/);

  assert.equal(context.maybeApplyCoachDrift().length, 0, 'в тот же день второй раз не подстраивается');
  assert.equal(context.maybeApplyCoachDrift(Date.now() + 8 * 86400000).length, 0,
    'через неделю менять уже нечего — микро это минимум');
});

test('дрейф идёт по одной ступени, даже если данные говорят «до упора»', () => {
  const { context } = coachHarness();
  context.setCoachParam('reflection', 'deep', 'вручную');
  context.createGoal({ title: 'Бегать', why: 'Здоровье', success: '5 км' });

  const reflection = context.suggestCoachDrift().suggestions.find(item => item.param === 'reflection');
  assert.equal(reflection.to, 'medium', 'deep → medium, а не deep → action');

  context.setCoachParam('structure', 'stepwise', 'вручную');
  for (let i = 0; i < 3; i++) {
    context.createGoal({ title: `Цель ${i}`, why: 'Зачем', success: 'Признак' });
  }
  const structure = context.suggestCoachDrift().suggestions.find(item => item.param === 'structure');
  assert.equal(structure.to, 'medium', 'stepwise → medium, а не stepwise → free');
});

test('подстройка попадает в системный промпт', () => {
  const { context } = coachHarness();
  context.createGoal({ title: 'Бегать', why: 'Здоровье', success: '5 км' });
  context.setCoachParam('stepSize', 'micro', 'маленькие шаги');

  const block = context.buildCoachingBlock('привет', []);
  assert.match(block, /ПОДСТРОЙКА ПОД ЧЕЛОВЕКА/);
  assert.match(block, /Размер шага: микро/);
  assert.match(block, /10 минут/, 'значение объяснено модели на практике');

  context.setCoachParam('directness', 'direct', 'хочу прямо');
  assert.match(context.buildCoachingBlock('привет', []), /говори прямо и коротко/);
});

test('обзор недели собирается из самоотчётов, без процентов', () => {
  const { context } = coachHarness();
  const { goal } = context.createGoal({ title: 'Писать книгу', why: 'Хочу высказаться', success: 'Глава' });
  context.setGoalNextStep(goal.id, 'Написать 500 слов');
  context.addGoalCheckin(goal.id, 'moved', 'Написал 300 слов');
  context.addGoalCheckin(goal.id, 'stuck', 'Отвлёкся');

  const result = context.runGoalWeeklyReview();
  assert.equal(result.created, 1);

  const review = context.getGoalReviews()[0];
  assert.equal(review.title, 'Писать книгу');
  assert.match(review.movement, /Сдвинулось 1/);
  assert.match(review.obstacle, /причина|внешнее|сомнение/i);
  assert.match(review.nextStep, /Написать 500 слов/);
  assert.equal(review.openedAt, 0);
  assert.doesNotMatch(JSON.stringify(review), /%/, 'в обзоре нет процентов');
});

test('обзор появляется не чаще раза в семь дней', () => {
  const { context } = coachHarness();
  const { goal } = context.createGoal({ title: 'Учить слова', why: 'Для поездки', success: '500 слов' });
  const now = Date.now();
  context.addGoalCheckin(goal.id, 'moved', '');

  assert.equal(context.runGoalWeeklyReview(now).created, 1);
  assert.equal(context.runGoalWeeklyReview(now + 86400000).created, 0, 'на следующий день обзор не повторяется');
  assert.equal(context.runGoalWeeklyReview(now + 8 * 86400000).created, 0,
    'без новых чек-инов обзор пустой');
  assert.equal(context.runGoalWeeklyReview(now + 8 * 86400000).created, 0);
});

test('обзоры ограничены по количеству, а прочитанный больше не всплывает', () => {
  const { context, values } = coachHarness();
  const { goal } = context.createGoal({ title: 'Цель', why: 'Зачем', success: 'Признак' });
  context.addGoalCheckin(goal.id, 'moved', '');

  const many = { version: 1, reviews: Array.from({ length: 60 }, (_, i) => ({
    id: `review_${i}`, weekKey: '2026-W01', goalId: goal.id, title: 'Цель',
    movement: 'Сдвинулось', obstacle: '', nextStep: 'Шаг', createdAt: Date.now(),
    // старые обзоры пользователь уже читал — непрочитанным остаётся только последний
    openedAt: i === 59 ? 0 : Date.now(), mentionedAt: 0
  })) };
  values.set(read(context, 'STORAGE_KEYS').goalReviews, JSON.stringify(many));
  assert.equal(context.getGoalReviews().length, 52, 'история обзоров ограничена');

  const latest = context.getLatestGoalReview();
  assert.equal(context.getUnopenedGoalReview().id, latest.id);
  context.markGoalReviewOpened(latest.id);
  assert.equal(context.getUnopenedGoalReview(), null, 'прочитанный обзор бот не поднимает');
});

test('неоткрытый обзор бот упоминает один раз', () => {
  const { context } = coachHarness();
  const { goal } = context.createGoal({ title: 'Учить слова', why: 'Для поездки', success: '500 слов' });
  context.addGoalCheckin(goal.id, 'moved', '');
  context.runGoalWeeklyReview();

  const first = context.buildCoachingBlock('привет', []);
  assert.match(first, /ОБЗОР НЕДЕЛИ/);
  assert.match(first, /один раз|ОДИН раз/);

  const second = context.buildCoachingBlock('привет', []);
  assert.doesNotMatch(second, /ОБЗОР НЕДЕЛИ/, 'повторно бот про обзор не напоминает');
});

test('в окне целей есть профиль с шестью параметрами и «почему так»', () => {
  const { context, getElement } = uiHarness();
  context.createGoal({ title: 'Бегать', why: 'Здоровье', success: '5 км' });
  context.openGoalsModal();
  context.goalsStartProfile();

  const markup = getElement('goalsBody').innerHTML;
  ['Прямота', 'Структура', 'Размер шага', 'Глубина рефлексии', 'Ритм касаний', 'Обратная связь']
    .forEach(label => assert.match(markup, new RegExp(label)));
  assert.match(markup, /Почему так/);
  assert.match(markup, /Журнал изменений/);
  assert.match(markup, /Влияет на:/);
});

test('прямота меняется только после подтверждения, остальные параметры — сразу', () => {
  const { context, toasts, getElement } = uiHarness();
  context.openGoalsModal();
  context.goalsStartProfile();

  context.window.confirm = () => false;
  context.goalsSetParam('directness', 'direct');
  assert.equal(context.getCoachProfileData().params.directness, 'neutral', 'без согласия прямота не меняется');

  context.window.confirm = () => true;
  context.goalsSetParam('directness', 'direct');
  assert.equal(context.getCoachProfileData().params.directness, 'direct');
  assert.match(getElement('goalsBody').innerHTML, /вручную/, 'в журнале видно, что это ручное изменение');

  context.goalsSetParam('stepSize', 'micro');
  assert.equal(context.getCoachProfileData().params.stepSize, 'micro');
  assert.equal(toasts.length >= 2, true);
});

test('обзор недели виден в списке и открывается', () => {
  const { context, getElement } = uiHarness();
  const { goal } = context.createGoal({ title: 'Писать книгу', why: 'Хочу высказаться', success: 'Глава' });
  context.setGoalNextStep(goal.id, 'Написать 500 слов');
  context.addGoalCheckin(goal.id, 'moved', 'Начал');
  context.runGoalWeeklyReview();

  context.openGoalsModal();
  assert.match(getElement('goalsBody').innerHTML, /Обзор недели/);
  assert.match(getElement('goalsBody').innerHTML, /новое/);

  context.goalsOpenReview();
  const reviewMarkup = getElement('goalsBody').innerHTML;
  assert.match(reviewMarkup, /Писать книгу/);
  assert.match(reviewMarkup, /Написать 500 слов/);
  assert.match(reviewMarkup, /не оценка/i);
  assert.match(reviewMarkup, /Что бот подстроил за неделю/);
  assert.equal(context.getUnopenedGoalReview(), null, 'после открытия обзор прочитан');
});

test('чек-ин сам запускает тихую подстройку и обзор', () => {
  const { context, values } = uiHarness();
  const { goal } = context.createGoal({ title: 'Бегать', why: 'Здоровье', success: '5 км' });

  context.goalsQuickCheckin(goal.id, 'stuck');
  context.goalsQuickCheckin(goal.id, 'no_time');

  assert.equal(context.getCoachProfileData().params.stepSize, 'micro', 'профиль подстроился');
  assert.equal(context.getGoalReviews().length, 1, 'обзор недели появился сам');
  assert.ok(values.get(read(context, 'STORAGE_KEYS').coachProfile), 'профиль сохранён');
});

test('экспорт везёт с собой обзоры и профиль, импорт не перетирает настроенный профиль', () => {
  const source = coachHarness();
  const { goal } = source.context.createGoal({ title: 'Бегать', why: 'Здоровье', success: '5 км' });
  source.context.addGoalCheckin(goal.id, 'moved', 'Вышел на пробежку');
  source.context.runGoalWeeklyReview();
  source.context.setCoachParam('directness', 'direct', 'хочу прямо');

  const payload = source.context.exportGoalsPackage();
  const parsed = JSON.parse(payload);
  assert.equal(Array.isArray(parsed.reviews), true, 'обзоры в пакете');
  assert.equal(parsed.profile.params.directness, 'direct', 'профиль в пакете');

  const fresh = coachHarness();
  const first = fresh.context.importGoalsPackage(payload);
  assert.equal(first.ok, true);
  assert.equal(first.profile, true, 'на чистой установке профиль восстанавливается');
  assert.equal(fresh.context.getCoachProfileData().params.directness, 'direct');
  assert.equal(fresh.context.getGoalReviews().length, 1, 'обзор тоже приехал');

  const tuned = coachHarness();
  tuned.context.setCoachParam('directness', 'soft', 'мне так спокойнее');
  const second = tuned.context.importGoalsPackage(payload);
  assert.equal(second.profile, false, 'настроенный профиль не перетирается');
  assert.equal(tuned.context.getCoachProfileData().params.directness, 'soft');
});
