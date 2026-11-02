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
    const result = await systemOne(state, buildComplexityQuestions(), options || {});
    const answer = result.answers.complexity || {};
    const score = normalizeComplexityScore(answer.score, COMPLEXITY_LEVELS.length);

    return {
        score,
        confidence: Number.isFinite(Number(answer.confidence)) ? Number(answer.confidence) : null,
        needsMemory: Number(result.answers.needs_memory && result.answers.needs_memory.noul) || 0,
        levels: answer.probabilities || null,
        model: result.model
    };
}

async function resolveMessageRoute(message, history, options) {
    try {
        const assessment = await assessMessageComplexity(message, history, options);
        if (!assessment || assessment.score === null) return null;
        const route = pickRouteByComplexity(assessment.score);
        if (!route) return null;
        return Object.assign({}, route, {
            confidence: assessment.confidence,
            needsMemory: assessment.needsMemory,
            source: 'jev'
        });
    } catch (error) {
        systemOneStats.errors++;
        console.warn('[Route] сложность не определена, работаем как раньше:', error.message);
        return null;
    }
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
