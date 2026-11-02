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
  assert.equal(questions.length, 1);
  assert.match(questions[0].instructions, /Работа/);
  assert.match(questions[0].instructions, /например:/);
  // Промпт остаётся компактным: одна тема — одна короткая строка.
  assert.ok(questions[0].instructions.length < 600, 'инструкция вопроса не разрастается');
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
