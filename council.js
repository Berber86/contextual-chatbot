// council.js — совет вопросов: все решения хода одним запросом.
//
// До этого решения жили в разных местах и в разных вызовах: маршрут и архетип —
// в jev.js, темы памяти — отдельным запросом, вопрос в конце ответа — в ui.js на
// Math.random, дистресс — регулярным выражением в app.js. Каждое решение было
// отдельной монеткой, и в спойлере нельзя было увидеть ход целиком.
//
// Здесь решения — данные. Линза знает три вещи:
//   questions(ctx) — какие вопросы она добавляет в общий запрос;
//   apply(answers, ctx) — что эти ответы означают;
//   fallback — что делать, если ответа нет (совет упал или домен отключён).
// Совет собирает вопросы всех включённых линз, делает ОДИН вызов System One и
// раскладывает ответы обратно по линзам.
//
// Правило деградации: совет целиком упал → null, и ход идёт на нейтральных
// значениях (без архетипа, без вопроса, без памяти). Это не «старый путь», а
// отсутствие решения: прежние случайные функции удалены намеренно.

const COUNCIL_CONFIG = {
    // Пороги живут в коде: пока нет журнала исходов, калибровать нечего.
    thresholds: {
        askQuestion: 0.5,
        distress: 0.55,
        crisis: 0.4,
        greeting: 0.55
    },
    state: {
        messageChars: 2000,
        recentMessages: 4,
        recentChars: 300
    }
};

// ==================== ЛИНЗЫ ====================
// Порядок линз = порядок вопросов в запросе. Он же фиксирует бюджет:
// 4 + 2 + 1 + 3 = 10 вопросов из 32 доступных.

// Выключатель маршрута гасит линзу целиком: и вопросы, и разбор ответов.
// Иначе выключенный флаг всё равно двигал бы выбор модели.
function isRouteLensEnabled() {
    return typeof isComplexityRoutingEnabled !== 'function' || isComplexityRoutingEnabled();
}

const COUNCIL_LENSES = {
    // Маршрут, форма ответа и уместность вопроса в конце.
    route: {
        questions() {
            if (!isRouteLensEnabled()) return {};
            return typeof buildTurnQuestions === 'function' ? buildTurnQuestions() : {};
        },
        apply(answers) {
            if (!isRouteLensEnabled()) return COUNCIL_LENSES.route.fallback;
            const answer = answers.complexity || {};
            const score = typeof normalizeComplexityScore === 'function'
                ? normalizeComplexityScore(answer.score, 10)
                : null;
            const archetype = typeof normalizeArchetype === 'function' ? normalizeArchetype(answers.archetype) : null;
            const askProbability = typeof clampProbability === 'function'
                ? clampProbability(answers.ask_question && answers.ask_question.noul)
                : null;
            const needsMemory = typeof clampProbability === 'function'
                ? clampProbability(answers.needs_memory && answers.needs_memory.noul)
                : null;

            return {
                complexity: score,
                route: score === null || typeof pickRouteByComplexity !== 'function' ? null : pickRouteByComplexity(score),
                archetype: archetype ? archetype.instruction : null,
                archetypeKey: archetype ? archetype.key : null,
                askProbability,
                shouldAsk: askProbability === null ? null : askProbability >= COUNCIL_CONFIG.thresholds.askQuestion,
                needsMemory: needsMemory === null ? null : needsMemory
            };
        },
        fallback: {
            complexity: null,
            route: null,
            archetype: null,
            archetypeKey: null,
            askProbability: null,
            shouldAsk: null,
            needsMemory: null
        }
    },

    // Тяжесть состояния. Регулярное выражение остаётся вето поверх вероятностей:
    // пропустить кризис из-за упавшей сети — не та цена, которую можно платить.
    safety: {
        questions() {
            return {
                distress: {
                    type: 'noul',
                    instructions:
                        'В сообщении есть признаки тяжёлого состояния: человек вымотан, на грани, ' +
                        'ему плохо эмоционально. Это не просьба о помощи с задачей, а состояние.',
                    criteria: {
                        true: 'Человеку сейчас тяжело, и это важнее любой задачи',
                        false: 'Обычное сообщение: человек в рабочем состоянии'
                    }
                },
                crisis: {
                    type: 'noul',
                    instructions:
                        'В сообщении есть прямые признаки кризиса: мысли о самоповреждении, ' +
                        'нежелание жить, «нет смысла продолжать». Отвечай «да» только при явных словах.',
                    criteria: {
                        true: 'Прямые слова о самоповреждении или нежелании жить',
                        false: 'Таких слов нет'
                    }
                }
            };
        },
        apply(answers) {
            const clamp = typeof clampProbability === 'function' ? clampProbability : value => Number(value);
            const distress = clamp(answers.distress && answers.distress.noul) || 0;
            const crisis = clamp(answers.crisis && answers.crisis.noul) || 0;
            const { distress: distressCut, crisis: crisisCut } = COUNCIL_CONFIG.thresholds;
            const level = crisis >= crisisCut ? 'crisis' : (distress >= distressCut ? 'distress' : 'none');
            return { distress, crisis, level };
        },
        fallback: { distress: 0, crisis: 0, level: 'none' }
    },

    // Приветствие и светская реплика: память тут не нужна, длинный ответ тоже.
    greeting: {
        questions() {
            return {
                greeting: {
                    type: 'noul',
                    instructions:
                        'Это приветствие или короткая светская реплика («привет», «как дела», «доброе утро»), ' +
                        'на которую не нужны воспоминания и разбор?',
                    criteria: {
                        true: 'Просто здороваются или поддерживают светскую беседу',
                        false: 'В сообщении есть содержательный запрос или тема'
                    }
                }
            };
        },
        apply(answers) {
            const clamp = typeof clampProbability === 'function' ? clampProbability : value => Number(value);
            const probability = clamp(answers.greeting && answers.greeting.noul);
            return {
                probability,
                isGreeting: probability !== null && probability >= COUNCIL_CONFIG.thresholds.greeting
            };
        },
        fallback: { probability: null, isGreeting: false }
    },

    // Темы памяти: прямой choice, уместность ассоциации и латеральный choice.
    memory: {
        questions(ctx) {
            const clouds = (ctx && Array.isArray(ctx.clouds)) ? ctx.clouds : [];
            if (clouds.length < 2 || typeof buildCloudQuestions !== 'function') return {};
            return buildCloudQuestions(clouds);
        },
        apply(answers, ctx) {
            const clouds = (ctx && Array.isArray(ctx.clouds)) ? ctx.clouds : [];
            // Меньше двух тем — выбирать нечего: это вся память целиком.
            if (clouds.length < 2) return null;
            const answer = answers.clouds || {};
            const rawProbabilities = answer.probabilities || {};
            const clamp = typeof clampProbability === 'function' ? clampProbability : value => Number(value);

            const probabilities = {};
            const lateralProbabilities = {};
            const lateralAnswer = answers.lateral_cloud || {};
            const rawLateralProbabilities = lateralAnswer.probabilities || {};
            clouds.forEach((cloud, index) => {
                const key = cloudOptionKey(index);
                const probability = clamp(rawProbabilities[key]);
                if (probability !== null) probabilities[cloud.id] = probability;
                const lateralProbability = clamp(rawLateralProbabilities[key]);
                if (lateralProbability !== null) lateralProbabilities[cloud.id] = lateralProbability;
            });
            const noneProbability = clamp(rawProbabilities[CLOUD_NONE_OPTION]) || 0;
            const lateralNoneProbability = clamp(rawLateralProbabilities[CLOUD_NONE_OPTION]) || 0;
            const needLateral = clamp(answers.need_lateral && answers.need_lateral.noul);
            const primary = typeof pickCloudsFromDistribution === 'function'
                ? pickCloudsFromDistribution(clouds, probabilities, noneProbability)
                : [];
            const picked = primary.map((cloud, index) => ({
                ...cloud,
                role: index === 0 ? 'anchor' : 'semantic_neighbor'
            }));
            const lateral = typeof pickLateralCloudFromDistribution === 'function'
                ? pickLateralCloudFromDistribution(
                    clouds,
                    lateralProbabilities,
                    lateralNoneProbability,
                    picked.map(cloud => cloud.id),
                    needLateral)
                : null;
            if (lateral && picked.length) picked.push(lateral);

            const questions = COUNCIL_LENSES.memory.questions(ctx) || {};
            return {
                clouds: picked,
                probabilities,
                noneProbability,
                needLateral,
                lateralProbabilities,
                lateralNoneProbability,
                lateralEnabled: picked.some(cloud => cloud.role === 'lateral_bridge'),
                threshold: CLOUD_SELECT_THRESHOLD,
                maxSelected: CLOUD_MAX_SELECTED,
                relativeCut: CLOUD_RELATIVE_CUT,
                questions,
                raw: { clouds: answer, need_lateral: answers.need_lateral || {}, lateral_cloud: lateralAnswer }
            };
        },
        fallback: null
    }
};

// ==================== СБОРКА И РАЗБОР ====================

function buildCouncilQuestions(ctx) {
    const questions = {};
    const enabled = (ctx && Array.isArray(ctx.lenses)) ? ctx.lenses : Object.keys(COUNCIL_LENSES);
    for (const name of enabled) {
        const lens = COUNCIL_LENSES[name];
        if (!lens || typeof lens.questions !== 'function') continue;
        Object.assign(questions, lens.questions(ctx) || {});
    }
    const limit = typeof SYSTEMONE_CONFIG !== 'undefined' ? SYSTEMONE_CONFIG.maxQuestions : 32;
    if (Object.keys(questions).length > limit) {
        throw new Error(`совет: ${Object.keys(questions).length} вопросов при лимите ${limit}`);
    }
    return questions;
}

function applyCouncilAnswers(answers, ctx) {
    const decisions = {};
    for (const name of Object.keys(COUNCIL_LENSES)) {
        const lens = COUNCIL_LENSES[name];
        if (typeof lens.apply !== 'function') continue;
        const value = lens.apply(answers || {}, ctx);
        decisions[name] = value === undefined ? (lens.fallback === undefined ? null : lens.fallback) : value;
    }

    // При тяжёлом состоянии человеку нужна поддержка, а не метафора из хобби.
    // Прямая память остаётся доступной, латеральный канал гасим кодом.
    const safety = decisions.safety || COUNCIL_LENSES.safety.fallback;
    if (decisions.memory && (safety.level === 'distress' || safety.level === 'crisis')) {
        decisions.memory.clouds = decisions.memory.clouds.filter(cloud => cloud.role !== 'lateral_bridge');
        decisions.memory.lateralEnabled = false;
        decisions.memory.lateralDisabledReason = 'safety';
    }

    // Решение совета = плоская форма, которую ждёт остальной код.
    const route = decisions.route || COUNCIL_LENSES.route.fallback;
    return {
        ...route,
        model: null,
        memory: decisions.memory,
        safety: decisions.safety || COUNCIL_LENSES.safety.fallback,
        greeting: decisions.greeting || COUNCIL_LENSES.greeting.fallback,
        decisions
    };
}

function buildCouncilState(message, history) {
    const clean = String(message == null ? '' : message).trim();
    const recent = (Array.isArray(history) ? history : [])
        .filter(item => item && (item.role === 'user' || item.role === 'assistant'))
        .slice(-COUNCIL_CONFIG.state.recentMessages)
        .map(item => ({ role: item.role, text: String(item.content || '').slice(0, COUNCIL_CONFIG.state.recentChars) }));
    return { message: clean.slice(0, COUNCIL_CONFIG.state.messageChars), recent };
}

/**
 * Один вызов System One на весь ход.
 * ctx: { clouds, lenses } — какие линзы включены и какие темы показывать.
 * null — любая проблема (сеть, таймаут, мусор в ответе): ход идёт без решений.
 */
async function resolveCouncil(message, history, ctx) {
    const clean = String(message == null ? '' : message).trim();
    if (!clean || typeof systemOne !== 'function') return null;

    const context = ctx || {};
    let questions;
    try {
        questions = buildCouncilQuestions(context);
    } catch (error) {
        console.warn('[Council] вопросы не собрались:', error.message);
        return null;
    }
    if (Object.keys(questions).length === 0) return null;

    try {
        const result = await systemOne(buildCouncilState(clean, history), questions, context.options || {});
        const decisions = applyCouncilAnswers(result.answers || {}, context);
        decisions.model = result.model || null;
        decisions.questions = questions;
        decisions.raw = result.answers || {};
        return decisions;
    } catch (error) {
        console.warn('[Council] совет не получен, ход пойдёт без решений:', error.message);
        return null;
    }
}

// Пороги и линзы видны снаружи: это часть контракта, а не внутренняя деталь.
if (typeof window !== 'undefined') {
    window.COUNCIL_CONFIG = COUNCIL_CONFIG;
    window.resolveCouncil = resolveCouncil;
    window.buildCouncilQuestions = buildCouncilQuestions;
}
