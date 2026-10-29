const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ui = fs.readFileSync('ui.js', 'utf8');

function harness({ local = false, smart = true, key = null } = {}) {
  const values = new Map();
  const requests = [];
  const errors = [];
  const events = [];
  const context = vm.createContext({
    console: { log() {}, error: (...args) => errors.push(args) },
    window: { location: { hostname: local ? 'localhost' : 'example.com' }, dispatchEvent: e => events.push(e.type) },
    localStorage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) },
    Event,
    setTimeout: fn => queueMicrotask(fn),
    getMessageCounter: () => 4,
    getChatHistory: () => [
      { role: 'user', content: 'Я живу в Амстердаме. Я люблю тишину. Вчера встретил друга Ивана.' },
      { role: 'assistant', content: 'Расскажите подробнее.' },
    ],
    fetch: async (url, options) => {
      requests.push({ url, ...options, body: JSON.parse(options.body) });
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(context.result || {}) } }] }) };
    },
  });
  vm.runInContext(fs.readFileSync('app.js', 'utf8'), context);
  vm.runInContext(ui.slice(0, ui.indexOf('// ==================== ВЫБОР ПЛАТНОЙ МОДЕЛИ')), context);
  vm.runInContext(ui.slice(ui.indexOf('async function callAPIOpenRouter('), ui.indexOf('// ==================== SEND MESSAGE')), context);
  vm.runInContext(fs.readFileSync('analytics.js', 'utf8'), context);
  vm.runInContext(`setSmartMode(${smart})`, context);
  if (key) vm.runInContext(`localStorage.setItem(STORAGE_KEYS.hydraKey, ${JSON.stringify(key)})`, context);
  context.getCurrentOpenRouterModel = () => 'test-free-model';
  context.resetModelIndex = () => {};
  return { context, requests, errors, events };
}

test('public user without browser keys writes all four memory sections through Hydra proxy', async () => {
  const { context, requests, errors, events } = harness();
  const cases = [
    ['facts', 'facts', { text: 'Живёт в Амстердаме', evidence: ['Я живу в Амстердаме'] }],
    ['traits', 'traits', { text: 'Любит тишину', evidence: ['Я люблю тишину'] }],
    ['timeline', 'events', { text: 'Встретил Ивана', evidence: ['Вчера встретил друга Ивана'] }],
    ['social', 'contacts', { name: 'Иван', relation: 'друг', facts: [{ text: 'Друг пользователя', evidence: ['Вчера встретил друга Ивана'] }] }],
  ];
  for (const [section, field, item] of cases) {
    context.result = { [field]: [item] };
    await context.runBackgroundAnalysis();
    const stored = vm.runInContext(`JSON.parse(localStorage.getItem(STORAGE_KEYS.${section}))`, context);
    assert.equal(stored?.[field]?.length, 1, `${section}: ${JSON.stringify(errors)}`);
  }
  assert.equal(requests.length, 4);
  assert.ok(requests.every(r => r.url === '/api/hydra' && r.body.model === 'hydra-gemini'));
  assert.ok(requests.every(r => !r.headers.Authorization));
  assert.equal(events.filter(e => e === 'memory-updated').length, 4);
  assert.deepEqual(errors, []);
});

test('free mode continues to use OpenRouter server proxy', async () => {
  const { context, requests } = harness({ smart: false });
  await context.callAPIOpenRouter([{ role: 'user', content: 'test' }], true);
  assert.equal(requests[0].url, '/api/chat');
});

test('legacy local full-Hydra key strips $$ and uses direct endpoint', async () => {
  const { context, requests } = harness({ local: true, key: 'test-key$$', smart: false });
  await context.callAPIOpenRouter([], true);
  assert.equal(requests[0].url, 'https://api.hydraai.ru/v1/chat/completions');
  assert.equal(requests[0].headers.Authorization, 'Bearer test-key');
});

test('Hydra body errors are surfaced rather than causing a choices TypeError', async () => {
  const { context } = harness();
  context.fetch = async () => ({ ok: true, json: async () => ({ error: { message: 'quota exceeded' } }) });
  await assert.rejects(context.callAPIOpenRouter([], true), /quota exceeded/);
});

for (const provider of ['chat', 'hydra']) {
  test(`${provider} proxy preserves upstream non-stream HTTP errors`, async () => {
    const context = vm.createContext({
      process: { env: { HYDRA_API_KEY: 'test', OPENROUTER_API_KEY: 'test' } },
      console: { log() {}, error() {} },
      fetch: async () => ({ status: 429, json: async () => ({ error: { message: 'rate limited' } }) }),
    });
    vm.runInContext(fs.readFileSync(`api/${provider}.js`, 'utf8').replace('export default ', ''), context);
    let status;
    await context.handler({ method: 'POST', body: { messages: [] } }, {
      setHeader() {}, status(code) { status = code; return this; }, json() {},
    });
    assert.equal(status, 429);
  });
}

test('OpenRouter priority contains only the requested Nemotron models', () => {
  const { context } = harness();
  assert.deepEqual(Array.from(vm.runInContext('CONFIG.openRouterModels', context)), [
    'nvidia/nemotron-3.5-super-vl:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
  ]);
});

for (const provider of ['hydra', 'openrouter']) {
  test(`memory choice ${provider} overrides chat mode and legacy key`, async () => {
    const { context, requests } = harness({ smart: provider === 'openrouter', key: 'test-key$$' });
    context.setMemoryProvider(provider);
    await context.callMemoryAPIWithRetry('test');
    assert.equal(requests[0].url, provider === 'hydra' ? '/api/hydra' : '/api/chat');
    vm.runInContext('setSmartMode(!isSmartMode())', context);
    assert.equal(context.getMemoryProvider(), provider);
    context.setMemoryProvider('invalid');
    assert.equal(context.getMemoryProvider(), provider);
  });
}

test('memory provider default is persisted, independently of later chat changes', () => {
  const { context } = harness({ smart: false });
  assert.equal(context.getMemoryProvider(), 'openrouter');
  vm.runInContext('setSmartMode(true)', context);
  assert.equal(context.getMemoryProvider(), 'openrouter');
});

test('all memory extraction and periodic updates use the memory provider wrapper', () => {
  const analytics = fs.readFileSync('analytics.js', 'utf8');
  assert.equal((analytics.match(/await callMemoryAPIWithRetry\(prompt, 2\)/g) || []).length, 9);
  assert.doesNotMatch(analytics, /callAPIWithRetry\(/);
});
