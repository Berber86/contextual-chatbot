const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const analytics = fs.readFileSync('analytics.js', 'utf8');
const jev = fs.readFileSync('jev.js', 'utf8');
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
  return { context, values, calls, storage };
}

const run = (context, expression) => vm.runInContext(expression, context);

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

test('выбор облаков: один запрос, noul на каждое облако, порог 0.45', async () => {
  const { context, calls } = cloudHarness({}, async (url, init) => {
    const names = Object.keys(JSON.parse(init.body).questions);
    const answers = {};
    names.forEach((name, index) => { answers[name] = { type: 'noul', noul: index === 0 ? 0.9 : index === 1 ? 0.44 : 0.2 }; });
    return {
      ok: true,
      status: 200,
      json: async () => ({ answers, usage: { input_tokens: 300, output_tokens: 0 } }),
      text: async () => '',
    };
  });

  seedCloudsWithFacts(context, ['Работа', 'Собака', 'Япония']);
  run(context, 'ensureCloud("Работа", "офис")');
  const clouds = run(context, 'getCloudsForSelection().map(c => ({ id: c.id, name: c.name, counts: c.counts }))');

  const selection = await run(context, `selectCloudsForTurn("Что посоветуешь по работе?", ${JSON.stringify(Array.from(clouds))}, [])`);

  assert.equal(calls.length, 1, 'один запрос на ход');
  assert.equal(Object.keys(calls[0].body.questions).length, 3, 'по вопросу на облако');
  Object.values(calls[0].body.questions).forEach(question => assert.equal(question.type, 'noul'));
  assert.equal(selection.clouds.length, 1, '0.44 не дотянуло до порога 0.45');
  assert.equal(selection.clouds[0].name, 'Работа');
});

test('выбор облаков: не больше четырёх, самые вероятные первыми', async () => {
  const probabilities = [0.9, 0.8, 0.7, 0.6, 0.55];
  let counter = 0;
  const { context } = cloudHarness({}, async (url, init) => {
    const names = Object.keys(JSON.parse(init.body).questions);
    const answers = {};
    // Имя вопроса — хеш id, поэтому вероятности выдаём по фактическому порядку.
    names.forEach((name, index) => { answers[name] = { type: 'noul', noul: probabilities[index] }; });
    counter++;
    return {
      ok: true,
      status: 200,
      json: async () => ({ answers, usage: { input_tokens: 300, output_tokens: 0 } }),
      text: async () => '',
    };
  });

  seedCloudsWithFacts(context, ['A', 'B', 'C', 'D', 'E']);
  const clouds = Array.from(run(context, 'getCloudsForSelection().map(c => ({ id: c.id, name: c.name, counts: c.counts }))'));
  assert.equal(clouds.length, 5);

  const selection = await run(context, `selectCloudsForTurn("тест", ${JSON.stringify(clouds)}, [])`);
  assert.equal(counter, 1);
  assert.equal(selection.clouds.length, 4, 'пятое облако отсекается');
  for (let index = 1; index < selection.clouds.length; index++) {
    assert.ok(selection.clouds[index - 1].probability >= selection.clouds[index].probability, 'по убыванию');
  }
});

test('выбор облаков: одна тема — не повод для запроса, ошибка — откат', async () => {
  const { context, calls } = cloudHarness({}, cloudAnswer({}));
  seedCloudsWithFacts(context, ['Работа']);
  const clouds = Array.from(run(context, 'getCloudsForSelection().map(c => ({ id: c.id, name: c.name, counts: c.counts }))'));
  assert.equal(await run(context, `selectCloudsForTurn("привет", ${JSON.stringify(clouds)}, [])`), null);
  assert.equal(calls.length, 0, 'одно облако — это вся память, выбирать нечего');

  const broken = cloudHarness({}, async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => 'down' }));
  seedCloudsWithFacts(broken.context, ['Работа', 'Собака']);
  const pair = Array.from(run(broken.context, 'getCloudsForSelection().map(c => ({ id: c.id, name: c.name, counts: c.counts }))'));
  await assert.rejects(async () => {
    await run(broken.context, `selectCloudsForTurn("тест", ${JSON.stringify(pair)}, [])`);
  }, 'ошибку сети обрабатывает вызывающий код');
});

// ==================== ВСТРОЙКА В ЧАТ ====================

test('стадия 1 сначала пробует облака, и только потом сжатие', () => {
  const start = ui.indexOf('async function findRelevantContext');
  const findBody = ui.slice(start, ui.indexOf('function buildSystemPromptLegacy', start));
  const cloudCall = findBody.indexOf('prepareCloudContext(userMessage, history, timeInfo)');
  const lengthCheck = findBody.indexOf('totalContextLength < 2000');
  const compression = findBody.indexOf('compressionPrompt');
  assert.ok(cloudCall > 0 && lengthCheck > cloudCall && compression > lengthCheck, 'порядок: облака → длина → сжатие');

  assert.match(ui, /function prepareCloudContext\(/, 'есть подготовка облачного контекста');
  assert.match(ui, /clouds\.length < 2/, 'одно облако не считается выбором');
  assert.match(ui, /isCloudMemoryEnabled\(\)/, 'есть выключатель');
});

test('стадия 2 получает облачный контекст, а не досье', () => {
  assert.match(ui, /contextResult\.source === 'clouds'/, 'облачный путь опознаётся');
  assert.match(ui, /=== ПАМЯТЬ: ПОДНЯТЫЕ ОБЛАКА ===/, 'заголовок блока');
  assert.match(ui, /память не поднималась: тема не требует воспоминаний/, 'честный пустой случай');
});

test('превью «мыслей» убрано из интерфейса и из промпта', () => {
  assert.doesNotMatch(ui, /micro_opening/, 'в промпте сжатия больше нет генерации мысли');
  assert.doesNotMatch(ui, /contextResult\.microOpening/, 'статус-бар её не показывает');
});

test('извлечение памяти раскладывает новые записи по облакам', () => {
  assert.match(analytics, /function cloudPromptBlock\(\)/, 'есть блок облаков для промптов');
  assert.match(analytics, /MEMORY CLOUDS/, 'модель видит список тем');
  const schemaFields = analytics.match(/"cloud": "тема памяти"/g) || [];
  assert.equal(schemaFields.length, 4, 'факты, черты, хронология и контакты просят облако');

  const assigns = analytics.match(/assignItemCloud\(/g) || [];
  assert.ok(assigns.length >= 4, 'записи получают облако при сохранении');
  assert.match(analytics, /assignItemCloud\(fact, newFact\.cloud\)/);
  assert.match(analytics, /assignItemCloud\(trait, newTrait\.cloud\)/);
  assert.match(analytics, /assignItemCloud\(event, newEvent\.cloud\)/);
  assert.match(analytics, /assignItemCloud\(contact, newContact\.cloud\)/);
});

test('первичная разбивка делается один раз и не повторяется после сбоя', async () => {
  const { values, storage } = createStorage();
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    localStorage: storage,
    window: { dispatchEvent() {} },
    document: { createElement: () => ({ textContent: '', innerHTML: '' }) },
    Event,
    setTimeout,
    clearTimeout,
    JSON,
    fetch: async () => ({ ok: true, json: async () => ({}), text: async () => '' }),
  });
  vm.runInContext(app, context);
  vm.runInContext('function parseJSON(text) { try { return JSON.parse(text); } catch (e) { return null; } }', context);

  let asked = 0;
  context.callMemoryAPIWithRetry = async () => {
    asked++;
    return JSON.stringify({
      clouds: [{ name: 'Работа', summary: 'офис' }, { name: 'Собака', summary: 'Бобик' }],
      assignments: [
        { kind: 'fact', index: 1, cloud: 'Работа' },
        { kind: 'fact', index: 2, cloud: 'Собака' },
      ],
    });
  };
  vm.runInContext(analytics, context);
  run(context, `setFactsData({ facts: [
    { id: 'f1', text: 'Работает в Сбере', confidence: 'high', superseded: false },
    { id: 'f2', text: 'Гуляет с Бобиком', confidence: 'high', superseded: false },
    { id: 'f3', text: 'Любит кофе', confidence: 'medium', superseded: false }
  ] });
  setTraitsData({ traits: [{ id: 't1', text: 'Любит планировать', confidence: 'medium', superseded: false }] })`);

  await run(context, 'bootstrapCloudsFromMemory()');
  assert.equal(asked, 1);
  const facts = Array.from(run(context, 'getFactsData().facts'));
  assert.equal(facts.filter(fact => fact.cloud).length, 2, 'два факта разложены');
  assert.equal(run(context, 'areCloudsBootstrapped()'), true);
  assert.deepEqual(Array.from(run(context, 'getClouds().map(c => c.name)')).sort(), ['Работа', 'Собака']);

  await run(context, 'bootstrapCloudsFromMemory()');
  assert.equal(asked, 1, 'повторно модель не спрашиваем');
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

test('в интерфейсе есть вкладка облаков: список, переименование и выключатель', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const page = fs.readFileSync('ui.js', 'utf8');

  assert.match(html, /data-tab="clouds"/);
  assert.match(html, /id="cloudsInfo"/);
  assert.match(page, /function renderCloudsTab\(/);
  assert.match(page, /renameCloudFromInput\(/);
  assert.match(page, /toggleCloudMemoryFromInput\(/);
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
  assert.equal(questions.length, 1);
  assert.match(questions[0].instructions, /Работа/);
  assert.match(questions[0].instructions, /например:/);
  // Промпт остаётся компактным: одна тема — одна короткая строка.
  assert.ok(questions[0].instructions.length < 600, 'инструкция вопроса не разрастается');
});
