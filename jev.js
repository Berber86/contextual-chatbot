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
    timeoutMs: 25000,
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
    let timedOut = false;
    const timer = controller ? setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs) : null;

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
        if (timedOut) {
            const timeoutError = new Error(`systemone timeout: Hydra не ответила за ${Math.round(timeoutMs / 1000)} с`);
            timeoutError.name = 'TimeoutError';
            throw timeoutError;
        }
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

// ==================== ВЫБОР ОБЛАКОВ ПАМЯТИ ====================
// Облако — тема (работа, хобби, здоровье, собака). Раньше спрашивали noul на
// каждую тему: 24 темы = 24 вопроса из 32 доступных, и на всё остальное в ходу
// оставалось восемь. Теперь темы спрашиваются одним вопросом типа choice:
// ответ — распределение по темам, из которого видно и «какая нужнее всего»,
// и «какие ещё близкие». Один слот вместо N, и распределение вместо N
// независимых бросков, которые надо калибровать по отдельности.
const CLOUD_SELECT_THRESHOLD = 0.10;   // абсолютный пол: ниже — это шум, а не тема
const CLOUD_RELATIVE_CUT = 0.4;        // тема берётся, если её вероятность ≥ 40% от лучшей
const CLOUD_MAX_SELECTED = 4;
const CLOUD_NONE_OPTION = 'none';
const CLOUD_NONE_STOP = 0.5;           // «ничего не нужно» так уверенно — память не поднимаем
const LATERAL_NEED_THRESHOLD = 0.45;   // ниже — ассоциация будет искусственной
const LATERAL_CLOUD_MIN_PROBABILITY = 0.15;

// Ключ варианта — позиция в списке: id облака может содержать что угодно,
// а стабильность ключей нужна только внутри одного запроса.
function cloudOptionKey(index) {
    return 'cloud_' + index;
}

function describeCloud(cloud) {
    const counts = cloud.counts || {};
    const contents = [
        counts.facts ? `фактов ${counts.facts}` : '',
        counts.traits ? `черт ${counts.traits}` : '',
        counts.events ? `событий ${counts.events}` : '',
        counts.contacts ? `людей ${counts.contacts}` : '',
        counts.hypotheses ? `гипотез ${counts.hypotheses}` : ''
    ].filter(Boolean).join(', ');
    const samples = Array.isArray(cloud.samples) ? cloud.samples.filter(Boolean).slice(0, 3) : [];
    return [
        cloud.name,
        cloud.summary,
        samples.length ? `например: ${samples.join('; ')}` : '',
        contents ? `(${contents})` : ''
    ].filter(Boolean).join(' — ');
}

function buildCloudQuestions(clouds) {
    const list = (Array.isArray(clouds) ? clouds : [])
        .filter(cloud => cloud && cloud.id && cloud.name)
        .slice(0, 254);   // 255 вариантов — предел choice, один слот уходит под «ничего»
    if (list.length === 0) return {};

    const criteria = {};
    list.forEach((cloud, index) => {
        criteria[cloudOptionKey(index)] = describeCloud(cloud);
    });
    criteria[CLOUD_NONE_OPTION] = 'Ни одна тема не нужна: без воспоминаний ответ будет не хуже';

    return {
        clouds: {
            type: 'choice',
            instructions:
                'Какая тема памяти нужнее всего, чтобы ответить на это сообщение ПО СУЩЕСТВУ? ' +
                'Выбери одну — распределение покажет и остальные близкие темы. ' +
                'Если ни одна не нужна, выбери «ничего».',
            criteria
        },
        need_lateral: {
            type: 'noul',
            instructions:
                'Выиграет ли ответ от нетривиальной параллели, метафоры или эмоциональной опоры ' +
                'из ДРУГОЙ сферы жизни человека? Для простого технического или фактического вопроса ' +
                'и для тяжёлого кризисного состояния сторонняя ассоциация не нужна.',
            criteria: {
                true: 'Человек рефлексирует, застрял, устал или ищет другой взгляд — точная параллель может помочь',
                false: 'Нужен прямой ответ по задаче либо сторонняя тема будет навязчивой и неуместной'
            }
        },
        lateral_cloud: {
            type: 'choice',
            instructions:
                'Какая ДРУГАЯ тема, не буквальная тема вопроса, лучше всего даст точную аналогию, ' +
                'контраст или опору на прошлый опыт? Не выбирай тему только потому, что она прямо ' +
                'относится к сообщению. Если уместной сторонней темы нет, выбери «ничего».',
            criteria
        }
    };
}

/**
 * Из распределения по темам — список тем для поднятия.
 * Чистая функция: её и проверяют тесты, без сети.
 * Берём темы не ниже 40% от лучшей (и не ниже абсолютного пола), максимум 4.
 * Если модель уверенно говорит «ничего не нужно» — не берём ни одной.
 */
function pickCloudsFromDistribution(list, probabilities, noneProbability) {
    const ranked = (Array.isArray(list) ? list : [])
        .map(cloud => ({
            id: cloud.id,
            name: cloud.name,
            probability: Number(probabilities && probabilities[cloud.id])
        }))
        .filter(item => Number.isFinite(item.probability))
        .sort((a, b) => b.probability - a.probability);

    if (ranked.length === 0) return [];

    const none = Number.isFinite(Number(noneProbability)) ? Number(noneProbability) : 0;
    if (none >= CLOUD_NONE_STOP && none >= ranked[0].probability) return [];

    const cut = Math.max(CLOUD_SELECT_THRESHOLD, ranked[0].probability * CLOUD_RELATIVE_CUT);
    const picked = ranked.filter(item => item.probability >= cut).slice(0, CLOUD_MAX_SELECTED);

    // Пусто при живых вероятностях — берём лучшую: память в этом приложении
    // важнее строгости порога, иначе ход уйдёт в дорогое сжатие досье.
    return picked.length ? picked : [ranked[0]];
}

// Латеральная тема — опциональная ассоциация, а не обязательное второе облако.
// Прямые темы исключаем: если JEV совпал с primary, просто берётся следующий кандидат.
function pickLateralCloudFromDistribution(list, probabilities, noneProbability, excludedIds, needProbability) {
    const need = Number(needProbability);
    if (!Number.isFinite(need) || need < LATERAL_NEED_THRESHOLD) return null;
    const excluded = new Set(Array.isArray(excludedIds) ? excludedIds : []);
    const ranked = (Array.isArray(list) ? list : [])
        .filter(cloud => cloud && !excluded.has(cloud.id))
        .map(cloud => ({
            id: cloud.id,
            name: cloud.name,
            probability: Number(probabilities && probabilities[cloud.id])
        }))
        .filter(item => Number.isFinite(item.probability))
        .sort((a, b) => b.probability - a.probability);
    if (!ranked.length) return null;
    const none = Number.isFinite(Number(noneProbability)) ? Number(noneProbability) : 0;
    if (none >= CLOUD_NONE_STOP && none >= ranked[0].probability) return null;
    if (ranked[0].probability < LATERAL_CLOUD_MIN_PROBABILITY) return null;
    return { ...ranked[0], role: 'lateral_bridge' };
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
    window.pickCloudsFromDistribution = pickCloudsFromDistribution;
}
