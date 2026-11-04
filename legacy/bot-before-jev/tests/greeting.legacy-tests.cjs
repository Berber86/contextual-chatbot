const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ui = fs.readFileSync('ui.js', 'utf8');
const dashboard = fs.readFileSync('dashboard.js', 'utf8');
const greetingSource = ui.slice(ui.indexOf('function getGreetingHistory()'), ui.indexOf('// ==================== SETTINGS MENU'));

function harness(options = {}) {
  const values = new Map(Object.entries(options.storage || {}));
  const state = {
    history: (options.history || []).slice(),
    messages: [],
    requests: [],
    lensRequests: [],
    statuses: [],
    fallbackCalls: 0,
  };
  const chat = {
    scrollHeight: 200,
    appendChild(element) { state.statuses.push(element); },
  };
  const context = {
    greetingShown: false,
    activeProactiveGreeting: null,
    GREETING_TIMESTAMP_KEY: 'lastGreeting',
    GREETING_HISTORY_KEY: 'greetingHistory',
    MAX_GREETING_HISTORY: 5,
    STORAGE_KEYS: { style: 'style' },
    isProcessing: false,
    isLocal: Boolean(options.isLocal),
    currentLanguage: 'ru',
    AbortController,
    setTimeout: callback => queueMicrotask(callback),
    localStorage: {
      getItem: key => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
    },
    document: {
      getElementById: id => id === 'chatArea' ? chat : null,
      createElement: () => ({ setAttribute() {}, remove() { this.removed = true; } }),
    },
    getChatHistory: () => state.history.slice(),
    getApiKey: () => options.openRouterKey === undefined ? 'server-side' : options.openRouterKey,
    getHydraKey: () => options.hydraKey || null,
    isSmartMode: () => options.smartMode !== false,
    getLanguageName: () => 'Russian',
    getFactsForPrompt: () => options.facts || '(no facts recorded yet)',
    getTraitsForPrompt: () => options.traits || '(no personality traits recorded yet)',
    getHypothesesForPrompt: () => options.hypotheses || '(no hypotheses yet)',
    getTimelineForPrompt: () => options.timeline || '(no timeline events recorded yet)',
    getGapsForPrompt: () => options.gaps || '(no knowledge gaps identified yet)',
    getSocialForPrompt: () => options.social || '(no social connections recorded yet)',
    t: key => ({ greetingThinking: 'Готовлю приветствие…', greetingUnavailable: 'Приветствие недоступно' })[key],
    appendMessage(role, content, save) {
      state.messages.push({ role, content, save });
      if (save) state.history.push({ role, content });
    },
    async streamResponse(messages, onChunk, onComplete, requestOptions) {
      state.requests.push({ messages, requestOptions });
      if (options.stream) return options.stream(messages, requestOptions);
      return 'Привет! Рад тебя видеть.';
    },
    async callAPI(messages, tools, useAnalysis, retries, signal) {
      state.fallbackCalls++;
      if (options.fallback) return options.fallback(messages, signal);
      throw new Error('offline');
    },
    async callAPIWithRetry(prompt, retries, useAnalysis, signal) {
      state.lensRequests.push({ prompt, signal });
      if (options.lens) return options.lens(prompt, signal);
      return JSON.stringify({ strategy: 'reflective_insight', mainThread: 'Продолжить общение' });
    },
    parseJSON: text => { try { return JSON.parse(text); } catch { return null; } },
    console: { log() {}, warn() {}, error() {} },
  };
  vm.runInNewContext(greetingSource, context);
  return { context, state, values };
}

test('a new user gets a generated, time-aware greeting on startup', async () => {
  const { context, state, values } = harness({ storage: { lastGreeting: String(Date.now()) } });
  await context.showProactiveGreeting();
  assert.equal(state.requests.length, 1, 'a recent old timestamp must not suppress startup');
  assert.equal(state.lensRequests.length, 0, 'no invented memory for a new user');
  assert.match(state.requests[0].messages[0].content, /CURRENT TIME CONTEXT/);
  assert.match(state.requests[0].messages[0].content, /No personal facts about this user are known yet/);
  assert.match(state.requests[0].messages[0].content, /Do not list the assistant's capabilities/);
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].role, 'assistant');
  assert.equal(state.messages[0].save, true);
  assert.equal(state.history[0].content, 'Привет! Рад тебя видеть.');
  assert.equal(JSON.parse(values.get('greetingHistory'))[0].text, state.history[0].content);
  assert.ok(values.get('lastGreeting'));
  assert.equal(state.statuses[0].removed, true);
  await context.showProactiveGreeting();
  assert.equal(state.requests.length, 1, 'only one attempt per page load');
});

test('returning-user greeting receives short memories and recent conversation, even when lens analysis fails', async () => {
  const { context, state } = harness({
    facts: 'Любит джаз',
    history: [{ role: 'user', content: 'Вчера был на концерте' }, { role: 'assistant', content: 'Как прошло?' }],
    lens: async () => { throw new Error('analysis unavailable'); },
  });
  await context.showProactiveGreeting();
  assert.equal(state.lensRequests.length, 1);
  assert.match(state.lensRequests[0].prompt, /Любит джаз/);
  assert.match(state.lensRequests[0].prompt, /Вчера был на концерте/);
  assert.match(state.requests[0].messages[0].content, /Любит джаз/);
  assert.match(state.requests[0].messages[0].content, /Вчера был на концерте/);
  assert.match(state.requests[0].messages[0].content, /Do not invent facts/);
  assert.equal(state.messages[0].role, 'assistant');
});

test('a local Hydra-only setup can greet with memory without requiring an OpenRouter key', async () => {
  const { context, state } = harness({ isLocal: true, openRouterKey: null, hydraKey: 'sk-local-hydra-key', facts: 'Ценит музыку' });
  await context.showProactiveGreeting();
  assert.equal(state.lensRequests.length, 0);
  assert.equal(state.requests.length, 1);
  assert.match(state.requests[0].messages[0].content, /Ценит музыку/);
  assert.equal(state.messages[0].role, 'assistant');
});

test('a non-streaming API response is used when the streaming greeting fails', async () => {
  const { context, state } = harness({
    stream: async () => { throw new Error('stream unavailable'); },
    fallback: async () => ({ content: 'Здравствуйте!' }),
  });
  await context.showProactiveGreeting();
  assert.equal(state.fallbackCalls, 1);
  assert.equal(state.messages[0].content, 'Здравствуйте!');
  assert.equal(state.messages[0].role, 'assistant');
});

test('API failure is shown as a system notice, not a fabricated greeting', async () => {
  const { context, state, values } = harness({ stream: async () => { throw new Error('offline'); } });
  await context.showProactiveGreeting();
  assert.equal(state.fallbackCalls, 1);
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].role, 'system');
  assert.equal(state.messages[0].save, false);
  assert.equal(values.has('lastGreeting'), false);
  assert.equal(values.has('greetingHistory'), false);
  assert.equal(state.statuses[0].removed, true);
});

test('sending first cancels a pending greeting and prevents a late assistant message', async () => {
  let requestStarted;
  let resolveRequest;
  const started = new Promise(resolve => { requestStarted = resolve; });
  const pending = new Promise(resolve => { resolveRequest = resolve; });
  const { context, state, values } = harness({
    stream: async (messages, options) => { requestStarted(options.signal); return pending; },
  });
  const running = context.showProactiveGreeting();
  const signal = await started;
  context.cancelProactiveGreeting();
  assert.equal(signal.aborted, true);
  state.history.push({ role: 'user', content: 'Уже написал сам' });
  resolveRequest('Опоздавшее приветствие');
  await running;
  assert.deepEqual(state.messages, []);
  assert.equal(state.fallbackCalls, 0);
  assert.equal(values.has('lastGreeting'), false);
  assert.equal(state.statuses[0].removed, true);
});

test('an aborted smart-mode stream does not fall back to another provider', async () => {
  const source = ui.slice(ui.indexOf('async function streamResponse(messages'), ui.indexOf('function createStreamingMessage()'));
  let fallbackCalls = 0;
  const controller = new AbortController();
  const context = {
    isSmartMode: () => true,
    streamHydraSmart: async () => { controller.abort(); throw Object.assign(new Error('aborted'), { name: 'AbortError' }); },
    streamResponseOpenRouter: async () => { fallbackCalls++; },
    console: { log() {}, warn() {} },
  };
  vm.runInNewContext(source, context);
  await assert.rejects(context.streamResponse([], () => {}, () => {}, { signal: controller.signal }), /aborted/);
  assert.equal(fallbackCalls, 0);
});

test('an assistant greeting hides the static welcome screen', () => {
  const welcome = { hidden: false };
  let selector = '';
  const chat = { querySelector(value) { selector = value; return {}; } };
  const context = {
    window: { addEventListener() {} },
    document: { getElementById: id => id === 'welcomeScreen' ? welcome : chat, addEventListener() {} },
  };
  vm.runInNewContext(dashboard, context);
  context.window.updateWelcomeScreen();
  assert.match(selector, /\.message\.assistant/);
  assert.equal(welcome.hidden, true);
});

test('a user action before greeting initialization suppresses the startup greeting', async () => {
  const { context, state } = harness();
  context.cancelProactiveGreeting();
  await context.showProactiveGreeting();
  assert.equal(state.requests.length, 0);
  assert.equal(state.messages.length, 0);
});

test('conversation history alone is enough to make a greeting contextual', async () => {
  const { context, state } = harness({ history: [{ role: 'user', content: 'В выходные собираюсь на прогулку' }] });
  await context.showProactiveGreeting();
  assert.equal(state.lensRequests.length, 1);
  assert.match(state.lensRequests[0].prompt, /В выходные собираюсь на прогулку/);
  assert.match(state.requests[0].messages[0].content, /В выходные собираюсь на прогулку/);
});

test('a locally unconfigured provider reports the problem without pretending to greet', async () => {
  const { context, state, values } = harness({ isLocal: true, openRouterKey: null, hydraKey: null });
  await context.showProactiveGreeting();
  assert.equal(state.requests.length, 0);
  assert.equal(state.messages[0].role, 'system');
  assert.equal(state.messages[0].save, false);
  assert.equal(values.has('lastGreeting'), false);
});

test('streaming providers receive an abort signal without serializing it into the API body', async () => {
  const encoder = new TextEncoder();
  const controller = new AbortController();
  for (const [start, end, endpoint] of [
    ['async function streamResponseOpenRouterSingle(', '// ==================== STREAMING RESPONSE', '/api/chat'],
    ['async function streamHydraSmart(', 'async function streamResponse(messages', '/api/hydra'],
  ]) {
    const source = ui.slice(ui.indexOf(start), ui.indexOf(end, ui.indexOf(start)));
    let request;
    let chunkSent = false;
    const context = {
      isLocal: false,
      CONFIG: { openrouterApiUrl: '/api/chat' },
      window: { location: { href: 'https://example.test/' } },
      hydraRequestInfo: () => ({ url: '/api/hydra', key: null }),
      getChatModel: () => 'test-model',
      TextDecoder,
      console: { log() {} },
      fetch: async (url, options) => {
        request = { url, options, body: JSON.parse(options.body) };
        return { ok: true, body: { getReader: () => ({
          read: async () => chunkSent ? { done: true } : (chunkSent = true, {
            done: false,
            value: encoder.encode('data: {"choices":[{"delta":{"content":"Привет"}}]}\n\n'),
          }),
        }) } };
      },
    };
    vm.runInNewContext(source, context);
    const args = [[{ role: 'user', content: 'hi' }], () => {}, () => {}, { signal: controller.signal, temperature: 0.6 }];
    const text = endpoint === '/api/chat'
      ? await context.streamResponseOpenRouterSingle(args[0], 'test-model', ...args.slice(1))
      : await context.streamHydraSmart(...args);
    assert.equal(text, 'Привет');
    assert.equal(request.url, endpoint);
    assert.equal(request.options.signal, controller.signal);
    assert.equal(Object.hasOwn(request.body, 'signal'), false);
    assert.equal(request.body.temperature, 0.6);
  }
});

test('prior conversation includes its recorded time so old plans are not treated as current', async () => {
  const timestamp = Date.UTC(2025, 0, 2, 10, 15);
  const { context, state } = harness({ history: [{ role: 'user', content: 'Завтра поездка', timestamp }] });
  await context.showProactiveGreeting();
  assert.match(state.lensRequests[0].prompt, /2025-01-02T10:15:00\.000Z/);
  assert.match(state.requests[0].messages[0].content, /Prior messages and memories may be outdated/);
});

test('non-streaming analysis forwards cancellation without sending the signal in JSON', async () => {
  const start = ui.indexOf('async function callAPIOpenRouterSingle(');
  const end = ui.indexOf('// Вызов API с приоритетом Hydra', start);
  const source = ui.slice(start, end);
  const controller = new AbortController();
  let request;
  const context = {
    isLocal: false,
    CONFIG: { openrouterApiUrl: '/api/chat' },
    window: { location: { href: 'https://example.test/' } },
    console: { log() {} },
    fetch: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
    },
  };
  vm.runInNewContext(source, context);
  const response = await context.callAPIOpenRouterSingle([{ role: 'user', content: 'hi' }], 'model', null, controller.signal);
  assert.equal(response.content, 'ok');
  assert.equal(request.options.signal, controller.signal);
  assert.equal(Object.hasOwn(request.body, 'signal'), false);
});
