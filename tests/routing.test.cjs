const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const jevSource = fs.readFileSync('jev.js', 'utf8');
const councilSource = fs.readFileSync('council.js', 'utf8');
const uiSource = fs.readFileSync('ui.js', 'utf8');
const devServer = fs.readFileSync('dev-server.mjs', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const apiSystemOne = fs.readFileSync('api/systemone.js', 'utf8');

// --- песочница: localStorage + fetch-мок + окно ---
function createFetchMock(handler) {
  const calls = [];
  const fetchMock = async (url, init) => {
    calls.push({ url, init, body: init && init.body ? JSON.parse(init.body) : null });
    return handler(url, init, calls.length);
  };
  return { fetchMock, calls };
}

function jevHarness(options = {}) {
  const values = new Map(Object.entries(options.storage || {}));
  const storage = {
    getItem: key => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };

  const { fetchMock, calls } = createFetchMock(options.handler || (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: 'jev-1.14',
      answers: {
        complexity: { type: 'score', score: 6.3, confidence: 0.77 },
        needs_memory: { type: 'noul', noul: 0.64 },
        archetype: { type: 'choice', choice: 'micro_plan', confidence: 0.6 },
        ask_question: { type: 'noul', noul: 0.72 },
      },
      usage: { input_tokens: 420, output_tokens: 0 },
    }),
    text: async () => '',
  })));

  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    localStorage: storage,
    window: { location: { hostname: options.hostname || 'localhost' }, addEventListener() {} },
    fetch: fetchMock,
    AbortController,
    setTimeout,
    clearTimeout,
    JSON,
  });

  vm.runInContext(jevSource, context);
  vm.runInContext(councilSource, context);
  return { context, calls, values };
}

const run = (context, expression) => vm.runInContext(expression, context);

// ==================== КОНТРАКТ ЗАПРОСА ====================

test('systemOne шлёт контракт System One: model, state, типизированные вопросы', async () => {
  const { context, calls } = jevHarness();

  const result = await run(context, 'systemOne({ message: "привет" }, buildTurnQuestions())');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/systemone', 'в браузере идём через серверный прокси');
  assert.equal(calls[0].body.model, 'jev-1.14', 'по умолчанию Jev');
  assert.equal(calls[0].body.state.message, 'привет');
  const questions = calls[0].body.questions;
  assert.equal(Object.keys(questions).length, 4, 'один запрос — четыре решения');
  assert.equal(questions.complexity.type, 'score');
  assert.equal(questions.complexity.criteria.length, 10, 'десять уровней → нормализация в 0..1');
  assert.equal(questions.needs_memory.type, 'noul');
  assert.equal(questions.archetype.type, 'choice');
  assert.equal(Object.keys(questions.archetype.criteria).length, 8, 'восемь архетипов ответа');
  assert.equal(questions.ask_question.type, 'noul');
  assert.equal(result.answers.complexity.score, 6.3);
});

test('провайдер переключается на solar-decide', async () => {
  const { context, calls } = jevHarness({ storage: { chatbot_systemone_provider: 'solar' } });
  await run(context, 'systemOne("тест", buildTurnQuestions())');
  assert.equal(calls[0].body.model, 'solar-decide');
});

test('защита контракта: больше 32 вопросов и неизвестный тип не уходят в сеть', async () => {
  const { context, calls } = jevHarness();

  const tooMany = await run(context, `(async () => {
    const questions = {};
    for (let i = 0; i < 33; i++) questions['q' + i] = { type: 'noul', instructions: 'x' };
    try { await systemOne('s', questions); return 'нет ошибки'; } catch (e) { return e.message; }
  })()`);
  assert.match(tooMany, /не больше 32/);

  const badType = await run(context, `(async () => {
    try { await systemOne('s', { q: { type: 'boolean', instructions: 'x' } }); return 'нет ошибки'; }
    catch (e) { return e.message; }
  })()`);
  assert.match(badType, /неизвестный тип/);

  assert.equal(calls.length, 0, 'в сеть ничего не ушло');
});

test('повторный одинаковый запрос берётся из кэша и не тратит деньги', async () => {
  const { context, calls } = jevHarness();
  await run(context, 'systemOne("привет", buildTurnQuestions())');
  await run(context, 'systemOne("привет", buildTurnQuestions())');
  assert.equal(calls.length, 1);
  assert.equal(run(context, 'getSystemOneStats().cacheHits'), 1);
});

// ==================== СЛОЖНОСТЬ И ПОРОГИ ====================

test('шкала сложности нормализуется в 0..1 и не выходит за границы', () => {
  const { context } = jevHarness();
  assert.equal(run(context, 'normalizeComplexityScore(0, 10)'), 0);
  assert.equal(run(context, 'normalizeComplexityScore(9, 10)'), 1);
  assert.equal(run(context, 'normalizeComplexityScore(4.5, 10)'), 0.5);
  assert.equal(run(context, 'normalizeComplexityScore(99, 10)'), 1, 'мусор сверху обрезается');
  assert.equal(run(context, 'normalizeComplexityScore(-5, 10)'), 0, 'мусор снизу обрезается');
  assert.equal(run(context, 'normalizeComplexityScore("нет", 10)'), null);
});

test('границы трёх уровней: 0.5 и 0.8', () => {
  const { context } = jevHarness();
  const route = score => run(context, `pickRouteByComplexity(${score})`);

  assert.equal(route(0.05).tier, 'easy');
  assert.equal(route(0.05).provider, 'openrouter');
  assert.equal(route(0.49).tier, 'easy', 'чуть ниже порога — всё ещё лёгкий');
  assert.equal(route(0.5).tier, 'medium', 'ровно 0.5 — уже средний');
  assert.equal(route(0.5).model, 'glm-5.2');
  assert.equal(route(0.79).tier, 'medium');
  assert.equal(route(0.8).tier, 'hard', 'ровно 0.8 — уже сильный');
  assert.equal(route(0.8).model, 'hydra-gemini-pro');
  assert.equal(route(0.99).tier, 'hard');
  assert.equal(route(NaN), null, 'без оценки маршрута нет');
});

test('совет собирает маршрут и не тащит в него текст ответа', async () => {
  const { context } = jevHarness({
    handler: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'jev-1.14',
        answers: { complexity: { type: 'score', score: 7.2, confidence: 0.81 }, needs_memory: { type: 'noul', noul: 0.7 } },
        usage: { input_tokens: 500, output_tokens: 0 },
      }),
      text: async () => '',
    }),
  });

  const plan = await run(context, 'resolveCouncil("Как мне объяснить это руководителю?", [], {})');
  assert.equal(plan.route.tier, 'hard');
  assert.equal(plan.route.model, 'hydra-gemini-pro');
  assert.equal(plan.complexity, 0.8);
  assert.equal(plan.needsMemory, 0.7);
  assert.equal(Object.prototype.hasOwnProperty.call(plan.route, 'text'), false, 'jev не приносит пользовательский текст');
  assert.deepEqual(Array.from(Object.keys(plan.route)).sort(), ['label', 'model', 'provider', 'score', 'tier']);
});

// ==================== ОТКАЗЫ ====================

test('сеть упала — маршрута нет, бот работает как раньше', async () => {
  const { context } = jevHarness({
    handler: async () => ({ ok: false, status: 503, text: async () => 'upstream down', json: async () => ({}) }),
  });
  const plan = await run(context, 'resolveCouncil("привет", [], {})');
  assert.equal(plan, null, 'без ответа — без решений');
  assert.equal(run(context, 'getSystemOneStats().errors') >= 1, true);
});

test('таймаут не подвешивает ход: маршрут отбрасывается', async () => {
  const { context } = jevHarness({
    // Висим до отмены — как настоящий fetch, который не отвечает.
    handler: (url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }),
  });
  const started = Date.now();
  const plan = await run(context, 'resolveCouncil("привет", [], { options: { timeoutMs: 60 } })');
  assert.equal(plan, null);
  assert.equal(Date.now() - started < 1500, true, 'таймаут срабатывает быстро');
});

test('мусор вместо вероятности — тоже отказ, а не случайный маршрут', async () => {
  const { context } = jevHarness({
    handler: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ answers: { complexity: { type: 'score' } }, usage: null }),
      text: async () => '',
    }),
  });
  const plan = await run(context, 'resolveCouncil("привет", [], {})');
  assert.equal(plan.route, null, 'мусор вместо оценки — маршрута нет, остальные решения живы');
});

// ==================== СВЯЗКА С ui.js ====================

test('стриминг берёт модель из маршрута, а не из выбора пользователя', async () => {
  const match = uiSource.match(/async function streamHydraSmart\([\s\S]*?\n\}\n/);
  assert.ok(match, 'streamHydraSmart должна существовать');

  const bodies = [];
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    window: { location: { href: 'https://example.test/' } },
    hydraRequestInfo: () => ({ url: '/api/hydra', key: null }),
    getChatModel: () => 'glm-5.2',
    TextDecoder,
    TextEncoder,
    fetch: async (url, init) => {
      bodies.push(JSON.parse(init.body));
      const chunks = ['data: ' + JSON.stringify({ choices: [{ delta: { content: 'ответ' } }] }) + '\n\n', 'data: [DONE]\n\n'];
      let index = 0;
      return {
        ok: true,
        body: {
          getReader() {
            return {
              read: async () => (index < chunks.length
                ? { done: false, value: new TextEncoder().encode(chunks[index++]) }
                : { done: true, value: undefined }),
            };
          },
        },
      };
    },
  });
  vm.runInContext(match[0], context);

  await run(context, `streamHydraSmart([{ role: 'user', content: 'x' }], () => {}, () => {}, { route: { provider: 'hydra', model: 'hydra-gemini-pro' } })`);
  assert.equal(bodies[0].model, 'hydra-gemini-pro', 'сложный ход идёт в Gemini Pro');
  assert.equal(bodies[0].route, undefined, 'маршрут не утекает в тело запроса');

  await run(context, `streamHydraSmart([{ role: 'user', content: 'x' }], () => {}, () => {}, {})`);
  assert.equal(bodies[1].model, 'glm-5.2', 'без маршрута — прежний выбор пользователя');
});

test('лёгкий маршрут пробует бесплатный OpenRouter первым, платный — только как страховку', () => {
  assert.match(uiSource, /route\.provider === 'openrouter'/, 'ветка лёгкого маршрута есть');
  const order = uiSource.slice(uiSource.indexOf("route.provider === 'openrouter'"));
  const openRouterFirst = order.indexOf('streamResponseOpenRouter(');
  const hydraFallback = order.indexOf('streamHydraSmart(');
  assert.ok(openRouterFirst > 0 && hydraFallback > openRouterFirst, 'сначала OpenRouter, потом Hydra');
});

test('маршрутизация включается только там, где есть платный провайдер, и отключается флагом', () => {
  assert.match(uiSource, /function isCouncilAvailable\(\)/, 'есть гейт доступности');
  assert.match(uiSource, /isSmartMode\(\) \|\| isFullHydraMode\(\)/, 'без Hydra маршрут не включается');
  assert.match(councilSource, /isComplexityRoutingEnabled\(\)/, 'есть выключатель');
  assert.match(uiSource, /const council = typeof resolveTurnCouncil === 'function'/,
    'ход получает решения до сборки контекста');
  assert.match(uiSource, /await resolveTurnCouncil\(userMessage, historyWithoutCurrent\)/,
    'решение запрашивается по текущему сообщению');
  assert.match(uiSource, /const turnPlan = council;/, 'к стадии 2 решение уже готово');
  assert.match(uiSource, /turnRoute \? \{ route: turnRoute \} : \{\}/, 'маршрут уходит в стриминг');
  assert.equal(uiSource.includes('selectCloudsForTurn'), false, 'второго запроса за ход нет');
});

test('System One подключён в страницу, в дев-сервер и в прод-прокси', () => {
  assert.match(indexHtml, /<script src="jev\.js"><\/script>/, 'скрипт загружается');
  assert.ok(indexHtml.indexOf('jev.js') < indexHtml.indexOf('ui.js'), 'jev.js раньше ui.js');
  assert.match(apiSystemOne, /api\.hydraai\.ru\/v1\/systemone/, 'прокси ходит в системный эндпоинт');
  assert.match(apiSystemOne, /HYDRA_API_KEY/, 'ключ только на сервере');
  assert.match(apiSystemOne, /ALLOWED_TYPES/, 'граница проверяет типы вопросов');
  assert.match(devServer, /pathname === '\/api\/systemone'/, 'дев-сервер умеет отвечать без ключа');
  assert.match(devServer, /function handleSystemOne/, 'и отдаёт демо-ответ по сложности');
});

// ==================== АРХЕТИП ОТВЕТА И ВОПРОС ====================

test('решение по ходу приносит архетип и уместность вопроса из того же запроса', async () => {
  const { context, calls } = jevHarness();

  const plan = await run(context, 'resolveCouncil("Хочу начать бегать, но не знаю с чего", [], {})');

  assert.equal(calls.length, 1, 'один запрос на ход');
  assert.equal(plan.archetypeKey, 'micro_plan');
  assert.match(plan.archetype, /^Micro-plan:/, 'в промпт уходит та же инструкция, что и раньше');
  assert.equal(plan.askProbability, 0.72);
  assert.equal(plan.shouldAsk, true);
  assert.equal(plan.route.tier, 'medium');
});

test('порог вопроса 0.5: 0.49 — молчим, 0.5 — спрашиваем', async () => {
  const handlerFor = noul => async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      answers: {
        complexity: { type: 'score', score: 2 },
        needs_memory: { type: 'noul', noul: 0.2 },
        archetype: { type: 'choice', choice: 'answer_first' },
        ask_question: { type: 'noul', noul },
      },
      usage: { input_tokens: 100, output_tokens: 0 },
    }),
    text: async () => '',
  });

  const low = jevHarness({ handler: handlerFor(0.49) });
  const high = jevHarness({ handler: handlerFor(0.5) });

  assert.equal((await run(low.context, 'resolveCouncil("ок", [], {})')).shouldAsk, false);
  assert.equal((await run(high.context, 'resolveCouncil("ок", [], {})')).shouldAsk, true);
});

test('неизвестный или пропавший архетип не ломает ход: остаётся null и фолбэк', async () => {
  const { context } = jevHarness({
    handler: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        answers: {
          complexity: { type: 'score', score: 2 },
          needs_memory: { type: 'noul', noul: 0.2 },
          archetype: { type: 'choice', choice: 'не-такой-архетип' },
          ask_question: { type: 'noul', noul: 0.2 },
        },
        usage: { input_tokens: 100, output_tokens: 0 },
      }),
      text: async () => '',
    }),
  });

  const plan = await run(context, 'resolveCouncil("ок", [], {})');
  assert.equal(plan.archetype, null);
  assert.equal(plan.archetypeKey, null);
  assert.equal(plan.route.tier, 'easy', 'остальные решения при этом живы');
});

test('архетипы в jev.js остались дословно прежними — промпт не меняется', () => {
  const EXPECTED = [
    'Answer-first: start with the useful answer immediately, then (optionally) add a short memory-based observation.',
    'Reframe: offer an alternative interpretation using their traits/hypotheses, then give a concrete next step.',
    'Options: propose 2–3 options with trade-offs; minimal fluff, maximal clarity.',
    'Micro-plan: give a short plan (2–4 steps) tailored to what you know about them.',
    'Reality-check: gently challenge or test an assumption, grounded in what you know about them.',
    'Story/analogy: use a brief analogy that fits their known interests; keep it tight.',
    "Connector: link their current message to something from their past or a pattern you've noticed.",
    'Minimalist: a concise response that moves forward; no fluff, pure value.',
  ];
  const { context } = jevHarness();
  const current = Array.from(run(context, 'Object.values(RESPONSE_ARCHETYPES)'));

  assert.equal(current.length, 8);
  assert.deepEqual(current.slice().sort(), EXPECTED.slice().sort(),
    'инструкции в промпт остались дословно прежними');
  assert.equal(uiSource.includes('pickResponseArchetype'), false, 'случайного архетипа больше нет');
});


test('вопрос в конце ответа: ASK_ME важнее совета, совет важнее молчания', () => {
  assert.match(uiSource, /function decideTurnQuestionPolicy\(plan\)/, 'есть решатель');
  const body = uiSource.slice(uiSource.indexOf('function decideTurnQuestionPolicy(plan)'));
  const askMe = body.indexOf('askMeMode && isAskMeModeAvailable()');
  const fromCouncil = body.indexOf("typeof plan.shouldAsk === 'boolean'");
  const silence = body.indexOf("modeLabel: 'NONE'");
  assert.ok(askMe > 0 && fromCouncil > askMe && silence > fromCouncil, 'порядок: ASK_ME → совет → молчание');

  assert.match(uiSource, /const archetype = \(turnPlan && turnPlan\.archetype\) \|\| '';/,
    'без решения архетипа нет, случайности тоже');
  assert.match(uiSource, /const qp = typeof decideTurnQuestionPolicy === 'function'/,
    'политика вопроса берётся из решения');
  assert.equal(uiSource.includes('decideQuestionPolicyForThisTurn'), false, 'случайная политика удалена');
});

