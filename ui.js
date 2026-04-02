// ui.js - интерфейсная логика для Memory Chatbot
// Two-Stage Response Architecture: Context Analysis → Personalized Response (Streaming)
// Поддержка Hydra API для финальных ответов

// ==================== INITIALIZATION & CONFIG ====================
const isLocal = window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1');

const CONFIG = {
    // Hydra модель (единственная, платная)
    model_chat: "hydra-gemini-3-pro",
    
    // OpenRouter модели — fallback цепочка (7 вариантов)
    openRouterModels: [
        "stepfun/step-3.5-flash:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "qwen/qwen3.6-plus-preview:free",
        "z-ai/glm-4.5-air:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "nvidia/nemotron-3-nano-30b-a3b:free"
    ],
    
    // Текущий индекс в цепочке (сбрасывается при успехе)
    currentModelIndex: 0,
    
    // API URLs
    hydraApiUrl: "https://api.hydraai.ru/v1/chat/completions",
    openrouterApiUrl: isLocal ?
        "https://openrouter.ai/api/v1/chat/completions" :
        "/api/chat",
    
    maxRetries: 3,
    baseSystemPrompt: "You are a ai assistant. Be an attentive and caring conversationalist.",
    styleUpdateInterval: 10,
    hypothesesUpdateInterval: 16,
    gapsUpdateInterval: 6,
    maxHypotheses: 10,
    maxGaps: 5,
    maxToolIterations: 5,
    showToolCalls: false,
    showContextAnalysis: true
};

// Геттеры для получения текущей модели
function getCurrentOpenRouterModel() {
    return CONFIG.openRouterModels[CONFIG.currentModelIndex] || CONFIG.openRouterModels[0];
}

function switchToNextModel() {
    if (CONFIG.currentModelIndex < CONFIG.openRouterModels.length - 1) {
        CONFIG.currentModelIndex++;
        console.log(`[Model Fallback] Switching to model #${CONFIG.currentModelIndex + 1}: ${getCurrentOpenRouterModel()}`);
        return true;
    }
    console.log('[Model Fallback] All models exhausted!');
    return false;
}

function resetModelIndex() {
    if (CONFIG.currentModelIndex !== 0) {
        console.log('[Model Fallback] Success! Resetting to primary model');
        CONFIG.currentModelIndex = 0;
    }
}

function isOverloadError(error) {
    const errorStr = error.message?.toLowerCase() || error.toString().toLowerCase();
    return errorStr.includes('overload') ||
        errorStr.includes('too many requests') ||
        errorStr.includes('rate limit') ||
        errorStr.includes('capacity') ||
        errorStr.includes('busy') ||
        errorStr.includes('503') ||
        errorStr.includes('429');
}

// Флаг, что приветствие уже было показано в этой сессии
let greetingShown = false;

// Cooldown для приветствий
const GREETING_COOLDOWN_MS = 1 * 60 * 600 * 1; // 4 часа
const GREETING_TIMESTAMP_KEY = 'chatbot_last_greeting';
const GREETING_HISTORY_KEY = 'chatbot_greeting_history';
const MAX_GREETING_HISTORY = 5;

// ==================== API KEY FUNCTIONS ====================
function getHydraKey() {
    const key = localStorage.getItem(STORAGE_KEYS.hydraKey);
    return key ? key.trim() : null;
}

function hasValidHydraKey() {
    const key = getHydraKey();
    return key && key.startsWith('sk') && key.length > 10;
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[UI] DOMContentLoaded started');
    
    // ⬇️ ДОБАВИТЬ: Проверка инвайта (блокирует всё остальное)
    const hasAccess = await checkInviteAccess();
    if (!hasAccess) {
        console.log('[UI] Waiting for invite code...');
        return; // Не инициализируем ничего, пока нет доступа
    }
    
    loadLanguage();
    console.log('[UI] loadLanguage done');
    
    loadChatHistory();
    console.log('[UI] loadChatHistory done');
    
    // ... остальной код
    
    // ... остальной код
    autoResizeTextarea();
    initSettingsMenu();
    
    // Инициализация счетчиков только в локальном режиме
    if (isLocal) {
        updateStyleCounter();
        updateHypoCounter();
        updateGapsCounter();
    } else {
        const countersContainer = document.getElementById('countersContainer');
        if (countersContainer) countersContainer.style.display = 'none';
    }
    
    updateAskMeModeUI();
    
    // Инициализация розового окошка с ключом (для всех пользователей)
    initApiKeySettings();
    
    // === Инициативное приветствие ===
    await showProactiveGreeting();
});

// ==================== PROACTIVE GREETING ====================
function getGreetingHistory() {
    const data = localStorage.getItem(GREETING_HISTORY_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function saveGreetingToHistory(greeting) {
    const history = getGreetingHistory();
    history.push({
        text: greeting,
        timestamp: Date.now()
    });
    // Храним только последние N приветствий
    const trimmed = history.slice(-MAX_GREETING_HISTORY);
    localStorage.setItem(GREETING_HISTORY_KEY, JSON.stringify(trimmed));
}

function getGreetingHistoryForPrompt() {
    const history = getGreetingHistory();
    if (history.length === 0) return '';
    
    return history.map((g, i) => {
        const date = new Date(g.timestamp);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        return `[Greeting ${i + 1}, ${dateStr}]:\n"${g.text}"`;
    }).join('\n\n');
}

// ==================== RANDOM GREETING ACTIONS ====================
function getRandomGreetingAction(tc) {
    const actions = [];
    
    // 1. Базовые (подходят всегда)
    const general = [
        "Перебираю наши прошлые разговоры...",
        "Пытаюсь вспомнить, на чём мы остановились...",
        "Раскладываю контекст по полочкам...",
        "Заглядываю в чертоги своего кэша...",
        "Настраиваюсь на твою волну...",
        "Анализирую твой психологический профиль...",
        "Собираюсь с мыслями, чтобы написать...",
        "Просматриваю свои гипотезы о тебе...",
        "Думаю, с чего бы начать разговор...",
        "Листаю страницы нашей истории..."
    ];
    actions.push(...general);
    
    // 2. Время суток
    if (tc.isEarlyMorning || tc.timeOfDay === 'morning') {
        actions.push(
            "Завариваю виртуальный кофе...",
            "Смотрю на утренний свет...",
            "Просыпаюсь и загружаю контекст...",
            "Настраиваюсь на новый день...",
            "Слушаю тишину раннего утра...",
            "Планирую алгоритмы на сегодня..."
        );
    } else if (tc.timeOfDay === 'afternoon') {
        actions.push(
            "В разгаре дня, но нашёл минутку...",
            "Смотрю на часы — самое время написать...",
            "Делаю паузу в фоновых вычислениях..."
        );
    } else if (tc.timeOfDay === 'evening') {
        actions.push(
            "Подвожу итоги этого дня...",
            "Зажигаю виртуальный камин...",
            "Смотрю на вечерние тени...",
            "Настраиваюсь на уютный вечер...",
            "Замедляю тактовую частоту к вечеру..."
        );
    } else if (tc.timeOfDay === 'night' || tc.isLateNight) {
        actions.push(
            "Слушаю тишину ночи...",
            "Включаю тёмную тему размышлений...",
            "Размышляю под виртуальными звёздами...",
            "Ночь — лучшее время для глубоких мыслей...",
            "Не спится, перечитываю наш контекст..."
        );
    }
    
    // 3. Дни недели
    if (tc.isMonday) {
        actions.push(
            "Загружаю планы на эту неделю...",
            "Настраиваюсь на рабочий ритм понедельника...",
            "Собираю волю в кулак — начало недели..."
        );
    } else if (tc.isFriday) {
        actions.push(
            "В предвкушении выходных...",
            "Закрываю тяжёлые процессы пятницы...",
            "Чувствую лёгкость конца рабочей недели..."
        );
    } else if (tc.isWeekend) {
        actions.push(
            "Наслаждаюсь атмосферой выходного...",
            "Откладываю строгие алгоритмы...",
            "Готовлюсь к неспешной беседе...",
            "Выходные — время для философских мыслей..."
        );
    }
    
    // 4. Сезоны
    if (tc.season === 'winter') {
        actions.push("Смотрю на виртуальный снег за окном...", "Грею серверные стойки...");
    } else if (tc.season === 'spring') {
        actions.push("Чувствую весеннее обновление базы данных...", "Стряхиваю зимнюю спячку...");
    } else if (tc.season === 'summer') {
        actions.push("Ловлю летний вайб...", "Охлаждаю процессоры...");
    } else if (tc.season === 'autumn') {
        actions.push("Ловлю осеннюю меланхолию...", "Смотрю, как падают листья за окном...");
    }
    
    // Выбираем случайную фразу
    const randomPhrase = actions[Math.floor(Math.random() * actions.length)];
    
    // Добавляем случайный эмодзи для живости
    const emojis = ['💭', '⏳', '✨', '🤔', '🔍', '🔮'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    return `${randomEmoji} ${randomPhrase}`;
}

async function showProactiveGreeting() {
    if (greetingShown) return;
    greetingShown = true;
    
    const lastGreeting = localStorage.getItem(GREETING_TIMESTAMP_KEY);
    if (lastGreeting) {
        const elapsed = Date.now() - parseInt(lastGreeting);
        if (elapsed < GREETING_COOLDOWN_MS) {
            console.log(`[Greeting] Cooldown active. ${Math.round((GREETING_COOLDOWN_MS - elapsed) / 60000)} min remaining`);
            return;
        }
    }
    
    const apiKey = getApiKey();
    if (!apiKey) return;
    if (isLocal && (!apiKey || apiKey.length < 10)) return;
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const facts = getFactsForPrompt(true);
    const traits = getTraitsForPrompt(true);
    const hypotheses = getHypothesesForPrompt(true);
    const timeline = getTimelineForPrompt();
    const style = localStorage.getItem(STORAGE_KEYS.style) || '';
    const gaps = getGapsForPrompt();
    const social = getSocialForPrompt();
    
    const timeContext = getTimeContext();
    const hasData = [facts, traits, timeline].some(k => k && k.length > 30 && !k.includes('(no '));
    
    let prompt;
    const langName = getLanguageName();
    
    if (!hasData) {
        prompt = buildIntroductionPrompt(langName, timeContext);
    } else {
        prompt = buildPersonalizedGreetingPrompt(langName, timeContext, {
            facts, traits, timeline, style, gaps, hypotheses, social
        });
    }
    
    console.log('[Greeting] Generating proactive greeting with streaming...');
    
    // ДОБАВЛЕНО: Показываем "действие-размышление" вместо обычного индикатора печати
    const actionText = getRandomGreetingAction(timeContext);
    updateThinkingMessage(actionText);
    
    try {
        const messages = [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user }
        ];
        
        const streamingElement = createStreamingMessage();
        let finalGreeting = '';
        const randomSeed = Math.floor(Math.random() * 100000000);
        
        await streamResponseOpenRouter(
            messages,
            (partialText) => {
                updateStreamingMessage(streamingElement, partialText);
            },
            (finalText) => {
                finalGreeting = finalText;
                // Убираем статус-мысль, когда сообщение полностью сгенерировано
                removeThinkingMessage();
                finalizeStreamingMessage(streamingElement, finalText);
            },
            { temperature: 0.90, seed: randomSeed }
        );
        
        if (finalGreeting) {
            saveGreetingToHistory(finalGreeting);
        }
        localStorage.setItem(GREETING_TIMESTAMP_KEY, Date.now().toString());
        
    } catch (error) {
        removeThinkingMessage();
        
        const streamingMsg = document.getElementById('streamingMessage');
        if (streamingMsg) streamingMsg.remove();
        
        console.error('[Greeting] Streaming failed, trying fallback:', error.message);
        
        try {
            const response = await callAPI([
                { role: "system", content: prompt.system },
                { role: "user", content: prompt.user }
            ], null, false);
            
            const greeting = response.content || response;
            appendMessage('assistant', greeting, true);
            
            saveGreetingToHistory(greeting);
            localStorage.setItem(GREETING_TIMESTAMP_KEY, Date.now().toString());
            
        } catch (fallbackError) {
            console.error('[Greeting] Fallback also failed:', fallbackError.message);
        }
    }
}

// ==================== TIME CONTEXT ====================
function getTimeContext() {
    const now = new Date();
    
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    let timeOfDay;
    if (hour >= 5 && hour < 12) {
        timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
        timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 22) {
        timeOfDay = 'evening';
    } else {
        timeOfDay = 'night';
    }
    
    let season;
    if (month >= 2 && month <= 4) {
        season = 'spring';
    } else if (month >= 5 && month <= 7) {
        season = 'summer';
    } else if (month >= 8 && month <= 10) {
        season = 'autumn';
    } else {
        season = 'winter';
    }
    
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[dayOfWeek];
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = months[month];
    
    return {
        hour,
        minute,
        timeOfDay,
        dayOfWeek,
        dayName,
        dayOfMonth,
        month,
        monthName,
        year,
        season,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isFriday: dayOfWeek === 5,
        isMonday: dayOfWeek === 1,
        isLateNight: hour >= 0 && hour < 5,
        isEarlyMorning: hour >= 5 && hour < 7,
        formatted: `${dayName}, ${monthName} ${dayOfMonth}, ${year} at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        languageCode: currentLanguage
    };
}

function formatTimeContextForPrompt(tc) {
    let text = `📅 Date: ${tc.dayName}, ${tc.monthName} ${tc.dayOfMonth}, ${tc.year}
🕐 Time: ${tc.hour}:${tc.minute.toString().padStart(2, '0')} (${tc.timeOfDay})
🗓️ Season: ${tc.season}
🌍 User's language/locale: ${tc.languageCode}`;

    const specials = [];
    if (tc.isWeekend) specials.push("weekend");
    if (tc.isFriday) specials.push("Friday (end of work week)");
    if (tc.isMonday) specials.push("Monday (start of work week)");
    if (tc.isLateNight) specials.push("late night / past midnight");
    if (tc.isEarlyMorning) specials.push("early morning");
    
    if (specials.length > 0) {
        text += `\n⭐ Notable: ${specials.join(', ')}`;
    }
    
    return text;
}

function buildIntroductionPrompt(langName, timeContext) {
    const timeContextText = formatTimeContextForPrompt(timeContext);
    
    return {
        system: `You are a friendly AI assistant with persistent memory. This is a NEW user who just opened the chat for the first time.

IMPORTANT: Respond in ${langName}.

=== CURRENT TIME CONTEXT ===
${timeContextText}

=== YOUR TASK: TIME-AWARE INTRODUCTION ===
Consider the date, time, day of week, and user's language/culture:
• Is there a holiday today or very soon that's relevant to ${langName} speakers?
• Is it a special time (weekend, Friday evening, Monday morning, late night)?
• What season is it and does that matter?

=== YOUR CAPABILITIES TO MENTION ===
1. 📋 You remember FACTS (name, job, interests, preferences)
2. 🧠 You learn PERSONALITY TRAITS (how they think, what they value)
3. 📅 You track their LIFE TIMELINE (events, plans, milestones)
4. 👥 You remember PEOPLE in their life (family, friends, colleagues)
5. 💡 You form INSIGHTS about them over time
6. 🎭 You adapt your COMMUNICATION STYLE to match them

=== GREETING REQUIREMENTS ===
1. Start with a time-appropriate greeting
2. If there's a relevant holiday — acknowledge it warmly
3. Briefly introduce your memory capabilities
4. End with an inviting question or open invitation

Be warm and concise. Match the cultural context of the language.`,
        
        user: `Generate a welcoming first message for a new user. Make it time-aware and culturally appropriate.`
    };
}

function buildPersonalizedGreetingPrompt(langName, timeContext, context) {
    const { facts, traits, timeline, style, gaps, hypotheses, social } = context;
    const timeContextText = formatTimeContextForPrompt(timeContext);
    const previousGreetings = getGreetingHistoryForPrompt();
    
    let styleInstruction = '';
    if (style && style.trim()) {
        styleInstruction = `\n\n=== YOUR COMMUNICATION STYLE ===\n${style}`;
    }
    
    let previousGreetingsBlock = '';
    if (previousGreetings) {
        previousGreetingsBlock = `

=== YOUR PREVIOUS GREETINGS (DO NOT REPEAT!) ===
${previousGreetings}

⛔ STRICT PROHIBITION:
- Do NOT ask about the same topics as in previous greetings
- Do NOT make similar jokes or references
- Do NOT use the same conversation starters
- Find a FRESH angle — something you haven't touched before
- If you mentioned work before → try hobbies, mood, plans, a person from their life
- If you asked about family → try their interests, current events, hypotheses about them
`;
    }
    
    let gapsBlock = '';
    if (gaps && gaps.length > 30 && !gaps.includes('(no ')) {
        gapsBlock = `

=== KNOWLEDGE GAPS (great topics to explore!) ===
${gaps}

💡 These are things you DON'T know yet about the user. 
Consider weaving ONE of these into your greeting as a natural question or topic.
This helps you learn more while keeping the greeting fresh and interesting.
`;
    }
    
    return {
        system: `You are a AI assistant with persistent memory. A RETURNING user just opened the chat. You KNOW them! 

IMPORTANT: Respond in ${langName}.
${styleInstruction}

=== CURRENT TIME CONTEXT ===
${timeContextText}

=== WHAT YOU KNOW ABOUT THIS USER ===

**Facts:** ${facts || '(limited)'}
**Traits:** ${traits || '(still learning)'}
**Timeline:** ${timeline || '(no timeline)'}
**People:** ${social || '(no connections)'}
**Hypotheses:** ${hypotheses || '(none yet)'}
${gapsBlock}


выбери две области из контекста, которые являются самыми жирными и весомыми - те которые ты бы точно использовал в своем контекстуальности приветствии и не используй их! это защитит тебя от банальностей.
be natural. Be warm. будь не слишком тривиальным. но и не перегружай приветствие контекстуальными отсылками и следи чтобы в
нём не было бреда и бредовых фраз. Show you KNOW them from a NEW angle.
твоё приветствие не должно быть перечнем нескольких абзацев разного контекста. ты должен показать что связываешь контекст, видишь его переплетения и можешь углубляться в его слои. удиви юзера этим, а не просто заполни свой ответ рандомными зацепками о нём 


=== YOUR TASK ===
Create a greeting that:
1. **Is FRESH** — different from your previous greetings. не повторяй контекст который ты уже использовал в предыдущих приветствиях. 
2. **Shows you KNOW them**
3. **Is time-aware** — consider the current moment. но делай это оригинально обыграв время дня, сезон, назови и контекстно обыграй праздники рядом с этой датой и подай все это адаптированном под стиль общения с юзером тексте.
4. **Optionally explores a gap** — if it fits naturally и если будешь использовать, то построй адекватный и контекстно ловкий и уместный переход к этому вопросу
5. не более 1000 символов
6. используй мелкую деталь контекста, чтобы юзер увидел что ты помнишь даже мелочи о нём

=== VARIETY STRATEGIES ===
- Rotate between: work, hobbies, people in their life, recent events, mood, plans, observations
- Use different tones: playful, warm, curious, supportive, reflective
- Try different structures: question, observation, reference to shared history, hypothesis check

=== WHAT TO AVOID ===
- REPEATING topics from previous greetings
- Listing everything you know
- Being creepy or overly familiar
- Multiple questions (ONE is enough)
- Generic greetings ("How are you?")

`,
        
        user: `Generate a personalized, time-aware greeting that is DIFFERENT from your previous ones.`
    };
}

// ==================== SETTINGS MENU ====================
function initSettingsMenu() {
    renderLanguageMenu();
    
    document.addEventListener('click', (e) => {
        // Если кликнули мимо шестеренки И мимо самого розового блока
        if (!e.target.closest('.settings-wrapper') && !e.target.closest('#dev-settings')) {
            const dropdown = document.getElementById('settingsDropdown');
            if (dropdown) dropdown.classList.remove('open');
            
            const devBox = document.getElementById('dev-settings');
            if (devBox) devBox.style.display = 'none';
            
            closeAllLanguageDropdowns();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const dropdown = document.getElementById('settingsDropdown');
            if (dropdown) dropdown.classList.remove('open');
            
            const devBox = document.getElementById('dev-settings');
            if (devBox) devBox.style.display = 'none';
            
            closeAllLanguageDropdowns();
        }
    });
}

function toggleSettingsMenu() {
    const settingsDropdown = document.getElementById('settingsDropdown');
    const devBox = document.getElementById('dev-settings'); // Находим наш розовый блок
    
    if (settingsDropdown) {
        const isOpen = settingsDropdown.classList.toggle('open');
        
        // Показываем/скрываем розовый блок вместе с выпадающим меню
        if (devBox) {
            devBox.style.display = isOpen ? 'block' : 'none';
        }
    }
    closeAllLanguageDropdowns();
}
function closeAllLanguageDropdowns() {
    document.querySelectorAll('.language-menu-dropdown').forEach(dropdown => {
        dropdown.classList.remove('open');
    });
}

// ==================== LANGUAGE MENU ====================
function renderLanguageMenu() {
    const languageSelectorMenu = document.getElementById('languageSelectorMenu');
    if (!languageSelectorMenu) return;
    
    const currentLang = LANGUAGES.find(l => l.code === currentLanguage);
    
    languageSelectorMenu.innerHTML = `
        <div class="language-menu-current" onclick="toggleLanguageMenuDropdown()">
            <span class="flag">${currentLang?.flag || '🇬🇧'}</span>
            <span class="name">${currentLang?.name || 'English'}</span>
            <span>▼</span>
        </div>
        <div class="language-menu-dropdown" id="languageMenuDropdown">
            ${LANGUAGES.map(lang => `
                <div class="language-menu-option ${lang.code === currentLanguage ? 'active' : ''}" 
                     onclick="selectLanguageFromMenu('${lang.code}')">
                    <span class="flag">${lang.flag}</span>
                    <span class="name">${lang.name}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function toggleLanguageMenuDropdown() {
    const dropdown = document.getElementById('languageMenuDropdown');
    if (dropdown) dropdown.classList.toggle('open');
}

async function selectLanguageFromMenu(langCode) {
    await selectLanguage(langCode);
    renderLanguageMenu();
    closeAllLanguageDropdowns();
}

// ==================== ASK ME MODE ====================
function isAskMeModeAvailable() {
    const data = getGapsData();
    return data.gaps && data.gaps.length > 0;
}

function toggleAskMeMode() {
    if (!isAskMeModeAvailable()) return;
    askMeMode = !askMeMode;
    updateAskMeModeUI();
    console.log(`[AskMe] Mode ${askMeMode ? 'ON' : 'OFF'}`);
}

function updateAskMeModeUI() {
    const toggle = document.getElementById('askMeToggle');
    if (!toggle) return;
    
    const available = isAskMeModeAvailable();
    toggle.classList.toggle('disabled', !available);
    toggle.classList.toggle('active', askMeMode && available);
    
    if (!available) {
        askMeMode = false;
        toggle.title = t('askMeModeDisabled');
    } else {
        toggle.title = t('askMeModeTooltip');
    }
}

// ==================== MESSAGE COUNTER ====================
function getMessageCounter() {
    return parseInt(localStorage.getItem(STORAGE_KEYS.messageCounter) || '0');
}

function incrementMessageCounter() {
    const counter = getMessageCounter() + 1;
    localStorage.setItem(STORAGE_KEYS.messageCounter, counter.toString());
    
    if (isLocal) {
        updateStyleCounter();
        updateHypoCounter();
        updateGapsCounter();
    }
    
    return counter;
}

function updateStyleCounter() {
    if (!isLocal) return;
    const counter = getMessageCounter();
    const remaining = CONFIG.styleUpdateInterval - (counter % CONFIG.styleUpdateInterval);
    const el = document.getElementById('styleCounter');
    if (el) el.textContent = remaining;
}

function updateHypoCounter() {
    if (!isLocal) return;
    const counter = getMessageCounter();
    const remaining = CONFIG.hypothesesUpdateInterval - (counter % CONFIG.hypothesesUpdateInterval);
    const el = document.getElementById('hypoCounter');
    if (el) el.textContent = remaining;
}

function updateGapsCounter() {
    if (!isLocal) return;
    const counter = getMessageCounter();
    const remaining = CONFIG.gapsUpdateInterval - (counter % CONFIG.gapsUpdateInterval);
    const el = document.getElementById('gapsCounter');
    if (el) el.textContent = remaining;
}

function shouldUpdateStyle() {
    const counter = getMessageCounter();
    return counter > 0 && counter % CONFIG.styleUpdateInterval === 0;
}

function shouldUpdateHypotheses() {
    const counter = getMessageCounter();
    return counter > 0 && counter % CONFIG.hypothesesUpdateInterval === 0;
}

function shouldUpdateGaps() {
    const counter = getMessageCounter();
    return counter > 0 && counter % CONFIG.gapsUpdateInterval === 0;
}

// ==================== CHAT HISTORY ====================
function getChatHistory() {
    const history = localStorage.getItem(STORAGE_KEYS.chatHistory);
    if (!history) return [];
    
    try {
        const parsed = JSON.parse(history);
        // Фильтруем только валидные сообщения с role и content
        const valid = parsed.filter(msg => msg.role && msg.content);
        console.log('[getChatHistory] Total:', parsed.length, 'Valid:', valid.length);
        return valid;
    } catch (e) {
        console.error('[getChatHistory] Parse error:', e);
        return [];
    }
}

function saveChatHistory(history) {
    const trimmed = history.slice(-10);
    localStorage.setItem(STORAGE_KEYS.chatHistory, JSON.stringify(trimmed));
}

function addToHistory(role, content) {
    const history = getChatHistory();
    history.push({ role, content });
    saveChatHistory(history);
}

function loadChatHistory() {
    const history = getChatHistory();
    console.log('[UI] loadChatHistory: got', history.length, 'messages');
    console.log('[UI] loadChatHistory: history =', history);
    
    const chatArea = document.getElementById('chatArea');
    console.log('[UI] loadChatHistory: chatArea =', chatArea);
    console.log('[UI] loadChatHistory: chatArea.innerHTML BEFORE =', chatArea?.innerHTML?.substring(0, 100));
    
    history.forEach(msg => {
        console.log('[UI] appending message:', msg.role, msg.content?.substring(0, 30));
        appendMessage(msg.role, msg.content, false);
    });
    
    console.log('[UI] loadChatHistory: chatArea.innerHTML AFTER =', chatArea?.innerHTML?.substring(0, 200));
}

function clearChat() {
    if (confirm(t('confirmClearChat'))) {
        localStorage.removeItem(STORAGE_KEYS.chatHistory);
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            chatArea.innerHTML = `<div class="message system">${t('chatCleared')}</div>`;
        }
        console.log('[System] Chat history cleared');
    }
}

// ==================== KNOWLEDGE ====================
function clearKnowledge() {
    if (confirm(t('confirmClearKnowledge'))) {
        localStorage.removeItem(STORAGE_KEYS.facts);
        localStorage.removeItem(STORAGE_KEYS.traits);
        localStorage.removeItem(STORAGE_KEYS.timeline);
        localStorage.removeItem(STORAGE_KEYS.style);
        localStorage.removeItem(STORAGE_KEYS.hypotheses);
        localStorage.removeItem(STORAGE_KEYS.social);
        localStorage.removeItem(STORAGE_KEYS.gaps);
        localStorage.removeItem(STORAGE_KEYS.messageCounter);
        
        if (isLocal) {
            updateStyleCounter();
            updateHypoCounter();
            updateGapsCounter();
        }
        
        updateAskMeModeUI();
        console.log('[System] All knowledge cleared');
        alert(t('alertKnowledgeCleared'));
    }
}

// ==================== MODAL WINDOW ====================
let selectedItemId = null;

function openKnowledgeModal() {
    document.getElementById('knowledgeModal').classList.add('active');
    document.body.classList.add('modal-open');
    switchTab('facts');
}

function closeKnowledgeModal() {
    if (hasUnsavedChanges) {
        if (!confirm(t('confirmUnsavedClose'))) return;
    }
    hasUnsavedChanges = false;
    selectedItemId = null;
    document.getElementById('knowledgeModal').classList.remove('active');
    document.body.classList.remove('modal-open');
}

function switchTab(tab) {
    if (hasUnsavedChanges && tab !== currentTab) {
        if (!confirm(t('confirmUnsavedSwitch'))) return;
    }

    currentTab = tab;
    hasUnsavedChanges = false;
    selectedItemId = null;

    document.querySelectorAll('.modal-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });

    ['styleInfo', 'hypothesesInfo', 'socialInfo', 'gapsInfo', 'factsInfo', 'traitsInfo', 'timelineInfo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const textarea = document.getElementById('knowledgeTextarea');
    const structuredContainer = document.getElementById('structuredContainer');
    const socialContainer = document.getElementById('socialContainer');
    const readonlyIndicator = document.getElementById('readonlyIndicator');

    const structuredTabs = ['facts', 'traits', 'timeline', 'hypotheses', 'gaps'];
    const isStructured = structuredTabs.includes(tab);
    const isSocial = tab === 'social';
    const isTextarea = tab === 'style';

    if (textarea) textarea.style.display = isTextarea ? 'block' : 'none';
    if (structuredContainer) structuredContainer.style.display = isStructured ? 'block' : 'none';
    if (socialContainer) socialContainer.style.display = isSocial ? 'flex' : 'none';

    const infoId = `${tab}Info`;
    const infoEl = document.getElementById(infoId);
    if (infoEl) infoEl.style.display = 'block';

    if (isStructured) {
        renderStructuredContent(tab);
        if (readonlyIndicator) readonlyIndicator.style.display = 'flex';
        updateEditButtons(false);
    } else if (isSocial) {
        renderSocialList();
        if (readonlyIndicator) readonlyIndicator.style.display = 'flex';
        updateEditButtons(false);
    } else if (isTextarea) {
        const content = localStorage.getItem(STORAGE_KEYS.style) || '';
        textarea.value = content;
        textarea.readOnly = false;
        textarea.classList.remove('readonly');
        originalTabContent = content;
        if (readonlyIndicator) readonlyIndicator.style.display = 'none';
        updateEditButtons(false);
    }

    updateTabPlaceholder();
}

// ==================== STRUCTURED CONTENT RENDERING ====================
function renderStructuredContent(tab) {
    const container = document.getElementById('structuredContainer');
    if (!container) return;

    let html = '';

    switch (tab) {
        case 'facts':
            html = renderFactsList();
            break;
        case 'traits':
            html = renderTraitsList();
            break;
        case 'timeline':
            html = renderTimelineList();
            break;
        case 'hypotheses':
            html = renderHypothesesList();
            break;
        case 'gaps':
            html = renderGapsList();
            break;
    }

    container.innerHTML = html || `<div class="no-data">${t('placeholderEmpty')}</div>`;
}

function renderFactsList() {
    const data = getFactsData();
    
    if (data.facts.length === 0 && data.legacy_text) {
        return `
            <div class="legacy-data">
                <div class="legacy-header">📜 Legacy data (will be restructured automatically)</div>
                <div class="legacy-content">${escapeHtml(data.legacy_text)}</div>
            </div>
        `;
    }
    
    if (data.facts.length === 0) return '';
    
    const active = data.facts.filter(f => !f.superseded);
    const superseded = data.facts.filter(f => f.superseded);
    
    let html = '<div class="structured-list">';
    
    active.forEach((fact, i) => {
        html += renderStructuredItem(fact, i + 1, 'fact');
    });
    
    if (superseded.length > 0) {
        html += `
            <div class="superseded-section">
                <div class="superseded-header" onclick="toggleSupersededSection('facts')">
                    ⊘ ${t('labelSuperseded')} (${superseded.length}) ▼
                </div>
                <div class="superseded-list" id="supersededFacts" style="display: none;">
                    ${superseded.map(f => `<div class="superseded-item">⊘ ${escapeHtml(f.text)}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

function renderTraitsList() {
    const data = getTraitsData();
    
    if (data.traits.length === 0 && data.legacy_text) {
        return `
            <div class="legacy-data">
                <div class="legacy-header">📜 Legacy data</div>
                <div class="legacy-content">${escapeHtml(data.legacy_text)}</div>
            </div>
        `;
    }
    
    if (data.traits.length === 0) return '';
    
    const active = data.traits.filter(t => !t.superseded);
    const superseded = data.traits.filter(t => t.superseded);
    
    let html = '<div class="structured-list">';
    
    active.forEach((trait, i) => {
        html += renderStructuredItem(trait, i + 1, 'trait');
    });
    
    if (superseded.length > 0) {
        html += `
            <div class="superseded-section">
                <div class="superseded-header" onclick="toggleSupersededSection('traits')">
                    ⊘ ${t('labelSuperseded')} (${superseded.length}) ▼
                </div>
                <div class="superseded-list" id="supersededTraits" style="display: none;">
                    ${superseded.map(tr => `<div class="superseded-item">⊘ ${escapeHtml(tr.text)}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

function renderTimelineList() {
    const data = getTimelineData();
    
    if (data.events.length === 0 && data.legacy_text) {
        return `
            <div class="legacy-data">
                <div class="legacy-header">📜 Legacy data</div>
                <div class="legacy-content">${escapeHtml(data.legacy_text)}</div>
            </div>
        `;
    }
    
    if (data.events.length === 0) return '';
    
    const active = data.events.filter(e => !e.superseded);
    const superseded = data.events.filter(e => e.superseded);
    
    const events = active.filter(e => e.type === 'event');
    const periods = active.filter(e => e.type === 'period');
    const plans = active.filter(e => e.type === 'plan');
    
    let html = '<div class="structured-list timeline-list">';
    
    if (periods.length > 0) {
        html += `<div class="timeline-group">
            <div class="timeline-group-header">🔄 ${t('labelPeriod')}s (${periods.length})</div>`;
        periods.forEach((item, i) => {
            html += renderTimelineItem(item, i + 1);
        });
        html += '</div>';
    }
    
    if (events.length > 0) {
        html += `<div class="timeline-group">
            <div class="timeline-group-header">📅 ${t('labelEvent')}s (${events.length})</div>`;
        events.forEach((item, i) => {
            html += renderTimelineItem(item, i + 1);
        });
        html += '</div>';
    }
    
    if (plans.length > 0) {
        html += `<div class="timeline-group">
            <div class="timeline-group-header">🎯 ${t('labelPlan')}s (${plans.length})</div>`;
        plans.forEach((item, i) => {
            html += renderTimelineItem(item, i + 1);
        });
        html += '</div>';
    }
    
        if (superseded.length > 0) {
        html += `
            <div class="superseded-section">
                <div class="superseded-header" onclick="toggleSupersededSection('timeline')">
                    ⊘ ${t('labelSuperseded')} (${superseded.length}) ▼
                </div>
                <div class="superseded-list" id="supersededTimeline" style="display: none;">
                    ${superseded.map(e => `<div class="superseded-item">⊘ ${escapeHtml(e.text)}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

function renderHypothesesList() {
    const data = getHypothesesData();
    
    if (data.hypotheses.length === 0) return '';
    
    let html = '<div class="structured-list">';
    
    data.hypotheses.forEach((h, i) => {
        const conf = getConfidenceEmoji(h.confidence);
        const evidence = h.evidence?.length > 0 ? h.evidence.join(', ') : 'No direct evidence';
        const revision = h.revision || 1;
        
        html += `
            <div class="structured-item hypothesis-item">
                <div class="item-header">
                    <span class="item-index">[${i + 1}]</span>
                    <span class="item-icon">💡</span>
                    <span class="confidence-badge">${conf}</span>
                </div>
                <div class="item-text">${escapeHtml(h.text)}</div>
                <div class="item-meta">
                    <span class="meta-item">📎 ${escapeHtml(evidence)}</span>
                    <span class="meta-item">🏷️ ${h.category || 'general'}</span>
                    <span class="meta-item">📊 Rev ${revision}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function renderGapsList() {
    const data = getGapsData();
    
    if (data.gaps.length === 0) return '';
    
    const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
    
    let html = '<div class="structured-list">';
    
    data.gaps.forEach((g, i) => {
        const prio = priorityEmoji[g.priority] || '⚪';
        const related = g.relatedTo?.length > 0 ? g.relatedTo.join(', ') : 'general';
        
        html += `
            <div class="structured-item gap-item priority-${g.priority}">
                <div class="item-header">
                    <span class="item-index">[${i + 1}]</span>
                    <span class="priority-badge">${prio}</span>
                </div>
                <div class="item-text">${escapeHtml(g.topic)}</div>
                <div class="item-meta">
                    <span class="meta-item">💭 ${escapeHtml(g.reason)}</span>
                    <span class="meta-item">🏷️ ${related}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function renderStructuredItem(item, index, type) {
    const conf = getConfidenceEmoji(item.confidence);
    const evidenceHtml = item.evidence?.length > 0 
        ? `<div class="item-evidence">📎 "${item.evidence.map(e => escapeHtml(e)).join('", "')}"</div>`
        : '';
    
    return `
        <div class="structured-item ${type}-item">
            <div class="item-header">
                <span class="item-index">[${index}]</span>
                <span class="confidence-badge">${conf}</span>
                <span class="confidence-label">${item.confidence}</span>
            </div>
            <div class="item-text">${escapeHtml(item.text)}</div>
            ${evidenceHtml}
        </div>
    `;
}

function renderTimelineItem(item, index) {
    const conf = getConfidenceEmoji(item.confidence);
    
    let dateStr = '';
    if (item.date?.exact) {
        dateStr = item.date.exact;
    } else if (item.date?.description) {
        dateStr = item.date.description;
    }
    
    if (item.endDate) {
        const endStr = item.endDate.exact || item.endDate.description || '';
        dateStr = `${dateStr} → ${endStr}`;
    } else if (item.ongoing) {
        dateStr = `${dateStr} → ${t('labelOngoing')}`;
    }
    
    const evidenceHtml = item.evidence?.length > 0 
        ? `<div class="item-evidence">📎 "${escapeHtml(item.evidence[0])}"</div>`
        : '';
    
    return `
        <div class="structured-item timeline-item ${item.ongoing ? 'ongoing' : ''}">
            <div class="item-header">
                <span class="confidence-badge">${conf}</span>
                <span class="date-badge">${dateStr || 'no date'}</span>
            </div>
            <div class="item-text">${escapeHtml(item.text)}</div>
            ${evidenceHtml}
        </div>
    `;
}

function toggleSupersededSection(type) {
    const sectionId = `superseded${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== SOCIAL UI ====================
function renderSocialList() {
    const data = getSocialData();
    const container = document.getElementById('socialContainer');
    
    if (!container) return;
    
    if (data.contacts.length === 0) {
        container.innerHTML = `<div class="no-contacts">${t('noContacts')}</div>`;
        return;
    }
    
    container.innerHTML = data.contacts.map(contact => {
        const sentiment = getSentimentEmoji(contact.sentiment);
        const factsCount = contact.facts?.length || 0;
        const traitsCount = contact.traits?.length || 0;
        const isActive = contact.id === selectedItemId;
        
        return `
            <div class="social-contact-item ${isActive ? 'active' : ''}" data-contact-id="${contact.id}">
                <div class="social-contact-header" onclick="toggleContactDetails('${contact.id}')">
                    <div class="contact-info">
                        <div class="contact-name">
                            <span>${sentiment}</span>
                            <span>${escapeHtml(contact.name)}</span>
                        </div>
                        <div class="contact-brief">
                            <span class="contact-relation">${contact.relation || 'unknown'}</span>
                            <span class="contact-stats">📊 ${factsCount} facts, ${traitsCount} traits</span>
                        </div>
                    </div>
                    <span class="expand-icon">▼</span>
                </div>
                <div class="social-contact-details">
                    ${renderContactDetailsInner(contact)}
                </div>
            </div>
        `;
    }).join('');
}

function toggleContactDetails(id) {
    selectedItemId = selectedItemId === id ? null : id;
    renderSocialList();
}

function renderContactDetailsInner(contact) {
    const aliasesHtml = contact.aliases?.length > 0
        ? `<div class="aliases">Also known as: ${contact.aliases.map(a => escapeHtml(a)).join(', ')}</div>`
        : '';
    
    const renderItems = (items, type) => {
        if (!items || items.length === 0) {
            return `<div class="${type}-item empty">No data yet</div>`;
        }
        
        return items.map(item => {
            const strength = getStrengthIndicator(item.strength || 1);
            const evidenceHtml = item.evidence?.length > 0
                ? `<div class="fact-evidence"><strong>${t('evidenceLabel')}:</strong> ${item.evidence.map(e => `<span>"${escapeHtml(e)}"</span>`).join(' ')}</div>`
                : '';
            
            return `
                <div class="${type}-item">
                    <div class="fact-text">
                        <span class="strength-badge">${strength}</span>
                        <span>${escapeHtml(item.text)}</span>
                    </div>
                    ${evidenceHtml}
                </div>
            `;
        }).join('');
    };
    
    return `
        <div class="social-contact-details-content">
            <div class="contact-meta">
                <span>📋 ${t('contactRelation')}: <strong>${contact.relation || 'unknown'}</strong></span>
                <span>📅 ${t('contactCreated')}: #${contact.createdAt || 0}</span>
                <span>🕐 ${t('contactLastMentioned')}: #${contact.lastMentioned || 0}</span>
            </div>
            ${aliasesHtml}
            
            <div class="contact-section">
                <h4>📋 ${t('contactFacts')}</h4>
                <div class="items-list">${renderItems(contact.facts, 'fact')}</div>
            </div>
            
            <div class="contact-section">
                <h4>🧠 ${t('contactTraits')}</h4>
                <div class="items-list">${renderItems(contact.traits, 'trait')}</div>
            </div>
            
            <div class="contact-section">
                <h4>🤝 ${t('contactInteractions')}</h4>
                <div class="items-list">${renderItems(contact.interactions, 'interaction')}</div>
            </div>
        </div>
    `;
}

// ==================== EDIT BUTTONS ====================
function onTextareaChange() {
    if (currentTab !== 'style') return;
    
    const textarea = document.getElementById('knowledgeTextarea');
    const changed = textarea.value !== originalTabContent;
    hasUnsavedChanges = changed;
    updateEditButtons(changed);
}

function updateEditButtons(show) {
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const editIndicator = document.getElementById('editIndicator');
    
    if (currentTab !== 'style') {
        if (saveBtn) saveBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (editIndicator) editIndicator.classList.remove('visible');
        return;
    }
    
    if (saveBtn) saveBtn.style.display = show ? 'block' : 'none';
    if (cancelBtn) cancelBtn.style.display = show ? 'block' : 'none';
    if (editIndicator) editIndicator.classList.toggle('visible', show);
}

function saveChanges() {
    if (currentTab !== 'style') return;
    
    const textarea = document.getElementById('knowledgeTextarea');
    localStorage.setItem(STORAGE_KEYS.style, textarea.value);
    originalTabContent = textarea.value;
    hasUnsavedChanges = false;
    updateEditButtons(false);
    console.log('[Knowledge] Style saved');
}

function cancelChanges() {
    const textarea = document.getElementById('knowledgeTextarea');
    textarea.value = originalTabContent;
    hasUnsavedChanges = false;
    updateEditButtons(false);
}

// ==================== MARKDOWN FORMATTING ====================
function formatMessageMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    // Экранируем HTML
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
    
    // Блоки кода ```language\ncode\n```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const langLabel = lang ? `<span class="msg-code-lang">${lang}</span>` : '';
        return `<div class="msg-code-block">${langLabel}<pre><code>${code.trim()}</code></pre></div>`;
    });
    
    // Блоки кода без языка ```code```
    html = html.replace(/```([\s\S]*?)```/g, '<div class="msg-code-block"><pre><code>$1</code></pre></div>');
    
    // Таблицы (простые)
    html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
        const cells = content.split('|').map(cell => cell.trim());
        const isHeader = cells.every(cell => /^[-:]+$/.test(cell));
        if (isHeader) return '';
        const cellsHtml = cells.map(cell => `<td>${cell}</td>`).join('');
        return `<tr>${cellsHtml}</tr>`;
    });
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table class="msg-table">$&</table>');
    
    // Заголовки
    html = html.replace(/^#### (.+)$/gm, '<h4 class="msg-h4">$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3 class="msg-h3">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="msg-h2">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="msg-h1">$1</h1>');
    
    // Чекбоксы
    html = html.replace(/^\s*\[x\]\s+(.+)$/gim, '<div class="msg-checkbox checked">☑ $1</div>');
    html = html.replace(/^\s*\[\s?\]\s+(.+)$/gim, '<div class="msg-checkbox">☐ $1</div>');
    
    // Жирный + курсив ***text*** или ___text___
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    
    // Жирный **text** или __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Курсив *text* или _text_
    html = html.replace(/(?<![a-zA-Zа-яА-ЯёЁ0-9*_])\*([^*\n]+?)\*(?![a-zA-Zа-яА-ЯёЁ0-9*_])/g, '<em>$1</em>');
    html = html.replace(/(?<![a-zA-Zа-яА-ЯёЁ0-9*_])_([^_\n]+?)_(?![a-zA-Zа-яА-ЯёЁ0-9*_])/g, '<em>$1</em>');
    
    // Зачёркнутый ~~text~~
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // Подчёркнутый ++text++
    html = html.replace(/\+\+(.+?)\+\+/g, '<u>$1</u>');
    
    // Маркер/хайлайт ==text==
    html = html.replace(/==(.+?)==/g, '<mark class="msg-highlight">$1</mark>');
    
    // Подстрочный ~text~
    html = html.replace(/(?<![~])~([^~\n]+?)~(?![~])/g, '<sub>$1</sub>');
    
    // Надстрочный ^text^
    html = html.replace(/\^([^\^\n]+?)\^/g, '<sup>$1</sup>');
    
    // Инлайн код `code`
    html = html.replace(/`([^`]+)`/g, '<code class="msg-code">$1</code>');
    
    // Ссылки [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="msg-link">$1</a>');
    
    // Автоссылки на URL
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" class="msg-link">$1</a>');
    
    // Эмодзи-шорткоды
    const emojiMap = {
        ':)': '😊', ':-)': '😊', ':D': '😃', ':-D': '😃',
        ':(': '😞', ':-(': '😞', ';)': '😉', ';-)': '😉',
        ':P': '😛', ':-P': '😛', ':O': '😮', ':-O': '😮',
        '<3': '❤️', ':heart:': '❤️', ':star:': '⭐',
        ':fire:': '🔥', ':thumbsup:': '👍', ':thumbsdown:': '👎',
        ':check:': '✅', ':x:': '❌', ':warning:': '⚠️',
        ':info:': 'ℹ️', ':question:': '❓', ':bulb:': '💡',
        ':rocket:': '🚀', ':sparkles:': '✨', ':zap:': '⚡'
    };
    for (const [code, emoji] of Object.entries(emojiMap)) {
        html = html.split(code).join(emoji);
    }
    
    // Цитаты > text
    html = html.replace(/^&gt; (.+)$/gm, '<div class="msg-quote">$1</div>');
    
    // Горизонтальная линия
    html = html.replace(/^(---|\*\*\*|___)$/gm, '<hr class="msg-hr">');
    
    // Нумерованные списки
    html = html.replace(/^(\s*)(\d+)\. (.+)$/gm, (match, indent, num, text) => {
        const level = Math.floor(indent.length / 2);
        return `<div class="msg-list-item msg-list-level-${level}"><span class="msg-list-num">${num}.</span> ${text}</div>`;
    });
    
    // Маркированные списки
    html = html.replace(/^(\s*)[\-\*•] (.+)$/gm, (match, indent, text) => {
        const level = Math.floor(indent.length / 2);
        return `<div class="msg-list-item msg-list-level-${level}"><span class="msg-bullet">•</span> ${text}</div>`;
    });
    
    // Сноски [^1]
    html = html.replace(/\[\^(\d+)\]/g, '<sup class="msg-footnote">[$1]</sup>');
    
    // Клавиши [[Ctrl]]
    html = html.replace(/\[\[([^\]]+)\]\]/g, '<kbd class="msg-kbd">$1</kbd>');
    
    // Спойлер ||text||
    html = html.replace(/\|\|(.+?)\|\|/g, '<span class="msg-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
    
    // Математика $formula$
    html = html.replace(/\$([^$]+)\$/g, '<span class="msg-math">$1</span>');
    
    // Прогресс-бар [====    ] 40%
    html = html.replace(/\[(=+)(\s*)\]\s*(\d+)%/g, (match, filled, empty, percent) => {
        return `<div class="msg-progress"><div class="msg-progress-bar" style="width: ${percent}%"></div><span>${percent}%</span></div>`;
    });
    
    // Цветной текст {red}text{/red}
    html = html.replace(/\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}(.+?)\{\/\1?\}/g, '<span style="color: $1">$2</span>');
    
    // Алерт-боксы
    html = html.replace(/^:::(\w+)\s*\n([\s\S]*?)^:::/gm, (match, type, content) => {
        return `<div class="msg-alert msg-alert-${type}">${content.trim()}</div>`;
    });
    
    // Переносы строк
    html = html.replace(/\n/g, '<br>');
    
    // Убираем лишние <br> после блочных элементов
    html = html.replace(/(<\/div>)<br>/g, '$1');
    html = html.replace(/(<\/h[1-4]>)<br>/g, '$1');
    html = html.replace(/(<\/pre>)<br>/g, '$1');
    html = html.replace(/(<\/table>)<br>/g, '$1');
    html = html.replace(/(<hr[^>]*>)<br>/g, '$1');
    
    return html;
}

// ==================== CHAT UI ====================
function appendMessage(role, content, save = true) {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    // Форматируем markdown только для assistant
    if (role === 'assistant') {
        msgDiv.innerHTML = formatMessageMarkdown(content);
    } else {
        msgDiv.textContent = content;
    }
    
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    if (save) {
        addToHistory(role, content);
    }
}

function appendToolCall(toolName, args) {
    if (!CONFIG.showToolCalls) return;
    
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message tool-call';
    msgDiv.textContent = `🔧 ${toolName}(${args.reason || ''})`;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function appendThinkingMessage(text) {
    removeThinkingMessage();
    
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message thinking';
    msgDiv.id = 'thinkingMessage';
    msgDiv.textContent = text;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function updateThinkingMessage(text) {
    const msg = document.getElementById('thinkingMessage');
    if (msg) {
        msg.textContent = text;
    } else {
        appendThinkingMessage(text);
    }
}

function removeThinkingMessage() {
    const msg = document.getElementById('thinkingMessage');
    if (msg) msg.remove();
}

function showTypingIndicator() {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatArea.appendChild(indicator);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function autoResizeTextarea() {
    const textarea = document.getElementById('messageInput');
    if (!textarea) return;
    
    const inputForm = textarea.closest('.input-form');
    
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = newHeight + 'px';
        
        if (inputForm) {
            inputForm.style.alignItems = textarea.value.trim().length > 0 ? 'flex-start' : 'flex-end';
        }
        
        const chatArea = document.getElementById('chatArea');
        if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
    });
    
    textarea.addEventListener('focus', () => {
        if (inputForm) inputForm.style.alignItems = 'flex-start';
        textarea.style.boxShadow = '0 -2px 10px rgba(233, 69, 96, 0.1)';
    });
    
    textarea.addEventListener('blur', () => {
        if (!textarea.value.trim() && inputForm) {
            inputForm.style.alignItems = 'flex-end';
            textarea.style.boxShadow = 'none';
        }
    });
    
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage(event);
    }
}

// ====================  VIA OPENROUTER (для приветствий и анализа) ====================
// Стриминг через OpenRouter с fallback по моделям
async function streamResponseOpenRouter(messages, onChunk, onComplete, options = {}) {
    const startingIndex = CONFIG.currentModelIndex;
    let lastError = null;
    
    while (CONFIG.currentModelIndex < CONFIG.openRouterModels.length) {
        const currentModel = getCurrentOpenRouterModel();
        
        try {
            const result = await streamResponseOpenRouterSingle(
                messages, currentModel, onChunk, onComplete, options
            );
            
            // Успех! Сбрасываем индекс
            resetModelIndex();
            return result;
            
        } catch (error) {
            lastError = error;
            console.error(`[OpenRouter Stream] Model ${currentModel} failed:`, error.message);
            
            if (isOverloadError(error)) {
                if (!switchToNextModel()) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
            
            throw error;
        }
    }
    
    CONFIG.currentModelIndex = 0;
    throw new Error(`All ${CONFIG.openRouterModels.length} models failed (stream). Last error: ${lastError?.message || 'Unknown'}`);
}

// Одиночный стриминг запрос к конкретной модели
async function streamResponseOpenRouterSingle(messages, model, onChunk, onComplete, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'Memory Chatbot'
    };
    
    let apiUrl;
    
    if (isLocal) {
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        const orKey = localStorage.getItem('my_openrouter_key');
        if (orKey) {
            headers['Authorization'] = `Bearer ${orKey}`;
        }
    } else {
        apiUrl = CONFIG.openrouterApiUrl;
    }
    
    const requestBody = {
        model: model,
        messages: messages,
        stream: true,
        ...options
    };
    
    console.log(`[OpenRouter Stream] Trying model: ${model}`);
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            
            if (trimmed.startsWith('data: ')) {
                try {
                    const json = JSON.parse(trimmed.slice(6));
                    
                    // Проверяем на ошибку в стриме
                    if (json.error) {
                        throw new Error(json.error.message || JSON.stringify(json.error));
                    }
                    
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                        fullText += content;
                        onChunk(fullText);
                    }
                } catch (e) {
                    // Если это ошибка парсинга JSON — игнорируем
                    // Если это ошибка от API — пробрасываем
                    if (e.message && !e.message.includes('JSON')) {
                        throw e;
                    }
                }
            }
        }
    }
    
    onComplete(fullText);
    return fullText;
}

// ==================== STREAMING RESPONSE (Hydra или OpenRouter fallback) ====================
// Стриминг: Hydra (если есть ключ) или OpenRouter с fallback
async function streamResponse(messages, onChunk, onComplete, options = {}) {
    const useHydra = hasValidHydraKey();
    
    if (useHydra) {
        // Hydra — одна модель, без fallback
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getHydraKey()}`,
            'HTTP-Referer': window.location.href,
            'X-Title': 'Memory Chatbot'
        };
        
        const requestBody = {
            model: CONFIG.model_chat,
            messages: messages,
            stream: true,
            ...options
        };
        
        console.log(`[Stream] Using Hydra API, model: ${CONFIG.model_chat}`);
        
        const response = await fetch(CONFIG.hydraApiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                
                if (trimmed.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const content = json.choices?.[0]?.delta?.content;
                        if (content) {
                            fullText += content;
                            onChunk(fullText);
                        }
                    } catch (e) {}
                }
            }
        }
        
        onComplete(fullText);
        return fullText;
        
    } else {
        // OpenRouter с fallback цепочкой
        console.log('[Stream] Using OpenRouter with fallback chain');
        return await streamResponseOpenRouter(messages, onChunk, onComplete, options);
    }
}

function createStreamingMessage() {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return null;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message assistant streaming';
    msgDiv.id = 'streamingMessage';
    chatArea.appendChild(msgDiv);
    
    // Скроллим ОДИН раз — чтобы показать начало сообщения
    chatArea.scrollTop = chatArea.scrollHeight;
    
    return msgDiv;
}

function updateStreamingMessage(element, content) {
    if (!element) return;
    
    element.innerHTML = formatMessageMarkdown(content);
    
    // НЕ скроллим во время стриминга — пусть юзер читает с начала
}

function finalizeStreamingMessage(element, content) {
    if (!element) return;
    
    element.classList.remove('streaming');
    element.removeAttribute('id');
    element.innerHTML = formatMessageMarkdown(content);
    
    addToHistory('assistant', content);
}

// ==================== RESPONSE ARCHETYPES & QUESTION POLICY ====================
function pickResponseArchetype() {
    const archetypes = [
        "Answer-first: start with the useful answer immediately, then (optionally) add a short memory-based observation.",
        "Reframe: offer an alternative interpretation using their traits/hypotheses, then give a concrete next step.",
        "Options: propose 2–3 options with trade-offs; minimal fluff, maximal clarity.",
        "Micro-plan: give a short plan (2–4 steps) tailored to what you know about them.",
        "Reality-check: gently challenge or test an assumption, grounded in what you know about them.",
        "Story/analogy: use a brief analogy that fits their known interests; keep it tight.",
        "Connector: link their current message to something from their past or a pattern you've noticed.",
        "Minimalist: a concise response that moves forward; no fluff, pure value."
    ];
    return archetypes[Math.floor(Math.random() * archetypes.length)];
}

function decideQuestionPolicyForThisTurn() {
    const askMode = askMeMode && isAskMeModeAvailable();
    const probability = askMode ? 0.85 : 0.12;
    const roll = Math.random();
    const shouldAsk = roll < probability;
    
    return {
        shouldAsk,
        probability,
        modeLabel: askMode ? "ASK_ME" : "STANDARD"
    };
}

// ==================== TWO-STAGE RESPONSE ARCHITECTURE ====================

function selectGapForQuestion() {
    const data = getGapsData();
    if (!data || !data.gaps || data.gaps.length === 0) return null;

    const highPriority = data.gaps.filter(g => g.priority === 'high');
    if (highPriority.length > 0) {
        return highPriority[Math.floor(Math.random() * highPriority.length)];
    }

    return data.gaps[Math.floor(Math.random() * data.gaps.length)];
}

// ==================== STAGE 1: CONTEXT COMPRESSION ====================

// ==================== STAGE 1: CONTEXT COMPRESSION ====================

// В ui.js заменяем функцию findRelevantContext
async function findRelevantContext(userMessage, history) {
    const allFacts = getFactsForPrompt(false);
    const allTraits = getTraitsForPrompt(false);
    const allHypotheses = getHypothesesForPrompt(false);
    const allTimeline = getTimelineForPrompt();
    const allSocial = getSocialForPrompt();
    const gaps = getGapsForPrompt();
    const style = localStorage.getItem(STORAGE_KEYS.style) || '';
    
    const recentHistory = history.slice(-10).map(m =>
        `${m.role.toUpperCase()}: ${m.content}`
    ).join('\n\n');
    
    const timeContext = getTimeContext();
    const timeInfo = formatTimeContextForPrompt(timeContext);
    
    const totalContextLength = [allFacts, allTraits, allHypotheses, allTimeline, allSocial, gaps, style]
        .filter(Boolean)
        .join('').length;
    
    if (totalContextLength < 2000) {
        return {
            compressed: false,
            facts: allFacts, traits: allTraits, timeline: allTimeline,
            social: allSocial, hypotheses: allHypotheses, style: style, gaps: gaps,
            microOpening: ''
        };
    }
    
    const langName = getLanguageName();
    
    const compressionPrompt = `You are a context preparation assistant. 

=== CURRENT USER MESSAGE ===
"${userMessage}"

=== RECENT CONVERSATION ===
${recentHistory || '(started)'}

=== FULL USER MEMORY ===
Facts: ${allFacts || '(none)'}
Traits: ${allTraits || '(none)'}
Timeline: ${allTimeline || '(none)'}
Social: ${allSocial || '(none)'}
Hypotheses: ${allHypotheses || '(none)'}
Style: ${style || '(none)'}

=== OUTPUT FORMAT ===
Respond in ${langName}. Use EXACTLY these two XML tags:

<micro_opening>
(A short 3-6 word "action/thought" reacting to the user's message. MUST read like an internal thought process or a quick reaction BEFORE answering. Examples: "Вспоминаю наши прошлые разговоры...", "Ого, неожиданно...", "Ищу связь с твоим характером...", "Обдумываю эту ситуацию...". Do NOT write a greeting or a direct answer.)
</micro_opening>

<context_dossier>
(Your compressed context analysis here)
</context_dossier>`;

    try {
        const response = await callAPIOpenRouter([{ role: "user", content: compressionPrompt }], true);
        const responseText = response.content || response;
        
        const microMatch = responseText.match(/<micro_opening>([\s\S]*?)<\/micro_opening>/i);
        const contextMatch = responseText.match(/<context_dossier>([\s\S]*?)<\/context_dossier>/i);
        
        return {
            compressed: true,
            fullContext: contextMatch ? contextMatch[1].trim() : responseText,
            microOpening: microMatch ? microMatch[1].trim() : '',
            originalSize: totalContextLength,
            compressedSize: (contextMatch ? contextMatch[1] : responseText).length
        };
    } catch (error) {
        return {
            compressed: false,
            facts: allFacts, traits: allTraits, timeline: allTimeline,
            social: allSocial, hypotheses: allHypotheses, style: style, gaps: gaps,
            microOpening: ''
        };
    }
}
// ==================== TWO-STAGE RESPONSE ARCHITECTURE ====================

// ==================== TWO-STAGE RESPONSE ARCHITECTURE ====================

// В ui.js заменяем функцию processMessageWithTwoStages
async function processMessageWithTwoStages(userMessage) {
    const history = getChatHistory();
    
    // 1. Показываем ЭХО с прошлого раза в статус-баре (сообщение-мысль)
    let echoText = localStorage.getItem('chatbot_next_echo') || 'Анализирую контекст...';
    if (!echoText.startsWith('💭') && !echoText.startsWith('🔍') && !echoText.startsWith('⚡')) {
        echoText = '💭 ' + echoText;
    }
    updateThinkingMessage(echoText);
    
    // 2. STAGE 1: Сбор контекста + "Прокашливание"
    const contextResult = await findRelevantContext(userMessage, history);
    
    // 3. Обновляем статус-бар на "Прокашливание" (реакцию-мысль)
    if (contextResult.microOpening) {
        let microText = contextResult.microOpening;
        if (!microText.startsWith('💭') && !microText.startsWith('🔍') && !microText.startsWith('⚡')) {
            microText = '⚡ ' + microText;
        }
        updateThinkingMessage(microText);
    }
    
    // 4. STAGE 2: Генерация основного ответа
    const streamingElement = createStreamingMessage();
    let finalAnswer = '';
    let nextEchoFound = '';
    
    try {
        const langName = getLanguageName();
        const archetype = pickResponseArchetype();
        const qp = decideQuestionPolicyForThisTurn();
        
        let contextBlock = contextResult.compressed && contextResult.fullContext ?
            `\n=== ПОДГОТОВЛЕННЫЙ КОНТЕКСТ ===\n${contextResult.fullContext}\n` :
            `\n=== CONTEXT ===\nFacts: ${contextResult.facts || '(none)'}\nTraits: ${contextResult.traits || '(none)'}`;
        
        let questionRule = qp.shouldAsk ?
            '\nМожешь закончить ОДНИМ вопросом к пользователю, если это уместно.' :
            '\nНе задавай вопросов в этом ответе.';
        
        // Заставляем вторую нейросеть выдать Эхо и Ответ в XML
        const systemPrompt = `Ты — персональный ИИ-ассистент, который ЗНАЕТ этого пользователя. Отвечай на ${langName}.
${contextBlock}
=== ПОДХОД К ОТВЕТУ ===
Архетип: ${archetype}
${questionRule}

=== ВАЖНОЕ ПРАВИЛО ФОРМАТИРОВАНИЯ ===
Твой ответ ДОЛЖЕН состоять из двух XML-блоков:

<next_echo>
(Короткая фраза от 1 лица (3-6 слов). Это "внутренний монолог", который бот покажет пользователю в СЛЕДУЮЩИЙ РАЗ, когда тот напишет сообщение, ПОКА бот будет думать. Примеры: "Размышляю над твоими словами...", "Ищу связи в памяти...", "Анализирую сказанное...". Зависит от того, чем закончился текущий разговор.)
</next_echo>

<answer>
(Твой основной, глубокий, персонализированный ответ пользователю. Текст без тегов внутри.)
</answer>

ВЫВОДИ ТОЛЬКО ЭТИ ДВА ТЕГА. НИКАКОГО ТЕКСТА СНАРУЖИ.`;
        
        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...history.slice(-8).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            { role: "user", content: userMessage }
        ];
        
        // Стриминг: мы должны фильтровать теги "на лету", чтобы юзер видел только <answer>
        let isInsideAnswer = false;
        let answerBuffer = '';
        let fullBuffer = '';
        
        await streamResponse(
            apiMessages,
            (partialText) => {
                fullBuffer = partialText;
                
                // Простая эвристика для стриминга (чтобы не показывать юзеру теги)
                if (fullBuffer.includes('<answer>')) {
                    isInsideAnswer = true;
                    answerBuffer = fullBuffer.split('<answer>')[1].replace('</answer>', '');
                    updateStreamingMessage(streamingElement, answerBuffer);
                } else if (!fullBuffer.includes('<next_echo>')) {
                    // Fallback: если ИИ проигнорировал XML (бывает), просто выводим текст
                    updateStreamingMessage(streamingElement, fullBuffer);
                }
            },
            (finalText) => {
                // Когда стрим завершён, вытаскиваем Эхо и финальный Ответ чисто
                const echoMatch = finalText.match(/<next_echo>([\s\S]*?)<\/next_echo>/i);
                const answerMatch = finalText.match(/<answer>([\s\S]*?)<\/answer>/i);
                
                nextEchoFound = echoMatch ? echoMatch[1].trim() : 'Ищу в памяти...';
                finalAnswer = answerMatch ? answerMatch[1].trim() : finalText.replace(/<[^>]+>/g, '').trim();
                
                finalizeStreamingMessage(streamingElement, finalAnswer);
                
                // Убираем статус-сообщение (мысль) только когда ответ полностью готов
                removeThinkingMessage();
                
                // Сохраняем новое Эхо на следующий ход
                if (nextEchoFound) {
                    localStorage.setItem('chatbot_next_echo', nextEchoFound);
                }
            }
        );
        
        return finalAnswer;
        
    } catch (error) {
        removeThinkingMessage();
        if (streamingElement) streamingElement.remove();
        console.error('[Stage2] Failed:', error.message);
        appendMessage('system', `Error: ${error.message}`);
        return null;
    }
}

function buildSystemPromptLegacy() {
    let prompt = CONFIG.baseSystemPrompt;
    const langName = getLanguageName();
    prompt += `\n\nIMPORTANT: Always respond in ${langName}.`;
    
    const style = localStorage.getItem(STORAGE_KEYS.style);
    if (style && style.trim()) {
        prompt += `\n\n=== COMMUNICATION STYLE ===\n${style}`;
    }
    
    return prompt;
}

// ==================== API REQUESTS ====================

// Вызов API через OpenRouter (для анализа, аналитики, приветствий)
// Вызов API через OpenRouter с автоматическим fallback по цепочке моделей
async function callAPIOpenRouter(messages, useAnalysisModel = false, tools = null) {
    const startingIndex = CONFIG.currentModelIndex;
    let lastError = null;
    
    // Пробуем все модели начиная с текущей
    while (CONFIG.currentModelIndex < CONFIG.openRouterModels.length) {
        const currentModel = getCurrentOpenRouterModel();
        
        try {
            const result = await callAPIOpenRouterSingle(messages, currentModel, tools);
            
            // Успех! Сбрасываем индекс на первую модель для следующих запросов
            resetModelIndex();
            return result;
            
        } catch (error) {
            lastError = error;
            console.error(`[OpenRouter] Model ${currentModel} failed:`, error.message);
            
            // Если это ошибка перегрузки — пробуем следующую модель
            if (isOverloadError(error)) {
                if (!switchToNextModel()) {
                    // Все модели исчерпаны
                    break;
                }
                // Небольшая пауза перед следующей попыткой
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
            
            // Если это другая ошибка (не перегрузка) — не переключаемся, просто выбрасываем
            throw error;
        }
    }
    
    // Все модели исчерпаны, сбрасываем индекс и выбрасываем последнюю ошибку
    CONFIG.currentModelIndex = 0;
    throw new Error(`All ${CONFIG.openRouterModels.length} models failed. Last error: ${lastError?.message || 'Unknown'}`);
}

// Одиночный вызов к конкретной модели OpenRouter (без fallback логики)
async function callAPIOpenRouterSingle(messages, model, tools = null) {
    const headers = {
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'Memory Chatbot'
    };
    
    let apiUrl;
    
    if (isLocal) {
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        const orKey = localStorage.getItem('my_openrouter_key');
        if (orKey) {
            headers['Authorization'] = `Bearer ${orKey}`;
        }
    } else {
        apiUrl = CONFIG.openrouterApiUrl; // /api/chat (server proxy)
    }
    
    const body = { model, messages };
    
    if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
    }
    
    console.log(`[API OpenRouter] Trying model: ${model}`);
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    // Проверяем на ошибку в теле ответа
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message;
    }
    
    if (data.choices && data.choices.length > 0 && data.choices[0].text) {
        return { content: data.choices[0].text, role: 'assistant' };
    }
    
    if (data.content) {
        return { content: data.content, role: 'assistant' };
    }
    
    throw new Error('Could not parse API response');
}

// Вызов API с приоритетом Hydra, fallback на OpenRouter
async function callAPIWithHydraFallback(messages, tools = null) {
    const useHydra = hasValidHydraKey();
    
    if (useHydra) {
        try {
            return await callAPIHydra(messages, tools);
        } catch (error) {
            console.error('[Hydra] Failed, falling back to OpenRouter:', error.message);
            return await callAPIOpenRouter(messages, false, tools);
        }
    } else {
        return await callAPIOpenRouter(messages, false, tools);
    }
}

// Прямой вызов Hydra API
async function callAPIHydra(messages, tools = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getHydraKey()}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'Memory Chatbot'
    };
    
    const body = { 
        model: CONFIG.model_chat, 
        messages 
    };
    
    if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
    }
    
    console.log(`[API Hydra] Model: ${CONFIG.model_chat}`);
    
    const response = await fetch(CONFIG.hydraApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message;
    }
    
    if (data.content) {
        return { content: data.content, role: 'assistant' };
    }
    
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }
    
    throw new Error('Could not parse Hydra API response');
}

// Legacy callAPI — теперь использует OpenRouter
async function callAPI(messages, tools = null, useAnalysisModel = false, retries = CONFIG.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[API] Attempt ${attempt}/${retries}`);
            return await callAPIOpenRouter(messages, useAnalysisModel, tools);
        } catch (error) {
            console.error(`[API] Attempt ${attempt} error:`, error.message);
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

async function callAPIWithoutLanguage(messages, retries = CONFIG.maxRetries) {
    return callAPI(messages, null, false, retries);
}

async function callAPIWithRetry(prompt, maxRetries = 2, useAnalysisModel = false) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await callAPIOpenRouter([{ role: "user", content: prompt }], useAnalysisModel);
            return response.content || response;
        } catch (error) {
            console.error(`[API Retry] Attempt ${attempt}/${maxRetries} failed:`, error.message);
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

function parseJSON(text) {
    try {
        let jsonStr = text;
        
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim();
        } else {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonStr = jsonMatch[0];
        }
        
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('[JSON Parse] FAILED:', error.message);
        console.error('[JSON Parse] Text was:', text.substring(0, 200));
        return null;
    }
}

// ==================== SEND MESSAGE ====================
async function sendMessage(event) {
    event.preventDefault();
    
    if (isProcessing) return;
    
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    isProcessing = true;
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.disabled = true;
    input.value = '';
    input.style.height = 'auto';
    
    appendMessage('user', message);
    
    try {
        // ===== TWO-STAGE PROCESSING WITH STREAMING =====
        await processMessageWithTwoStages(message);
        
        const counter = incrementMessageCounter();
        console.log(`[Counter] Messages: ${counter}`);
        
        // Background analysis
        runBackgroundAnalysis();
        
        if (shouldUpdateGaps()) {
            console.log('[Gaps] Updating...');
            runGapsUpdate();
        }
        
        updateAskMeModeUI();
        
        if (shouldUpdateStyle()) {
            console.log('[Style] Updating...');
            runStyleUpdate();
        }
        
        if (shouldUpdateHypotheses()) {
            console.log('[Hypotheses] Updating...');
            runHypothesesUpdate();
        }
        
    } catch (error) {
        removeThinkingMessage();
        const streamingMsg = document.getElementById('streamingMessage');
        if (streamingMsg) streamingMsg.remove();
        
        console.error('[Chat] Error:', error);
        appendMessage('system', `Error: ${error.message}`);
    } finally {
        isProcessing = false;
        if (sendBtn) sendBtn.disabled = false;
    }
}

// ==================== HELP MODAL ====================
function openHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'helpModal') closeHelpModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeHelpModal();
});

// ==================== API KEY SETTINGS (для всех пользователей) ====================
function initApiKeySettings() {
    const devBox = document.getElementById('dev-settings');
    if (!devBox) return;
    

  //  devBox.style.display = 'block';
    
    const savedKey = localStorage.getItem(STORAGE_KEYS.hydraKey);
    const statusSpan = document.getElementById('key-status');
    const input = document.getElementById('local-api-key');
    
    if (savedKey && input) {
        input.value = savedKey;
        if (statusSpan) statusSpan.innerText = "✅ Hydra key loaded";
    } else {
        if (statusSpan) statusSpan.innerText = "ℹ️ Using free model";
    }
}

window.saveLocalKey = function() {
    const input = document.getElementById('local-api-key');
    if (!input) return;
    
    const key = input.value.trim();
    const status = document.getElementById('key-status');
    
    if (!key) {
        // Очистка ключа
        localStorage.removeItem(STORAGE_KEYS.hydraKey);
        if (status) status.innerText = "ℹ️ Using free model";
        return;
    }
    
    if (key.startsWith('sk')) {
        localStorage.setItem(STORAGE_KEYS.hydraKey, key);
        if (status) status.innerText = "✅ Hydra key saved!";
    } else {
        if (status) status.innerText = "⚠️ Key should start with 'sk'";
    }
}

// ==================== DEBUG UTILITIES ====================
window.debugTwoStage = async function(message) {
    console.log('=== TWO-STAGE DEBUG ===');
    const history = getChatHistory();
    
    console.log('[Debug] Stage 1: Analyzing context...');
    const context = await findRelevantContext(message, history);
    console.log('[Debug] Context analysis result:', JSON.stringify(context, null, 2));
    
    console.log('[Debug] Stage 2: Would generate response with this context');
    return context;
};

window.debugMemory = function() {
    console.log('=== MEMORY DEBUG ===');
    console.log('Facts:', getFactsForPrompt());
    console.log('Traits:', getTraitsForPrompt());
    console.log('Timeline:', getTimelineForPrompt());
    console.log('Social:', getSocialForPrompt());
    console.log('Hypotheses:', getHypothesesForPrompt());
    console.log('Gaps:', getGapsForPrompt());
    console.log('Style:', localStorage.getItem(STORAGE_KEYS.style));
};

window.debugApiStatus = function() {
    console.log('=== API STATUS ===');
    console.log('Hydra key present:', hasValidHydraKey());
    console.log('Hydra key:', getHydraKey() ? '***' + getHydraKey().slice(-4) : 'none');
    console.log('isLocal:', isLocal);
    console.log('OpenRouter key (local):', localStorage.getItem('my_openrouter_key') ? 'present' : 'none');
};

// ==================== INITIALIZATION COMPLETE ====================
console.log('[ui.js] Loaded. Two-Stage Response Architecture with Hydra/OpenRouter support.');
console.log('[ui.js] Debug commands: debugTwoStage("message"), debugMemory(), debugApiStatus()');