const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const jevSource = fs.readFileSync('jev.js', 'utf8');
const councilSource = fs.readFileSync('council.js', 'utf8');
const uiSource = fs.readFileSync('ui.js', 'utf8');

function harness({ answers, handler, storage = {} } = {}) {
  const values = new Map(Object.entries(storage));
  const calls = [];
  const storageApi = {
    getItem: key => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };

  const defaultAnswers = {
    complexity: { type: 'score', score: 4.5 },
    needs_memory: { type: 'noul', noul: 0.6 },
    archetype: { type: 'choice', choice: 'answer_first' },
    ask_question: { type: 'noul', noul: 0.3 },
    distress: { type: 'noul', noul: 0.1 },
    crisis: { type: 'noul', noul: 0.02 },
    greeting: { type: 'noul', noul: 0.08 },
    clouds: { type: 'choice', choice: 'cloud_0', probabilities: { cloud_0: 0.6, cloud_1: 0.2, none: 0.2 } },
    ...(answers || {}),
  };

  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    localStorage: storageApi,
    window: { location: { hostname: 'example.com' }, addEventListener() {} },
    fetch: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      if (handler) return handler(url, init, calls.length);
      return { ok: true, status: 200, json: async () => ({ model: 'jev-1.14', answers: defaultAnswers, usage: {} }), text: async () => '' };
    },
    AbortController,
    setTimeout,
    clearTimeout,
    JSON,
  });

  vm.runInContext(jevSource, context);
  vm.runInContext(councilSource, context);
  return { context, calls, values };
}

const clouds = [
  { id: 'c1', name: 'Работа', counts: { facts: 3 } },
  { id: 'c2', name: 'Собака', counts: { facts: 1 } },
  { id: 'c3', name: 'Япония', counts: { facts: 2 } },
];

const run = (context, expression) => vm.runInContext(expression, context);

test('совет спрашивает всё одним запросом: десять вопросов из тридцати двух', async () => {
  const { context, calls } = harness();

  const plan = await run(context, `resolveCouncil("Что посоветуешь по работе?", [], { clouds: ${JSON.stringify(clouds)} })`);

  assert.equal(calls.length, 1, 'один запрос на весь ход');
  const questions = calls[0].body.questions;
  assert.equal(Object.keys(questions).length, 10);
  for (const name of ['complexity', 'needs_memory', 'archetype', 'ask_question']) {
    assert.equal(questions[name].type !== undefined, true, `маршрут: ${name}`);
  }
  assert.equal(questions.distress.type, 'noul', 'состояние');
  assert.equal(questions.crisis.type, 'noul', 'кризис');
  assert.equal(questions.greeting.type, 'noul', 'приветствие');
  assert.equal(questions.clouds.type, 'choice', 'прямые темы — один слот');
  assert.equal(questions.need_lateral.type, 'noul', 'уместность ассоциации');
  assert.equal(questions.lateral_cloud.type, 'choice', 'латеральная тема — отдельный слот');

  assert.equal(plan.route.tier, 'medium', 'сложность 4.5 из 10 → средний уровень');
  assert.equal(plan.archetypeKey, 'answer_first');
  assert.equal(plan.shouldAsk, false);
  assert.equal(plan.memory.clouds.length, 1);
  assert.equal(plan.memory.clouds[0].name, 'Работа');
});

test('латеральная линза добавляет одну другую тему без второго запроса', async () => {
  const { context, calls } = harness({ answers: {
    need_lateral: { type: 'noul', noul: 0.8 },
    lateral_cloud: { type: 'choice', choice: 'cloud_0', probabilities: { cloud_0: 0.7, cloud_1: 0.25, none: 0.05 } },
  } });
  const plan = await run(context, `resolveCouncil("Застрял с обучением джуна", [], { clouds: ${JSON.stringify(clouds)} })`);
  assert.equal(calls.length, 1);
  assert.equal(plan.memory.clouds.length, 2);
  assert.equal(plan.memory.clouds[0].role, 'anchor');
  assert.equal(plan.memory.clouds[1].name, 'Собака', 'primary повторно не поднимается');
  assert.equal(plan.memory.clouds[1].role, 'lateral_bridge');
  assert.equal(plan.memory.lateralEnabled, true);
});

test('решение «прямая память не нужна» не обходится через латеральный канал', async () => {
  const { context } = harness({ answers: {
    clouds: { type: 'choice', probabilities: { cloud_0: 0.1, cloud_1: 0.05, none: 0.85 } },
    need_lateral: { type: 'noul', noul: 0.9 },
    lateral_cloud: { type: 'choice', probabilities: { cloud_1: 0.9, none: 0.1 } },
  } });
  const plan = await run(context, `resolveCouncil("Как дела?", [], { clouds: ${JSON.stringify(clouds)} })`);
  assert.equal(plan.memory.clouds.length, 0);
  assert.equal(plan.memory.lateralEnabled, false);
});

test('distress гасит латеральную ассоциацию кодом, но оставляет прямую память', async () => {
  const { context } = harness({ answers: {
    distress: { type: 'noul', noul: 0.9 },
    need_lateral: { type: 'noul', noul: 0.9 },
    lateral_cloud: { type: 'choice', probabilities: { cloud_1: 0.9, none: 0.1 } },
  } });
  const plan = await run(context, `resolveCouncil("Мне очень плохо", [], { clouds: ${JSON.stringify(clouds)} })`);
  assert.equal(plan.safety.level, 'distress');
  assert.equal(plan.memory.clouds.some(cloud => cloud.role === 'lateral_bridge'), false);
  assert.equal(plan.memory.clouds[0].role, 'anchor');
  assert.equal(plan.memory.lateralDisabledReason, 'safety');
});

test('нет тем — нет вопроса о темах, остальные решения живы', async () => {
  const { context, calls } = harness();

  const plan = await run(context, `resolveCouncil("привет", [], { clouds: ${JSON.stringify(clouds.slice(0, 1))} })`);

  assert.equal(calls[0].body.questions.clouds, undefined, 'выбирать из одной темы нечего');
  assert.equal(plan.memory, null);
  assert.equal(plan.route.tier, 'medium', 'маршрут посчитан');
});

test('сбой латерального запроса повторяет совет без неё и сохраняет прямые темы', async () => {
  const { context, calls } = harness({ handler: async (url, init, count) => {
    if (count === 1) return { ok: false, status: 503, json: async () => ({}), text: async () => 'upstream unavailable' };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: 'jev-1.14',
        answers: {
          complexity: { type: 'score', score: 4.5 },
          clouds: { type: 'choice', probabilities: { cloud_0: 0.8, cloud_1: 0.1, none: 0.1 } },
        },
        usage: {},
      }),
      text: async () => '',
    };
  } });
  const plan = await run(context, `resolveCouncil("Что по работе?", [], { clouds: ${JSON.stringify(clouds)} })`);
  assert.equal(calls.length, 2, 'один повтор без необязательной линзы');
  assert.ok(calls[0].body.questions.lateral_cloud);
  assert.equal(calls[1].body.questions.lateral_cloud, undefined);
  assert.equal(calls[1].body.questions.need_lateral, undefined);
  assert.equal(Object.keys(calls[1].body.questions).length, 8);
  assert.equal(plan.memory.clouds[0].name, 'Работа');
  assert.equal(plan.memory.lateralEnabled, false);
  assert.equal(plan.memory.lateralDisabledReason, 'request-fallback');
  assert.equal(plan.degraded.reason, 'lateral-unavailable');
});

test('при полном сбое совета причина доступна для спойлера', async () => {
  const { context } = harness({
    handler: async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => 'upstream down' }),
  });
  const plan = await run(context, `resolveCouncil("тест", [], { clouds: ${JSON.stringify(clouds)} })`);
  assert.equal(plan, null);
  const error = run(context, 'getLastCouncilError()');
  assert.equal(error.stage, 'request');
  assert.match(error.message, /основной: systemone HTTP 503/);
  assert.match(error.message, /запасной: systemone HTTP 503/);
});

test('таймаут не повторяется вторым долгим запросом и подписан явно', async () => {
  const { context, calls } = harness({
    handler: (url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const error = new Error('signal is aborted without reason');
        error.name = 'AbortError';
        reject(error);
      });
    }),
  });
  const plan = await run(context, `resolveCouncil("тест", [], {
    clouds: ${JSON.stringify(clouds)}, options: { timeoutMs: 40 }
  })`);
  assert.equal(plan, null);
  assert.equal(calls.length, 1, 'таймаут не удваивает ожидание запасным запросом');
  const error = run(context, 'getLastCouncilError()');
  assert.equal(error.stage, 'request');
  assert.match(error.message, /systemone timeout/);
  assert.match(error.message, /Hydra не ответила/);
});

test('без сети совет молчит и не роняет ход', async () => {
  const { context } = harness({
    handler: async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => 'down' }),
  });

  const plan = await run(context, `resolveCouncil("привет", [], { clouds: ${JSON.stringify(clouds)} })`);
  assert.equal(plan, null, 'нет решения — ход идёт без него');
});

test('флаг маршрута выключает только свою линзу', async () => {
  const { context, calls } = harness({ storage: { chatbot_route_complexity: '0' } });

  const plan = await run(context, `resolveCouncil("привет", [], { clouds: ${JSON.stringify(clouds)} })`);

  assert.equal(calls[0].body.questions.complexity, undefined, 'маршрут не спрашивается');
  assert.ok(calls[0].body.questions.distress, 'состояние спрашивается всё равно');
  assert.ok(calls[0].body.questions.clouds, 'темы тоже');
  assert.equal(plan.route, null);
  assert.equal(Object.keys(calls[0].body.questions).length, 6, 'состояние, приветствие и три вопроса памяти');
});

test('состояние: кризис важнее дистресса, обычный ход — none', async () => {
  const cases = [
    [{ distress: 0.3, crisis: 0.1 }, 'none'],
    [{ distress: 0.8, crisis: 0.1 }, 'distress'],
    [{ distress: 0.8, crisis: 0.7 }, 'crisis'],
  ];

  for (const [values, expected] of cases) {
    const { context } = harness({ answers: { distress: { noul: values.distress }, crisis: { noul: values.crisis } } });
    const plan = await run(context, 'resolveCouncil("тест", [], {})');
    assert.equal(plan.safety.level, expected, `${values.distress}/${values.crisis} → ${expected}`);
  }
});

test('приветствие распознаётся по вероятности', async () => {
  const { context } = harness({ answers: { greeting: { noul: 0.72 } } });
  const plan = await run(context, 'resolveCouncil("привет", [], {})');
  assert.equal(plan.greeting.isGreeting, true);

  const quiet = harness({ answers: { greeting: { noul: 0.2 } } });
  const quietPlan = await run(quiet.context, 'resolveCouncil("посоветуй книгу", [], {})');
  assert.equal(quietPlan.greeting.isGreeting, false);
});

test('мусор вместо ответов не превращается в решения', async () => {
  const { context } = harness({ answers: { complexity: {}, archetype: {}, ask_question: {}, distress: {} } });
  const plan = await run(context, 'resolveCouncil("ок", [], {})');

  assert.equal(plan.route, null, 'без оценки маршрута нет');
  assert.equal(plan.complexity, null);
  assert.equal(plan.archetype, null);
  assert.equal(plan.shouldAsk, null, 'нет вероятности — нет решения, а не случайное «да»');
  assert.equal(plan.safety.level, 'none');
});

test('совет подключён к странице раньше ui.js и к ходу', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /<script src="council\.js"><\/script>/);
  assert.ok(html.indexOf('council.js') < html.indexOf('ui.js'), 'совет объявлен до ui.js');
  assert.ok(html.indexOf('jev.js') < html.indexOf('council.js'), 'транспорт объявлен до совета');

  assert.match(uiSource, /window\.lastCouncil = council/, 'решение доступно для отладки');
  assert.match(uiSource, /await resolveTurnCouncil\(userMessage, historyWithoutCurrent\)/);
  assert.equal(uiSource.includes('resolveTurnDecisions'), false, 'прежняя точка входа удалена');
  assert.equal(uiSource.includes('pickResponseArchetype'), false, 'случайный архетип удалён');
  assert.equal(uiSource.includes('decideQuestionPolicyForThisTurn'), false, 'случайная политика удалена');
});
