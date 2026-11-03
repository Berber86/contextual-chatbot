const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const FILM = [
  { role: 'user', content: 'Вчера смотрел фильм «Ветер» — там у главного героя есть младший брат, он погиб на войне.' },
  { role: 'assistant', content: 'Сильная сцена.' },
  { role: 'user', content: 'А Гретта в фильме — сестра героя, она мне понравилась.' },
];

const REAL = [
  { role: 'user', content: 'Вчера встретил друга Ивана, он заходил к моей маме. Я живу в Амстердаме.' },
];

function harness(history) {
  const values = new Map();
  const context = vm.createContext({
    console: { log() {}, error() {}, warn() {} },
    window: { location: { hostname: 'example.com' }, dispatchEvent() {} },
    localStorage: { getItem: k => (values.has(k) ? values.get(k) : null), setItem: (k, v) => values.set(k, v) },
    Event: class { constructor(type) { this.type = type; } },
    getMessageCounter: () => 7,
    getChatHistory: () => history,
    setTimeout: fn => fn(),
  });
  vm.runInContext(fs.readFileSync('app.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('analytics.js', 'utf8'), context);
  return { context, values };
}

function factsOf(context) {
  return vm.runInContext('getFactsData().facts', context);
}

test('персонаж фильма не становится контактом, а его брат — фактом о пользователе', () => {
  const { context } = harness(FILM);
  const factsBefore = vm.runInContext('getFactsData()', context);

  vm.runInContext(
    `integrateFactsData(
      [{ text: 'У пользователя есть младший брат, погибший на войне', evidence: ['есть младший брат, он погиб на войне'], confidence: 'high' }],
      getFactsData(),
      getChatHistory()
    )`,
    context
  );
  assert.equal(factsOf(context).length, 0, 'факт из обсуждения фильма не записан');

  vm.runInContext(
    `integrateSocialData(
      [{ name: 'Гретта', relation: 'family', facts: [{ text: 'Сестра героя', evidence: ['Гретта в фильме — сестра героя'] }] }],
      getChatHistory()
    )`,
    context
  );
  const contacts = vm.runInContext('getSocialData().contacts', context);
  assert.equal(contacts.length, 0, 'персонаж не попал в социальные связи');

  // Старое «мёртвое» состояние до интеграции не изменилось.
  assert.equal(factsBefore.facts.length, 0);
});

test('настоящие люди и факты проходят как раньше', () => {
  const { context } = harness(REAL);

  vm.runInContext(
    `integrateFactsData(
      [{ text: 'Живёт в Амстердаме', evidence: ['Я живу в Амстердаме'], confidence: 'high' }],
      getFactsData(),
      getChatHistory()
    )`,
    context
  );
  assert.equal(factsOf(context).length, 1, 'факт о себе записан');

  vm.runInContext(
    `integrateSocialData(
      [{ name: 'Иван', relation: 'friend', facts: [{ text: 'Друг', evidence: ['Вчера встретил друга Ивана'] }] }],
      getChatHistory()
    )`,
    context
  );
  assert.equal(vm.runInContext('getSocialData().contacts.length', context), 1, 'настоящий знакомый остался');
});

test('третье лицо без первого не становится фактом о пользователе', () => {
  const history = [{ role: 'user', content: 'Коллега рассказывал: его брат погиб на войне.' }];
  const { context } = harness(history);

  vm.runInContext(
    `integrateFactsData(
      [{ text: 'Брат погиб на войне', evidence: ['его брат погиб на войне'], confidence: 'high' }],
      getFactsData(),
      getChatHistory()
    )`,
    context
  );
  assert.equal(factsOf(context).length, 0, 'чужой родственник не стал фактом о пользователе');

  // А про себя — можно.
  vm.runInContext(
    `integrateFactsData(
      [{ text: 'Мой брат погиб на войне', evidence: ['его брат погиб на войне'], confidence: 'high' }],
      getFactsData(),
      getChatHistory()
    )`,
    context
  );
  assert.equal(factsOf(context).length, 0, 'цитата про чужого брата не годится и для своего');
});

test('чистка находит и убирает то, что уже записалось', () => {
  const { context } = harness(FILM);

  vm.runInContext(
    `setFactsData({ facts: [
      { id: 'f1', text: 'У пользователя есть младший брат, погибший на войне', evidence: ['есть младший брат, он погиб на войне'], confidence: 'high' },
      { id: 'f2', text: 'Живёт в Амстердаме', evidence: ['Я живу в Амстердаме'], confidence: 'high' }
    ], legacy_text: '' })`,
    context
  );
  vm.runInContext(
    `setSocialData({ contacts: [
      { id: 'c1', name: 'Гретта', relation: 'family', facts: [{ text: 'Сестра героя', evidence: ['Гретта в фильме — сестра героя'] }], traits: [], interactions: [] }
    ] })`,
    context
  );

  const found = vm.runInContext('findFictionPollution()', context);
  assert.equal(found.contacts.length, 1, 'Гретта найдена');
  assert.equal(found.facts.length, 1, 'факт про брата найден');

  const report = vm.runInContext(`purgeFictionPollution(findFictionPollution())`, context);
  assert.equal(report.contacts, 1);
  assert.equal(report.facts, 1);

  assert.equal(vm.runInContext('getSocialData().contacts.length', context), 0, 'персонаж удалён');
  const facts = factsOf(context);
  assert.equal(facts.length, 2, 'записи не удалены безвозвратно');
  assert.equal(facts.find(f => f.id === 'f1').superseded, true, 'факт про брата устарел');
  assert.equal(Boolean(facts.find(f => f.id === 'f2').superseded), false, 'настоящий факт не тронут');

  const prompt = vm.runInContext('getFactsForPrompt()', context);
  assert.equal(prompt.includes('брат'), false, 'в промпт факт про брата больше не идёт');
  assert.equal(prompt.includes('Амстердам'), true, 'настоящий факт остался в промпте');
});

test('«роман с коллегой» — не повод считать человека персонажем', () => {
  const history = [{ role: 'user', content: 'У меня был роман с коллегой Мариной, потом мы расстались.' }];
  const { context } = harness(history);
  vm.runInContext(
    `integrateSocialData(
      [{ name: 'Марина', relation: 'colleague', facts: [{ text: 'Коллега', evidence: ['У меня был роман с коллегой Мариной'] }] }],
      getChatHistory()
    )`,
    context
  );
  assert.equal(vm.runInContext('getSocialData().contacts.length', context), 1, 'настоящая Марина осталась');
});

test('без цитат записи не трогаем — доказательств против них нет', () => {
  const { context } = harness(FILM);
  vm.runInContext(
    `setFactsData({ facts: [{ id: 'f3', text: 'Любит тишину', evidence: [], confidence: 'medium' }], legacy_text: '' })`,
    context
  );
  const found = vm.runInContext('findFictionPollution()', context);
  assert.equal(found.facts.length, 0);
});

test('кнопка чистки есть в базе знаний', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const ui = fs.readFileSync('ui.js', 'utf8');
  assert.match(html, /runFictionCleanup\(\)/);
  assert.match(ui, /function runFictionCleanup\(/);
  assert.match(ui, /purgeFictionPollution/);
  assert.match(ui, /function deleteContact\(/);
  assert.match(ui, /function deleteMemoryItem\(/);
  assert.match(ui, /deleteMemoryItem\('\$\{type\}'/, 'у каждой записи есть крестик');
  assert.match(ui, /deleteContact\('\$\{contact\.id\}'\)/, 'у контакта тоже');
});
