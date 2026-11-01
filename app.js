// ==================== LANGUAGES ====================
const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'cs', name: 'Čeština', flag: '🇨🇿' }
];

// ==================== TRANSLATIONS ====================
const DEFAULT_TRANSLATIONS = {
    // API Section
    apiKeyTitle: "🔑 Ключ OpenRouter API",
    apiKeyPlaceholder: "Введите ваш ключ...",
    apiKeySaved: "✓ Ключ сохранён",
    
    // Buttons
    btnKnowledge: "📚 Знания о пользователе",
    btnClearChat: "Очистить чат",
    btnClearKnowledge: "Очистить знания",
    btnSend: "Отправить",
    btnClose: "✕ Закрыть",
    btnCancel: "Отмена",
    btnSave: "💾 Сохранить",
    
    // Counters
    counterCaption: "До обновления (сообщений):",
    counterStyle: "🎭 Стиль:",
    counterHypotheses: "💡 Гипотезы:",
    counterGaps: "🔍 Пробелы:",
    counterPersona: "🎭 Эмуляция:",
    
    // Main workspace
    brandSubtitle: "ЛИЧНЫЙ ИИ-АССИСТЕНТ",
    navMain: "ПРОСТРАНСТВО",
    navChat: "Чат с Memory",
    navMemory: "Моя память",
    navSelf: "Самопознание",
    navDating: "Знакомства",
    navDialogs: "Диалоги",
    navReports: "Отчёты",
    navOther: "ДОПОЛНИТЕЛЬНО",
    navHelp: "Как это работает",
    navSettings: "Настройки",
    settingsTitle: "Настройки",
    settingsInsight: "Режим инсайтов",
    settingsSmart: "Умный режим",
    settingsModel: "Модель",
    settingsPersona: "Эмуляция личности",
    settingsPersonaPrompt: "Промпт правила",
    sidebarPrivacyTitle: "Всё под контролем",
    sidebarPrivacyText: "Память хранится в этом браузере",
    sidebarFooter: "ВАШЕ ЛИЧНОЕ ПРОСТРАНСТВО",
    workspaceTitle: "Личный чат",
    workspaceSubtitle: "Пространство для ваших мыслей",
    workspaceMemory: "Память в браузере",
    heroEyebrow: "ВАШ ЛИЧНЫЙ ИИ-СОБЕСЕДНИК",
    heroTitle: "Привет, я Memory.",
    heroTitleAccent: "Давайте познакомимся.",
    heroDescription: "Я запоминаю важное из наших разговоров, чтобы лучше понимать вас. Начните с любой мысли — я рядом.",
    heroAction: "Начать разговор",
    askMeShort: "Спроси меня",
    composerPrivacy: "Память сохраняется в этом браузере",
    composerShortcut: "Enter — отправить · Shift + Enter — новая строка",
    contextHeading: "ВАШЕ ПРОСТРАНСТВО",
    contextTitle: "Всё о вас",
    memoryLabel: "ЛИЧНАЯ ПАМЯТЬ",
    memoryEmptyTag: "Пока пусто",
    memoryFilledTag: "Есть записи",
    memoryCardTitle: "Память о вас",
    memoryEmptySummary: "Здесь появится важное из ваших разговоров. Расскажите немного о себе.",
    memoryFilledSummary: "Здесь собрано важное из ваших разговоров. Вы можете просмотреть и удалить записи.",
    memoryFactsLabel: "фактов",
    memoryTraitsLabel: "черт",
    memoryEventsLabel: "событий",
    memoryOpen: "Открыть память",
    quickHeading: "ИССЛЕДУЙТЕ",
    quickSelf: "Самопознание",
    quickSelfText: "Узнайте себя лучше",
    quickReports: "Отчёты",
    quickReportsText: "Новый взгляд на себя",
    contextPrivacy: "Вы можете просмотреть и удалить сохранённые знания в любой момент.",

    // Ask Me Mode
    askMeMode: "Режим 'Спроси меня'",
    askMeModeTooltip: "ИИ будет заканчивать ответы вопросами, чтобы узнать о вас больше",
    askMeModeDisabled: "Нужны сначала пробелы в знаниях (подождите 6 сообщений)",
    
    // Persona Mode
    personaModeEnabled: "Эмуляция личности включена",
    personaModeDisabled: "Эмуляция личности выключена (обычный стиль)",
    
    // Chat
    welcomeMessage: "Привет! Я ваш персональный помощник. Расскажите о себе, и я запомню важную информацию.",
    inputPlaceholder: "Напишите о чём угодно...",
    thinkingMessage: "💭 Запоминаю информацию о вас...",
    chatCleared: "Чат очищен. История удалена.",
    chatConnectionError: "Не удалось получить ответ. Проверьте подключение и настройки ИИ, затем попробуйте ещё раз.",
    chatBusyClear: "Дождитесь окончания ответа, чтобы очистить чат.",
    greetingThinking: "Готовлю приветствие…",
    greetingUnavailable: "Не удалось получить приветствие. Проверьте подключение и настройки ИИ.",
    
    // Modal
    modalTitle: "📚 База знаний",
    insightMode: "Режим инсайтов",
    personaMode: "Эмуляция личности",
    
    // Tabs
    tabFacts: "📋 Факты",
    tabTraits: "🧠 Черты личности",
    tabTimeline: "📅 Хронология",
    tabSocial: "👥 Социальные связи",
    tabStyle: "🎭 Стиль общения",
    tabHypotheses: "💡 Гипотезы",
    tabGaps: "🔍 Белые пятна",
    tabPersonaPrompt: "🎭 Промпт личности",
    tabPersonaNotes: "📝 Заметки личности",
    
    // Tab Info
    styleInfo: "<strong>ℹ️ Стиль общения</strong> — автоматически генерируется каждые 10 сообщений на основе анализа черт личности. Вы можете редактировать настройки вручную.",
    hypothesesInfo: "<strong>💡 Гипотезы</strong> — неочевидные инсайты о вас, генерируются каждые 16 сообщений. Основаны на анализе фактов, черт и хронологии. Только для чтения.",
    socialInfo: "<strong>👥 Социальные связи</strong> — люди, упомянутые в ваших беседах. Нажмите на контакт, чтобы увидеть его профиль.",
    gapsInfo: "<strong>🔍 Белые пятна</strong> — важные темы о вас, которые остаются неизвестными. Обновляются каждые 6 сообщений. Только для чтения.",
    personaPromptInfo: "<strong>🎭 Промпт личности</strong> — текстовое правило, которое бот должен имитировать в диалоге. Вы можете написать его вручную.",
    personaNotesInfo: "<strong>📝 Заметки личности</strong> — бот сам пишет заметки о личности каждые 5 сообщений пользователя, чтобы история и личность расширялись.",
    factsInfo: "<strong>📋 Факты</strong> — конкретная информация о вас: имя, работа, интересы, предпочтения. Каждый факт подтверждён цитатами.",
    traitsInfo: "<strong>🧠 Черты личности</strong> — ваши психологические особенности, стиль мышления, ценности. Могут объединяться в сложные характеристики.",
    timelineInfo: "<strong>📅 Хронология</strong> — события вашей жизни, текущие периоды, планы на будущее.",
    
    // Placeholders
    placeholderEmpty: "Пока здесь пусто. Расскажите о себе в чате — важные детали появятся здесь.",
    placeholderFacts: "Факты о пользователе будут накапливаться здесь...",
    placeholderTraits: "Черты личности будут накапливаться здесь...",
    placeholderTimeline: "Хронология жизни будет здесь...",
    placeholderStyle: "Настройки стиля общения бота будут здесь...",
    placeholderHypotheses: "Неочевидные гипотезы о вас появятся здесь...",
    placeholderGaps: "Важные неизвестные темы появятся здесь...",
    placeholderPersonaPrompt: "Напишите правило эмуляции личности (например: «Ты — Шерлок Холмс, анализируй всё»)...",
    placeholderPersonaNotes: "Здесь появятся заметки о личности, которые бот будет писать каждые 5 сообщений...",
    
    // Social Tab
    noContactSelected: "← Выберите контакт для просмотра деталей",
    noContacts: "Пока нет контактов. Упоминайте людей в беседах!",
    contactFacts: "Факты",
    contactTraits: "Личность",
    contactInteractions: "Взаимодействия",
    contactRelation: "Отношение",
    contactSentiment: "Настроение",
    contactLastMentioned: "Последнее упоминание",
    contactCreated: "Первое упоминание",
    evidenceLabel: "На основе",
    
    // Indicators
    unsavedChanges: "⚠️ Несохранённые изменения",
    readOnly: "🔒 Только чтение",
    
    // Confirmations
    confirmClearChat: "Очистить историю чата?",
    confirmClearKnowledge: "Очистить ВСЕ накопленные знания о пользователе?",
    confirmUnsavedClose: "Есть несохранённые изменения. Закрыть без сохранения?",
    confirmUnsavedSwitch: "Есть несохранённые изменения. Переключить вкладку без сохранения?",
    
    // Help Modal
    helpTitle: "🧠 Чат-бот с памятью",
    helpWhatIs: "Что это?",
    helpWhatIsText: "Персональный AI-ассистент, который <strong>запоминает</strong> информацию о вас.",
    helpWhatRemembers: "Что он запоминает?",
    helpFacts: "Факты — имя, работа, интересы, предпочтения",
    helpTraits: "Черты личности — как вы думаете, что цените",
    helpTimeline: "Хронология — события, планы, важные даты",
    helpPeople: "Люди — семья, друзья, коллеги",
    helpInsights: "Инсайты — паттерны и наблюдения",
    helpAskMe: "Режим 'Спроси меня'",
    helpAskMeText: "Включите переключатель — бот будет задавать вопросы, чтобы узнать вас лучше.",
    helpPersona: "Эмуляция личности",
    helpPersonaText: "Бот имитирует личность по вашему промпту. Заметки обновляются каждые 5 сообщений.",
    helpPrivacy: "Приватность",
    helpPrivacyText1: "Все данные хранятся только на вашем устройстве.",
    helpPrivacyText2: "Автор бота не может прочитать вашу переписку.",
    helpPrivacyText3: "Сообщения обрабатываются через OpenRouter.",
    helpPrivacyText4: "Нажмите 'Очистить знания' чтобы удалить всё.",
    helpRoadmap: "Что дальше?",
    helpRoadmapSync: "Синхронизация между устройствами",
    helpRoadmapExport: "Экспорт/импорт базы знаний",
    helpRoadmapSettings: "Больше настроек",
    helpRoadmapMobile: "Мобильное приложение",
    helpAuthor: "Автор",
    helpVersion: "Версия 1.3 · 2025",
    
    // Alerts
    alertNoApiKey: "Пожалуйста, введите ваш ключ OpenRouter API",
    alertKnowledgeCleared: "Знания очищены",
    
    // TTS — озвучка ответов бота (HeyGen Voice Turbo)
    ttsSpeak: "Озвучить",
    ttsStop: "Остановить",
    ttsLoading: "Готовлю…",
    ttsStatusLoading: "Озвучиваю ответ…",
    ttsTruncated: "Текст длинный — озвучу только первую часть",
    ttsErrNothing: "Здесь нечего озвучивать",
    ttsErrEmpty: "Модель вернула слишком короткое аудио — попробуйте ещё раз",
    ttsErrPlayback: "Не удалось воспроизвести аудио",
    ttsErrRateLimit: "Слишком часто: у бесплатной модели лимит ~20 запросов в минуту. Подождите немного и попробуйте снова.",
    ttsErrEnded: "Бесплатный доступ к модели озвучки закончился (он был до 30.11.2026).",
    ttsErrNoKey: "На сервере не задан ключ OPENROUTER_API_KEY — озвучка недоступна.",
    ttsErrForbidden: "Доступ к модели озвучки запрещён.",
    ttsErrNetwork: "Ошибка озвучки",
    settingsTtsVoice: "Голос озвучки",
    settingsTtsVoiceHint: "Голос для кнопки «Озвучить» в ответах бота (HeyGen Voice Turbo, бесплатно до 30.11.2026).",
    
    // Structured data labels
    labelSuperseded: "устарело",
    labelOngoing: "продолжается",
    labelPlan: "план",
    labelEvent: "событие",
    labelPeriod: "период"
};

// ==================== STORAGE KEYS ====================
const STORAGE_KEYS = {
    apiKey: "memory_chatbot_api_key",
    language: "memory_chatbot_language",
    insightMode: "memory_chatbot_insight_mode",
    smartMode: "memory_chatbot_smart_mode",
    model: "memory_chatbot_model",
    ttsVoice: "memory_chatbot_tts_voice",
    
    // Knowledge storage keys
    facts: "memory_chatbot_facts",
    traits: "memory_chatbot_traits",
    timeline: "memory_chatbot_timeline",
    social: "memory_chatbot_social",
    style: "memory_chatbot_style",
    hypotheses: "memory_chatbot_hypotheses",
    gaps: "memory_chatbot_gaps",
    
    // Counters
    styleCounter: "memory_chatbot_style_counter",
    hypothesesCounter: "memory_chatbot_hypotheses_counter",
    gapsCounter: "memory_chatbot_gaps_counter",
    
    // Persona Emulation Mode
    personaMode: "memory_chatbot_persona_mode",
    personaPrompt: "memory_chatbot_persona_prompt",
    personaNotes: "memory_chatbot_persona_notes",
    personaCounter: "memory_chatbot_persona_counter",
    
    // Chat history
    chatHistory: "memory_chatbot_chat_history",
    
    // Ask Me Mode
    askMeMode: "memory_chatbot_ask_me_mode"
};

// ==================== CONFIGURATION ====================
const CONFIG = {
    styleUpdateInterval: 10, // messages
    hypothesesUpdateInterval: 16, // messages
    gapsUpdateInterval: 6, // messages
    personaNotesUpdateInterval: 5, // messages
    
    // API defaults
    defaultModel: "openai/gpt-4o-mini",
    defaultLanguage: "ru",
    
    // TTS defaults
    defaultTtsVoice: "heygen_voice_turbo",
    
    // Prompt templates
    systemPromptBase: "Ты — Memory, персональный AI-ассистент, который запоминает информацию о пользователе. Используй накопленные знания для ответов. Твоя цель — помогать пользователю, анализировать его мысли и вести диалог, учитывая контекст.",
    
    // Persona Emulation System Prompt template
    personaSystemPromptTemplate: "Ты — Memory, персональный AI-ассистент. Твоя задача — имитировать личность по правилу: {{personaPrompt}}. Используй накопленные знания, включая заметки личности: {{personaNotes}}. Твои ответы должны соответствовать правилу, но при этом оставаться полезными и дружелюбными. Включай контекст из памяти пользователя.",
    
    // Style update prompts
    styleUpdatePrompt: "Проанализируй черты личности пользователя и сгенерируй новый стиль общения. Формат: [название стиля] — [описание]. Максимум 200 символов.",
    
    // Hypotheses update prompts
    hypothesesUpdatePrompt: "Проанализируй факты, черты личности и хронологию. Сгенерируй 3-5 неочевидных гипотез о пользователе. Формат: [гипотеза] — [основание].",
    
    // Gaps update prompts
    gapsUpdatePrompt: "Проанализируй знания о пользователе. Выдели 3-5 важных тем, о которых пока мало информации. Формат: [тема] — [почему важно].",
    
    // Persona Notes update prompt
    personaNotesUpdatePrompt: "Проанализируй последние сообщения и правила эмуляции личности ({{personaPrompt}}). Напиши 1-2 короткие заметки о личности, которые расширят историю и идентичность. Формат: [заметка].",
    
    // Ask Me Mode prompt addition
    askMeModePromptAddition: "\n\nВ конце ответа задай вопрос, чтобы узнать пользователя лучше. Используй пробелы в знаниях ({{gaps}}) как основу для вопросов.",
    
    // TTS limits
    ttsMaxCharacters: 1500,
    ttsRateLimitPerMinute: 20
};

// ==================== UTILITY FUNCTIONS ====================
function getStorageKey(key) {
    return STORAGE_KEYS[key] || `memory_chatbot_${key}`;
}

function saveToStorage(key, value) {
    localStorage.setItem(getStorageKey(key), JSON.stringify(value));
}

function loadFromStorage(key, defaultValue = null) {
    const value = localStorage.getItem(getStorageKey(key));
    return value ? JSON.parse(value) : defaultValue;
}

function clearStorage(key) {
    localStorage.removeItem(getStorageKey(key));
}

function clearAllKnowledge() {
    const knowledgeKeys = [
        "facts", "traits", "timeline", "social", "style", 
        "hypotheses", "gaps", "styleCounter", "hypothesesCounter", 
        "gapsCounter", "personaMode", "personaPrompt", "personaNotes", "personaCounter"
    ];
    knowledgeKeys.forEach(key => clearStorage(key));
}

// ==================== KNOWLEDGE MANAGEMENT ====================
function getKnowledge(type) {
    return loadFromStorage(type, []);
}

function setKnowledge(type, data) {
    saveToStorage(type, data);
}

function addKnowledgeItem(type, item) {
    const data = getKnowledge(type);
    data.push(item);
    setKnowledge(type, data);
    return data;
}

function updateKnowledgeItem(type, index, newItem) {
    const data = getKnowledge(type);
    if (index >= 0 && index < data.length) {
        data[index] = newItem;
        setKnowledge(type, data);
    }
    return data;
}

function removeKnowledgeItem(type, index) {
    const data = getKnowledge(type);
    if (index >= 0 && index < data.length) {
        data.splice(index, 1);
        setKnowledge(type, data);
    }
    return data;
}

// ==================== PERSONA EMULATION HELPERS ====================
function getPersonaMode() {
    return loadFromStorage("personaMode", false);
}

function setPersonaMode(enabled) {
    saveToStorage("personaMode", enabled);
}

function getPersonaPrompt() {
    return loadFromStorage("personaPrompt", "");
}

function setPersonaPrompt(prompt) {
    saveToStorage("personaPrompt", prompt);
}

function getPersonaNotes() {
    return loadFromStorage("personaNotes", []);
}

function setPersonaNotes(notes) {
    saveToStorage("personaNotes", notes);
}

function addPersonaNote(note) {
    const notes = getPersonaNotes();
    notes.push({ text: note, timestamp: Date.now() });
    setPersonaNotes(notes);
    return notes;
}

function getPersonaCounter() {
    return loadFromStorage("personaCounter", 0);
}

function incrementPersonaCounter() {
    const counter = getPersonaCounter() + 1;
    saveToStorage("personaCounter", counter);
    return counter;
}

function resetPersonaCounter() {
    saveToStorage("personaCounter", 0);
}

// ==================== COUNTER MANAGEMENT ====================
function getCounter(type) {
    return loadFromStorage(`${type}Counter`, 0);
}

function incrementCounter(type) {
    const counter = getCounter(type) + 1;
    saveToStorage(`${type}Counter`, counter);
    return counter;
}

function resetCounter(type) {
    saveToStorage(`${type}Counter`, 0);
}

function shouldUpdate(type) {
    const counter = getCounter(type);
    const interval = CONFIG[`${type}UpdateInterval`];
    return counter >= interval;
}

// ==================== CHAT HISTORY ====================
function getChatHistory() {
    return loadFromStorage("chatHistory", []);
}

function addToChatHistory(message) {
    const history = getChatHistory();
    history.push(message);
    saveToStorage("chatHistory", history);
    return history;
}

function clearChatHistory() {
    clearStorage("chatHistory");
}

// ==================== API & MODEL ====================
function getApiKey() {
    return loadFromStorage("apiKey", "");
}

function setApiKey(key) {
    saveToStorage("apiKey", key);
}

function getLanguage() {
    return loadFromStorage("language", CONFIG.defaultLanguage);
}

function setLanguage(lang) {
    saveToStorage("language", lang);
}

function getInsightMode() {
    return loadFromStorage("insightMode", false);
}

function setInsightMode(enabled) {
    saveToStorage("insightMode", enabled);
}

function getSmartMode() {
    return loadFromStorage("smartMode", false);
}

function setSmartMode(enabled) {
    saveToStorage("smartMode", enabled);
}

function getModel() {
    return loadFromStorage("model", CONFIG.defaultModel);
}

function setModel(model) {
    saveToStorage("model", model);
}

function getTtsVoice() {
    return loadFromStorage("ttsVoice", CONFIG.defaultTtsVoice);
}

function setTtsVoice(voice) {
    saveToStorage("ttsVoice", voice);
}

function getAskMeMode() {
    return loadFromStorage("askMeMode", false);
}

function setAskMeMode(enabled) {
    saveToStorage("askMeMode", enabled);
}

// ==================== TRANSLATIONS ====================
function getTranslation(key, lang = getLanguage()) {
    // In production, load translations for the selected language
    // For now, return from DEFAULT_TRANSLATIONS
    return DEFAULT_TRANSLATIONS[key] || key;
}

// ==================== INITIALIZATION ====================
function init() {
    // Load language
    const lang = getLanguage();
    const langObj = LANGUAGES.find(l => l.code === lang);
    if (!langObj) {
        setLanguage(CONFIG.defaultLanguage);
    }
    
    // Initialize counters if not set
    const counters = ["style", "hypotheses", "gaps", "persona"];
    counters.forEach(type => {
        if (getCounter(type) === null) {
            resetCounter(type);
        }
    });
    
    // Initialize persona mode
    if (getPersonaMode() === null) {
        setPersonaMode(false);
    }
    
    // Initialize persona prompt
    if (getPersonaPrompt() === null) {
        setPersonaPrompt("");
    }
    
    // Initialize persona notes
    if (getPersonaNotes() === null) {
        setPersonaNotes([]);
    }
    
    // Initialize persona counter
    if (getPersonaCounter() === null) {
        resetPersonaCounter();
    }
    
    // Initialize Ask Me Mode
    if (getAskMeMode() === null) {
        setAskMeMode(false);
    }
}

// Run initialization
init();

// Export for UI access
window.MemoryChatbot = {
    LANGUAGES,
    DEFAULT_TRANSLATIONS,
    STORAGE_KEYS,
    CONFIG,
    getStorageKey,
    saveToStorage,
    loadFromStorage,
    clearStorage,
    clearAllKnowledge,
    getKnowledge,
    setKnowledge,
    addKnowledgeItem,
    updateKnowledgeItem,
    removeKnowledgeItem,
    getPersonaMode,
    setPersonaMode,
    getPersonaPrompt,
    setPersonaPrompt,
    getPersonaNotes,
    setPersonaNotes,
    addPersonaNote,
    getPersonaCounter,
    incrementPersonaCounter,
    resetPersonaCounter,
    getCounter,
    incrementCounter,
    resetCounter,
    shouldUpdate,
    getChatHistory,
    addToChatHistory,
    clearChatHistory,
    getApiKey,
    setApiKey,
    getLanguage,
    setLanguage,
    getInsightMode,
    setInsightMode,
    getSmartMode,
    setSmartMode,
    getModel,
    setModel,
    getTtsVoice,
    setTtsVoice,
    getAskMeMode,
    setAskMeMode,
    getTranslation
};
