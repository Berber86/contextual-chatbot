// you.js - Модуль самопознания YOU
// Интегрирован в Memory Chatbot

// ============================================
// Конфигурация YOU
// ============================================

const YOU_CONFIG = {
    // Hydra модель (единственная, платная)
    hydraModel: 'hydra-gemini-3-pro',
    
    // OpenRouter модели — fallback цепочка (используем ту же что в ui.js)
    // Будем брать из CONFIG если доступен, иначе свой список
    openRouterModels: [
    "stepfun/step-3.5-flash:free",
    "z-ai/glm-4.5-air:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "z-ai/glm-4.5-air:free",
    "arcee-ai/trinity-large-preview:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "nvidia/nemotron-3-nano-30b-a3b:free"
],
    
    // Текущий индекс модели для YOU (изолирован от ui.js)
    currentModelIndex: 0,
    
    hydraApiUrl: 'https://api.hydraai.ru/v1/chat/completions',
    timeout: 600000,
    zoneLimits: {
        yes: 2,
        neutral: 999,
        no: 1
    }
};

// ============================================
// Storage ключи (изолированные)
// ============================================

const YOU_STORAGE = {
    facts: 'you_facts',
    hypotheses: 'you_hypotheses'
};

// ============================================
// Функции управления моделями (аналогично ui.js)
// ============================================

function youGetCurrentModel() {
    return YOU_CONFIG.openRouterModels[YOU_CONFIG.currentModelIndex] || YOU_CONFIG.openRouterModels[0];
}

function youSwitchToNextModel() {
    if (YOU_CONFIG.currentModelIndex < YOU_CONFIG.openRouterModels.length - 1) {
        YOU_CONFIG.currentModelIndex++;
        console.log(`[YOU Model Fallback] Switching to model #${YOU_CONFIG.currentModelIndex + 1}: ${youGetCurrentModel()}`);
        return true;
    }
    console.log('[YOU Model Fallback] All models exhausted!');
    return false;
}

function youResetModelIndex() {
    if (YOU_CONFIG.currentModelIndex !== 0) {
        console.log('[YOU Model Fallback] Success! Resetting to primary model');
        YOU_CONFIG.currentModelIndex = 0;
    }
}

function youIsOverloadError(error) {
    const errorStr = error.message?.toLowerCase() || error.toString().toLowerCase();
    return errorStr.includes('overload') ||
           errorStr.includes('too many requests') ||
           errorStr.includes('rate limit') ||
           errorStr.includes('capacity') ||
           errorStr.includes('busy') ||
           errorStr.includes('503') ||
           errorStr.includes('429') ||
           errorStr.includes('service unavailable') ||
           errorStr.includes('temporarily unavailable');
}

// ============================================
// Проверка Hydra ключа (из основного бота)
// ============================================

function youGetHydraKey() {
    const key = localStorage.getItem('chatbot_hydra_key');
    return key ? key.trim() : null;
}

function youHasValidHydraKey() {
    // В умном режиме на проде используем серверный прокси /api/hydra (ключ в env) — ключ в браузере не нужен
    const isLocalHost = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
    if (typeof isSmartMode === 'function' && isSmartMode() && !isLocalHost) {
        return true;
    }
    const key = youGetHydraKey();
    return key && key.startsWith('sk') && key.length > 10;
}

// ============================================
// Пулы карточек
// ============================================

const YOU_QUALITIES_POOL = [
    { emoji: '🎯', name: 'Я целеустремлённый', description: 'Упорно иду к своей цели' },
    { emoji: '💡', name: 'Я креативный', description: 'Нахожу нестандартные решения' },
    { emoji: '🤝', name: 'Я эмпатичный', description: 'Чувствую эмоции других людей' },
    { emoji: '🦁', name: 'Я смелый', description: 'Не боюсь рисковать' },
    { emoji: '📚', name: 'Я любознательный', description: 'Стремлюсь узнавать новое' },
    { emoji: '⚖️', name: 'Я справедливый', description: 'Ценю честность во всём' },
    { emoji: '🎭', name: 'Я артистичный', description: 'Люблю быть в центре внимания' },
    { emoji: '🧘', name: 'Я спокойный', description: 'Сохраняю хладнокровие' },
    { emoji: '🔥', name: 'Я страстный', description: 'Отдаюсь делу полностью' },
    { emoji: '🛡️', name: 'Я надёжный', description: 'На меня можно положиться' },
    { emoji: '🌊', name: 'Я гибкий', description: 'Легко адаптируюсь к переменам' },
    { emoji: '👑', name: 'Я лидер', description: 'Веду за собой других' },
    { emoji: '🎨', name: 'Я чувствительный', description: 'Тонко воспринимаю мир' },
    { emoji: '⚡', name: 'Я энергичный', description: 'Всегда в движении' },
    { emoji: '🧩', name: 'Я аналитичный', description: 'Люблю разбираться в деталях' },
    { emoji: '💎', name: 'Я перфекционист', description: 'Стремлюсь к идеалу' },
    { emoji: '🌱', name: 'Я оптимист', description: 'Верю в лучшее' },
    { emoji: '🐢', name: 'Я терпеливый', description: 'Умею ждать' },
    { emoji: '🎪', name: 'Я спонтанный', description: 'Действую по наитию' },
    { emoji: '🏔️', name: 'Я независимый', description: 'Ценю свою свободу' }
];

const YOU_VALUES_POOL = [
    { emoji: '🏠', name: 'Мне важна семья', description: 'Близкие люди на первом месте' },
    { emoji: '🕊️', name: 'Я ценю свободу', description: 'Возможность жить по своим правилам' },
    { emoji: '💰', name: 'Я ценю достаток', description: 'Финансовая стабильность важна' },
    { emoji: '❤️', name: 'Мне важна любовь', description: 'Глубокие чувства и привязанность' },
    { emoji: '🎓', name: 'Я ценю знания', description: 'Образование и понимание мира' },
    { emoji: '⚖️', name: 'Мне важна справедливость', description: 'Честность и равенство для всех' },
    { emoji: '🤝', name: 'Я ценю дружбу', description: 'Верные и надёжные друзья' },
    { emoji: '🏆', name: 'Мне важен успех', description: 'Достижения и признание' },
    { emoji: '🧘', name: 'Я ценю гармонию', description: 'Внутренний баланс и покой' },
    { emoji: '🌍', name: 'Мне важна природа', description: 'Забота о планете и экологии' },
    { emoji: '✨', name: 'Я ценю творчество', description: 'Самовыражение и созидание' },
    { emoji: '🛡️', name: 'Мне важна безопасность', description: 'Защищённость и стабильность' },
    { emoji: '📈', name: 'Я ценю развитие', description: 'Постоянный рост и прогресс' },
    { emoji: '🙏', name: 'Мне важна духовность', description: 'Вера и поиск смысла' },
    { emoji: '🎢', name: 'Я ценю впечатления', description: 'Яркая и насыщенная жизнь' },
    { emoji: '💪', name: 'Мне важно здоровье', description: 'Физическое и ментальное благополучие' },
    { emoji: '👑', name: 'Я ценю независимость', description: 'Самостоятельность в решениях' },
    { emoji: '🌟', name: 'Мне важно признание', description: 'Уважение и оценка от других' },
    { emoji: '🤗', name: 'Я ценю доброту', description: 'Помощь и забота о других' },
    { emoji: '⏰', name: 'Мне важно время', description: 'Осознанное отношение к жизни' }
];

const YOU_LIFE_SPHERES_POOL = [
    { emoji: '💼', name: 'Я строю карьеру', description: 'Профессиональный рост и достижения' },
    { emoji: '💕', name: 'Я развиваю отношения', description: 'Романтика и партнёрство' },
    { emoji: '🏋️', name: 'Я забочусь о здоровье', description: 'Тело, питание, активность' },
    { emoji: '👨‍👩‍👧', name: 'Я укрепляю семью', description: 'Близкие и родные люди' },
    { emoji: '💵', name: 'Я управляю финансами', description: 'Деньги, бюджет, накопления' },
    { emoji: '📖', name: 'Я занимаюсь саморазвитием', description: 'Обучение и новые навыки' },
    { emoji: '🎨', name: 'Я реализую творчество', description: 'Хобби и самовыражение' },
    { emoji: '👥', name: 'Я поддерживаю связи', description: 'Друзья и общение' },
    { emoji: '🧠', name: 'Я работаю над собой', description: 'Психология и внутренний мир' },
    { emoji: '🌴', name: 'Я уделяю время отдыху', description: 'Путешествия и восстановление' },
    { emoji: '🏡', name: 'Я обустраиваю быт', description: 'Дом и комфорт' },
    { emoji: '🎓', name: 'Я получаю образование', description: 'Учёба и квалификация' },
    { emoji: '🙏', name: 'Я развиваю духовность', description: 'Вера и практики' },
    { emoji: '🤝', name: 'Я помогаю другим', description: 'Волонтёрство и поддержка' },
    { emoji: '🎮', name: 'Я нахожу время для досуга', description: 'Развлечения и удовольствия' },
    { emoji: '🏃', name: 'Я занимаюсь спортом', description: 'Физическая активность' },
    { emoji: '📱', name: 'Я слежу за технологиями', description: 'Гаджеты и инновации' },
    { emoji: '🌿', name: 'Я живу осознанно', description: 'Экология и ответственность' },
    { emoji: '🎵', name: 'Я наслаждаюсь искусством', description: 'Музыка, кино, культура' },
    { emoji: '👔', name: 'Я развиваю своё дело', description: 'Бизнес и проекты' }
];

// ============================================
// Промпты
// ============================================

const YOU_PROMPTS = {
    portrait: (selection) => {
        const parts = [];
        if (selection.yes.length > 0) {
            parts.push(`качества "${selection.yes.join('" и "')}" своими`);
        }
        if (selection.no.length > 0) {
            parts.push(`качество "${selection.no.join('" и "')}" ему не подходящим`);
        }
        return `Напиши перекрестный личностный портрет человека который назвал ${parts.join(', а ')}.\n\nПиши проницательно и обращаясь к самому этому человеку. Без вступлений. Ты должен удивить его в том числе таким уровнем реальной эмпатии, которую он даже, пожалуй, никогда ранее и не встречал`;
    },
    
    qualities: (portrait) => `Прочти этот анализ и сформируй 5 точно соответствующих ему качеств этого человека.
Формат твоего ответа:
1) нумерованный список в формате 1.
2) после точки идет эмодзи качества
3) после эмодзи идет название качества от первого лица (например: "Я терпеливый", "Я энергичный")
4) после названия идет -
5) после - идет пояснение об этом качестве длиной не более 100 символов
6) между всем этим лишь одиночные пробелы
7) четко следуй моей инструкции
8) без вступлений и послесловий

${portrait}`,

    portraitValues: (selection) => {
        const parts = [];
        if (selection.yes.length > 0) {
            parts.push(`ценности "${selection.yes.join('" и "')}" своими`);
        }
        if (selection.no.length > 0) {
            parts.push(`ценность "${selection.no.join('" и "')}" ему не подходящей`);
        }
        return `Напиши перекрестный анализ ценностей человека который назвал ${parts.join(', а ')}.\n\nПиши проницательно и обращаясь к самому этому человеку. Без вступлений. Ты должен удивить его в том числе таким уровнем реальной эмпатии, которую он даже, пожалуй, никогда ранее и не встречал, однако не используй в своем ответе ни разу точные названия полученных от него ценностей. Обходись синонимами и союзными смыслами`;
    },
    
    values: (portrait) => `Прочти этот анализ и сформируй 5 точно соответствующих ему ценностей этого человека.
Формат твоего ответа:
1) нумерованный список в формате 1.
2) после точки идет эмодзи ценности
3) после эмодзи идет название ценности от первого лица (например: "Я ценю свободу", "Мне важна семья")
4) после названия идет -
5) после - идет пояснение об этой ценности длиной не более 100 символов
6) между всем этим лишь одиночные пробелы
7) четко следуй моей инструкции
8) без вступлений и послесловий

${portrait}`,

    portraitSpheres: (selection) => {
        const parts = [];
        if (selection.yes.length > 0) {
            parts.push(`сферы жизни "${selection.yes.join('" и "')}" своими`);
        }
        if (selection.no.length > 0) {
            parts.push(`сферу жизни "${selection.no.join('" и "')}" ему не подходящей`);
        }
        return `Напиши перекрестный анализ сфер жизни человека который назвал ${parts.join(', а ')}.\n\nПиши проницательно и обращаясь к самому этому человеку. Без вступлений. Ты должен удивить его в том числе таким уровнем реальной эмпатии, которую он даже, пожалуй, никогда ранее и не встречал, однако не используй в своем ответе ни разу точные названия полученных от него сфер жизни. Обходись синонимами и союзными смыслами`;
    },
    
    spheres: (portrait) => `Прочти этот анализ и сформируй 5 точно соответствующих ему сфер жизни этого человека.
Формат твоего ответа:
1) нумерованный список в формате 1.
2) после точки идет эмодзи сферы
3) после эмодзи идет название сферы жизни от первого лица (например: "Я строю карьеру", "Я забочусь о здоровье")
4) после названия идет -
5) после - идет пояснение об этой сфере длиной не более 100 символов
6) между всем этим лишь одиночные пробелы
7) четко следуй моей инструкции
8) без вступлений и послесловий

${portrait}`,

    final: (reports) => `Внимательно прочти эти три анализа личности/ценностей/сфер жизни человека. Они составлены немного провокационно. Не обращай на это внимания. Смотри в суть и вглубь. Твоя задача внимательно сопоставить данные из этих отчетов и выявить три самых важных противоречия между отчетами(не внутри лишь одного отчета, а между ними!). И на основе этих противоречий действительно глубоко пойми этого человека. Потому что суть настоящего именно во внутренних конфликтах и того как человек из них произрастает. Пиши свой отчет живым интересным не банальным языком. Не делай отсылок по типу "в первом анализе...". Не цитируй дословно отчеты, а пиши синонимичные, ассоциативные определения. Реально удиви пользователя. Открой ему глаза на не очевидное для него.

=== ОТЧЕТ 1 (ЛИЧНОСТЬ) ===
${reports.personality}

=== ОТЧЕТ 2 (ЦЕННОСТИ) ===
${reports.values}

=== ОТЧЕТ 3 (СФЕРЫ ЖИЗНИ) ===
${reports.lifeSpheres}`,

    facts: (text) => `Пользователю понравился этот анализ. Прочти его еще раз и напиши мне 4 факта и 2 гипотезы о нём. Формат твоего ответа должен иметь строгую нумерацию начиная с 1. И заканчиваясь 6., где 5. и 6. это места для гипотез. Без вступлений и послесловий.

${text}`
};

// ============================================
// Конфигурация режимов
// ============================================

const YOU_TEST_CONFIGS = {
    personality: {
        name: 'Личность',
        emoji: '🎭',
        pool: YOU_QUALITIES_POOL,
        promptPortrait: YOU_PROMPTS.portrait,
        promptItems: YOU_PROMPTS.qualities
    },
    values: {
        name: 'Ценности',
        emoji: '💎',
        pool: YOU_VALUES_POOL,
        promptPortrait: YOU_PROMPTS.portraitValues,
        promptItems: YOU_PROMPTS.values
    },
    lifeSpheres: {
        name: 'Сферы жизни',
        emoji: '🌐',
        pool: YOU_LIFE_SPHERES_POOL,
        promptPortrait: YOU_PROMPTS.portraitSpheres,
        promptItems: YOU_PROMPTS.spheres
    },
    final: {
        name: 'Итог',
        emoji: '🏆',
        pool: [],
        promptPortrait: null,
        promptItems: null
    }
};

// ============================================
// Последовательность раундов
// ============================================

const YOU_ROUND_SEQUENCE = [
    { mode: 'personality', step: 1 },
    { mode: 'values', step: 1 },
    { mode: 'lifeSpheres', step: 1 },
    { mode: 'personality', step: 2 },
    { mode: 'values', step: 2 },
    { mode: 'lifeSpheres', step: 2 }
];

// ============================================
// Состояние YOU
// ============================================

let youState = {
    currentRound: 0,
    currentMode: 'personality',
    currentQualities: [],
    activeCard: null,
    draggedCard: null,
    touchDragData: null,
    
    modeData: {
        personality: { step1Selection: null, portrait1: null, step2Qualities: null, step1Promise: null, finalPortrait: null, step2Promise: null },
        values: { step1Selection: null, portrait1: null, step2Qualities: null, step1Promise: null, finalPortrait: null, step2Promise: null },
        lifeSpheres: { step1Selection: null, portrait1: null, step2Qualities: null, step1Promise: null, finalPortrait: null, step2Promise: null }
    },
    
    savedResults: {
        personality: null,
        values: null,
        lifeSpheres: null
    },
    
    finalReportText: ''
};

// ============================================
// API вызовы
// ============================================

/**
 * Одиночный вызов к конкретной модели OpenRouter (без fallback)
 */
async function youCallOpenRouterSingle(prompt, model) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), YOU_CONFIG.timeout);
    
    try {
        const isLocal = window.location.hostname.includes('localhost') ||
            window.location.hostname.includes('127.0.0.1');
        
        const headers = {
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.href,
            'X-Title': 'Memory Chatbot - YOU'
        };
        
        if (isLocal) {
            const apiKey = localStorage.getItem('my_openrouter_key');
            if (!apiKey) {
                throw new Error('OpenRouter API ключ не найден. Введите его в настройках.');
            }
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const apiUrl = isLocal ?
            'https://openrouter.ai/api/v1/chat/completions' :
            '/api/chat';
        
        console.log(`[YOU] OpenRouter request, model: ${model}`);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        // Проверяем на ошибку в теле ответа
        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }
        
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            throw new Error('Empty response from AI');
        }
        
        return content;
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('[YOU] OpenRouter error:', error.message);
        throw error;
    }
}

/**
 * Вызов OpenRouter с автоматическим fallback по цепочке моделей
 */
async function youCallOpenRouter(prompt) {
    let lastError = null;
    
    while (YOU_CONFIG.currentModelIndex < YOU_CONFIG.openRouterModels.length) {
        const currentModel = youGetCurrentModel();
        
        try {
            const result = await youCallOpenRouterSingle(prompt, currentModel);
            
            // Успех! Сбрасываем индекс
            youResetModelIndex();
            return result;
            
        } catch (error) {
            lastError = error;
            console.error(`[YOU] Model ${currentModel} failed:`, error.message);
            
            // Если это ошибка перегрузки — пробуем следующую модель
            if (youIsOverloadError(error)) {
                if (!youSwitchToNextModel()) {
                    break;
                }
                // Небольшая пауза перед следующей попыткой
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
            
            // Если это другая ошибка — не переключаемся
            throw error;
        }
    }
    
    // Все модели исчерпаны
    YOU_CONFIG.currentModelIndex = 0;
    throw new Error(`Все ${YOU_CONFIG.openRouterModels.length} моделей недоступны. Последняя ошибка: ${lastError?.message || 'Unknown'}`);
}

/**
 * Вызов Hydra API (для финальных ответов)
 */
async function youCallHydra(prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), YOU_CONFIG.timeout);
    
    try {
        const isLocalHost = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
        const smart = (typeof isSmartMode === 'function') ? isSmartMode() : false;
        let url, headers;
        if (smart && !isLocalHost) {
            // серверный прокси с env-ключом
            url = '/api/hydra';
            headers = {
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'Memory Chatbot - YOU'
            };
        } else {
            const hydraKey = youGetHydraKey();
            if (!hydraKey) {
                throw new Error('Hydra key not available');
            }
            url = YOU_CONFIG.hydraApiUrl;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${hydraKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Memory Chatbot - YOU'
            };
        }
        
        console.log(`[YOU] Hydra request (${smart && !isLocalHost ? 'proxy /api/hydra' : 'direct'}), model: ${YOU_CONFIG.hydraModel}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: YOU_CONFIG.hydraModel,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            throw new Error('Empty response from Hydra');
        }
        
        return content;
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('[YOU] Hydra error:', error.message);
        throw error;
    }
}

/**
 * Основная функция вызова AI
 * - Для обычных запросов: OpenRouter с fallback
 * - Для discussion (финальный ответ): Hydra если есть ключ, иначе OpenRouter с fallback
 */
async function youCallAI(prompt, useHydraIfAvailable = false) {
    // Если запрошен Hydra и ключ есть — используем Hydra
    if (useHydraIfAvailable && youHasValidHydraKey()) {
        try {
            return await youCallHydra(prompt);
        } catch (error) {
            console.warn('[YOU] Hydra failed, falling back to OpenRouter:', error.message);
            // Fallback на OpenRouter с цепочкой моделей
            return await youCallOpenRouter(prompt);
        }
    }
    
    // Обычный запрос через OpenRouter с fallback
    return await youCallOpenRouter(prompt);
}

// ============================================
// Открытие/закрытие модалки YOU
// ============================================

function openYouModal() {
    const modal = document.getElementById('youModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        youInitialize();
    }
}

function closeYouModal() {
    const modal = document.getElementById('youModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

// ============================================
// Инициализация YOU
// ============================================

function youInitialize() {
    console.log('[YOU] Initializing...');
    console.log('[YOU] Hydra key available:', youHasValidHydraKey());
    console.log('[YOU] OpenRouter models:', YOU_CONFIG.openRouterModels.length);
    
    // Сброс состояния при открытии
    youResetState();
    
    // Сброс индекса моделей
    YOU_CONFIG.currentModelIndex = 0;
    
    // Начинаем первый раунд
    youStartRound(0);
}

function youResetState() {
    youState = {
        currentRound: 0,
        currentMode: 'personality',
        currentQualities: [],
        activeCard: null,
        draggedCard: null,
        touchDragData: null,
        
        modeData: {
            personality: { step1Selection: null, portrait1: null, step2Qualities: null, step1Promise: null, finalPortrait: null, step2Promise: null },
            values: { step1Selection: null, portrait1: null, step2Qualities: null, step1Promise: null, finalPortrait: null, step2Promise: null },
            lifeSpheres: { step1Selection: null, portrait1: null, step2Qualities: null, step1Promise: null, finalPortrait: null, step2Promise: null }
        },
        
        savedResults: {
            personality: null,
            values: null,
            lifeSpheres: null
        },
        
        finalReportText: ''
    };
    
    // Сброс UI вкладок
    document.querySelectorAll('.you-mode-btn').forEach(btn => {
        btn.classList.remove('done', 'active');
        if (btn.dataset.mode === 'personality') {
            btn.classList.add('active');
        }
        if (btn.dataset.mode === 'final') {
            btn.disabled = true;
        }
    });
}

// ============================================
// UI функции
// ============================================

function youUpdateTabsUI() {
    document.querySelectorAll('.you-mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === youState.currentMode) {
            btn.classList.add('active');
        }
    });
}

function youShowLoading(percent, text) {
    const nextBtn = document.getElementById('youNextBtn');
    const content = document.getElementById('youMainContent');
    
    if (nextBtn) nextBtn.style.display = 'none';
    
    if (content) {
        content.innerHTML = `
            <div class="you-loading-state">
                <div class="you-spinner"></div>
                <div class="you-progress-text">${percent}%</div>
                <div class="you-progress-bar">
                    <div class="you-progress-fill" style="width: ${percent}%"></div>
                </div>
                <p class="you-loading-hint">${youEscapeHtml(text)}</p>
            </div>
        `;
    }
}

function youShowError(message) {
    const content = document.getElementById('youMainContent');
    const nextBtn = document.getElementById('youNextBtn');
    
    if (nextBtn) nextBtn.disabled = true;
    
    if (content) {
        content.innerHTML = `
            <div class="you-error-state">
                <div class="you-emoji">😞</div>
                <p class="you-error-title">Ошибка</p>
                <p class="you-error-message">${youEscapeHtml(message)}</p>
                <button class="you-btn you-btn-start" onclick="youStartRound(youState.currentRound)">
                    🔄 Попробовать снова
                </button>
            </div>
        `;
    }
}

function youShowToast(message) {
    const oldToast = document.querySelector('.you-toast');
    if (oldToast) oldToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'you-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ============================================
// Логика раундов
// ============================================

async function youStartRound(roundIndex) {
    if (roundIndex >= YOU_ROUND_SEQUENCE.length) {
        await youFinishAllAndShowFinal();
        return;
    }
    
    youState.currentRound = roundIndex;
    const round = YOU_ROUND_SEQUENCE[roundIndex];
    youState.currentMode = round.mode;
    
    youUpdateTabsUI();
    
    if (round.step === 1) {
        youState.currentQualities = youGetRandomQualities(round.mode);
        youRenderZones(roundIndex);
    } else {
        const data = youState.modeData[round.mode];
        
        if (data.step2Qualities) {
            youState.currentQualities = data.step2Qualities;
            youRenderZones(roundIndex);
        } else {
            youShowLoading(50, 'Подбираю уточнённые варианты...');
            try {
                await data.step1Promise;
                youState.currentQualities = data.step2Qualities;
                youRenderZones(roundIndex);
            } catch (error) {
                youShowError(error.message);
            }
        }
    }
}

async function youHandleNext() {
    const selection = youGetSelection();
    
    if (selection.yes.length === 0 && selection.no.length === 0) {
        alert('Распределите хотя бы одно качество');
        return;
    }
    
    const nextBtn = document.getElementById('youNextBtn');
    if (nextBtn) nextBtn.disabled = true;
    
    const round = YOU_ROUND_SEQUENCE[youState.currentRound];
    const data = youState.modeData[round.mode];
    const config = YOU_TEST_CONFIGS[round.mode];
    
    if (round.step === 1) {
        data.step1Selection = selection;
        
        data.step1Promise = (async () => {
            try {
                // Портрет — OpenRouter с fallback
                data.portrait1 = await youCallAI(config.promptPortrait(selection));
                // Карточки — OpenRouter с fallback
                const qualitiesText = await youCallAI(config.promptItems(data.portrait1));
                data.step2Qualities = youParseQualities(qualitiesText);
            } catch (error) {
                console.error(`[YOU] Background processing failed for ${round.mode}:`, error);
                throw error;
            }
        })();
        
        youStartRound(youState.currentRound + 1);
        
    } else {
        const isLastRound = youState.currentRound === 5;
        
        if (isLastRound) {
            await youProcessLastRound(selection);
        } else {
            data.step2Promise = (async () => {
                try {
                    // Финальный портрет режима — OpenRouter с fallback
                    data.finalPortrait = await youCallAI(config.promptPortrait(selection));
                } catch (error) {
                    console.error(`[YOU] Final portrait failed for ${round.mode}:`, error);
                    throw error;
                }
            })();
            
            youStartRound(youState.currentRound + 1);
        }
    }
}

async function youProcessLastRound(selection) {
    const data = youState.modeData.lifeSpheres;
    const config = YOU_TEST_CONFIGS.lifeSpheres;
    
    youShowLoading(60, 'Завершаю анализ...');
    
    try {
        data.finalPortrait = await youCallAI(config.promptPortrait(selection));
        
        youShowLoading(70, 'Собираю результаты...');
        
        if (youState.modeData.personality.step2Promise) {
            await youState.modeData.personality.step2Promise;
        }
        if (youState.modeData.values.step2Promise) {
            await youState.modeData.values.step2Promise;
        }
        
        youState.savedResults.personality = youState.modeData.personality.finalPortrait;
        youState.savedResults.values = youState.modeData.values.finalPortrait;
        youState.savedResults.lifeSpheres = data.finalPortrait;
        
        document.querySelectorAll('.you-mode-btn').forEach(btn => {
            if (btn.dataset.mode !== 'final') {
                btn.classList.add('done');
            }
        });
        
        const finalBtn = document.querySelector('.you-mode-btn[data-mode="final"]');
        if (finalBtn) finalBtn.disabled = false;
        
        await youGenerateFinalReport();
        
    } catch (error) {
        youShowError(error.message);
    }
}

async function youFinishAllAndShowFinal() {
    youState.currentMode = 'final';
    youUpdateTabsUI();
    await youGenerateFinalReport();
}

async function youGenerateFinalReport() {
    youState.currentMode = 'final';
    youUpdateTabsUI();
    
    youShowLoading(80, 'Создаю глубинный портрет...');
    
    try {
        const prompt = YOU_PROMPTS.final(youState.savedResults);
        // Финальный отчет — используем Hydra если есть ключ
        youState.finalReportText = await youCallAI(prompt, true);
        
        youShowLoading(100, 'Готово!');
        await new Promise(r => setTimeout(r, 300));
        
        youRenderFinalResult(youState.finalReportText);
        
    } catch (error) {
        youShowError(error.message);
    }
}

function youRenderFinalResult(text) {
    const nextBtn = document.getElementById('youNextBtn');
    const content = document.getElementById('youMainContent');
    
    if (nextBtn) nextBtn.style.display = 'none';
    
    if (content) {
        content.innerHTML = `
            <div class="you-portrait-result">
                <div class="you-portrait-header">
                    <div class="you-emoji">🤯</div>
                    <div class="you-title">Глубинный портрет</div>
                </div>
                <div class="you-portrait-text">${youFormatMarkdown(text)}</div>
                
                <div class="you-result-actions">
                    <button class="you-btn you-btn-copy" id="youCopyFinalBtn">
                        📋 Скопировать
                    </button>
                    <button class="you-btn you-btn-discuss" id="youDiscussBtn">
                        💬 Обсудить с ассистентом
                    </button>
                    <button class="you-btn you-btn-secondary" id="youRestartBtn">
                        🔄 Заново
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('youCopyFinalBtn')?.addEventListener('click', () => {
            youCopyAndAnalyze(youState.finalReportText);
        });
        
        document.getElementById('youDiscussBtn')?.addEventListener('click', () => {
            youDiscussWithAssistant();
        });
        
        document.getElementById('youRestartBtn')?.addEventListener('click', youRestartAll);
    }
}

function youRestartAll() {
    if (!confirm('Сбросить все результаты и начать заново?')) return;
    youResetState();
    YOU_CONFIG.currentModelIndex = 0; // Сброс индекса моделей
    youStartRound(0);
}

// ============================================
// Рендеринг зон
// ============================================

function youRenderZones(roundIndex) {
    const round = YOU_ROUND_SEQUENCE[roundIndex];
    const config = YOU_TEST_CONFIGS[round.mode];
    const content = document.getElementById('youMainContent');
    const nextBtn = document.getElementById('youNextBtn');
    
    const stepText = round.step === 1
        ? `Выберите ${config.name.toLowerCase()}, которые вам подходят`
        : 'Уточните выбор';
    
    let cardsHtml = '';
    for (let i = 0; i < youState.currentQualities.length; i++) {
        const q = youState.currentQualities[i];
        cardsHtml += `
            <div class="you-quality-card" draggable="true" data-card="${i}">
                <div class="you-quality-emoji">${q.emoji}</div>
                <div class="you-quality-info">
                    <div class="you-quality-name">${youEscapeHtml(q.name)}</div>
                    <div class="you-quality-description">${youEscapeHtml(q.description)}</div>
                </div>
            </div>
        `;
    }
    
    if (nextBtn) {
        nextBtn.style.display = 'block';
        nextBtn.disabled = true;
    }
    
    if (content) {
        content.innerHTML = `
            <div class="you-step-indicator">
                <div class="you-step">${config.emoji} Раунд ${roundIndex + 1} из 6</div>
                <div class="you-instruction">${stepText}</div>
            </div>
            <div class="you-zones-container">
                <div class="you-drop-zone you-zone-yes" data-zone="yes">
                    <div class="you-zone-header">✅ Это я <span class="you-zone-limit">(макс. 2)</span></div>
                    <div class="you-zone-cards" data-zone="yes"></div>
                </div>
                <div class="you-drop-zone you-zone-neutral" data-zone="neutral">
                    <div class="you-zone-header">🔄 Варианты</div>
                    <div class="you-zone-cards" data-zone="neutral">${cardsHtml}</div>
                </div>
                <div class="you-drop-zone you-zone-no" data-zone="no">
                    <div class="you-zone-header">❌ Не я <span class="you-zone-limit">(макс. 1)</span></div>
                    <div class="you-zone-cards" data-zone="no"></div>
                </div>
            </div>
            <p class="you-touch-hint">💡 Нажмите карточку, затем на зону</p>
        `;
        
        youInitDragAndDrop();
        youUpdateNextButton();
    }
}

// ============================================
// Drag and Drop
// ============================================

function youInitDragAndDrop() {
    const cards = document.querySelectorAll('.you-quality-card');
    const zones = document.querySelectorAll('.you-drop-zone');
    
    cards.forEach(card => {
        card.addEventListener('dragstart', youHandleDragStart);
        card.addEventListener('dragend', youHandleDragEnd);
        card.addEventListener('touchstart', youHandleTouchStart, { passive: false });
        card.addEventListener('touchmove', youHandleTouchMove, { passive: false });
        card.addEventListener('touchend', youHandleTouchEnd);
        card.addEventListener('click', youHandleCardClick);
    });
    
    zones.forEach(zone => {
        zone.addEventListener('dragover', youHandleDragOver);
        zone.addEventListener('dragleave', youHandleDragLeave);
        zone.addEventListener('drop', youHandleDrop);
        zone.addEventListener('click', youHandleZoneClick);
    });
    
    youUpdateZoneStates();
}

function youHandleCardClick(e) {
    e.stopPropagation();
    if (youState.touchDragData && youState.touchDragData.isDragging) return;
    
    const card = this;
    const wasActive = card.classList.contains('active');
    
    document.querySelectorAll('.you-quality-card').forEach(c => c.classList.remove('active'));
    
    if (!wasActive) {
        card.classList.add('active');
        youState.activeCard = card;
    } else {
        youState.activeCard = null;
    }
    
    youUpdateZoneHighlights();
}

function youHandleZoneClick(e) {
    if (e.target.closest('.you-quality-card')) return;
    
    const zone = this;
    const zoneType = zone.dataset.zone;
    
    if (youState.activeCard) {
        youMoveCardToZone(youState.activeCard, zoneType);
        youState.activeCard.classList.remove('active');
        youState.activeCard = null;
        youUpdateZoneHighlights();
    }
}

function youHandleDragStart(e) {
    if (youState.activeCard) {
        youState.activeCard.classList.remove('active');
        youState.activeCard = null;
    }
    
    youState.draggedCard = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function youHandleDragEnd() {
    this.classList.remove('dragging');
    youState.draggedCard = null;
    document.querySelectorAll('.you-drop-zone').forEach(z => z.classList.remove('drag-over'));
}

function youHandleDragOver(e) {
    e.preventDefault();
    const zone = this;
    const zoneCards = zone.querySelector('.you-zone-cards');
    const cardCount = zoneCards.querySelectorAll('.you-quality-card').length;
    
    if (youState.draggedCard && youState.draggedCard.parentElement !== zoneCards && cardCount < YOU_CONFIG.zoneLimits[zone.dataset.zone]) {
        zone.classList.add('drag-over');
    }
}

function youHandleDragLeave() {
    this.classList.remove('drag-over');
}

function youHandleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    if (!youState.draggedCard) return;
    
    youMoveCardToZone(youState.draggedCard, this.dataset.zone);
}

function youHandleTouchStart(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const card = this;
    
    youState.touchDragData = {
        card: card,
        startX: touch.clientX,
        startY: touch.clientY,
        offsetX: touch.clientX - card.getBoundingClientRect().left,
        offsetY: touch.clientY - card.getBoundingClientRect().top,
        isDragging: false,
        clone: null
    };
}

function youHandleTouchMove(e) {
    if (!youState.touchDragData) return;
    const touch = e.touches[0];
    const dx = touch.clientX - youState.touchDragData.startX;
    const dy = touch.clientY - youState.touchDragData.startY;
    
    if (!youState.touchDragData.isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        youState.touchDragData.isDragging = true;
        youState.touchDragData.card.classList.add('dragging');
        
        if (youState.activeCard) {
            youState.activeCard.classList.remove('active');
            youState.activeCard = null;
        }
        
        const clone = youState.touchDragData.card.cloneNode(true);
        clone.classList.add('you-drag-preview');
        clone.style.width = youState.touchDragData.card.offsetWidth + 'px';
        document.body.appendChild(clone);
        youState.touchDragData.clone = clone;
    }
    
    if (youState.touchDragData.isDragging) {
        e.preventDefault();
        if (youState.touchDragData.clone) {
            youState.touchDragData.clone.style.left = (touch.clientX - youState.touchDragData.offsetX) + 'px';
            youState.touchDragData.clone.style.top = (touch.clientY - youState.touchDragData.offsetY) + 'px';
        }
        
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        const zone = elementUnder ? elementUnder.closest('.you-drop-zone') : null;
        
        document.querySelectorAll('.you-drop-zone').forEach(z => z.classList.remove('drag-over'));
        
        if (zone) {
            const zoneCards = zone.querySelector('.you-zone-cards');
            const cardCount = zoneCards.querySelectorAll('.you-quality-card').length;
            if (youState.touchDragData.card.parentElement !== zoneCards && cardCount < YOU_CONFIG.zoneLimits[zone.dataset.zone]) {
                zone.classList.add('drag-over');
            }
        }
    }
}

function youHandleTouchEnd(e) {
    if (!youState.touchDragData) return;
    
    const wasDragging = youState.touchDragData.isDragging;
    
    youState.touchDragData.card.classList.remove('dragging');
    if (youState.touchDragData.clone) youState.touchDragData.clone.remove();
    
    if (wasDragging) {
        const touch = e.changedTouches[0];
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        const zone = elementUnder ? elementUnder.closest('.you-drop-zone') : null;
        
        if (zone) {
            youMoveCardToZone(youState.touchDragData.card, zone.dataset.zone);
        }
        
        document.querySelectorAll('.you-drop-zone').forEach(z => z.classList.remove('drag-over'));
    }
    
    youState.touchDragData = null;
}

function youMoveCardToZone(card, zoneType) {
    const zone = document.querySelector(`.you-drop-zone.you-zone-${zoneType}`);
    const zoneCards = zone.querySelector('.you-zone-cards');
    const cardCount = zoneCards.querySelectorAll('.you-quality-card').length;
    
    if (card.parentElement === zoneCards) return;
    
    if (cardCount < YOU_CONFIG.zoneLimits[zoneType]) {
        zoneCards.appendChild(card);
        youUpdateZoneStates();
        youUpdateNextButton();
    }
}

function youUpdateZoneStates() {
    document.querySelectorAll('.you-drop-zone').forEach(zone => {
        const cardCount = zone.querySelector('.you-zone-cards').querySelectorAll('.you-quality-card').length;
        zone.classList.toggle('zone-full', cardCount >= YOU_CONFIG.zoneLimits[zone.dataset.zone]);
    });
}

function youUpdateZoneHighlights() {
    const zones = document.querySelectorAll('.you-drop-zone');
    
    zones.forEach(zone => {
        zone.classList.remove('can-accept');
        
        if (youState.activeCard) {
            const zoneCards = zone.querySelector('.you-zone-cards');
            const cardCount = zoneCards.querySelectorAll('.you-quality-card').length;
            const zoneType = zone.dataset.zone;
            
            if (youState.activeCard.parentElement !== zoneCards && cardCount < YOU_CONFIG.zoneLimits[zoneType]) {
                zone.classList.add('can-accept');
            }
        }
    });
}

function youGetSelection() {
    const result = { yes: [], no: [] };
    
    const yesZone = document.querySelector('.you-zone-yes .you-zone-cards');
    const noZone = document.querySelector('.you-zone-no .you-zone-cards');
    
    if (yesZone) {
        yesZone.querySelectorAll('.you-quality-card').forEach(card => {
            const name = card.querySelector('.you-quality-name');
            if (name) result.yes.push(name.textContent);
        });
    }
    
    if (noZone) {
        noZone.querySelectorAll('.you-quality-card').forEach(card => {
            const name = card.querySelector('.you-quality-name');
            if (name) result.no.push(name.textContent);
        });
    }
    
    return result;
}

function youUpdateNextButton() {
    const selection = youGetSelection();
    const hasSelection = selection.yes.length > 0 || selection.no.length > 0;
    const nextBtn = document.getElementById('youNextBtn');
    if (nextBtn) nextBtn.disabled = !hasSelection;
}

// ============================================
// Утилиты
// ============================================

function youGetRandomQualities(mode) {
    const config = YOU_TEST_CONFIGS[mode];
    const shuffled = [...config.pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
}

function youParseQualities(text) {
    const lines = text.split('\n');
    const qualities = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        let cleaned = trimmed.replace(/^\d+[\.\)]\s*/, '').trim();
        if (!cleaned) continue;
        
        const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u;
        const emojiMatch = cleaned.match(emojiRegex);
        let emoji = '❓';
        
        if (emojiMatch) {
            emoji = emojiMatch[1];
            cleaned = cleaned.slice(emojiMatch[0].length).trim();
        }
        
        let name = 'Неизвестное качество';
        let description = '';
        
        const dashIndex = cleaned.indexOf(' - ');
        if (dashIndex > 0) {
            name = cleaned.slice(0, dashIndex).trim();
            description = cleaned.slice(dashIndex + 3).trim();
        } else {
            const simpleDash = cleaned.indexOf('-');
            if (simpleDash > 0) {
                name = cleaned.slice(0, simpleDash).trim();
                description = cleaned.slice(simpleDash + 1).trim();
            } else {
                name = cleaned;
            }
        }
        
        qualities.push({ emoji, name, description });
    }
    
    while (qualities.length < 5) {
        qualities.push({
            emoji: '❓',
            name: 'Я уникальный',
            description: 'Это качество ещё предстоит раскрыть'
        });
    }
    
    return qualities.slice(0, 5);
}

// ============================================
// YOU Help Modal
// ============================================

function openYouHelpModal() {
    const modal = document.getElementById('youHelpModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeYouHelpModal() {
    const modal = document.getElementById('youHelpModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Закрытие по клику на оверлей
document.addEventListener('click', (e) => {
    if (e.target.id === 'youHelpModal') {
        closeYouHelpModal();
    }
});

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeYouHelpModal();
    }
});

window.openYouHelpModal = openYouHelpModal;
window.closeYouHelpModal = closeYouHelpModal;

function youEscapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function youFormatMarkdown(text) {
    if (!text) return '';
    
    let html = youEscapeHtml(text);
    
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    html = html.replace(/(?<!\w)\*([^*]+?)\*(?!\w)/g, '<em>$1</em>');
    html = html.replace(/(?<!\w)_([^_]+?)_(?!\w)/g, '<em>$1</em>');
    
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => '<ul>' + match + '</ul>');
    
    html = html.replace(/\n(?!<)/g, '<br>\n');
    html = html.replace(/(<\/(h1|h2|h3|ul|ol|blockquote|hr)>)<br>/g, '$1');
    html = html.replace(/<br>\n(<(h1|h2|h3|ul|ol|blockquote))/g, '\n$1');
    
    return html;
}

// ============================================
// Копирование и анализ фактов
// ============================================

async function youCopyAndAnalyze(text) {
    try {
        await navigator.clipboard.writeText(text);
        youShowToast('✅ Скопировано! Анализирую...');
    } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            youShowToast('✅ Скопировано! Анализирую...');
        } catch (e) {
            youShowToast('⚠️ Не удалось скопировать');
            return;
        }
        document.body.removeChild(textarea);
    }
    
    try {
        const response = await youCallAI(YOU_PROMPTS.facts(text));
        youParseAndSaveFacts(response);
        youShowToast('✨ Новые инсайты сохранены!');
    } catch (error) {
        console.error('[YOU] Failed to get facts:', error);
    }
}

function youParseAndSaveFacts(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const newFacts = [];
    const newHypotheses = [];
    
    for (const line of lines) {
        const match = line.match(/^(\d+)[\.\)]\s*(.+)/);
        if (match) {
            const num = parseInt(match[1]);
            const content = match[2].trim();
            
            if (num >= 1 && num <= 4) {
                newFacts.push(content);
            } else if (num === 5 || num === 6) {
                newHypotheses.push(content);
            }
        }
    }
    
    const existingFacts = JSON.parse(localStorage.getItem(YOU_STORAGE.facts) || '[]');
    const existingHypotheses = JSON.parse(localStorage.getItem(YOU_STORAGE.hypotheses) || '[]');
    
    localStorage.setItem(YOU_STORAGE.facts, JSON.stringify([...existingFacts, ...newFacts]));
    localStorage.setItem(YOU_STORAGE.hypotheses, JSON.stringify([...existingHypotheses, ...newHypotheses]));
}

// ============================================
// Модалки фактов/гипотез (тройной тап)
// ============================================

function youShowFactsModal() {
    const facts = JSON.parse(localStorage.getItem(YOU_STORAGE.facts) || '[]');
    youShowDataModal('📊 Факты о вас', facts, 'facts');
}

function youShowHypothesesModal() {
    const hypotheses = JSON.parse(localStorage.getItem(YOU_STORAGE.hypotheses) || '[]');
    youShowDataModal('🔮 Гипотезы', hypotheses, 'hypotheses');
}

function youShowDataModal(title, items, type) {
    const overlay = document.createElement('div');
    overlay.className = 'you-data-modal-overlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
    
    let contentHtml = '';
    if (items.length === 0) {
        contentHtml = `
            <div class="you-modal-empty">
                <div class="you-emoji">${type === 'facts' ? '📭' : '🔮'}</div>
                <p>Пока пусто</p>
                <p class="you-modal-hint">Нажмите "Скопировать" на финальном портрете</p>
            </div>
        `;
    } else {
        contentHtml = items.map((item, i) => `
            <div class="you-modal-item">${i + 1}. ${youEscapeHtml(item)}</div>
        `).join('');
    }
    
    overlay.innerHTML = `
        <div class="you-data-modal">
            <div class="you-data-modal-header">
                <div class="you-data-modal-title">${title}</div>
                <button class="you-data-modal-close" onclick="this.closest('.you-data-modal-overlay').remove()">✕</button>
            </div>
            <div class="you-data-modal-content">
                ${contentHtml}
            </div>
            ${items.length > 0 ? `
                <div class="you-data-modal-footer">
                    <button class="you-btn you-btn-clear" onclick="youClearStorage('${type}'); this.closest('.you-data-modal-overlay').remove();">
                        🗑️ Очистить
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function youClearStorage(type) {
    if (type === 'facts') {
        localStorage.removeItem(YOU_STORAGE.facts);
    } else {
        localStorage.removeItem(YOU_STORAGE.hypotheses);
    }
    youShowToast('🗑️ Очищено');
}

// ============================================
// Тройной тап на звёздочки
// ============================================

function youSetupTripleTap(elementId, callback) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let tapCount = 0;
    let lastTapTime = 0;
    
    element.addEventListener('click', () => {
        const now = Date.now();
        if (now - lastTapTime < 400) {
            tapCount++;
        } else {
            tapCount = 1;
        }
        lastTapTime = now;
        
        if (tapCount === 3) {
            callback();
            tapCount = 0;
        }
    });
}

// Инициализация тройного тапа при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    youSetupTripleTap('youLeftStar', youShowFactsModal);
    youSetupTripleTap('youRightStar', youShowHypothesesModal);
});

// ============================================
// Обсуждение с ассистентом
// ============================================

async function youDiscussWithAssistant() {
    // Собираем данные из YOU
    const youAnalysis = youState.finalReportText;
    const youFacts = JSON.parse(localStorage.getItem(YOU_STORAGE.facts) || '[]');
    const youHypotheses = JSON.parse(localStorage.getItem(YOU_STORAGE.hypotheses) || '[]');
    
    // Собираем данные из основного бота (используем глобальные функции)
    const botFacts = typeof getFactsForPrompt === 'function' ? getFactsForPrompt() : '';
    const botTraits = typeof getTraitsForPrompt === 'function' ? getTraitsForPrompt() : '';
    const botHypotheses = typeof getHypothesesForPrompt === 'function' ? getHypothesesForPrompt() : '';
    const botTimeline = typeof getTimelineForPrompt === 'function' ? getTimelineForPrompt() : '';
    
    // Показываем загрузку
    youShowDiscussionLoading();
    
    const prompt = `Ты — проницательный психолог-консультант. Пользователь прошёл тест самопознания и получил глубинный анализ своей личности. Также у тебя есть дополнительный контекст о нём из предыдущих бесед.

=== ГЛУБИННЫЙ АНАЛИЗ ЛИЧНОСТИ (из теста) ===
${youAnalysis}

=== ФАКТЫ ИЗ ТЕСТА ===
${youFacts.length > 0 ? youFacts.map((f, i) => `${i + 1}. ${f}`).join('\n') : '(пока нет)'}

=== ГИПОТЕЗЫ ИЗ ТЕСТА ===
${youHypotheses.length > 0 ? youHypotheses.map((h, i) => `${i + 1}. ${h}`).join('\n') : '(пока нет)'}

=== ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ ИЗ БЕСЕД ===

**Известные факты:**
${botFacts || '(нет данных)'}

**Черты личности:**
${botTraits || '(нет данных)'}

**Гипотезы о пользователе:**
${botHypotheses || '(нет данных)'}

**Хронология жизни:**
${botTimeline || '(нет данных)'}

=== ТВОЯ ЗАДАЧА ===

1. **Синтезируй** информацию из теста и контекста бесед. Найди пересечения, подтверждения, интересные связи.

2. **Прокомментируй** глубинный анализ через призму того, что знаешь о пользователе. Что подтверждается? Что раскрывается по-новому?

3. **Добавь ценность** — предложи инсайты, которые возникают именно из сопоставления двух источников информации.

4. **Будь конкретен** — не общие фразы, а точные наблюдения с примерами из контекста.

5. **Обращайся лично** — пиши "ты", "тебе", как будто разговариваешь с человеком.


Пиши живо, интересно, без занудства. Удиви пользователя глубиной понимания. не стесняйся выдать очень длинный ответ. финальная треть твоего ответа должна быть сосредоточена на объяснении того как пользователю со всем этим разносторонним внутренним конфликтом жить дальше лучше чем сейчас. это должен быть блок действительно небанальных но мудрых советов, пронизанных хорошим пониманием контекста и обстоятельств его жизни.  `;
    
    try {
        // Discussion — используем Hydra если есть ключ
        const response = await youCallAI(prompt, true);
        youShowDiscussionResult(response);
    } catch (error) {
        youShowDiscussionError(error.message);
    }
}

function youShowDiscussionLoading() {
    const content = document.getElementById('youMainContent');
    if (!content) return;
    
    const usingHydra = youHasValidHydraKey();
    const currentModel = usingHydra ? YOU_CONFIG.hydraModel : youGetCurrentModel();
    const hint = `Сопоставляю данные теста с контекстом бесед (${usingHydra ? 'Hydra' : 'OpenRouter'})`;
    
    content.innerHTML = `
        <div class="you-loading-state">
            <div class="you-spinner"></div>
            <div class="you-progress-text">Анализирую...</div>
            <p class="you-loading-hint">${hint}</p>
        </div>
    `;
}

function youShowDiscussionResult(text) {
    const content = document.getElementById('youMainContent');
    const nextBtn = document.getElementById('youNextBtn');
    
    if (nextBtn) nextBtn.style.display = 'none';
    
    if (content) {
        content.innerHTML = `
            <div class="you-discussion-result">
                <div class="you-discussion-header">
                    <div class="you-emoji">🔮</div>
                    <div class="you-title">Взгляд ассистента</div>
                </div>
                <div class="you-portrait-text">${youFormatMarkdown(text)}</div>
                
                <div class="you-result-actions">
                    <button class="you-btn you-btn-copy" onclick="youCopyText(this)" data-text="${youEscapeAttr(text)}">
                        📋 Скопировать
                    </button>
                    <button class="you-btn you-btn-secondary" onclick="youBackToFinalReport()">
                        ← Назад к анализу
                    </button>
                </div>
            </div>
        `;
    }
}

function youShowDiscussionError(message) {
    const content = document.getElementById('youMainContent');
    
    if (content) {
        content.innerHTML = `
            <div class="you-error-state">
                <div class="you-emoji">😞</div>
                <p class="you-error-title">Ошибка</p>
                <p class="you-error-message">${youEscapeHtml(message)}</p>
                <button class="you-btn you-btn-secondary" onclick="youBackToFinalReport()">
                    ← Назад к анализу
                </button>
            </div>
        `;
    }
}

function youBackToFinalReport() {
    if (youState.finalReportText) {
        youRenderFinalResult(youState.finalReportText);
    } else {
        youRestartAll();
    }
}

function youCopyText(button) {
    const text = button.dataset.text;
    
    navigator.clipboard.writeText(text).then(() => {
        youShowToast('✅ Скопировано!');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            youShowToast('✅ Скопировано!');
        } catch (e) {
            youShowToast('⚠️ Не удалось скопировать');
        }
        document.body.removeChild(textarea);
    });
}

function youEscapeAttr(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ============================================
// Экспорт для глобального доступа
// ============================================

window.openYouModal = openYouModal;
window.closeYouModal = closeYouModal;
window.youHandleNext = youHandleNext;
window.youStartRound = youStartRound;
window.youRestartAll = youRestartAll;
window.youShowFactsModal = youShowFactsModal;
window.youShowHypothesesModal = youShowHypothesesModal;
window.youClearStorage = youClearStorage;
window.youDiscussWithAssistant = youDiscussWithAssistant;
window.youBackToFinalReport = youBackToFinalReport;
window.youCopyText = youCopyText;

console.log('[you.js] Loaded. Self-discovery module ready.');
console.log('[you.js] Hydra support:', youHasValidHydraKey() ? 'enabled' : 'disabled (using OpenRouter fallback)');
console.log('[you.js] OpenRouter models:', YOU_CONFIG.openRouterModels.length, 'available for fallback');