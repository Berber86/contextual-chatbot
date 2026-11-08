const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ui = fs.readFileSync('ui.js', 'utf8');

function extract(start, end) {
  const from = ui.indexOf(start);
  const to = ui.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `секция ${start}`);
  return ui.slice(from, to);
}

function sse(text) {
  return 'data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\ndata: [DONE]\n\n';
}

function streamResponse(chunks) {
  let index = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => index < chunks.length
          ? { done: false, value: new TextEncoder().encode(chunks[index++]) }
          : { done: true, value: undefined },
      }),
    },
    text: async () => '',
  };
}

function harness({ timeoutMs = 30, fetch, models = ['or-1'] } = {}) {
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    window: { location: { href: 'https://example.test/' } },
    localStorage: { getItem: () => null },
    hydraRequestInfo: () => ({ url: '/api/hydra', key: null }),
    isSmartMode: () => true,
    isFullHydraMode: () => false,
    isLocal: false,
    CONFIG: {
      model_chat: 'glm-5.2',
      openrouterApiUrl: '/api/chat',
      openRouterModels: models,
      currentModelIndex: 0,
      responseIdleTimeoutMs: timeoutMs,
    },
    AbortController,
    TextDecoder,
    TextEncoder,
    setTimeout,
    clearTimeout,
    fetch,
  });
  vm.runInContext(extract('function isOverloadError(error)', '// Одно приветствие'), context);
  vm.runInContext(`
    function getCurrentOpenRouterModel() { return CONFIG.openRouterModels[CONFIG.currentModelIndex]; }
    function switchToNextModel() {
      if (CONFIG.currentModelIndex >= CONFIG.openRouterModels.length - 1) return false;
      CONFIG.currentModelIndex++;
      return true;
    }
    function resetModelIndex() { CONFIG.currentModelIndex = 0; }
  `, context);
  vm.runInContext(extract('async function streamResponseOpenRouter(', '// ==================== СОВЕТ ВОПРОСОВ'), context);
  return context;
}

test('активный SSE не обрывается по суммарному времени: таймаут только между кусками', async () => {
  const chunks = [sse('первый '), sse('второй')];
  let index = 0;
  const context = harness({
    timeoutMs: 25,
    fetch: async () => ({
      ok: true,
      body: { getReader: () => ({
        read: () => new Promise(resolve => setTimeout(() => {
          resolve(index < chunks.length
            ? { done: false, value: new TextEncoder().encode(chunks[index++]) }
            : { done: true, value: undefined });
        }, 20)),
      }) },
    }),
  });
  const result = await context.streamHydraSmart([], () => {}, () => {});
  assert.equal(result, 'первый второй');
  assert.equal(index, 2, 'оба куска пришли, хотя суммарно ждали дольше одного idle-таймаута');
});

test('зависшая Hydra прерывается по idle-таймауту и ответ уходит в OpenRouter', async () => {
  const models = [];
  const context = harness({
    timeoutMs: 25,
    fetch: async (url, init) => {
      const body = JSON.parse(init.body);
      models.push(body.model);
      if (body.model === 'glm-5.2') {
        return new Promise((resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        });
      }
      return streamResponse([sse('резервный ответ')]);
    },
  });
  const result = await context.streamResponse([], () => {}, () => {});
  assert.equal(result, 'резервный ответ');
  assert.deepEqual(models, ['glm-5.2', 'or-1']);
});

test('резерв проходит все три варианта в порядке исходного маршрута', async () => {
  const scenarios = [
    {
      options: { route: { provider: 'openrouter', model: null } },
      succeed: 'hydra-gemini-pro',
      expected: ['or-1', 'glm-5.2', 'hydra-gemini-pro'],
    },
    {
      options: {},
      succeed: 'hydra-gemini-pro',
      expected: ['glm-5.2', 'or-1', 'hydra-gemini-pro'],
    },
    {
      options: { route: { provider: 'hydra', model: 'hydra-gemini-pro' } },
      succeed: 'or-1',
      expected: ['hydra-gemini-pro', 'glm-5.2', 'or-1'],
    },
  ];

  for (const scenario of scenarios) {
    const models = [];
    const context = harness({
      fetch: async (url, init) => {
        const model = JSON.parse(init.body).model;
        models.push(model);
        if (model !== scenario.succeed) return { ok: false, status: 500, text: async () => 'down' };
        return streamResponse([sse(`ok:${model}`)]);
      },
    });
    const result = await context.streamResponse([], () => {}, () => {}, scenario.options);
    assert.equal(result, `ok:${scenario.succeed}`);
    assert.deepEqual(models, scenario.expected);
  }
});

test('после отказа всех вариантов сохраняется вся цепочка ошибок', async () => {
  const models = [];
  const context = harness({
    fetch: async (url, init) => {
      models.push(JSON.parse(init.body).model);
      return { ok: false, status: 503, text: async () => 'down' };
    },
  });
  await assert.rejects(
    context.streamResponse([], () => {}, () => {}, { route: { provider: 'openrouter', model: null } }),
    error => {
      assert.equal(error.name, 'AllModelsFailedError');
      assert.equal(error.attempts.length, 3);
      assert.equal(error.attempts[2].model, 'hydra-gemini-pro');
      return true;
    }
  );
  assert.deepEqual(models, ['or-1', 'glm-5.2', 'hydra-gemini-pro']);
});

test('ручная отмена сохраняет AbortError и не запускает fallback', async () => {
  const controller = new AbortController();
  let calls = 0;
  const context = harness({
    timeoutMs: 1000,
    fetch: async (url, init) => {
      calls++;
      return new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const error = new Error('cancelled');
          error.name = 'AbortError';
          reject(error);
        });
      });
    },
  });
  const pending = context.streamResponse([], () => {}, () => {}, { signal: controller.signal });
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(pending, error => error.name === 'AbortError');
  assert.equal(calls, 1, 'отмена пользователя — не повод запускать другой запрос');
});

test('HTTP 500 переключает OpenRouter на следующую модель, HTTP 400 — нет', async () => {
  const attempts = [];
  const context = harness({
    models: ['or-1', 'or-2'],
    fetch: async (url, init) => {
      const model = JSON.parse(init.body).model;
      attempts.push(model);
      if (model === 'or-1') return { ok: false, status: 500, text: async () => 'temporary' };
      return streamResponse([sse('ok')]);
    },
  });
  // Пауза между моделями не нужна тесту; idle-таймер остаётся настоящим.
  context.setTimeout = (fn, ms) => ms === 500 ? queueMicrotask(fn) : setTimeout(fn, ms);
  const result = await context.streamResponseOpenRouter([], () => {}, () => {});
  assert.equal(result, 'ok');
  assert.deepEqual(attempts, ['or-1', 'or-2']);

  const badAttempts = [];
  const bad = harness({
    fetch: async () => {
      badAttempts.push('or-1');
      return { ok: false, status: 400, text: async () => 'bad request' };
    },
  });
  await assert.rejects(bad.streamResponseOpenRouter([], () => {}, () => {}), /HTTP 400/);
  assert.deepEqual(badAttempts, ['or-1'], 'ошибку запроса не маскируем перебором моделей');
});
