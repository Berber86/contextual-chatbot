const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const analytics = fs.readFileSync('analytics.js', 'utf8');
const jev = fs.readFileSync('jev.js', 'utf8');
const council = fs.readFileSync('council.js', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');

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

// app.js + jev.js: облака и их выбор типизированной моделью.
function cloudHarness(initial = {}, fetchHandler) {
  const { values, storage } = createStorage(initial);
  const calls = [];
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    localStorage: storage,
    window: { dispatchEvent() {}, location: { hostname: 'localhost' } },
    document: { createElement: () => ({ textContent: '', innerHTML: '' }) },
    Event,
    fetch: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return fetchHandler(url, init, calls.length);
    },
    AbortController,
    setTimeout,
    clearTimeout,
    JSON,
    Number,
  });
  vm.runInContext(app, context);
  vm.runInContext(jev, context);
  vm.runInContext(council, context);
  return { context, values, calls, storage };
}

const run = (context, expression) => vm.runInContext(expression, context);

// Решение о темах приходит из совета: отдельной функции выбора больше нет.
const councilMemory = (context, message, clouds) => vm.runInContext(
  `(async () => { const plan = await resolveCouncil(${JSON.stringify(message)}, [], { clouds: ${JSON.stringify(clouds)} }); return plan ? plan.memory : null; })()`,
  context
);

// app.js + analytics.js: фоновая стадия разбора. Модель подменяем целиком —
// проверяем, что стадия делает с ответом, а не как устроен провайдер памяти.
function consolidationHarness(getPayload) {
  const { values, storage } = createStorage({});
  const calls = [];
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    localStorage: storage,
    window: { dispatchEvent() {}, location: { hostname: 'localhost' } },
    document: { createElement: () => ({ textContent: '', innerHTML: '' }), getElementById: () => null, querySelectorAll: () => [] },
    Event, AbortController, setTimeout, clearTimeout, JSON, Number, TextDecoder, TextEncoder,
    getMessageCounter: () => 12,
    getChatHistory: () => [{ role: 'user', content: 'привет' }, { role: 'assistant', content: 'привет' }],
    parseJSON: text => JSON.parse(text),
    callMemoryAPIWithRetry: async prompt => {
      calls.push(prompt);
      return JSON.stringify(getPayload(prompt, calls.length));
    },
  });
  vm.runInContext(app, context);
  vm.runInContext(analytics, context);
  return { context, calls, values };
}

function seedMemory(context, facts) {
  run(context, 'setFactsData({ facts: ' + JSON.stringify(facts) + ' })');
}

// Облако без содержимого не участвует в выборе — сеем по факту в каждое.
function seedCloudsWithFacts(context, names) {
  const clouds = names.map(name => run(context, `ensureCloud(${JSON.stringify(name)})`));
  const facts = clouds.map((cloud, index) => ({
    id: 'seed_' + index,
    text: 'Факт темы ' + cloud.name,
    confidence: 'high',
    cloud: cloud.id,
    superseded: false,
  }));
  seedMemory(context, facts);
  return clouds;
}

// ==================== ВРЕМЯ ЗАПИСИ ПАМЯТИ ====================

test('событие получает timestamp сообщения-доказательства, а не время фонового разбора', () => {
  const { context, values } = consolidationHarness(() => ({}));
  const saidAt = Date.UTC(2025, 5, 16, 12, 0, 0);
  run(context, `globalThis.__timeHistory = [{ role: 'user', content: 'Завтра еду в Москву', timestamp: ${saidAt} }]`);
  run(context, `integrateTimelineData([{
    text: 'Поездка в Москву', type: 'plan',
    date: { exact: '2025-06-17', description: 'завтра', precision: 'exact' },
    evidence: ['Завтра еду в Москву'], confidence: 'high',
    updatesEventIndex: null, supersedesEventIndex: null
  }], getTimelineData(), globalThis.__timeHistory)`);

  const timelineKey = run(context, 'STORAGE_KEYS.timeline');
  const event = JSON.parse(values.get(timelineKey)).events[0];
  assert.equal(event.timestamp, saidAt);
  assert.equal(event.saidAt, saidAt);
  assert.equal(event.date.exact, '2025-06-17');
  assert.equal(event.date.description, 'завтра');
  assert.notEqual(event.lastConfirmedAt, saidAt, 'техническое подтверждение хранится отдельно');
});

test('новое подтверждение не переносит старое «завтра» на дату подтверждения', () => {
  const { context, values } = consolidationHarness(() => ({}));
  const saidAt = Date.UTC(2025, 5, 16, 12, 0, 0);
  const confirmedAt = Date.UTC(2025, 5, 17, 9, 0, 0);
  run(context, `setTimelineData({ events: [{
    id: 'trip', text: 'Завтра еду в Москву', type: 'plan',
    date: { exact: '2025-06-17', description: 'завтра', precision: 'exact' },
    evidence: ['Завтра еду в Москву'], confidence: 'high',
    createdAt: 1, updatedAt: 1, timestamp: ${saidAt}, saidAt: ${saidAt},
    superseded: false
  }], legacy_text: '' })`);
  run(context, `globalThis.__timeHistory = [{ role: 'user', content: 'Да, всё ещё еду в Москву', timestamp: ${confirmedAt} }]`);
  run(context, `integrateTimelineData([{
    text: 'Поездка в Москву', type: 'plan', date: { description: 'завтра' },
    evidence: ['Да, всё ещё еду в Москву'], confidence: 'high',
    updatesEventIndex: 1, supersedesEventIndex: null
  }], getTimelineData(), globalThis.__timeHistory)`);

  const timelineKey = run(context, 'STORAGE_KEYS.timeline');
  const event = JSON.parse(values.get(timelineKey)).events[0];
  assert.equal(event.timestamp, saidAt);
  assert.equal(event.saidAt, saidAt);
  assert.ok(event.lastConfirmedAt > saidAt);
});

test('промпт извлечения видит дату реплики и правило разрешения «завтра»', async () => {
  const { context, calls } = consolidationHarness(() => ({ events: [] }));
  const saidAt = Date.UTC(2025, 5, 16, 12, 0, 0);
  await run(context, `extractTimelineInformation([{
    role: 'user', content: 'Завтра еду в Москву', timestamp: ${saidAt}
  }])`);
  assert.match(calls[0], /2025-06-16T12:00:00\.000Z/);
  assert.match(calls[0], /2025-06-17/);
  assert.match(calls[0], /never from extraction time/);
});

// ==================== СЛОЙ ОБЛАКОВ ====================

test('облако создаётся один раз: регистр, ё и лишние пробелы не плодят дубли', () => {
  const { context } = cloudHarness();
  const first = run(context, 'ensureCloud("Работа", "офис и планы")');
  const second = run(context, 'ensureCloud("  работа ")');
  const third = run(context, 'ensureCloud("РАБОТА")');

  assert.equal(first.id, second.id);
  assert.equal(first.id, third.id);
  assert.equal(run(context, 'getClouds().length'), 1);
  assert.equal(first.summary, 'офис и планы', 'описание не теряется');
});

test('«Разное» — служебное облако с постоянным id', () => {
  const { context } = cloudHarness();
  const misc = run(context, 'ensureMiscCloud()');
  const again = run(context, 'ensureMiscCloud()');
  assert.equal(misc.id, 'cloud_misc');
  assert.equal(again.id, misc.id);
  assert.equal(run(context, 'getClouds().length'), 1);
});

test('элемент памяти без облака попадает в «Разное», с именем — в своё облако', () => {
  const { context } = cloudHarness();
  const fact = run(context, '({ text: "Работает в Сбере" })');
  const cloud = run(context, 'assignItemCloud({ text: "Работает в Сбере" }, "Работа")');
  assert.equal(fact.cloud, undefined, 'без вызова облака нет');
  assert.equal(cloud.name, 'Работа');

  run(context, 'assignItemCloud(globalThis.__orphan = {}, null)');
  assert.equal(run(context, 'globalThis.__orphan.cloud'), 'cloud_misc');
});

test('контекст собирается только из выбранных облаков', () => {
  const { context } = cloudHarness();
  run(context, 'const work = ensureCloud("Работа"); const dog = ensureCloud("Собака");');
  seedMemory(context, [
    { id: 'f1', text: 'Работает в Сбере', confidence: 'high', cloud: run(context, 'ensureCloud("Работа").id'), superseded: false },
    { id: 'f2', text: 'Гуляет с Бобиком', confidence: 'high', cloud: run(context, 'ensureCloud("Собака").id'), superseded: false },
    { id: 'f3', text: 'Выброшенный факт', confidence: 'high', cloud: run(context, 'ensureCloud("Работа").id'), superseded: true },
  ]);

  const workId = run(context, 'ensureCloud("Работа").id');
  const text = run(context, `buildCloudContext(["${workId}"])`);
  assert.match(text, /ОБЛАКО «Работа»/);
  assert.match(text, /Работает в Сбере/);
  assert.doesNotMatch(text, /Бобик/, 'чужое облако не подмешивается');
  assert.doesNotMatch(text, /Выброшенный/, 'superseded не попадает');

  assert.equal(run(context, 'buildCloudContext([])'), '');
  assert.equal(run(context, `buildCloudContext(["cloud_нет_такого"])`), '');
});

test('облачный контекст сохраняет время высказывания и смысл относительной даты', () => {
  const { context } = cloudHarness();
  const timestamp = Date.UTC(2025, 5, 16, 12, 0, 0);
  run(context, 'const travel = ensureCloud("Поездки");');
  const cloudId = run(context, 'travel.id');
  run(context, `setTimelineData({ events: [{
    id: 'trip_moscow',
    text: 'Завтра еду в Москву',
    type: 'plan',
    date: { exact: '2025-06-17', description: 'завтра', precision: 'exact' },
    timestamp: ${timestamp},
    saidAt: ${timestamp},
    cloud: ${JSON.stringify(cloudId)},
    confidence: 'high',
    superseded: false
  }], legacy_text: '' })`);

  const text = run(context, 'buildCloudContext([travel.id])');
  const recorded = run(context, `formatTimestamp(${timestamp})`);
  assert.match(text, /Завтра еду в Москву/);
  assert.match(text, /\[plan\]/);
  assert.match(text, /2025-06-17/);
  assert.match(text, /исходная формулировка: «завтра»/);
  assert.ok(text.includes(`[recorded: ${recorded}]`), 'модель получает опору 16.06.2025, а не только текущую дату');
});

test('облачный контекст не скрывает LEGACY и время записи факта', () => {
  const { context } = cloudHarness();
  const timestamp = Date.UTC(2025, 5, 16, 12, 0, 0);
  run(context, 'const travel = ensureCloud("Поездки");');
  run(context, `setTimelineData({ events: [{
    id: 'old_trip', text: 'Завтра еду в Москву', type: 'plan',
    date: { description: 'завтра' }, timestamp: 'legacy_version',
    cloud: travel.id, superseded: false
  }], legacy_text: '' })`);
  seedMemory(context, [{
    id: 'dated_fact', text: 'Билет куплен на завтра', confidence: 'high',
    timestamp, saidAt: timestamp, cloud: run(context, 'travel.id'), superseded: false,
  }]);

  const text = run(context, 'buildCloudContext([travel.id])');
  const recorded = run(context, `formatTimestamp(${timestamp})`);
  assert.match(text, /\[LEGACY\]/);
  assert.ok(text.includes(`Билет куплен на завтра (high) [recorded: ${recorded}]`));
});

test('Always-On Core ограничен, содержит стиль и не дублирует записи поднятого облака', () => {
  const { context } = cloudHarness();
  run(context, `localStorage.setItem(STORAGE_KEYS.style, 'Прямо и без канцелярита');
    const work = ensureCloud('Работа');`);
  const traits = Array.from({ length: 8 }, (_, index) => ({
    id: `trait_${index}`, text: `Черта ${index}`, confidence: index === 0 ? 'verified' : 'high',
    evidence: index < 6 ? ['подтверждение'] : [], timestamp: index + 1,
    cloud: index === 0 ? run(context, 'work.id') : null, superseded: false,
  }));
  run(context, `setTraitsData({ traits: ${JSON.stringify(traits)}, legacy_text: '' })`);
  run(context, `setHypothesesData({ hypotheses: [
    { id: 'h1', text: 'Рабочая гипотеза', confidence: 'high', cloud: work.id },
    { id: 'h2', text: 'Сквозная гипотеза', confidence: 'medium' }
  ] })`);

  const core = run(context, 'buildAlwaysOnCoreContext({ excludeCloudIds: [work.id] })');
  assert.match(core, /Прямо и без канцелярита/);
  assert.doesNotMatch(core, /Черта 0/, 'черта уже видна в облаке и не дублируется');
  assert.doesNotMatch(core, /Рабочая гипотеза/);
  assert.match(core, /Сквозная гипотеза/);
  assert.match(core, /Гипотезы \(предположения, не факты\)/);
  assert.ok((core.match(/Черта /g) || []).length <= 5);
  assert.ok(core.length <= run(context, 'CORE_MEMORY_CONFIG.maxTotalChars'));

  const withoutHypotheses = run(context, 'buildAlwaysOnCoreContext({ includeHypotheses: false })');
  assert.doesNotMatch(withoutHypotheses, /Сквозная гипотеза/);
});

test('латеральное облако попадает в отдельную зону, а прямое остаётся фокусом', () => {
  const { context } = cloudHarness();
  run(context, `const work = ensureCloud('Работа'); const dog = ensureCloud('Собака');`);
  seedMemory(context, [
    { id: 'work_fact', text: 'Работает техлидом', confidence: 'high', cloud: run(context, 'work.id'), superseded: false },
    { id: 'dog_fact', text: 'Учил Бобика короткими подходами', confidence: 'high', cloud: run(context, 'dog.id'), superseded: false },
  ]);
  const text = run(context, `buildCloudContext([work.id, dog.id], [
    { id: work.id, role: 'anchor' }, { id: dog.id, role: 'lateral_bridge' }
  ])`);
  assert.match(text, /🎯 ПРЯМОЙ КОНТЕКСТ ТЕМЫ/);
  assert.match(text, /🌊 БОКОВОЕ ЗРЕНИЕ: ТОЛЬКО ДЛЯ АНАЛОГИЙ/);
  assert.match(text, /Не пересказывай их/);
  assert.ok(text.indexOf('Работает техлидом') < text.indexOf('🌊'));
  assert.ok(text.indexOf('Учил Бобика') > text.indexOf('🌊'));
});

test('список для выбора считает содержимое и не показывает пустые облака', () => {
  const { context } = cloudHarness();
  run(context, 'ensureCloud("Работа"); ensureCloud("Пустое");');
  const workId = run(context, 'ensureCloud("Работа").id');
  seedMemory(context, [
    { id: 'f1', text: 'Факт про работу', confidence: 'high', cloud: workId, superseded: false },
  ]);

  const list = Array.from(run(context, 'getCloudsForSelection()'));
  assert.equal(list.length, 1, 'пустое облако скрыто');
  assert.equal(list[0].name, 'Работа');
  assert.equal(list[0].counts.facts, 1);
  assert.equal(list[0].total, 1);
});

test('флаг облаков по умолчанию включён и отключается', () => {
  const { context } = cloudHarness();
  assert.equal(run(context, 'isCloudMemoryEnabled()'), true);
  run(context, 'setCloudMemoryEnabled(false)');
  assert.equal(run(context, 'isCloudMemoryEnabled()'), false);
  run(context, 'setCloudMemoryEnabled(true)');
  assert.equal(run(context, 'isCloudMemoryEnabled()'), true);
});

// ==================== ВЫБОР ОБЛАКОВ ЧЕРЕЗ jev ====================

const cloudAnswer = (probabilities) => async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    model: 'jev-1.14',
    answers: Object.fromEntries(
      Object.entries(probabilities).map(([name, value]) => [name, { type: 'noul', noul: value }])
    ),
    usage: { input_tokens: 300, output_tokens: 0 },
  }),
  text: async () => '',
});

// Ответ демо-jev на вопрос о темах: распределение по вариантам choice.
const cloudChoiceAnswer = (probabilities) => async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    model: 'jev-1.14',
    answers: { clouds: { type: 'choice', choice: 'cloud_0', confidence: 0.7, probabilities } },
    usage: { input_tokens: 300, output_tokens: 0 },
  }),
  text: async () => '',
});

test('выбор облаков: прямой и латеральный choice на все темы вместо noul на каждую', async () => {
  const { context, calls } = cloudHarness({}, cloudChoiceAnswer({
    cloud_0: 0.62, cloud_1: 0.14, cloud_2: 0.05, none: 0.19,
  }));

  seedCloudsWithFacts(context, ['Работа', 'Собака', 'Япония']);
  const clouds = run(context, 'getCloudsForSelection().map(c => ({ id: c.id, name: c.name, counts: c.counts }))');

  const selection = await councilMemory(context, 'Что посоветуешь по работе?', Array.from(clouds));

  assert.equal(calls.length, 1, 'один запрос на ход');
  const questions = calls[0].body.questions;
  assert.equal(Object.keys(questions).length, 10, 'весь совет: маршрут, состояние, приветствие и два контура памяти');
  assert.equal(questions.clouds.type, 'choice', 'темы — один слот, а не вопрос на каждую');
  assert.equal(Object.keys(questions.clouds.criteria).length, 4, 'три темы плюс «ничего»');
  ['complexity', 'archetype', 'ask_question', 'distress', 'crisis', 'greeting'].forEach(name => {
    assert.ok(questions[name], `вопрос «${name}» в том же запросе`);
  });
  assert.ok(questions.clouds.criteria.none, 'вариант «ничего не нужно» на месте');

  assert.equal(selection.clouds.length, 1, '0.14 меньше 40% от 0.62 — не поднимаем');
  assert.equal(selection.clouds[0].name, 'Работа');
  assert.equal(selection.threshold, 0.1);
  assert.equal(Object.keys(selection.probabilities).length, 3, 'вероятности есть у всех тем');
});

test('выбор облаков: не больше четырёх, самые вероятные первыми', async () => {
  const { context } = cloudHarness({}, cloudChoiceAnswer({
    cloud_0: 0.35, cloud_1: 0.3, cloud_2: 0.25, cloud_3: 0.2, cloud_4: 0.1, none: 0.05,
  }));

  seedCloudsWithFacts(context, ['A', 'B', 'C', 'D', 'E']);
  const clouds = Array.from(run(context, 'getCloudsForSelection().map(c => ({ id: c.id, name: c.name, counts: c.counts }))'));
  assert.equal(clouds.length, 5);

  const selection = await councilMemory(context, 'тест', clouds);
  assert.equal(selection.clouds.length, 4, 'пятое облако отсекается');
  for (let index = 1; index < selection.clouds.length; index++) {
    assert.ok(selection.clouds[index - 1].probability >= selection.clouds[index].probability, 'по убыванию');
  }
});

test('все темы укладываются в два choice-слота из 32', () => {
  const { context } = cloudHarness();
  for (let index = 0; index < 14; index++) run(context, `ensureCloud(${JSON.stringify('Тема ' + index)})`);
  const clouds = Array.from(run(context, 'getClouds().map(c => ({ id: c.id, name: c.name }))'));
  assert.equal(clouds.length, 14, 'четырнадцать созданных тем');

  const questions = run(context, `buildCloudQuestions(${JSON.stringify(clouds)})`);
  assert.equal(Object.keys(questions).length, 3, 'прямой choice, уместность и латеральный choice');
  assert.equal(Object.keys(questions.clouds.criteria).length, 15, 'по варианту на тему плюс «ничего»');
  assert.equal(questions.clouds.type, 'choice');
});

test('«ничего не нужно» перебивает темы, а плоское распределение не тянет всё подряд', () => {
  const { context } = cloudHarness();
  const list = [
    { id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' },
  ];

  const none = run(context, `pickCloudsFromDistribution(${JSON.stringify(list)}, {a: 0.2, b: 0.1, c: 0.05}, 0.62)`);
  assert.equal(none.length, 0, 'модель уверенно сказала «память не нужна»');

  const flat = run(context, `pickCloudsFromDistribution(${JSON.stringify(list)}, {a: 0.04, b: 0.04, c: 0.04}, 0.04)`);
  assert.equal(flat.length, 1, 'шум не превращается в три темы — берём лучшую');

  const close = run(context, `pickCloudsFromDistribution(${JSON.stringify(list)}, {a: 0.5, b: 0.3, c: 0.1}, 0.1)`);
  assert.equal(close.map(item => item.id).join(','), 'a,b', 'близкая к лучшей тема тоже поднимается');
});

test('латеральный выбор пропускает primary и требует уместности ассоциации', () => {
  const { context } = cloudHarness();
  const list = [{ id: 'work', name: 'Работа' }, { id: 'dog', name: 'Собака' }, { id: 'wood', name: 'Столярка' }];
  const probabilities = { work: 0.6, dog: 0.3, wood: 0.08 };
  const picked = run(context, `pickLateralCloudFromDistribution(${JSON.stringify(list)}, ${JSON.stringify(probabilities)}, 0.02, ['work'], 0.7)`);
  assert.equal(picked.id, 'dog');
  assert.equal(picked.role, 'lateral_bridge');
  assert.equal(run(context, `pickLateralCloudFromDistribution(${JSON.stringify(list)}, ${JSON.stringify(probabilities)}, 0.02, ['work'], 0.44)`), null);
  assert.equal(run(context, `pickLateralCloudFromDistribution(${JSON.stringify(list)}, ${JSON.stringify(probabilities)}, 0.9, ['work'], 0.7)`), null);
});

test('выбор облаков: одна тема — не повод для запроса, ошибка — откат', async () => {
  const { context, calls } = cloudHarness({}, cloudAnswer({}));
  seedCloudsWithFacts(context, ['Работа']);
  const clouds = Array.from(run(context, 'getCloudsForSelection().map(c => ({ id: c.id, name: c.name, counts: c.counts }))'));
  assert.equal(await councilMemory(context, 'привет', clouds), null, 'одна тема — выбирать нечего');
  assert.equal(calls.length, 1, 'совет спрашивает только про маршрут, состояние и приветствие');
  assert.equal(calls[0].body.questions.clouds, undefined, 'вопроса о темах нет');

  const broken = cloudHarness({}, async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => 'down' }));
  seedCloudsWithFacts(broken.context, ['Работа', 'Собака']);
  const pair = Array.from(run(broken.context, 'getCloudsForSelection().map(c => ({ id: c.id, name: c.name, counts: c.counts }))'));
  assert.equal(await councilMemory(broken.context, 'тест', pair), null,
    'ошибка сети — совет не дал решения, а не уронил ход');
});

// ==================== ВСТРОЙКА В ЧАТ ====================

test('стадия 1 сначала пробует облака, и только потом сжатие', () => {
  const start = ui.indexOf('async function findRelevantContext');
  const findBody = ui.slice(start, ui.indexOf('function buildSystemPromptLegacy', start));
  const cloudCall = findBody.indexOf('prepareCloudContext(userMessage, history, timeInfo, council)');
  const lengthCheck = findBody.indexOf('totalContextLength < 2000');
  const compression = findBody.indexOf('compressionPrompt');
  assert.ok(cloudCall > 0 && lengthCheck > cloudCall && compression > lengthCheck, 'порядок: облака → длина → сжатие');

  assert.match(ui, /function prepareCloudContext\(/, 'есть подготовка облачного контекста');
  assert.match(ui, /isCloudMemoryEnabled\(\)/, 'есть выключатель');
  // Одна тема с записями — это вся память: берём её напрямую, без jev и без сжатия.
  assert.match(ui, /clouds\.length === 1/, 'одна тема — отдельная ветка');
  assert.match(ui, /Тема одна — берём без jev/, 'и это видно в консоли');
  assert.match(ui, /lastCloudSkip/, 'причина отказа запоминается для спойлера');
});

test('стадия 2 получает облачный контекст, а не досье', () => {
  assert.match(ui, /contextResult\.source === 'clouds'/, 'облачный путь опознаётся');
  assert.match(ui, /=== ПАМЯТЬ: ПОДНЯТЫЕ ОБЛАКА ===/, 'заголовок блока');
  assert.match(ui, /=== 🧠 ЯДРО ЛИЧНОСТИ И СТИЛЬ ===/, 'сквозное ядро подключается к облакам');
  assert.match(ui, /contextResult\.coreContext/, 'ядро попадает в системный промпт');
  assert.match(ui, /память не поднималась: тема не требует воспоминаний/, 'честный пустой случай');
});

test('превью «мыслей» убрано из интерфейса и из промпта', () => {
  assert.doesNotMatch(ui, /micro_opening/, 'в промпте сжатия больше нет генерации мысли');
  assert.doesNotMatch(ui, /contextResult\.microOpening/, 'статус-бар её не показывает');
});

test('извлечение памяти не придумывает темы: это работа фоновой стадии', () => {
  assert.equal(analytics.includes('cloudPromptBlock'), false, 'подсказки про облака в промптах нет');
  assert.equal(analytics.includes('"cloud": "тема памяти"'), false, 'схемы извлечения без поля cloud');
  assert.equal(/assignItemCloud\(/.test(analytics), true, 'стадия раскладывает записи сама');
  const assignLines = analytics.split('\n').filter(line => line.includes('assignItemCloud('));
  assert.ok(assignLines.length <= 3, 'присвоение живёт только в стадии разбора, а не в четырёх сохранениях');
  assert.equal(/assignItemCloud\(fact, newFact\.cloud\)/.test(analytics), false);
  assert.equal(/assignItemCloud\(newContact\.cloud\)/.test(analytics), false);
});

test('стадия разбора сама раскладывает новые записи и называет темы', async () => {
  const { context, calls } = consolidationHarness(() => ({
    clouds: [
      { name: 'Работа', summary: 'офис, коллектив, планы' },
      { name: 'Собака Бобик', summary: 'прогулки и корм' },
    ],
    moves: [{ index: 1, cloud: 'Работа' }, { index: 2, cloud: 'Собака Бобик' }],
    merges: [],
    renames: [],
  }));

  run(context, `setFactsData({ facts: [
    { id: 'f1', text: 'Работает в Сбере', confidence: 'high', superseded: false },
    { id: 'f2', text: 'Гуляет с Бобиком', confidence: 'high', superseded: false },
    { id: 'f3', text: 'Любит кофе', confidence: 'medium', superseded: false },
    { id: 'f4', text: 'Живёт в Амстердаме', confidence: 'high', superseded: false }
  ] })`);

  assert.equal(run(context, 'shouldRunCloudConsolidation()'), true, 'четыре записи и ни одной темы — пора');
  await run(context, 'runCloudConsolidation()');
  assert.equal(calls.length, 1, 'один вызов модели на проход');

  const clouds = Array.from(run(context, 'getClouds()'));
  const names = clouds.map(cloud => cloud.name).sort();
  assert.deepEqual(names, ['Работа', 'Разное', 'Собака Бобик'], 'новые темы названы, остаток ушёл в «Разное»');
  assert.equal(run(context, 'getClouds().find(c => c.name === "Работа").summary'), 'офис, коллектив, планы');

  const facts = Array.from(run(context, 'getFactsData().facts'));
  const cloudOf = text => clouds.find(cloud => cloud.id === facts.find(f => f.text === text).cloud)?.name;
  assert.equal(cloudOf('Работает в Сбере'), 'Работа');
  assert.equal(cloudOf('Гуляет с Бобиком'), 'Собака Бобик');
  assert.equal(cloudOf('Любит кофе'), 'Разное', 'нераспознанное не теряется');
  assert.equal(run(context, 'getCloudsData().lastConsolidatedAt > 0'), true);
});

test('разбор сливает дубли тем и переименовывает неудачные имена', async () => {
  const { context } = consolidationHarness((prompt, call) => (call === 1
    ? { clouds: [], moves: [{ index: 1, cloud: 'Карьера' }, { index: 2, cloud: 'Офисное' }], merges: [], renames: [] }
    : { clouds: [], moves: [], merges: [{ from: 'Офисное', into: 'Карьера' }], renames: [{ from: 'Карьера', to: 'Работа' }] }));

  run(context, `setFactsData({ facts: [
    { id: 'f1', text: 'Работает в Сбере', confidence: 'high', superseded: false },
    { id: 'f2', text: 'Ходит в офис на Тульской', confidence: 'high', superseded: false }
  ] })`);

  await run(context, 'runCloudConsolidation({ force: true })');
  assert.deepEqual(Array.from(run(context, 'getClouds().map(c => c.name)')).sort(), ['Карьера', 'Офисное'], 'сначала две темы об одном');

  await run(context, 'runCloudConsolidation({ force: true })');
  const clouds = Array.from(run(context, 'getClouds()'));
  assert.deepEqual(clouds.map(cloud => cloud.name), ['Работа'], 'дубль слит, имя исправлено');
  const facts = Array.from(run(context, 'getFactsData().facts'));
  assert.equal(facts.every(fact => fact.cloud === clouds[0].id), true, 'записи переехали вместе с темой');
});

test('разбор не частит: пауза между попытками и порог по числу записей', async () => {
  const { context, calls } = consolidationHarness(() => ({ clouds: [], moves: [], merges: [], renames: [] }));
  run(context, `setFactsData({ facts: [
    { id: 'f1', text: 'Один факт', confidence: 'high', superseded: false }
  ] })`);

  assert.equal(run(context, 'shouldRunCloudConsolidation()'), false, 'одной записи мало');
  await run(context, 'runCloudConsolidation()');
  assert.equal(calls.length, 0, 'без повода модель не зовём');

  run(context, `setFactsData({ facts: [
    { id: 'f1', text: 'Работает в Сбере', confidence: 'high', superseded: false },
    { id: 'f2', text: 'Гуляет с Бобиком', confidence: 'high', superseded: false },
    { id: 'f3', text: 'Любит кофе', confidence: 'medium', superseded: false },
    { id: 'f4', text: 'Живёт в Амстердаме', confidence: 'high', superseded: false }
  ] })`);
  assert.equal(run(context, 'shouldRunCloudConsolidation()'), true);
  await run(context, 'runCloudConsolidation()');
  assert.equal(calls.length, 1);

  run(context, `setFactsData({ facts: [
    { id: 'f1', text: 'Работает в Сбере', confidence: 'high', superseded: false },
    { id: 'f2', text: 'Гуляет с Бобиком', confidence: 'high', superseded: false },
    { id: 'f3', text: 'Любит кофе', confidence: 'medium', superseded: false },
    { id: 'f4', text: 'Живёт в Амстердаме', confidence: 'high', superseded: false },
    { id: 'f5', text: 'Учит японский', confidence: 'high', superseded: false },
    { id: 'f6', text: 'Мечтает о Киото', confidence: 'high', superseded: false }
  ] })`);
  assert.equal(run(context, 'shouldRunCloudConsolidation()'), false, 'сразу после прохода — пауза');
  assert.equal(run(context, 'shouldRunCloudConsolidation(true)'), true, 'кнопка «разобрать сейчас» паузу обходит');
});

test('сбой разбора не повторяется каждый ход', async () => {
  const { context, calls } = consolidationHarness(() => { throw new Error('down'); });
  run(context, `setFactsData({ facts: [
    { id: 'f1', text: 'Работает в Сбере', confidence: 'high', superseded: false },
    { id: 'f2', text: 'Гуляет с Бобиком', confidence: 'high', superseded: false },
    { id: 'f3', text: 'Любит кофе', confidence: 'medium', superseded: false },
    { id: 'f4', text: 'Живёт в Амстердаме', confidence: 'high', superseded: false }
  ] })`);

  const first = await run(context, 'runCloudConsolidation()');
  assert.equal(first, false, 'сбой не считается успехом');
  assert.equal(calls.length, 1);
  assert.equal(run(context, 'shouldRunCloudConsolidation()'), false, 'пауза после неудачи');
  assert.equal(run(context, 'getCloudsData().lastConsolidatedAt'), 0);
});

test('облако переименовывается без потери записей, дубли и «Разное» — нет', () => {
  const { context } = cloudHarness();
  const work = run(context, 'ensureCloud("Работа")');
  run(context, `ensureCloud("Собака"); assignItemCloud({ text: 'Работает в Сбере' }, "Работа")`);

  assert.equal(run(context, `renameCloud('${work.id}', '  Карьера   и офис ')`), true);
  assert.equal(run(context, 'getClouds().find(c => c.name === "Карьера и офис").id'), work.id);

  assert.equal(run(context, `renameCloud('${work.id}', 'собака')`), false, 'дубль имени не принимаем');
  assert.equal(run(context, `renameCloud('${work.id}', '   ')`), false, 'пустое имя не принимаем');
  assert.equal(run(context, `renameCloud('cloud_misc', 'Другое')`), false, 'служебное облако не переименовать');
  assert.equal(run(context, `renameCloud('nope', 'Что-то')`), false);
});

test('вкладка облаков только показывает работу стадии разбора', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const page = fs.readFileSync('ui.js', 'utf8');

  assert.match(html, /data-tab="clouds"/);
  assert.match(html, /id="cloudsInfo"/);
  assert.match(page, /function renderCloudsTab\(/);
  assert.match(page, /toggleCloudMemoryFromInput\(/);
  assert.match(page, /requestCloudConsolidation\(/, 'можно попросить стадию поработать сейчас');
  // Имена и содержимое правит стадия, а не человек: полей ввода в вкладке нет.
  assert.equal(page.includes('cloud-name-input'), false, 'ручного переименования нет');
  assert.equal(page.includes('renameCloudFromInput'), false);
  // Вкладка рисуется по требованию: на верхнем уровне ui.js никаких вызовов.
  assert.equal(page.includes('\nrenderCloudsTab();'), false);
});

test('в вопрос jev попадают примеры содержимого облака, а не только имя', () => {
  const { context } = cloudHarness();
  seedCloudsWithFacts(context, ['Работа']);
  run(context, `assignItemCloud({ text: 'Руководит командой из пяти человек' }, 'Работа')`);

  const cloud = Array.from(run(context, 'getCloudsForSelection()'))[0];
  assert.ok(Array.isArray(cloud.samples) && cloud.samples.length > 0, 'выборка содержимого есть');

  const questions = Array.from(run(context, `Object.values(buildCloudQuestions(${JSON.stringify(cloud ? [cloud] : [])}))`));
  assert.equal(questions.length, 3);
  const described = questions[0].criteria.cloud_0;
  assert.match(described, /Работа/);
  assert.match(described, /например:/);
  // Промпт остаётся компактным: одна тема — одна короткая строка.
  assert.ok(described.length < 600, 'описание темы не разрастается');
});

test('вкладка показывает темы, а по клику — записи внутри', () => {
  const { storage } = createStorage({});
  const container = { innerHTML: '' };
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    localStorage: storage,
    window: { dispatchEvent() {}, location: { hostname: 'localhost' } },
    document: {
      getElementById: id => (id === 'structuredContainer' ? container : null),
      querySelectorAll: () => [],
      createElement: () => ({ textContent: '', innerHTML: '' }),
    },
    navigator: { language: 'ru' },
    Event, AbortController, setTimeout, clearTimeout, JSON, Number, TextDecoder, TextEncoder,
    // escapeHtml объявлен ниже вкладки — подставляем эквивалент, чтобы не тянуть весь файл.
    escapeHtml: text => String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  });
  vm.runInContext(app, context);
  vm.runInContext(
    ui.slice(ui.indexOf('// ==================== MODAL WINDOW ===================='),
      ui.indexOf('// ==================== STRUCTURED CONTENT RENDERING ====================')),
    context
  );

  const work = run(context, 'ensureCloud("Работа", "офис и коллектив")');
  run(context, 'ensureCloud("Собака Бобик")');
  run(context, `setFactsData({ facts: [
    { id: 'f1', text: 'Работает в Сбере', confidence: 'high', superseded: false, cloud: '${work.id}' },
    { id: 'f2', text: 'Руководит командой', confidence: 'high', superseded: false, cloud: '${work.id}' },
    { id: 'f3', text: 'Гуляет с Бобиком', confidence: 'high', superseded: false, cloud: '${run(context, 'getClouds().find(c => c.name === "Собака Бобик").id')}' }
  ] })`);

  run(context, 'renderCloudsTab()');
  assert.match(container.innerHTML, /Облака памяти/);
  assert.match(container.innerHTML, /Работа/);
  assert.match(container.innerHTML, /офис и коллектив/);
  assert.match(container.innerHTML, /2 записи/);
  assert.equal(container.innerHTML.includes('Работает в Сбере'), false, 'по умолчанию записи свёрнуты');
  assert.match(container.innerHTML, /Разобрать сейчас/);

  run(context, `toggleCloudDetails('${work.id}')`);
  assert.match(container.innerHTML, /Работает в Сбере/);
  assert.match(container.innerHTML, /Руководит командой/);
  assert.equal(container.innerHTML.includes('Гуляет с Бобиком'), false, 'чужие темы не раскрываются');

  run(context, `toggleCloudDetails('${work.id}')`);
  assert.equal(container.innerHTML.includes('Работает в Сбере'), false, 'повторный клик сворачивает');
});

test('одна запись может принадлежать нескольким темам, а в промпт идёт один раз', () => {
  const { context } = cloudHarness();
  const work = run(context, 'ensureCloud("Работа")');
  const career = run(context, 'ensureCloud("Карьера")');

  // Читаем и пишем один и тот же объект: getFactsData() каждый раз парсит заново.
  run(context, `
    const data = getFactsData();
    data.facts = [{ id: 'f1', text: 'Работает в Сбере', confidence: 'high', superseded: false }];
    assignItemCloud(data.facts[0], 'Работа');
    addItemCloud(data.facts[0], 'Карьера');
    setFactsData(data);
  `);

  const ids = Array.from(run(context, 'getItemCloudIds(getFactsData().facts[0])'));
  assert.deepEqual(ids.sort(), [work.id, career.id].sort(), 'обе темы записаны');
  assert.equal(run(context, 'getFactsData().facts[0].cloud'), work.id, 'основная тема осталась первой');

  const counts = Array.from(run(context, 'getCloudsForSelection()')).map(cloud => [cloud.name, cloud.total]);
  assert.deepEqual(counts.sort(), [['Карьера', 1], ['Работа', 1]], 'в каждой теме запись считается');
  assert.equal(run(context, 'countUniqueCloudItems()'), 1, 'уникальных записей — одна');

  const block = run(context, `buildCloudContext(${JSON.stringify([work.id, career.id])})`);
  assert.equal(String(block).split('Работает в Сбере').length - 1, 1, 'в контексте запись не дублируется');

  // Как и стадия разбора: читаем, меняем и сохраняем один и тот же объект.
  run(context, `const d1 = getFactsData(); removeItemCloud(d1.facts[0], '${work.id}'); setFactsData(d1);`);
  assert.deepEqual(Array.from(run(context, 'getItemCloudIds(getFactsData().facts[0])')), [career.id]);

  run(context, `const d2 = getFactsData(); removeItemCloud(d2.facts[0], '${career.id}'); setFactsData(d2);`);
  assert.equal(run(context, 'getItemCloudIds(getFactsData().facts[0])[0]'), 'cloud_misc', 'без тем — в «Разное»');
});

test('стадия разбора ставит несколько тем и добавляет общую через links', async () => {
  const { context, calls } = consolidationHarness((prompt, call) => {
    if (call === 1) {
      return {
        clouds: [{ name: 'Карьера', summary: 'рост и планы' }],
        placements: [{ index: 1, clouds: ['Работа', 'Карьера'] }],
        links: [],
        merges: [],
        renames: [],
      };
    }
    // Второй проход: у записи уже есть «Работа», просим добавить «Карьера».
    return { clouds: [], placements: [], links: [{ index: 5, cloud: 'Карьера' }], merges: [], renames: [] };
  });

  run(context, `ensureCloud('Работа'); setFactsData({ facts: [
    { id: 'f1', text: 'Работает в Сбере', confidence: 'high', superseded: false },
    { id: 'f2', text: 'Любит кофе', confidence: 'medium', superseded: false },
    { id: 'f3', text: 'Живёт в Амстердаме', confidence: 'high', superseded: false },
    { id: 'f4', text: 'Учит японский', confidence: 'high', superseded: false },
    { id: 'f5', text: 'Готовится к повышению', confidence: 'high', superseded: false, cloud: getClouds()[0].id }
  ] })`);

  await run(context, 'runCloudConsolidation({ force: true })');
  const first = Array.from(run(context, 'getItemCloudIds(getFactsData().facts[0])'));
  assert.equal(first.length, 2, 'новая запись попала сразу в две темы');
  assert.equal(first.includes(run(context, 'findCloudByName("Карьера").id')), true);

  const assignedBefore = Array.from(run(context, 'getItemCloudIds(getFactsData().facts[4])'));
  await run(context, 'runCloudConsolidation({ force: true })');
  const assignedAfter = Array.from(run(context, 'getItemCloudIds(getFactsData().facts[4])'));
  assert.deepEqual(assignedBefore, [run(context, 'findCloudByName("Работа").id')], 'до связывания тема одна');
  assert.equal(assignedAfter.length, 2, 'links добавил вторую тему');
  assert.equal(assignedAfter.includes(run(context, 'findCloudByName("Работа").id')), true, 'прежняя тема не отобрана');
  assert.equal(calls.length, 2);
});

test('тема может делиться: часть записей уезжает в новую тему', async () => {
  const { context } = consolidationHarness(() => ({
    clouds: [{ name: 'Здоровье', summary: 'сон и спина' }],
    placements: [],
    links: [],
    reassign: [{ index: 1, clouds: ['Здоровье'] }, { index: 2, clouds: ['Здоровье'] }],
    merges: [],
    renames: [],
  }));

  run(context, `const data = getFactsData();
    data.facts = [
      { id: 'f1', text: 'Болит спина', confidence: 'high', superseded: false },
      { id: 'f2', text: 'Спит по шесть часов', confidence: 'high', superseded: false },
      { id: 'f3', text: 'Работает в Сбере', confidence: 'high', superseded: false },
      { id: 'f4', text: 'Руководит командой', confidence: 'high', superseded: false }
    ];
    const work = ensureCloud('Работа');
    data.facts.forEach(fact => assignItemCloud(fact, 'Работа'));
    setFactsData(data);`);

  await run(context, 'runCloudConsolidation({ force: true })');

  const counts = Object.fromEntries(Array.from(run(context, 'getCloudsForSelection()')).map(c => [c.name, c.total]));
  assert.equal(counts['Работа'], 2, 'в исходной теме осталось две записи');
  assert.equal(counts['Здоровье'], 2, 'две ушли в новую тему');
  assert.equal(run(context, 'findCloudByName("Работа") !== null'), true, 'исходная тема не удалена');
});

test('деление не может опустошить тему — это уже слияние', async () => {
  const { context } = consolidationHarness(() => ({
    clouds: [],
    placements: [],
    links: [],
    reassign: [{ index: 1, clouds: ['Отдых'] }, { index: 2, clouds: ['Отдых'] }],
    merges: [],
    renames: [],
  }));

  run(context, `const data = getFactsData();
    data.facts = [
      { id: 'f1', text: 'Работает в Сбере', confidence: 'high', superseded: false },
      { id: 'f2', text: 'Руководит командой', confidence: 'high', superseded: false }
    ];
    data.facts.forEach(fact => assignItemCloud(fact, 'Работа'));
    setFactsData(data);`);

  await run(context, 'runCloudConsolidation({ force: true })');

  const counts = Object.fromEntries(Array.from(run(context, 'getCloudsForSelection()')).map(c => [c.name, c.total]));
  assert.equal(counts['Работа'], 1, 'последняя запись осталась в теме');
  assert.equal(counts['Отдых'], 1, 'перенос прошёл только для одной записи');
});

test('тем не может быть больше лимита', () => {
  const { context } = cloudHarness();
  run(context, `
    for (let i = 0; i < CLOUD_CONFIG.maxClouds; i++) ensureCloud('Тема ' + i);
  `);
  assert.equal(run(context, 'getClouds().length'), run(context, 'CLOUD_CONFIG.maxClouds'));
  assert.equal(run(context, "ensureCloud('Лишняя')"), null, 'сверх лимита тема не создаётся');
  assert.equal(run(context, 'getClouds().length'), run(context, 'CLOUD_CONFIG.maxClouds'));
});

test('jev отдаёт сырой ответ, вопросы и порог для отладки', async () => {
  const { context } = cloudHarness({}, cloudAnswer({}));
  seedCloudsWithFacts(context, ['Работа', 'Собака']);
  const clouds = Array.from(run(context, 'getCloudsForSelection()'));

  const selection = await councilMemory(context, 'Что по работе?', clouds);
  assert.equal(selection.threshold, 0.1);
  assert.equal(selection.maxSelected, 4);
  assert.equal(selection.relativeCut, 0.4);
  assert.ok(selection.raw && typeof selection.raw === 'object', 'сырые answers сохранены');
  assert.ok(selection.questions && Object.keys(selection.questions).length === 3, 'вопросы двух контуров тоже сохранены');
});

test('спойлер показывает вероятности, сырой ответ и блок промпта', () => {
  const page = fs.readFileSync('ui.js', 'utf8');
  const start = page.indexOf('// ==================== JEV SPOILER ====================');
  const end = page.indexOf('// ==================== TWO-STAGE RESPONSE ARCHITECTURE ====================');
  assert.ok(start > 0 && end > start, 'секция спойлера на месте');

  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    escapeHtml: text => String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    getClouds: () => [],
  });
  vm.runInContext(page.slice(start, end), context);

  const html = vm.runInContext(`buildJevSpoiler({
    source: 'clouds',
    picked: ['Работа'],
    themes: [{ id: 'c1', name: 'Работа', probability: 0.62 }, { id: 'c2', name: 'Собака', probability: 0.21 }],
    threshold: 0.45,
    maxSelected: 4,
    model: 'jev-1.14',
    raw: { cloud_c1: { type: 'noul', noul: 0.62 } },
    questions: { cloud_c1: { type: 'noul' } },
    block: '=== ПАМЯТЬ: ПОДНЯТЫЕ ОБЛАКА ===\\nФакты: работает в Сбере',
    turn: { complexity: 0.72, routeLabel: 'GLM 5.2', archetype: 'options', askProbability: 0.61 }
  })`, context);

  assert.match(html, /^<details class="jev-spoiler">/, 'это раскрывающийся спойлер');
  assert.match(html, /Что шепнул jev/);
  assert.match(html, /Работа/);
  assert.match(html, /0\.62/);
  assert.match(html, /class="jev-theme hit"/, 'поднятая тема отмечена');
  assert.match(html, /Собака/);
  assert.match(html, /Сырой ответ jev/);
  assert.match(html, /noul/);
  assert.match(html, /Что ушло в промпт/);
  assert.match(html, /ПОДНЯТЫЕ ОБЛАКА/);
  assert.match(html, /сложность 0\.72/);

  const fallback = vm.runInContext(`buildJevSpoiler({ source: 'compression', picked: [], themes: [], block: 'досье' })`, context);
  assert.match(fallback, /работало сжатие досье/);

  const notNeeded = vm.runInContext(`buildJevSpoiler({
    source: 'clouds', notNeeded: true, picked: [], themes: [{ id: 'c1', name: 'Работа', probability: 0.15 }],
    threshold: 0.1, relativeCut: 0.4, maxSelected: 4, model: 'jev-1.14', block: ''
  })`, context);
  assert.match(notNeeded, /Память не нужна — jev так решил/, 'пустой выбор подписан как решение');
  assert.match(notNeeded, /память не поднималась/);

  assert.match(page, /lastJevDebug = buildJevDebug\(contextResult, contextBlock, turnPlan\)/, 'stage 2 запоминает отладку');
  assert.match(page, /appendJevSpoiler\(element\)/, 'спойлер добавляется к готовому ответу');
});

// Стадия 1 живёт в ui.js, но зависит только от app.js и jev.js.
function loadStageOne(context) {
  const start = ui.indexOf('// ==================== СОВЕТ ВОПРОСОВ ====================');
  const end = ui.indexOf('async function findRelevantContext');
  assert.ok(start > 0 && end > start, 'секция совета и стадии 1 на месте');
  vm.runInContext(ui.slice(start, end), context);
}

test('стадия 1 собирает Core, фокус и латеральное облако в одном ходу', async () => {
  const { context, calls } = cloudHarness({}, async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: 'jev-1.14',
      answers: {
        clouds: { type: 'choice', probabilities: { cloud_0: 0.8, cloud_1: 0.1, cloud_2: 0.05, none: 0.05 } },
        need_lateral: { type: 'noul', noul: 0.82 },
        lateral_cloud: { type: 'choice', probabilities: { cloud_0: 0.7, cloud_1: 0.2, cloud_2: 0.08, none: 0.02 } },
      },
      usage: { input_tokens: 300, output_tokens: 0 },
    }),
    text: async () => '',
  }));
  loadStageOne(context);
  seedCloudsWithFacts(context, ['Работа', 'Собака', 'Столярка']);
  run(context, `localStorage.setItem(STORAGE_KEYS.style, 'Тепло и коротко')`);

  const result = await run(context, `prepareCloudContext('Проще самому, чем учить джуна', [], { text: 'сейчас' })`);
  assert.equal(calls.length, 1);
  assert.match(result.coreContext, /Тепло и коротко/);
  assert.match(result.cloudContext, /🎯 ПРЯМОЙ КОНТЕКСТ ТЕМЫ/);
  assert.match(result.cloudContext, /🌊 БОКОВОЕ ЗРЕНИЕ/);
  assert.match(result.cloudContext, /Собака/);
  assert.equal(result.lateralCloudIds.length, 1);
});

test('приветствие из совета гасит память: темы не поднимаем', async () => {
  const { context, calls } = cloudHarness({}, async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: 'jev-1.14',
      answers: {
        greeting: { type: 'noul', noul: 0.86 },
        clouds: { type: 'choice', choice: 'cloud_0', probabilities: { cloud_0: 0.55, cloud_1: 0.25, none: 0.2 } },
      },
      usage: { input_tokens: 200, output_tokens: 0 },
    }),
    text: async () => '',
  }));
  loadStageOne(context);
  seedCloudsWithFacts(context, ['Работа', 'Собака']);

  const result = await run(context, `prepareCloudContext('Доброе утро', [], { text: 'сейчас' })`);

  assert.equal(result, null, 'светская реплика не тянет воспоминания');
  assert.equal(run(context, 'lastCloudSkip.code'), 'greeting');
  assert.match(run(context, 'lastCloudSkip.text'), /приветствие/);
  assert.equal(calls.length, 1, 'один запрос на ход');
});

test('jev уверенно выбрал «ничего» — память не поднимается и досье не сжимается', async () => {
  const { context } = cloudHarness({}, cloudChoiceAnswer({ cloud_0: 0.15, cloud_1: 0.12, none: 0.73 }));
  loadStageOne(context);
  seedCloudsWithFacts(context, ['Работа', 'Собака']);

  const result = await run(context, `prepareCloudContext('Как дела?', [], { text: 'сейчас' })`);
  assert.equal(result && result.source, 'clouds');
  assert.equal(result.notNeeded, true, 'это решение модели, а не отказ');
  assert.equal(result.cloudContext, '', 'контекст пустой — сжатия нет');

  assert.equal(result.jev && typeof result.jev.noneProbability, 'number', 'причина видна в отладке');
});

test('одна тема с записями поднимается напрямую, без jev', async () => {
  const { context, calls } = cloudHarness({}, cloudAnswer({}));
  loadStageOne(context);
  seedCloudsWithFacts(context, ['Работа']);
  run(context, `ensureCloud('Пустая тема')`);

  const result = await run(context, `prepareCloudContext('Привет', [], { text: 'сейчас' })`);
  assert.equal(result && result.source, 'clouds');
  assert.equal(result.single, true, 'режим одной темы');
  assert.match(result.cloudContext, /Работа/);
  assert.equal(calls.length, 0, 'jev не спрашивали — платить не за что');
  assert.equal(run(context, 'getClouds().length'), 1, 'пустая тема вычищена до подсчёта');
});

test('без тем с записями причина отказа попадает в отладку', async () => {
  const { context, calls } = cloudHarness({}, cloudAnswer({}));
  loadStageOne(context);
  run(context, `ensureCloud('Пустая раз'); ensureCloud('Пустая два')`);

  const result = await run(context, `prepareCloudContext('Привет', [], { text: 'сейчас' })`);
  assert.equal(result, null);
  assert.equal(run(context, 'lastCloudSkip.code'), 'no-clouds');
  assert.match(run(context, 'lastCloudSkip.text'), /всего тем: 0/);
  assert.equal(calls.length, 0);
});

test('ошибка jev даёт понятную причину, а не молчаливое сжатие', async () => {
  const { context } = cloudHarness({}, async () => ({
    ok: false, status: 500, json: async () => ({}), text: async () => 'down',
  }));
  loadStageOne(context);
  seedCloudsWithFacts(context, ['Работа', 'Собака']);

  const result = await run(context, `prepareCloudContext('Что по работе?', [], { text: 'сейчас' })`);
  assert.equal(result, null);
  assert.equal(run(context, 'lastCloudSkip.code'), 'no-council');
  assert.match(run(context, 'lastCloudSkip.text'), /совет не ответил/);
  assert.match(run(context, 'lastCloudSkip.text'), /systemone HTTP 500/, 'в спойлер попадает реальная причина');
});

test('спойлер объясняет режим одной темы и причину отказа', () => {
  const page = fs.readFileSync('ui.js', 'utf8');
  const start = page.indexOf('// ==================== JEV SPOILER ====================');
  const end = page.indexOf('// ==================== TWO-STAGE RESPONSE ARCHITECTURE ====================');
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    escapeHtml: text => String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    getClouds: () => [],
  });
  vm.runInContext(page.slice(start, end), context);

  const single = vm.runInContext(`buildJevSpoiler({
    source: 'clouds', single: true, picked: ['Работа'], themes: [], block: 'факт'
  })`, context);
  assert.match(single, /Тема одна — jev не спрашивали/);
  assert.match(single, /без jev/);

  const skipped = vm.runInContext(`buildJevSpoiler({
    source: 'compression', picked: [], themes: [], block: 'досье',
    skip: { code: 'no-clouds', text: 'нет ни одной темы с записями (всего тем: 5)' }
  })`, context);
  assert.match(skipped, /работало сжатие досье/);
  assert.match(skipped, /Почему не облака/);
  assert.match(skipped, /всего тем: 5/);
  assert.match(skipped, /выбор тем не работал/, 'в шапке нет намёка на выбор тем');
  assert.equal(skipped.includes('Модель выбора'), false, 'на старом пути нет строки «модель выбора»');
  assert.equal(skipped.includes('вероятностей нет'), false, 'и пустых вероятностей тоже');

  const noReason = vm.runInContext(`buildJevSpoiler({ source: 'compression', picked: [], themes: [], block: 'досье' })`, context);
  assert.match(noReason, /причина не записана/, 'старая сборка честно себя выдаёт');

  const withTurn = vm.runInContext(`buildJevSpoiler({
    source: 'clouds', picked: ['Работа'], themes: [{ id: 'c1', name: 'Работа', probability: 0.7 }],
    threshold: 0.45, maxSelected: 4, model: 'jev-1.14', block: 'факт',
    turn: { complexity: 0.77, routeLabel: 'GLM 5.2', archetype: 'connector', askProbability: 0.58, model: 'jev-1.14' }
  })`, context);
  assert.match(withTurn, /модель решения jev-1\.14/);

  const empty = vm.runInContext(`buildJevSpoiler({ source: 'clouds', picked: [], themes: [], block: '' })`, context);
  assert.match(empty, /jev не поднял ни одной темы/);
});
