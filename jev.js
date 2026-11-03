// jev.js — System One: типизированные решения вместо генерации текста.
//
// Контракт (docs.system-one.dev): POST /v1/systemone
//   { model, state, questions: { имя: { type, instructions, criteria } } }
//   → { answers: { имя: { noul | choice + probabilities | score } }, usage }
// Типы вопросов: noul (0..1 — вероятность «да»), choice (ключ + распределение),
// score (число на упорядоченной шкале + распределение). До 32 вопросов на один state.
//
// В каталоге Hydra: jev-1.14 (TypeSafe, 2,70 ₽/1M вход) и solar-decide
// (Upstage, 1,00 ₽/1M вход). Выходные токены у обеих бесплатны.

const SYSTEMONE_CONFIG = {
    endpoint: 'https://api.hydraai.ru/v1/systemone',
    proxyUrl: '/api/systemone',
    providers: {
        jev: { id: 'jev-1.14', label: 'Jev 1.14', inputPerMillion: 2.70 },
        solar: { id: 'solar-decide', label: 'Solar Decide', inputPerMillion: 1.00 }
    },
    maxQuestions: 32,
    timeoutMs: 2500,
    cacheSize: 200,
    // Границы трёх уровней сложности (решение пользователя).
    thresholds: { medium: 0.5, hard: 0.8 },
    levels: 10
};

// ==================== ПРОВАЙДЕР ====================
function getSystemOneProvider() {
    const saved = localStorage.getItem('chatbot_systemone_provider');
    return SYSTEMONE_CONFIG.providers[saved] ? saved : 'jev';
}

function setSystemOneProvider(provider) {
    if (!SYSTEMONE_CONFIG.providers[provider]) return false;
    localStorage.setItem('chatbot_systemone_provider', provider);
    return true;
}

function getSystemOneModel(provider) {
    const key = SYSTEMONE_CONFIG.providers[provider] ? provider : getSystemOneProvider();
    return SYSTEMONE_CONFIG.providers[key].id;
}

// ==================== ЗАПРОС ====================
const systemOneCache = new Map();
const systemOneStats = { calls: 0, errors: 0, cacheHits: 0, byProvider: {}, tokens: 0 };

function hashSystemOneRequest(payload) {
    const text = JSON.stringify(payload);
    let hash = 0;
    for (let index = 0; index < text.length; index++) {
        hash = (hash * 31 + text.charCodeAt(index)) | 0;
    }
    return String(hash);
}

function systemOneEndpoint() {
    const host = typeof window !== 'undefined' && window.location ? window.location.hostname : '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const key = localStorage.getItem('chatbot_hydra_key');
    if (isLocal && key && key.trim()) return { url: SYSTEMONE_CONFIG.endpoint, key: key.trim().replace(/\$\$$/, '') };
    // В проде ключ живёт на сервере: /api/systemone — такой же прокси, как /api/hydra.
    return { url: SYSTEMONE_CONFIG.proxyUrl, key: null };
}

function normalizeQuestions(questions) {
    const names = Object.keys(questions || {});
    if (names.length === 0) throw new Error('systemone: нужен хотя бы один вопрос');
    if (names.length > SYSTEMONE_CONFIG.maxQuestions) {
        throw new Error(`systemone: не больше ${SYSTEMONE_CONFIG.maxQuestions} вопросов`);
    }
    const clean = {};
    for (const name of names) {
        const question = questions[name] || {};
        if (!['noul', 'choice', 'score'].includes(question.type)) {
            throw new Error(`systemone: неизвестный тип вопроса «${question.type}»`);
        }
        const item = { type: question.type, instructions: String(question.instructions || '') };
        if (question.criteria) item.criteria = question.criteria;
        clean[name] = item;
    }
    return clean;
}

// Один state — много решений. Возвращает { answers, usage }; бросает при любой проблеме,
// чтобы вызывающий код мог молча откатиться на старое поведение.
async function systemOne(state, questions, options = {}) {
    const provider = options.provider || getSystemOneProvider();
    const payload = {
        model: getSystemOneModel(provider),
        state,
        questions: normalizeQuestions(questions)
    };

    const cacheKey = hashSystemOneRequest(payload);
    if (!options.noCache && systemOneCache.has(cacheKey)) {
        systemOneStats.cacheHits++;
        return systemOneCache.get(cacheKey);
    }

    const info = systemOneEndpoint();
    const headers = { 'Content-Type': 'application/json' };
    if (info.key) headers['Authorization'] = 'Bearer ' + info.key;

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutMs = options.timeoutMs || SYSTEMONE_CONFIG.timeoutMs;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    systemOneStats.calls++;
    systemOneStats.byProvider[provider] = (systemOneStats.byProvider[provider] || 0) + 1;

    try {
        const response = await fetch(info.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller ? controller.signal : undefined
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`systemone HTTP ${response.status}: ${text.slice(0, 200)}`);
        }
        const data = await response.json();
        if (!data || !data.answers) throw new Error('systemone: в ответе нет answers');

        if (data.usage && Number(data.usage.input_tokens) > 0) {
            systemOneStats.tokens += Number(data.usage.input_tokens);
        }

        const result = { answers: data.answers, usage: data.usage || null, model: data.model || payload.model };
        if (!options.noCache) {
            if (systemOneCache.size >= SYSTEMONE_CONFIG.cacheSize) {
                const oldest = systemOneCache.keys().next().value;
                systemOneCache.delete(oldest);
            }
            systemOneCache.set(cacheKey, result);
        }
        return result;
    } catch (error) {
        systemOneStats.errors++;
        throw error;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

// ==================== СЛОЖНОСТЬ ЗАПРОСА ====================
const COMPLEXITY_LEVELS = [
    'приветствие, «ок», одна короткая реплика без запроса',
    'простой фактический вопрос или болтовня',
    'короткая просьба без контекста',
    'обычный вопрос, нужен один шаг рассуждения',
    'нужно связать сообщение с прошлым разговором',
    'несколько условий или сравнение вариантов',
    'многослойный вопрос: контекст, ограничения, последствия',
    'эмоционально тонкая тема, нужна аккуратность',
    'сложный разбор: причины, противоречия, планирование',
    'просьба, где ошибка дорого стоит: решение, деньги, здоровье, отношения'
];

function buildComplexityQuestions() {
    return {
        complexity: {
            type: 'score',
            instructions:
                'Насколько сильная модель нужна, чтобы достойно ответить на это сообщение? ' +
                'Учитывай: нужен ли прошлый контекст, сколько шагов рассуждения, есть ли эмоциональная тонкость ' +
                'и насколько дорога ошибка. Приветствия и короткие реплики — низкий уровень.',
            criteria: COMPLEXITY_LEVELS
        },
        needs_memory: {
            type: 'noul',
            instructions: 'Ответ на это сообщение станет заметно лучше, если вспомнить прошлые разговоры с человеком?'
        }
    };
}

function normalizeComplexityScore(raw, levels) {
    const total = Math.max(2, Number(levels) || SYSTEMONE_CONFIG.levels) - 1;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    return Math.min(1, Math.max(0, value / total));
}

function pickRouteByComplexity(score, provider) {
    const thresholds = SYSTEMONE_CONFIG.thresholds;
    if (!Number.isFinite(score)) return null;
    if (score < thresholds.medium) {
        return { tier: 'easy', provider: 'openrouter', model: null, score, label: 'OpenRouter (лёгкая)' };
    }
    if (score < thresholds.hard) {
        return { tier: 'medium', provider: 'hydra', model: 'glm-5.2', score, label: 'GLM 5.2' };
    }
    return { tier: 'hard', provider: 'hydra', model: 'hydra-gemini-pro', score, label: 'Gemini Pro' };
}

// ==================== АРХЕТИП ОТВЕТА И ВОПРОС ====================
// Раньше архетип и «задавать ли вопрос» выбирались Math.random(). Это часть того же
// запроса, что и сложность: state один, цена та же, поведение перестаёт быть рулеткой.

const RESPONSE_ARCHETYPES = {
    answer_first: 'Answer-first: start with the useful answer immediately, then (optionally) add a short memory-based observation.',
    reframe: 'Reframe: offer an alternative interpretation using their traits/hypotheses, then give a concrete next step.',
    options: 'Options: propose 2–3 options with trade-offs; minimal fluff, maximal clarity.',
    micro_plan: 'Micro-plan: give a short plan (2–4 steps) tailored to what you know about them.',
    reality_check: 'Reality-check: gently challenge or test an assumption, grounded in what you know about them.',
    story: 'Story/analogy: use a brief analogy that fits their known interests; keep it tight.',
    connector: 'Connector: link their current message to something from their past or a pattern you\'ve noticed.',
    minimalist: 'Minimalist: a concise response that moves forward; no fluff, pure value.'
};

const ARCHETYPE_CRITERIA = {
    answer_first: 'Нужен прямой полезный ответ: человек пришёл за результатом, а не за разбором',
    reframe: 'Человек застрял в одной трактовке — уместно предложить другую',
    options: 'Нужен выбор из нескольких путей, важны компромиссы',
    micro_plan: 'Нужен короткий план из 2–4 шагов под его ситуацию',
    reality_check: 'Есть допущение или ожидание, которое стоит мягко проверить',
    story: 'Аналогия или история помогут лучше прямого ответа',
    connector: 'Уместно связать с прошлым разговором или замеченным паттерном',
    minimalist: 'Лучше короткая реплика без структуры и теории'
};

const ASK_QUESTION_PROBABILITY_THRESHOLD = 0.5;

function buildTurnQuestions() {
    const questions = buildComplexityQuestions();
    questions.archetype = {
        type: 'choice',
        instructions: 'Какая форма ответа лучше всего подойдёт именно на это сообщение? Выбери одну.',
        criteria: ARCHETYPE_CRITERIA
    };
    questions.ask_question = {
        type: 'noul',
        instructions: 'Уместно ли закончить ответ одним вопросом к человеку? Не если он просит просто сделать что-то, ' +
            'не если вопрос будет для галочки, и не если человеку сейчас тяжело.',
        criteria: {
            true: 'Вопрос поможет человеку продвинуться и звучит естественно',
            false: 'Вопрос лишний: ответ самодостаточен или человеку не до вопросов'
        }
    };
    return questions;
}

function clampProbability(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.min(1, Math.max(0, number));
}

function normalizeArchetype(answer) {
    const key = answer && typeof answer.choice === 'string' ? answer.choice : '';
    if (!RESPONSE_ARCHETYPES[key]) return null;
    return { key, instruction: RESPONSE_ARCHETYPES[key] };
}

// Главная точка входа: сложность → маршрут. null означает «оставь как было»,
// и это безопасный ответ на любую проблему: сеть, таймаут, мусор в ответе.
async function assessMessageComplexity(message, history, options) {
    const clean = String(message == null ? '' : message).trim();
    if (!clean) return null;

    const recent = (Array.isArray(history) ? history : [])
        .filter(item => item && (item.role === 'user' || item.role === 'assistant'))
        .slice(-4)
        .map(item => ({ role: item.role, text: String(item.content || '').slice(0, 400) }));

    const state = { message: clean.slice(0, 2000), recent };
    const result = await systemOne(state, buildTurnQuestions(), options || {});
    const answers = result.answers || {};
    const answer = answers.complexity || {};
    const score = normalizeComplexityScore(answer.score, COMPLEXITY_LEVELS.length);
    const archetype = normalizeArchetype(answers.archetype);
    const askProbability = clampProbability(answers.ask_question && answers.ask_question.noul);

    return {
        score,
        confidence: Number.isFinite(Number(answer.confidence)) ? Number(answer.confidence) : null,
        needsMemory: clampProbability(answers.needs_memory && answers.needs_memory.noul) || 0,
        levels: answer.probabilities || null,
        archetype: archetype ? archetype.instruction : null,
        archetypeKey: archetype ? archetype.key : null,
        askProbability,
        shouldAsk: askProbability === null ? null : askProbability >= ASK_QUESTION_PROBABILITY_THRESHOLD,
        model: result.model
    };
}

// Один запрос за ход: сложность, нужна ли память, архетип ответа и уместность вопроса.
// null — любая проблема; вызывающий код тогда работает по-старому.
async function resolveTurnPlan(message, history, options) {
    const clean = String(message == null ? '' : message).trim();
    if (!clean) return null;

    try {
        const assessment = await assessMessageComplexity(clean, history, options);
        if (!assessment) return null;
        return {
            route: pickRouteByComplexity(assessment.score),
            complexity: assessment.score,
            confidence: assessment.confidence,
            needsMemory: assessment.needsMemory,
            archetype: assessment.archetype,
            archetypeKey: assessment.archetypeKey,
            askProbability: assessment.askProbability,
            shouldAsk: assessment.shouldAsk,
            model: assessment.model
        };
    } catch (error) {
        systemOneStats.errors++;
        console.warn('[Route] решение по ходу не получено, работаем как раньше:', error.message);
        return null;
    }
}

// ==================== ВЫБОР ОБЛАКОВ ПАМЯТИ ====================
// Облако — тема (работа, хобби, здоровье, собака). Одна реплика может задевать
// несколько тем, поэтому спрашиваем noul по каждому облаку: поднимать или нет.

const CLOUD_SELECT_THRESHOLD = 0.45;
const CLOUD_MAX_SELECTED = 4;

function buildCloudQuestions(clouds) {
    const list = (Array.isArray(clouds) ? clouds : [])
        .filter(cloud => cloud && cloud.id && cloud.name)
        .slice(0, SYSTEMONE_CONFIG.maxQuestions);
    const questions = {};
    for (const cloud of list) {
        const counts = cloud.counts || {};
        const contents = [
            counts.facts ? `фактов ${counts.facts}` : '',
            counts.traits ? `черт ${counts.traits}` : '',
            counts.events ? `событий ${counts.events}` : '',
            counts.contacts ? `людей ${counts.contacts}` : '',
            counts.hypotheses ? `гипотез ${counts.hypotheses}` : ''
        ].filter(Boolean).join(', ');
        const samples = Array.isArray(cloud.samples) ? cloud.samples.filter(Boolean).slice(0, 3) : [];
        const description = [
            cloud.name,
            cloud.summary,
            samples.length ? `например: ${samples.join('; ')}` : '',
            contents ? `(${contents})` : ''
        ].filter(Boolean).join(' — ');
        questions[cloudQuestionName(cloud.id)] = {
            type: 'noul',
            instructions: `Поднять облако памяти «${description}», чтобы ответить на сообщение? ` +
                'Отвечай «да», только если тема облака действительно нужна для этого ответа, ' +
                'а не просто упомянута одним словом.',
            criteria: {
                true: 'Без этого облака ответ будет хуже или потеряет важный контекст',
                false: 'Тема не нужна: ответ можно дать без этих воспоминаний'
            }
        };
    }
    return questions;
}

// Имя вопроса — валидный ключ: id облака может содержать что угодно, поэтому хешируем.
function cloudQuestionName(cloudId) {
    let hash = 0;
    for (let index = 0; index < String(cloudId).length; index++) {
        hash = (hash * 31 + String(cloudId).charCodeAt(index)) | 0;
    }
    return 'cloud_' + Math.abs(hash);
}

async function selectCloudsForTurn(message, clouds, history, options) {
    const clean = String(message == null ? '' : message).trim();
    const list = (Array.isArray(clouds) ? clouds : []).filter(cloud => cloud && cloud.id && cloud.name);
    if (!clean || list.length < 2) return null;

    const state = {
        message: clean.slice(0, 2000),
        recent: (Array.isArray(history) ? history : [])
            .filter(item => item && (item.role === 'user' || item.role === 'assistant'))
            .slice(-4)
            .map(item => ({ role: item.role, text: String(item.content || '').slice(0, 300) }))
    };

    const result = await systemOne(state, buildCloudQuestions(list), options || {});
    const answers = result.answers || {};

    const picked = [];
    const probabilities = {};
    for (const cloud of list) {
        const answer = answers[cloudQuestionName(cloud.id)];
        const probability = clampProbability(answer && answer.noul);
        if (probability === null) continue;
        probabilities[cloud.id] = probability;
        if (probability >= CLOUD_SELECT_THRESHOLD) {
            picked.push({ id: cloud.id, name: cloud.name, probability });
        }
    }

    picked.sort((a, b) => b.probability - a.probability);
    return {
        clouds: picked.slice(0, CLOUD_MAX_SELECTED),
        probabilities,
        model: result.model,
        threshold: CLOUD_SELECT_THRESHOLD,
        maxSelected: CLOUD_MAX_SELECTED,
        questions: buildCloudQuestions(list),
        // Сырой ответ модели — для отладки в интерфейсе, в логику не идёт.
        raw: answers
    };
}

// Совместимость: только маршрут по сложности (с контекстом решения).
async function resolveMessageRoute(message, history, options) {
    const plan = await resolveTurnPlan(message, history, options);
    if (!plan || !plan.route) return null;
    return Object.assign({}, plan.route, {
        confidence: plan.confidence,
        needsMemory: plan.needsMemory,
        source: 'jev'
    });
}

// ==================== ФЛАГИ И НАБЛЮДАЕМОСТЬ ====================
function isComplexityRoutingEnabled() {
    const saved = localStorage.getItem('chatbot_route_complexity');
    return saved === null ? true : saved === '1';
}

function setComplexityRoutingEnabled(on) {
    localStorage.setItem('chatbot_route_complexity', on ? '1' : '0');
}

function getSystemOneStats() {
    const provider = getSystemOneProvider();
    const price = SYSTEMONE_CONFIG.providers[provider].inputPerMillion;
    return {
        calls: systemOneStats.calls,
        errors: systemOneStats.errors,
        cacheHits: systemOneStats.cacheHits,
        byProvider: Object.assign({}, systemOneStats.byProvider),
        tokens: systemOneStats.tokens,
        provider,
        // Грубая оценка в рублях: только входные токены, выход бесплатный.
        estimatedRub: (systemOneStats.tokens / 1e6) * price
    };
}

if (typeof window !== 'undefined') {
    window.getSystemOneStats = getSystemOneStats;
    window.setSystemOneProvider = setSystemOneProvider;
    window.setComplexityRoutingEnabled = setComplexityRoutingEnabled;
    window.pickRouteByComplexity = pickRouteByComplexity;
}
