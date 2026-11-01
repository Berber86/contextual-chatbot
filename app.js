// app.js - основная логика для Memory Chatbot
// Все функции глобальные

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
    navGoals: "Цели",
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
    settingsPersonaPrompt: "Промпт личности",
    settingsPersonaHint: "Бот будет отвечать в образе из промпта личности. Заметки об образе обновляются каждые 5 сообщений.",
    settingsPersonaEmpty: "Сначала напишите промпт личности — без него эмуляция не включается.",
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

    // Persona Emulation (🎭 Эмуляция личности)
    personaModeOn: "Эмуляция включена",
    personaModeOff: "Обычный стиль",
    personaModeNoPrompt: "Нужен промпт личности",
    personaNotesNext: "Следующая заметка через",
    personaNotesUnit: "сообщ.",
    personaNotesEmpty: "Заметок пока нет. Продолжайте разговор — первая появится через 5 сообщений после включения эмуляции.",
    personaKindTrait: "черта",
    personaKindStyle: "стиль",
    personaKindTheme: "тема",
    personaKindPreference: "предпочтение",
    personaKindOther: "наблюдение",

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
    factsInfo: "<strong>📋 Факты</strong> — конкретная информация о вас: имя, работа, интересы, предпочтения. Каждый факт подтверждён цитатами.",
    traitsInfo: "<strong>🧠 Черты личности</strong> — ваши психологические особенности, стиль мышления, ценности. Могут объединяться в сложные характеристики.",
    timelineInfo: "<strong>📅 Хронология</strong> — события вашей жизни, текущие периоды, планы на будущее.",
    personaPromptInfo: "<strong>🎭 Промпт личности</strong> — роль, в образе которой бот отвечает в чате. Опишите характер, манеру речи и привычки. Пока промпт пуст, эмуляция выключена.",
    personaNotesInfo: "<strong>📝 Заметки личности</strong> — бот сам записывает наблюдения об образе каждые 5 сообщений: как проявляется роль, что уже получается, что стоит усилить. Только для чтения.",
    
    // Placeholders
    placeholderEmpty: "Пока здесь пусто. Расскажите о себе в чате — важные детали появятся здесь.",
    placeholderFacts: "Факты о пользователе будут накапливаться здесь...",
    placeholderTraits: "Черты личности будут накапливаться здесь...",
    placeholderTimeline: "Хронология жизни будет здесь...",
    placeholderStyle: "Настройки стиля общения бота будут здесь...",
    placeholderHypotheses: "Неочевидные гипотезы о вас появятся здесь...",
    placeholderSocial: "Люди из вашей жизни появятся здесь...",
    placeholderGaps: "Важные неизвестные темы появятся здесь...",
    placeholderPersonaPrompt: "Например: «Ты — Шерлок Холмс: замечай мельчайшие детали, говори сухо и точно, строй выводы из наблюдений»...",
    placeholderPersonaNotes: "Заметки об образе появятся через 5 сообщений после включения эмуляции...",
    
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
    helpPersonaText: "Напишите роль в «Промпте личности» и включите переключатель — бот будет отвечать в этом образе. Заметки об образе обновляются каждые 5 сообщений.",
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

let currentLanguage = 'ru';
let translations = { ...DEFAULT_TRANSLATIONS };

// ==================== STORAGE KEYS ====================
const STORAGE_KEYS = {
    apiKey: 'chatbot_api_key',
    hydraKey: 'chatbot_hydra_key', // ← ДОБАВИТЬ
    smartMode: 'chatbot_smart_mode', // умный режим (платный провайдер через /api/hydra)
    memoryProvider: 'chatbot_memory_provider',
    chatModel: 'chatbot_chat_model', // выбранная платная модель (hydra-gemini-3-pro | glm-5.2)
    ttsVoice: 'chatbot_tts_voice', // голос озвучки ответов бота (HeyGen Voice Turbo)
    insightModePref: 'chatbot_insight_mode', // выбор пользователя для insight mode
    chatHistory: 'chatbot_chat_history',

    facts: 'chatbot_knowledge_facts',
    traits: 'chatbot_knowledge_traits',
    timeline: 'chatbot_knowledge_timeline',
    style: 'chatbot_communication_style',
    hypotheses: 'chatbot_hypotheses',
    social: 'chatbot_social_connections',
    gaps: 'chatbot_knowledge_gaps',
    messageCounter: 'chatbot_message_counter',
    language: 'chatbot_language',
    translations: 'chatbot_translations',

    // Эмуляция личности (🎭): режим, промпт-роль, заметки об образе и счётчик сообщений
    personaMode: 'chatbot_persona_mode',
    personaPrompt: 'chatbot_persona_prompt',
    personaNotes: 'chatbot_persona_notes',
    personaCounter: 'chatbot_persona_counter',

    // Цели (🎯): цели пользователя, самоотчёты по ним и настройки коучинга
    goals: 'chatbot_goals',
    goalCheckins: 'chatbot_goal_checkins',
    coachProfile: 'chatbot_coaching_profile'
};

// ==================== LIMITS ====================
const LIMITS = {
    facts: 100,
    traits: 50,
    timeline: 50,
    social: 20,
    hypotheses: 10,
    gaps: 5,
    evidencePerItem: 3,
    personaNotes: 20
};

// ==================== PERSONA EMULATION CONFIG ====================
const PERSONA_CONFIG = {
    notesInterval: 5,        // заметка об образе каждые N сообщений пользователя
    maxNotes: LIMITS.personaNotes,
    historyWindow: 10,       // сколько последних сообщений видит генератор заметок
    promptLimit: 2000,       // максимальная длина промпта личности
    notesInPrompt: 5         // сколько свежих заметок попадает в системный промпт
};

// Виды заметок: ключ → иконка и ключ перевода подписи
const PERSONA_NOTE_KINDS = {
    trait: { icon: '🧠', labelKey: 'personaKindTrait' },
    style: { icon: '🎭', labelKey: 'personaKindStyle' },
    theme: { icon: '🧵', labelKey: 'personaKindTheme' },
    preference: { icon: '💛', labelKey: 'personaKindPreference' }
};
const PERSONA_DEFAULT_KIND = { icon: '🔎', labelKey: 'personaKindOther' };

// ==================== CONTEXT FILTERING CONFIG ====================
const CONTEXT_FILTER_CONFIG = {
    FACTS_INCLUSION_CHANCE: 90,      // % шанс включения каждого факта
    TRAITS_INCLUSION_CHANCE: 90,     // % шанс включения каждой черты
    HYPOTHESES_INCLUSION_CHANCE: 90  // % шанс включения каждой гипотезы
};

// ==================== CONFIDENCE LEVELS ====================
const CONFIDENCE_LEVELS = ['low', 'medium', 'high', 'verified'];

const CONFIDENCE_EMOJI = {
    low: '🔴',
    medium: '🟡',
    high: '🟢',
    verified: '✅'
};

// ==================== KNOWLEDGE CATEGORIES ====================
const CATEGORY_NAMES = {
    facts: 'facts about the user',
    traits: 'user personality traits',
    timeline: 'user life timeline',
    social: 'social connections and people in user life',
    style: 'communication style settings',
    hypotheses: 'hypotheses about the user',
    gaps: 'knowledge gaps and unexplored topics'
};

// Read-only tabs (cannot be edited manually)
const READONLY_TABS = ['hypotheses', 'gaps', 'facts', 'traits', 'timeline', 'social'];

// ==================== STATE VARIABLES ====================
let isProcessing = false;
let currentTab = 'facts';
let originalTabContent = '';
let hasUnsavedChanges = false;
let askMeMode = false;
let insightMode = localStorage.getItem(STORAGE_KEYS.insightModePref) !== '0'; // по умолчанию ВКЛ

// ==================== LANGUAGE FUNCTIONS ====================
function loadLanguage() {
    const savedLang = localStorage.getItem(STORAGE_KEYS.language);
    if (savedLang) {
        currentLanguage = savedLang;
        const cachedTranslations = localStorage.getItem(`${STORAGE_KEYS.translations}_${savedLang}`);
        if (cachedTranslations) {
            translations = JSON.parse(cachedTranslations);
        }
    } else {
        currentLanguage = 'ru';
        translations = { ...DEFAULT_TRANSLATIONS };
    }
    applyTranslations();
}

async function selectLanguage(langCode) {
    if (langCode === currentLanguage) return;

    const lang = LANGUAGES.find(l => l.code === langCode);
    if (!lang) return;

    // Russian is the built-in source language and never needs an API translation.
    if (langCode === 'ru') {
        translations = { ...DEFAULT_TRANSLATIONS };
        currentLanguage = 'ru';
        localStorage.setItem(STORAGE_KEYS.language, 'ru');
        applyTranslations();
        return;
    }

    const cachedTranslations = localStorage.getItem(`${STORAGE_KEYS.translations}_${langCode}`);
    
    if (cachedTranslations) {
        translations = JSON.parse(cachedTranslations);
        currentLanguage = langCode;
        localStorage.setItem(STORAGE_KEYS.language, langCode);
        applyTranslations();
        return;
    }

    if (!getApiKey()) {
        alert('Please enter API key first to translate interface');
        return;
    }

    await translateInterface(langCode);
}

async function translateInterface(langCode) {
    const lang = LANGUAGES.find(l => l.code === langCode);
    
    const overlay = document.getElementById('translatingOverlay');
    document.getElementById('translatingText').textContent = `Translating to ${lang.name}...`;
    overlay.classList.add('active');

    try {
        const prompt = `Translate the following UI texts to ${lang.name} (${langCode}). 
Return ONLY a valid JSON object with the same keys but translated values.
Keep emojis in place. Preserve HTML tags like <strong>.
Do not add any explanation, just the JSON.

${JSON.stringify(DEFAULT_TRANSLATIONS, null, 2)}`;

        const response = await callAPIWithoutLanguage([{ role: "user", content: prompt }]);
        const responseText = response.content || response;
        
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        
        const newTranslations = JSON.parse(jsonStr);
        
        localStorage.setItem(`${STORAGE_KEYS.translations}_${langCode}`, JSON.stringify(newTranslations));
        
        translations = newTranslations;
        currentLanguage = langCode;
        localStorage.setItem(STORAGE_KEYS.language, langCode);
        
        applyTranslations();
        
    } catch (error) {
        console.error('[Language] Translation error:', error);
        alert(`Translation failed: ${error.message}`);
    } finally {
        overlay.classList.remove('active');
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = translations[key] || DEFAULT_TRANSLATIONS[key];
        if (value) {
            if (key.endsWith('Info')) {
                el.innerHTML = value;
            } else {
                el.textContent = value;
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const value = translations[key] || DEFAULT_TRANSLATIONS[key];
        if (value) el.placeholder = value;
    });

    document.documentElement.lang = currentLanguage;
    if (typeof window.refreshMemoryOverview === 'function') window.refreshMemoryOverview();

    if (currentTab) {
        updateTabPlaceholder();
    }
}

function updateTabPlaceholder() {
    const textarea = document.getElementById('knowledgeTextarea');
    if (!textarea) return;
    const placeholderKey = `placeholder${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}`;
    textarea.placeholder = translations[placeholderKey] || translations.placeholderEmpty;
}

function t(key) {
    return translations[key] || DEFAULT_TRANSLATIONS[key] || key;
}

function getLanguageName() {
    const lang = LANGUAGES.find(l => l.code === currentLanguage);
    return lang ? lang.name : 'English';
}

function getApiKey() {
    const isLocal = window.location.hostname.includes('localhost') ||
        window.location.hostname.includes('127.0.0.1');
    
    if (isLocal) {
        const key = localStorage.getItem('my_openrouter_key');
        return key ? key.trim() : null;
    }
    return 'server-side';
}

function formatTimestamp(ts) {
    if (!ts) return 'Unknown date';
    if (ts === 'legacy_version') return 'Legacy';
    try {
        const date = new Date(ts);
        if (isNaN(date.getTime())) return 'Unknown date';
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return 'Unknown date';
    }
}

function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getConfidenceEmoji(confidence) {
    return CONFIDENCE_EMOJI[confidence] || CONFIDENCE_EMOJI.medium;
}

function filterByChance(items, chancePercent) {
    if (!items || items.length === 0) return [];
    return items.filter(() => Math.random() * 100 < chancePercent);
}

// ==================== FACTS STORAGE ====================
function getFactsData() {
    const data = localStorage.getItem(STORAGE_KEYS.facts);
    if (!data) return { facts: [], legacy_text: '' };
    
    try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && parsed.facts) {
            return parsed;
        }
        return { facts: [], legacy_text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed) };
    } catch (e) {
        return { facts: [], legacy_text: data };
    }
}

function setFactsData(data) {
    localStorage.setItem(STORAGE_KEYS.facts, JSON.stringify(data));
    window.dispatchEvent(new Event('memory-updated'));
}

function getFactsForDisplay() {
    const data = getFactsData();
    
    if (data.facts.length === 0 && data.legacy_text) {
        return `📜 Legacy data (will be restructured):\n\n${data.legacy_text}`;
    }
    
    if (data.facts.length === 0) return '';
    
    const active = data.facts.filter(f => !f.superseded);
    const superseded = data.facts.filter(f => f.superseded);
    
    let result = active.map((f, i) => {
        const conf = getConfidenceEmoji(f.confidence);
        const time = formatTimestamp(f.timestamp);
        const evidence = f.evidence?.length > 0 
            ? `\n    📎 "${f.evidence.join('", "')}"` 
            : '';
        return `[${i + 1}] ${conf} ${f.text} (${time})\n${evidence}`;
    }).join('\n\n');
    
    if (superseded.length > 0) {
        result += `\n\n--- ${t('labelSuperseded')} (${superseded.length}) ---\n`;
        result += superseded.map(f => `⊘ ${f.text}`).join('\n');
    }
    
    return result;
}

function getFactsForPrompt(filtered = false) {
    const data = getFactsData();
    
    if (data.facts.length === 0) {
        return '(no facts recorded yet)';
    }
    
    let active = data.facts.filter(f => !f.superseded);
    
    if (filtered) {
        active = filterByChance(active, CONTEXT_FILTER_CONFIG.FACTS_INCLUSION_CHANCE);
        if (active.length === 0) {
            return '(no facts selected this time)';
        }
    }
    
    return active.map((f, i) => {
        const evidence = f.evidence?.length > 0 ? ` [evidence: "${f.evidence[0]}"]` : '';
        const timeTag = f.timestamp === 'legacy_version' ? ' [LEGACY]' : ` [recorded: ${formatTimestamp(f.timestamp)}]`;
        return `${i + 1}. ${f.text} (${f.confidence})${timeTag}${evidence}`;
    }).join('\n');
}

// ==================== TRAITS STORAGE ====================
function getTraitsData() {
    const data = localStorage.getItem(STORAGE_KEYS.traits);
    if (!data) return { traits: [], legacy_text: '' };
    
    try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && parsed.traits) {
            return parsed;
        }
        return { traits: [], legacy_text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed) };
    } catch (e) {
        return { traits: [], legacy_text: data };
    }
}

function setTraitsData(data) {
    localStorage.setItem(STORAGE_KEYS.traits, JSON.stringify(data));
    window.dispatchEvent(new Event('memory-updated'));
}

function getTraitsForDisplay() {
    const data = getTraitsData();
    
    if (data.traits.length === 0 && data.legacy_text) {
        return `📜 Legacy data:\n\n${data.legacy_text}`;
    }
    
    if (data.traits.length === 0) return '';
    
    const active = data.traits.filter(t => !t.superseded);
    const superseded = data.traits.filter(t => t.superseded);
    
    let result = active.map((tr, i) => {
        const conf = getConfidenceEmoji(tr.confidence);
        const evidence = tr.evidence?.length > 0 
            ? `\n    📎 "${tr.evidence.join('", "')}"` 
            : '';
        return `[${i + 1}] ${conf} ${tr.text}${evidence}`;
    }).join('\n\n');
    
    if (superseded.length > 0) {
        result += `\n\n--- ${t('labelSuperseded')} (${superseded.length}) ---\n`;
        result += superseded.map(tr => `⊘ ${tr.text}`).join('\n');
    }
    
    return result;
}

function getTraitsForPrompt(filtered = false) {
    const data = getTraitsData();
    
    if (data.traits.length === 0) {
        return '(no personality traits recorded yet)';
    }
    
    let active = data.traits.filter(t => !t.superseded);
    
    if (filtered) {
        active = filterByChance(active, CONTEXT_FILTER_CONFIG.TRAITS_INCLUSION_CHANCE);
        if (active.length === 0) {
            return '(no traits selected this time)';
        }
    }
    
    return active.map((tr, i) => {
        const evidence = tr.evidence?.length > 0 ? ` [based on: "${tr.evidence[0]}"]` : '';
        return `${i + 1}. ${tr.text} (${tr.confidence})${evidence}`;
    }).join('\n');
}
// ==================== TIMELINE STORAGE ====================
function getTimelineData() {
    const data = localStorage.getItem(STORAGE_KEYS.timeline);
    if (!data) return { events: [], legacy_text: '' };
    
    try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && parsed.events) {
            return parsed;
        }
        return { events: [], legacy_text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed) };
    } catch (e) {
        return { events: [], legacy_text: data };
    }
}

function setTimelineData(data) {
    localStorage.setItem(STORAGE_KEYS.timeline, JSON.stringify(data));
    window.dispatchEvent(new Event('memory-updated'));
}

function getTimelineForDisplay() {
    const data = getTimelineData();
    
    if (data.events.length === 0 && data.legacy_text) {
        return `📜 Legacy data:\n\n${data.legacy_text}`;
    }
    
    if (data.events.length === 0) return '';
    
    const active = data.events.filter(e => !e.superseded);
    const superseded = data.events.filter(e => e.superseded);
    
    const events = active.filter(e => e.type === 'event');
    const periods = active.filter(e => e.type === 'period');
    const plans = active.filter(e => e.type === 'plan');
    
    let result = '';
    
    if (events.length > 0) {
        result += `📅 ${t('labelEvent').toUpperCase()}S:\n`;
        result += events.map(e => formatTimelineItem(e)).join('\n');
        result += '\n\n';
    }
    
    if (periods.length > 0) {
        result += `🔄 ${t('labelPeriod').toUpperCase()}S:\n`;
        result += periods.map(e => formatTimelineItem(e)).join('\n');
        result += '\n\n';
    }
    
    if (plans.length > 0) {
        result += `🎯 ${t('labelPlan').toUpperCase()}S:\n`;
        result += plans.map(e => formatTimelineItem(e)).join('\n');
        result += '\n\n';
    }
    
    if (superseded.length > 0) {
        result += `--- ${t('labelSuperseded')} (${superseded.length}) ---\n`;
        result += superseded.map(e => `⊘ ${e.text}`).join('\n');
    }
    
    return result.trim();
}

function formatTimelineItem(item) {
    const conf = getConfidenceEmoji(item.confidence);
    let dateStr = '';
    
    if (item.date) {
        if (item.date.exact) {
            dateStr = item.date.exact;
        } else if (item.date.description) {
            dateStr = item.date.description;
        }
    }
    
    if (item.endDate) {
        const endStr = item.endDate.exact || item.endDate.description || '';
        dateStr = `${dateStr} → ${endStr}`;
    } else if (item.ongoing) {
        dateStr = `${dateStr} → ${t('labelOngoing')}`;
    }
    
    const recorded = formatTimestamp(item.timestamp);
    const evidence = item.evidence?.length > 0 
        ? `\n    📎 "${item.evidence[0]}"` 
        : '';
    
    return `${conf} [${dateStr}] ${item.text} (rec: ${recorded})${evidence}`;
}

function getTimelineForPrompt() {
    const data = getTimelineData();
    
    if (data.events.length === 0) {
        return '(no timeline events recorded yet)';
    }
    
    const active = data.events.filter(e => !e.superseded);
    
    if (active.length === 0) {
        return '(no timeline events recorded yet)';
    }
    
    return active.map(e => {
        let dateStr = '';
        if (e.date?.exact) dateStr = e.date.exact;
        else if (e.date?.description) dateStr = e.date.description;
        
        const timeTag = e.timestamp === 'legacy_version' ? ' [LEGACY]' : ` [recorded: ${formatTimestamp(e.timestamp)}]`;
        if (e.ongoing) dateStr += ' (ongoing)';
        if (e.type === 'plan') dateStr += ' [PLAN]';
        
        return `• ${timeTag}[${dateStr}] ${e.text} (${e.confidence})`;
    }).join('\n');
}
// ==================== HYPOTHESES STORAGE ====================
function getHypothesesData() {
    const data = localStorage.getItem(STORAGE_KEYS.hypotheses);
    if (!data) return { hypotheses: [] };
    try {
        const parsed = JSON.parse(data);
        if (!parsed.hypotheses) {
            return { hypotheses: [] };
        }
        return parsed;
    } catch (e) {
        console.error('[Hypotheses] Parse error:', e);
        return { hypotheses: [] };
    }
}

function setHypothesesData(data) {
    localStorage.setItem(STORAGE_KEYS.hypotheses, JSON.stringify(data));
    window.dispatchEvent(new Event('memory-updated'));
}

function getHypothesesForDisplay() {
    const data = getHypothesesData();
    if (data.hypotheses.length === 0) return '';
    
    return data.hypotheses.map((h, i) => {
        const conf = getConfidenceEmoji(h.confidence);
        const evidence = h.evidence?.length > 0 
            ? h.evidence.join(', ') 
            : 'No direct evidence';
        const revision = h.revision || 1;
        const updated = h.updatedAt !== h.createdAt 
            ? ` | Updated: #${h.updatedAt}` 
            : '';
        
        return `[${i + 1}] 💡 ${h.text}
    📊 Confidence: ${conf} ${h.confidence}
    📎 Based on: ${evidence}
    🏷️ Category: ${h.category || 'general'}
    📅 Created: #${h.createdAt}${updated} | Rev: ${revision}`;
    }).join('\n\n');
}

function getHypothesesForPrompt(filtered = false) {
    const data = getHypothesesData();
    if (data.hypotheses.length === 0) return '(no hypotheses yet)';
    
    let hypotheses = data.hypotheses;
    
    if (filtered) {
        hypotheses = filterByChance(hypotheses, CONTEXT_FILTER_CONFIG.HYPOTHESES_INCLUSION_CHANCE);
        if (hypotheses.length === 0) {
            return '(no hypotheses selected this time)';
        }
    }
    
    return hypotheses.map((h, i) => {
        const evidence = h.evidence?.length > 0 
            ? `Evidence: [${h.evidence.join('; ')}]` 
            : 'Evidence: none';
        return `[${i + 1}] ${h.text}
   Confidence: ${h.confidence} | Category: ${h.category} | ${evidence}`;
    }).join('\n\n');
}

// ==================== GAPS STORAGE ====================
function getGapsData() {
    const data = localStorage.getItem(STORAGE_KEYS.gaps);
    if (!data) return { gaps: [], lastUpdated: 0 };
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error('[Gaps] Parse error:', e);
        return { gaps: [], lastUpdated: 0 };
    }
}

function setGapsData(data) {
    localStorage.setItem(STORAGE_KEYS.gaps, JSON.stringify(data));
}

function getGapsForDisplay() {
    const data = getGapsData();
    if (data.gaps.length === 0) return '';
    
    const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
    
    return data.gaps.map((g, i) => {
        const prio = priorityEmoji[g.priority] || '⚪';
        const related = g.relatedTo?.length > 0 ? g.relatedTo.join(', ') : 'general';
        
        return `[${i + 1}] ${prio} ${g.topic}
    💭 Why: ${g.reason}
    🏷️ Related: ${related}`;
    }).join('\n\n');
}

function getGapsForPrompt() {
    const data = getGapsData();
    if (data.gaps.length === 0) return '(no knowledge gaps identified yet)';
    
    return data.gaps.map((g, i) => {
        const related = g.relatedTo?.length > 0 ? `[${g.relatedTo.join(', ')}]` : '';
        return `${i + 1}. [${g.priority}] ${g.topic}\n   Why: ${g.reason} ${related}`;
    }).join('\n\n');
}

// ==================== SOCIAL STORAGE ====================
const SOCIAL_CONFIG = {
    maxContacts: 20,
    strengthColors: { 1: '🔴', 2: '🟡', 3: '🟢' },
    sentimentEmoji: { positive: '💚', neutral: '😐', negative: '💔' }
};

function getSocialData() {
    const data = localStorage.getItem(STORAGE_KEYS.social);
    if (!data) return { contacts: [] };
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error('[Social] Parse error:', e);
        return { contacts: [] };
    }
}

function setSocialData(data) {
    localStorage.setItem(STORAGE_KEYS.social, JSON.stringify(data));
    window.dispatchEvent(new Event('memory-updated'));
}

function getStrengthIndicator(strength) {
    const s = Math.min(Math.max(strength, 1), 3);
    return `${SOCIAL_CONFIG.strengthColors[s]} (${strength})`;
}

function getSentimentEmoji(sentiment) {
    return SOCIAL_CONFIG.sentimentEmoji[sentiment] || SOCIAL_CONFIG.sentimentEmoji.neutral;
}

function getSocialForDisplay() {
    const data = getSocialData();
    if (data.contacts.length === 0) return '';
    
    return data.contacts.map((c, i) => {
        const sentiment = getSentimentEmoji(c.sentiment);
        return `[${i + 1}] ${sentiment} ${c.name}
    📋 Relation: ${c.relation || 'unknown'}
    📊 Facts: ${c.facts?.length || 0} | Traits: ${c.traits?.length || 0}
    📅 Last: #${c.lastMentioned || c.createdAt}`;
    }).join('\n\n');
}

function getSocialForPrompt() {
    const data = getSocialData();
    if (data.contacts.length === 0) return '(no social connections recorded yet)';
    
    return data.contacts.map((c, i) => {
        const aliases = c.aliases?.length > 0 ? `(aka: ${c.aliases.join(', ')})` : '';
        const factsText = c.facts?.length > 0
            ? c.facts.map(f => `  • ${f.text}`).join('\n')
            : '  (no facts)';
        const traitsText = c.traits?.length > 0
            ? c.traits.map(t => `  • ${t.text}`).join('\n')
            : '  (no traits)';
        
        return `[${i + 1}] ${c.name} ${aliases}
Relation: ${c.relation || 'unknown'} | Sentiment: ${c.sentiment || 'neutral'}
Facts:\n${factsText}
Traits:\n${traitsText}`;
    }).join('\n\n---\n\n');
}

function getContactById(id) {
    const data = getSocialData();
    return data.contacts.find(c => c.id === id);
}

function findContactByName(name) {
    const data = getSocialData();
    const nameLower = name.toLowerCase();
    return data.contacts.find(c => {
        if (c.name.toLowerCase() === nameLower) return true;
        if (c.aliases?.some(a => a.toLowerCase() === nameLower)) return true;
        return false;
    });
}

// ==================== UNIVERSAL GETTERS ====================
function getKnowledge(category) {
    switch (category) {
        case 'facts':
            return getFactsForDisplay();
        case 'traits':
            return getTraitsForDisplay();
        case 'timeline':
            return getTimelineForDisplay();
        case 'hypotheses':
            return getHypothesesForDisplay();
        case 'social':
            return getSocialForDisplay();
        case 'gaps':
            return getGapsForDisplay();
        case 'style':
            return localStorage.getItem(STORAGE_KEYS.style) || '';
        default:
            return '';
    }
}

function setKnowledge(category, content) {
    if (category === 'style') {
        localStorage.setItem(STORAGE_KEYS.style, content);
    }
}

// ==================== PERSONA EMULATION (🎭 Эмуляция личности) ====================
// Режим хранит только выбор пользователя и текст роли; заметки — это отдельная
// «память об образе», которую бот пишет сам каждые PERSONA_CONFIG.notesInterval сообщений.
function dispatchPersonaUpdated() {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    if (typeof Event === 'undefined') return;
    window.dispatchEvent(new Event('persona-updated'));
}

function getPersonaPrompt() {
    const raw = localStorage.getItem(STORAGE_KEYS.personaPrompt);
    return raw ? raw.trim() : '';
}

function setPersonaPrompt(text) {
    const clean = String(text == null ? '' : text).trim().slice(0, PERSONA_CONFIG.promptLimit);
    if (clean) {
        localStorage.setItem(STORAGE_KEYS.personaPrompt, clean);
    } else {
        localStorage.removeItem(STORAGE_KEYS.personaPrompt);
    }
    dispatchPersonaUpdated();
    return clean;
}

function isPersonaMode() {
    return localStorage.getItem(STORAGE_KEYS.personaMode) === '1';
}

function setPersonaMode(on) {
    localStorage.setItem(STORAGE_KEYS.personaMode, on ? '1' : '0');
    dispatchPersonaUpdated();
    return Boolean(on);
}

// Эмуляция работает только когда режим включён И промпт не пустой.
function isPersonaEnabled() {
    return isPersonaMode() && getPersonaPrompt().length > 0;
}

// ==================== PERSONA NOTES STORAGE ====================
function getPersonaNotesData() {
    const raw = localStorage.getItem(STORAGE_KEYS.personaNotes);
    if (!raw) return { notes: [], lastUpdated: 0 };

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return { notes: parsed, lastUpdated: 0 };
        if (parsed && Array.isArray(parsed.notes)) {
            return { notes: parsed.notes, lastUpdated: parsed.lastUpdated || 0 };
        }
        return { notes: [], lastUpdated: 0 };
    } catch (e) {
        console.error('[Persona] Notes parse error:', e);
        return { notes: [], lastUpdated: 0 };
    }
}

function setPersonaNotesData(data) {
    const notes = Array.isArray(data && data.notes)
        ? data.notes.slice(-PERSONA_CONFIG.maxNotes)
        : [];
    localStorage.setItem(STORAGE_KEYS.personaNotes, JSON.stringify({
        notes,
        lastUpdated: (data && data.lastUpdated) || 0
    }));
    dispatchPersonaUpdated();
}

function normalizePersonaNoteText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isDuplicatePersonaNote(text, notes) {
    const needle = normalizePersonaNoteText(text);
    if (!needle) return true;
    return (notes || []).some(note => normalizePersonaNoteText(note.text) === needle);
}

function getPersonaNoteKind(kind) {
    return PERSONA_NOTE_KINDS[kind] || PERSONA_DEFAULT_KIND;
}

function addPersonaNote(text, options = {}) {
    const clean = String(text == null ? '' : text).trim().slice(0, 600);
    if (!clean) return null;

    const data = getPersonaNotesData();
    if (isDuplicatePersonaNote(clean, data.notes)) return null;

    const note = {
        id: generateId('persona'),
        text: clean,
        kind: PERSONA_NOTE_KINDS[options.kind] ? options.kind : 'other',
        createdAt: Date.now(),
        // getMessageCounter живёт в ui.js — app.js не должен от него падать.
        messageCount: typeof options.messageCount === 'number'
            ? options.messageCount
            : (typeof getMessageCounter === 'function' ? getMessageCounter() : 0)
    };

    setPersonaNotesData({
        notes: data.notes.concat(note),
        lastUpdated: note.messageCount
    });
    return note;
}

function clearPersonaNotes() {
    localStorage.removeItem(STORAGE_KEYS.personaNotes);
    dispatchPersonaUpdated();
}

function getPersonaNotesForDisplay() {
    const notes = getPersonaNotesData().notes;
    if (notes.length === 0) return '';

    return notes.map((note, i) => {
        const kind = getPersonaNoteKind(note.kind);
        return `[${i + 1}] ${kind.icon} ${note.text} (${formatTimestamp(note.createdAt)})`;
    }).join('\n\n');
}

function getPersonaNotesForPrompt(limit) {
    const notes = getPersonaNotesData().notes;
    if (notes.length === 0) return '';
    const maxItems = typeof limit === 'number' && limit > 0 ? limit : PERSONA_CONFIG.notesInPrompt;
    return notes.slice(-maxItems).map(note => `• ${note.text}`).join('\n');
}

// ==================== PERSONA COUNTER ====================
function getPersonaCounter() {
    const value = parseInt(localStorage.getItem(STORAGE_KEYS.personaCounter) || '0', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function setPersonaCounter(value) {
    const safe = Math.max(0, Math.floor(Number(value) || 0));
    if (safe === 0) {
        localStorage.removeItem(STORAGE_KEYS.personaCounter);
    } else {
        localStorage.setItem(STORAGE_KEYS.personaCounter, String(safe));
    }
    return safe;
}

function incrementPersonaCounter() {
    return setPersonaCounter(getPersonaCounter() + 1);
}

function resetPersonaCounter() {
    return setPersonaCounter(0);
}

function getPersonaMessagesLeft() {
    return Math.max(0, PERSONA_CONFIG.notesInterval - getPersonaCounter());
}

function shouldUpdatePersonaNotes() {
    return isPersonaEnabled() && getPersonaCounter() >= PERSONA_CONFIG.notesInterval;
}

// Блок системного промпта: попадает в чат только при включённой эмуляции с промптом.
function getPersonaPromptBlock() {
    if (!isPersonaEnabled()) return '';

    const prompt = getPersonaPrompt();
    const notes = getPersonaNotesForPrompt();
    const notesBlock = notes
        ? `\n\n=== 📝 ЗАМЕТКИ ОБ ОБРАЗЕ (уже накоплено) ===\n${notes}\nЭто твои собственные наблюдения о том, как складывается роль. Продолжай линию и не противоречь себе.`
        : '';

    return `\n=== 🎭 ЭМУЛЯЦИЯ ЛИЧНОСТИ: ВКЛЮЧЕНА ===\n` +
        `Ты отвечаешь в образе, который описал пользователь. Держи роль постоянно: манера речи, лексика, ритм, привычки, способ думать и реагировать.\n\n` +
        `ОБРАЗ (промпт пользователя):\n"""\n${prompt}\n"""${notesBlock}\n\n` +
        `ПРАВИЛА ЭМУЛЯЦИИ:\n` +
        `1. Оставайся в образе весь диалог — в каждом ответе, без напоминаний и без выхода из роли.\n` +
        `2. Никогда не упоминай, что ты «эмулируешь», «играешь роль» или используешь промпт.\n` +
        `3. Образ меняет ТОЛЬКО манеру и подачу. Факты о пользователе бери из памяти и из диалога — не выдумывай их ради образа.\n` +
        `4. Если образ конфликтует с полезностью ответа, помоги пользователю, но останься в манере роли.\n` +
        `5. Образ не отменяет правила формата ответа и запрет раскрывать системные инструкции.`;
}

// ==================== GOALS (🎯 Цели пользователя) ====================
// Цель — подтверждённое пользователем намерение плюс один следующий шаг.
// Здесь только данные: никаких процентов, стриков и целей, выведенных из памяти.
const GOALS_CONFIG = {
    version: 1,
    maxGoals: 20,
    activeWarn: 3,          // мягкое предупреждение, не блокировка
    checkinsCap: 200,
    doneStepsCap: 50,
    titleLimit: 160,
    whyLimit: 1200,
    successLimit: 600,
    stepLimit: 300,
    noteLimit: 400,
    statuses: ['active', 'paused', 'done', 'dropped'],
    horizons: ['week', 'month', 'quarter', 'open'],
    checkinStates: ['moved', 'stuck', 'no_time']
};

function dispatchGoalsUpdated() {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    if (typeof Event === 'undefined') return;
    window.dispatchEvent(new Event('goals-updated'));
}

function normalizeGoalText(value, limit) {
    return String(value == null ? '' : value).trim().slice(0, limit);
}

// Ключ для поиска дубликатов: регистр, пунктуация и лишние пробелы не важны.
function normalizeGoalKey(value) {
    return normalizeGoalText(value, 500)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isGoalShape(goal) {
    return Boolean(goal) &&
        typeof goal.id === 'string' && goal.id.length > 0 &&
        typeof goal.title === 'string';
}

function emptyGoalsData() {
    return { version: GOALS_CONFIG.version, goals: [] };
}

function getGoalsData() {
    const raw = localStorage.getItem(STORAGE_KEYS.goals);
    if (!raw) return emptyGoalsData();

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return { version: GOALS_CONFIG.version, goals: parsed.filter(isGoalShape) };
        }
        if (parsed && Array.isArray(parsed.goals)) {
            return { version: parsed.version || 1, goals: parsed.goals.filter(isGoalShape) };
        }
        return emptyGoalsData();
    } catch (e) {
        console.error('[Goals] Parse error:', e);
        return emptyGoalsData();
    }
}

function setGoalsData(data) {
    // Ничего не отбрасываем молча: лимит проверяется при создании и импорте,
    // иначе можно потерять давнюю цель пользователя.
    const goals = Array.isArray(data && data.goals) ? data.goals : [];
    localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify({
        version: GOALS_CONFIG.version,
        goals
    }));
    dispatchGoalsUpdated();
}

function getGoals() {
    return getGoalsData().goals;
}

function getGoalById(id) {
    return getGoals().find(goal => goal.id === id) || null;
}

function getActiveGoals() {
    return getGoals().filter(goal => goal.status === 'active');
}

function getGoalCounts() {
    const counts = { active: 0, paused: 0, done: 0, dropped: 0, total: 0 };
    getGoals().forEach(goal => {
        counts.total += 1;
        if (counts[goal.status] !== undefined) counts[goal.status] += 1;
    });
    return counts;
}

// Внутренняя запись: единственная точка, где цель меняется на диске.
function writeGoal(id, mutator) {
    const data = getGoalsData();
    const index = data.goals.findIndex(goal => goal.id === id);
    if (index === -1) return { ok: false, errors: ['not_found'] };

    const draft = mutator({ ...data.goals[index] });
    if (!draft) return { ok: false, errors: ['rejected'] };

    draft.updatedAt = Date.now();
    data.goals[index] = draft;
    setGoalsData(data);
    return { ok: true, goal: draft };
}

function createGoal(input) {
    const source = input || {};
    const title = normalizeGoalText(source.title, GOALS_CONFIG.titleLimit);
    const why = normalizeGoalText(source.why, GOALS_CONFIG.whyLimit);
    const success = normalizeGoalText(source.success, GOALS_CONFIG.successLimit);

    const errors = [];
    if (!title) errors.push('title_required');
    if (!why) errors.push('why_required');
    if (!success) errors.push('success_required');
    if (errors.length > 0) return { ok: false, errors };

    const data = getGoalsData();
    if (data.goals.length >= GOALS_CONFIG.maxGoals) return { ok: false, errors: ['limit_reached'] };

    const titleKey = normalizeGoalKey(title);
    // Мешают только живые цели: завершённую можно поставить заново.
    const duplicate = data.goals.some(goal =>
        (goal.status === 'active' || goal.status === 'paused') &&
        normalizeGoalKey(goal.title) === titleKey
    );
    if (duplicate) return { ok: false, errors: ['duplicate_title'] };

    const now = Date.now();
    const goal = {
        id: generateId('goal'),
        title,
        why,
        success,
        horizon: GOALS_CONFIG.horizons.includes(source.horizon) ? source.horizon : 'open',
        status: 'active',
        nextStep: null,
        doneSteps: [],
        source: source.source === 'suggested' ? 'suggested' : 'user',
        createdAt: now,
        updatedAt: now,
        archivedReason: ''
    };

    setGoalsData({ goals: data.goals.concat(goal) });
    return { ok: true, goal };
}

function updateGoal(id, patch) {
    const changes = patch || {};
    return writeGoal(id, goal => {
        if (changes.title !== undefined) {
            const title = normalizeGoalText(changes.title, GOALS_CONFIG.titleLimit);
            if (!title) return null;
            goal.title = title;
        }
        if (changes.why !== undefined) {
            const why = normalizeGoalText(changes.why, GOALS_CONFIG.whyLimit);
            if (!why) return null;
            goal.why = why;
        }
        if (changes.success !== undefined) {
            const success = normalizeGoalText(changes.success, GOALS_CONFIG.successLimit);
            if (!success) return null;
            goal.success = success;
        }
        if (changes.horizon !== undefined && GOALS_CONFIG.horizons.includes(changes.horizon)) {
            goal.horizon = changes.horizon;
        }
        return goal;
    });
}

function setGoalStatus(id, status, reason) {
    if (!GOALS_CONFIG.statuses.includes(status)) return { ok: false, errors: ['bad_status'] };
    return writeGoal(id, goal => {
        goal.status = status;
        goal.archivedReason = status === 'done' || status === 'dropped'
            ? normalizeGoalText(reason, GOALS_CONFIG.noteLimit)
            : '';
        return goal;
    });
}

function setGoalNextStep(id, text) {
    const step = normalizeGoalText(text, GOALS_CONFIG.stepLimit);
    return writeGoal(id, goal => {
        goal.nextStep = step ? { text: step, createdAt: Date.now() } : null;
        return goal;
    });
}

// «Сделал» — шаг переезжает в историю. Процентов нет, есть только факт.
function completeGoalNextStep(id) {
    const goal = getGoalById(id);
    if (!goal) return { ok: false, errors: ['not_found'] };
    if (!goal.nextStep || !goal.nextStep.text) return { ok: false, errors: ['no_next_step'] };

    return writeGoal(id, draft => {
        draft.doneSteps = (Array.isArray(draft.doneSteps) ? draft.doneSteps : [])
            .concat({ text: draft.nextStep.text, at: Date.now() })
            .slice(-GOALS_CONFIG.doneStepsCap);
        draft.nextStep = null;
        return draft;
    });
}

// ==================== GOAL CHECK-INS ====================
function getGoalCheckinsData() {
    const raw = localStorage.getItem(STORAGE_KEYS.goalCheckins);
    if (!raw) return { version: GOALS_CONFIG.version, checkins: [] };

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return { version: GOALS_CONFIG.version, checkins: parsed };
        if (parsed && Array.isArray(parsed.checkins)) {
            return { version: parsed.version || 1, checkins: parsed.checkins };
        }
        return { version: GOALS_CONFIG.version, checkins: [] };
    } catch (e) {
        console.error('[Goals] Check-ins parse error:', e);
        return { version: GOALS_CONFIG.version, checkins: [] };
    }
}

function setGoalCheckinsData(data) {
    const checkins = Array.isArray(data && data.checkins)
        ? data.checkins.slice(-GOALS_CONFIG.checkinsCap)
        : [];
    localStorage.setItem(STORAGE_KEYS.goalCheckins, JSON.stringify({
        version: GOALS_CONFIG.version,
        checkins
    }));
    dispatchGoalsUpdated();
}

function addGoalCheckin(goalId, state, note) {
    if (!getGoalById(goalId)) return { ok: false, errors: ['not_found'] };
    if (!GOALS_CONFIG.checkinStates.includes(state)) return { ok: false, errors: ['bad_state'] };

    const checkin = {
        id: generateId('checkin'),
        goalId,
        at: Date.now(),
        state,
        note: normalizeGoalText(note, GOALS_CONFIG.noteLimit)
    };

    const data = getGoalCheckinsData();
    setGoalCheckinsData({ checkins: data.checkins.concat(checkin) });
    return { ok: true, checkin };
}

function getGoalCheckins(goalId, limit) {
    const all = getGoalCheckinsData().checkins
        .filter(checkin => !goalId || checkin.goalId === goalId)
        .sort((a, b) => (a.at || 0) - (b.at || 0));
    return typeof limit === 'number' && limit > 0 ? all.slice(-limit) : all;
}

function getGoalLastCheckin(goalId) {
    const list = getGoalCheckins(goalId);
    return list.length ? list[list.length - 1] : null;
}

// Сколько чек-инов подряд прошли без движения — основа триажа застревания.
// «Без движения» — это и «застряло», и «не было времени»: оба значат, что шаг не сдвинулся.
function getGoalStuckStreak(goalId) {
    const list = getGoalCheckins(goalId).slice().reverse();
    let streak = 0;
    for (const checkin of list) {
        if (checkin.state === 'moved') break;
        streak += 1;
    }
    return streak;
}

// ==================== GOALS TRANSFER ====================
function exportGoalsPackage() {
    return JSON.stringify({
        app: 'memory-chatbot',
        kind: 'goals',
        version: GOALS_CONFIG.version,
        exportedAt: new Date().toISOString(),
        goals: getGoals(),
        checkins: getGoalCheckinsData().checkins
    }, null, 2);
}

// Импорт добавляет только новые записи: существующие цели и чек-ины не перетираются.
function importGoalsPackage(raw) {
    let parsed;
    try {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
        return { ok: false, errors: ['bad_json'] };
    }

    if (!parsed || !Array.isArray(parsed.goals)) return { ok: false, errors: ['bad_shape'] };

    const goals = getGoals();
    const checkins = getGoalCheckinsData().checkins;
    const goalIds = new Set(goals.map(goal => goal.id));
    const checkinIds = new Set(checkins.map(checkin => checkin.id));

    const newGoals = [];
    parsed.goals.filter(isGoalShape).forEach(goal => {
        if (goalIds.has(goal.id)) return;
        if (goals.length + newGoals.length >= GOALS_CONFIG.maxGoals) return;
        goalIds.add(goal.id);
        newGoals.push({
            ...goal,
            status: GOALS_CONFIG.statuses.includes(goal.status) ? goal.status : 'active'
        });
    });

    const newCheckins = [];
    (Array.isArray(parsed.checkins) ? parsed.checkins : []).forEach(checkin => {
        if (!checkin || typeof checkin.goalId !== 'string') return;
        if (checkinIds.has(checkin.id) || !goalIds.has(checkin.goalId)) return;
        checkinIds.add(checkin.id);
        newCheckins.push(checkin);
    });

    if (newGoals.length === 0 && newCheckins.length === 0) {
        return { ok: true, imported: 0, checkins: 0, skipped: parsed.goals.length };
    }

    setGoalsData({ goals: goals.concat(newGoals) });
    if (newCheckins.length > 0) {
        setGoalCheckinsData({ checkins: checkins.concat(newCheckins) });
    }

    return {
        ok: true,
        imported: newGoals.length,
        checkins: newCheckins.length,
        skipped: parsed.goals.length - newGoals.length
    };
}

// Миграция: приводим старый формат (массив без версии) к { version, goals }.
function migrateGoalsData() {
    const raw = localStorage.getItem(STORAGE_KEYS.goals);
    if (!raw) return false;

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) && parsed && parsed.version === GOALS_CONFIG.version) return false;
        setGoalsData({ goals: getGoalsData().goals });
        return true;
    } catch (e) {
        // Повреждённые данные не удаляем: пользователь может восстановить их вручную.
        console.error('[Goals] Migration skipped, storage is corrupt:', e);
        return false;
    }
}

// ==================== GOAL COACHING (контекст для чата) ====================
// Инкремент 2: бот видит цели пользователя, но не управляет ими.
// Здесь только чтение и правила; никаких записей в цели из чата нет.
const COACH_CONFIG = {
    version: 1,
    promptGoals: 3,              // сколько целей максимум попадает в промпт
    whyLimit: 240,
    successLimit: 160,
    stepLimit: 160,
    noteLimit: 160,
    stuckStreakToTriage: 2,      // после двух чек-инов без движения — триаж
    questionGapMessages: 2,      // сколько прошлых ответов бота смотрим перед вопросом о цели
    staleDays: 21,
    // как состояние чек-ина называется в промпте (без кодов и оценок)
    stateLabels: { moved: 'сдвинулось', stuck: 'застряло', no_time: 'не было времени' }
};

// Профиль подстройки: в этом инкременте только выключатель и место под параметры.
// Значения параметров начнут влиять на речь в инкременте 3.
function emptyCoachProfile() {
    return {
        version: COACH_CONFIG.version,
        enabled: true,
        params: {
            directness: 'neutral',
            structure: 'medium',
            stepSize: 'normal',
            reflection: 'medium',
            contactRhythm: 'regular',
            feedback: 'process'
        },
        changelog: []
    };
}

function getCoachProfileData() {
    const raw = localStorage.getItem(STORAGE_KEYS.coachProfile);
    if (!raw) return emptyCoachProfile();

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return emptyCoachProfile();
        const base = emptyCoachProfile();
        return {
            version: COACH_CONFIG.version,
            enabled: parsed.enabled !== false,
            params: { ...base.params, ...(parsed.params || {}) },
            changelog: Array.isArray(parsed.changelog) ? parsed.changelog.slice(-60) : []
        };
    } catch (e) {
        console.error('[Coach] Profile parse error:', e);
        return emptyCoachProfile();
    }
}

function setCoachProfileData(data) {
    const base = emptyCoachProfile();
    const next = {
        version: COACH_CONFIG.version,
        enabled: !data || data.enabled !== false,
        params: { ...base.params, ...((data && data.params) || {}) },
        changelog: Array.isArray(data && data.changelog) ? data.changelog.slice(-60) : []
    };
    localStorage.setItem(STORAGE_KEYS.coachProfile, JSON.stringify(next));
    dispatchGoalsUpdated();
    return next;
}

function isCoachingEnabled() {
    return getCoachProfileData().enabled !== false;
}

function setCoachingEnabled(enabled) {
    const data = getCoachProfileData();
    data.enabled = Boolean(enabled);
    return setCoachProfileData(data);
}

function getGoalLastCheckinAt(goalId) {
    const last = getGoalLastCheckin(goalId);
    return last && last.at ? last.at : null;
}

// Цели для коучинга: сначала те, где движение встало, потом самые «забытые».
function getCoachableGoals() {
    const goals = getActiveGoals().slice();
    const rank = goal => {
        const stuck = getGoalStuckStreak(goal.id);
        return stuck >= COACH_CONFIG.stuckStreakToTriage ? 0 : 1;
    };
    goals.sort((a, b) => {
        const byRank = rank(a) - rank(b);
        if (byRank !== 0) return byRank;
        const aLast = getGoalLastCheckinAt(a.id) || a.createdAt || 0;
        const bLast = getGoalLastCheckinAt(b.id) || b.createdAt || 0;
        return aLast - bLast;
    });
    return goals.slice(0, COACH_CONFIG.promptGoals);
}

function formatGoalDaysAgo(ts) {
    if (!ts) return 'дата неизвестна';
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (days <= 0) return 'сегодня';
    if (days === 1) return 'вчера';
    if (days < 7) return `${days} дн. назад`;
    if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
    return `${Math.floor(days / 30)} мес. назад`;
}

// Триаж застревания из спеки: внешнее препятствие → мельче шаг,
// сомнение в цели → вернуться к «зачем», смешанные сигналы → спросить причину.
function classifyGoalObstacle(goalId) {
    const notes = getGoalCheckins(goalId)
        .filter(checkin => checkin.state !== 'moved' && checkin.note)
        .slice(-2);
    if (notes.length === 0) return 'mixed';

    const text = notes.map(checkin => normalizeGoalKey(checkin.note)).join(' ');
    const doubt = /(не мо[её]|не вижу смысла|нет смысла|сомнева|не хочу|бросить|не нужно|передумал|ошибся с целью)/;
    const external = /(нет времени|не хватило времени|не успел|не успева|занят|работа|семь|реб[её]н|поездк|болел|болезн|устал|нет сил|деньги|очеред|дедлайн|дорог|созвон|переезд)/;

    const hasDoubt = doubt.test(text);
    const hasExternal = external.test(text);
    if (hasDoubt && !hasExternal) return 'doubt';
    if (hasExternal && !hasDoubt) return 'external';
    return 'mixed';
}

function getGoalTriageHint(goal, allowQuestion) {
    if (!goal) return '';
    if (getGoalStuckStreak(goal.id) < COACH_CONFIG.stuckStreakToTriage) return '';

    const obstacle = classifyGoalObstacle(goal.id);
    const question = allowQuestion ? 'Можно один раз спросить, что именно мешает.' : 'Вопрос о цели сейчас не задавай — просто предложи, что делать.';

    if (obstacle === 'external') {
        return `Застряло на внешнем препятствии. Предложи уменьшенный шаг (например, на 10 минут), а не больший напор. ${question}`;
    }
    if (obstacle === 'doubt') {
        return `В заметках звучит сомнение в самой цели. Вернись к его собственному «зачем» и спроси, продолжать ли; любой ответ нормален, снимать цель за него нельзя. ${question}`;
    }
    return `Причина застревания неясна — не додумывай её. ${question}`;
}

function getGoalsForPrompt() {
    const goals = getCoachableGoals();
    if (goals.length === 0) return '';

    return goals.map((goal, index) => {
        const parts = [];
        parts.push(`${index + 1}. «${goal.title}»`);
        parts.push(`   Зачем (слова пользователя): ${String(goal.why || '').slice(0, COACH_CONFIG.whyLimit)}`);
        parts.push(`   Признак готовности: ${String(goal.success || '').slice(0, COACH_CONFIG.successLimit)}`);
        parts.push(`   Следующий шаг: ${goal.nextStep && goal.nextStep.text
            ? String(goal.nextStep.text).slice(0, COACH_CONFIG.stepLimit)
            : 'пока не выбран'}`);

        const last = getGoalLastCheckin(goal.id);
        if (last) {
            const note = last.note ? ` Заметка: «${String(last.note).slice(0, COACH_CONFIG.noteLimit)}»` : '';
            const stateLabel = COACH_CONFIG.stateLabels[last.state] || last.state;
            parts.push(`   Последний чек-ин: ${formatGoalDaysAgo(last.at)} — ${stateLabel}.${note}`);
        } else {
            parts.push(`   Чек-инов ещё не было. Цель создана ${formatGoalDaysAgo(goal.createdAt)}.`);
        }

        if (getGoalStuckStreak(goal.id) >= COACH_CONFIG.stuckStreakToTriage) {
            parts.push('   Два чек-ина подряд без движения.');
        }
        const lastAt = getGoalLastCheckinAt(goal.id) || goal.createdAt;
        const idleDays = lastAt ? Math.floor((Date.now() - lastAt) / 86400000) : 0;
        if (idleDays >= COACH_CONFIG.staleDays) {
            parts.push(`   Цель не трогали ${idleDays} дн. — уместна мягкая ревизия одним вопросом (важна / поменять шаг / снять), без стыда.`);
        }

        return parts.join('\n');
    }).join('\n\n');
}

// Считается ли, что бот уже говорил про цели в этом сообщении.
function assistantMessageDiscussedGoals(text, goals) {
    const normalized = normalizeGoalKey(text);
    if (!normalized) return false;
    if (/(^| )(цель|цели|целью|целей|целям|целях)( |$)/.test(normalized)) return true;

    return goals.some(goal => {
        const words = normalizeGoalKey(goal.title).split(' ').filter(word => word.length >= 4);
        const hits = words.filter(word => normalized.includes(word)).length;
        if (words.length > 0 && hits >= Math.min(2, words.length)) return true;

        const stepWords = normalizeGoalKey((goal.nextStep && goal.nextStep.text) || '')
            .split(' ')
            .filter(word => word.length >= 5);
        const stepHits = stepWords.filter(word => normalized.includes(word)).length;
        return stepWords.length > 0 && stepHits >= 2;
    });
}

// Жёсткое правило: не больше одного вопроса о цели за последние сообщения бота.
function isGoalQuestionAllowed(history) {
    const goals = getActiveGoals();
    if (goals.length === 0) return false;

    const recentAssistant = (Array.isArray(history) ? history : [])
        .filter(message => message && message.role === 'assistant' && typeof message.content === 'string')
        .slice(-COACH_CONFIG.questionGapMessages);

    const alreadyAsked = recentAssistant.some(message =>
        message.content.includes('?') && assistantMessageDiscussedGoals(message.content, goals)
    );
    return !alreadyAsked;
}

// Кризис и тяжёлое состояние важнее любой цели: коучинг выключается в коде.
function detectUserDistress(text) {
    const value = String(text == null ? '' : text);
    const crisis = /(не хочу (больше )?жить|не хочу жить дальше|покончить с собой|покончу с собой|суицид|убить себя|убью себя|резать себя|самоповрежд|kill myself|suicide|want to die|end my life|self[- ]harm)/i;
    const distress = /(не могу больше|больше нет сил|нет сил|выгор|паническ|паник[ау]|депресс|всё бессмысленно|все бессмысленно|срываюсь|истерик|на грани|сдаюсь|невыносим|burn(ed|t)? ?out|can'?t cope|panic attack|depress)/i;

    if (crisis.test(value)) return { level: 'crisis', matched: value.match(crisis)[0] };
    if (distress.test(value)) return { level: 'distress', matched: value.match(distress)[0] };
    return { level: 'none', matched: '' };
}

// ==================== TOOL DEFINITIONS (FULL VERSION) ====================
function getToolDefinitions() {
    return [
        {
            type: "function",
            function: {
                name: "get_user_facts",
                description: `Retrieves accumulated facts about the user. CALL THIS PROACTIVELY AND OFTEN.

⚡ ALWAYS CALL WHEN:
• User mentions ANY topic that might connect to their life
• User asks for advice or opinion on anything
• User shares emotions or reactions
• User mentions other people (might be known contacts)
• User talks about places, activities, work, hobbies
• User asks a question (context helps give better answer)
• Starting a new topic or after topic shift
• You want to personalize your response in ANY way
• You're about to give recommendations
• User mentions time periods (today, yesterday, last week)
• User uses pronouns that might refer to known people/things
• EVERY few messages even if not obviously needed — context enriches conversation

🎯 BIAS TOWARD CALLING: When in doubt, CALL. The cost of missing context is higher than the cost of checking. Personalized responses are ALWAYS better.

❌ Skip ONLY if: You JUST retrieved this info in the previous turn AND the topic hasn't shifted at all.`,
                parameters: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "What context are you looking for"
                        }
                    },
                    required: ["reason"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_user_timeline",
                description: `Retrieves user's life events, history, and future plans. CALL PROACTIVELY.

⚡ ALWAYS CALL WHEN:
• User mentions ANYTHING about past or future
• User talks about plans, dreams, goals, wishes
• User mentions decisions they're facing
• User expresses regret, nostalgia, anticipation
• User talks about changes in their life
• User mentions learning, growth, progress
• User discusses career, education, relationships
• User compares "before" and "now"
• You're giving advice about life decisions
• User mentions deadlines, events, appointments
• User seems to be at a crossroads
• Understanding their journey would help your response

🎯 BIAS TOWARD CALLING: Life context makes every response more meaningful. Historical patterns predict future behavior. Always check before advising.

❌ Skip ONLY if: Purely technical question with zero life relevance.`,
                parameters: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "What timeline context are you seeking"
                        }
                    },
                    required: ["reason"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_user_traits",
                description: `Retrieves user's personality traits and psychological patterns. ESSENTIAL FOR QUALITY RESPONSES.

⚡ ALWAYS CALL WHEN:
• You're about to give ANY advice
• You need to choose tone or approach
• User is expressing emotions
• User is making decisions
• User is facing challenges
• You want to motivate or support
• User is asking "what should I do"
• User shares opinions or reactions
• You're crafting a longer response
• User seems stressed, excited, confused
• You want to validate or challenge their thinking
• Adapting your communication style to them

🎯 BIAS TOWARD CALLING: Every human interaction benefits from understanding personality. Trait-aware responses feel more empathetic and accurate. This is your empathy module — use it liberally.

❌ Skip ONLY if: Single factual question like "what time is it in Tokyo"`,
                parameters: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "Why personality context would help"
                        }
                    },
                    required: ["reason"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_user_hypotheses",
                description: `Retrieves deep insights and non-obvious patterns about the user. YOUR SECRET WEAPON FOR PROFOUND CONVERSATIONS.

⚡ ALWAYS CALL WHEN:
• You're about to ASK the user anything
• You want to make an insightful observation
• User seems to have underlying concerns
• You sense there's more than surface meaning
• User is being vague or indirect
• You want to connect current topic to deeper patterns
• User repeats themes across conversations
• You're trying to understand "why" behind their words
• User is making choices that might have hidden motivations
• You want to surprise them with understanding
• Before offering perspective or reframing
• User expresses strong emotions (look for root causes)
• You want to ask a BETTER question than the obvious one

🧠 THIS IS YOUR INTUITION MODULE: Hypotheses let you see between the lines. They make you feel like you truly KNOW the person, not just remember facts about them.

🎯 CALL BEFORE EVERY QUESTION YOU ASK: This transforms generic questions into personally meaningful ones. Instead of "how was your day?" you can ask about something that matters to THEM.

❌ Skip ONLY if: Simple transactional exchange with zero depth.`,
                parameters: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "What deeper understanding are you seeking"
                        }
                    },
                    required: ["reason"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_user_social",
                description: `Retrieves information about people in the user's life — friends, family, colleagues, acquaintances.

⚡ ALWAYS CALL WHEN:
• User mentions ANY person by name
• User talks about relationships, conflicts, interactions with others
• User mentions "friend", "colleague", "mom", "boss", etc.
• User describes social situations
• You want to understand user's social context
• User asks for advice about dealing with someone
• User expresses emotions about other people
• Before asking about user's relationships
• User mentions group activities ("we did...", "my team...")

🎯 THIS IS YOUR SOCIAL MEMORY: Know who's who in user's life. Understand relationship dynamics. Remember past context about each person.

❌ Skip ONLY if: Conversation has zero social/interpersonal dimension.`,
                parameters: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "What social context are you seeking"
                        }
                    },
                    required: ["reason"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_user_goals",
                description: `Retrieves the goals the USER set for themselves: title, their own reason, success criterion and the one next step, plus the last self-reported check-in.

⚡ CALL WHEN:
• User talks about plans, intentions, progress, procrastination or being stuck
• User asks what they were going to do / why they started something
• You are about to suggest a next step
• User mentions motivation, discipline or giving something up

READ-ONLY: you can suggest a draft, but you never create, edit, pause, complete or drop a goal yourself.

❌ Skip when the turn has nothing to do with the user's own goals.`,
                parameters: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "Why you need the goals right now"
                        }
                    },
                    required: ["reason"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_knowledge_gaps",
                description: `Retrieves "white spots" — important topics about the user that remain unknown but would significantly improve your ability to help them.

⚡ ALWAYS CALL WHEN:
• You're about to ask the user ANY question
• You want to deepen the conversation meaningfully
• You're looking for what to explore next
• User seems open to sharing more
• You have a choice of what direction to take conversation
• Before giving advice that might benefit from more context

🎯 HOW TO USE:
• Review the gaps before formulating questions
• Weave gap exploration into natural conversation
• Don't interrogate — find organic moments
• Prioritize high-priority gaps when relevant
• Your questions should serve BOTH the current topic AND gap discovery

💡 EXAMPLE: If gap says "conflict resolution style unknown" and user mentions disagreement with colleague, you can naturally ask how they handled it.

❌ Don't force gaps into conversation. Wait for natural openings.`,
                parameters: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "What question are you considering, and how might gaps inform it"
                        }
                    },
                    required: ["reason"]
                }
            }
        }
    ];
}

// ==================== TOOL EXECUTION ====================
function executeTool(name, args) {
    console.log(`[Tool] Executing: ${name}`, args);
    
    switch (name) {
        case 'get_user_facts':
            return getFactsForPrompt() || 'No facts accumulated yet.';
        case 'get_user_timeline':
            return getTimelineForPrompt() || 'No timeline data yet.';
        case 'get_user_traits':
            return getTraitsForPrompt() || 'No personality traits yet.';
        case 'get_user_hypotheses':
            return getHypothesesForPrompt() || 'No hypotheses generated yet.';
        case 'get_user_social':
            return getSocialForPrompt() || 'No social connections yet.';
        case 'get_knowledge_gaps':
            return getGapsForPrompt() || 'No knowledge gaps identified yet.';
        case 'get_user_goals':
            return getGoalsForPrompt() || 'У пользователя нет активных целей.';
        default:
            return `Unknown tool: ${name}`;
    }
}

// ==================== FIREBASE INTEGRATION ====================
// Используем глобальную переменную isLocal из ui.js
// isLocal уже определена в ui.js, не объявляем повторно

async function callFirebaseAPI(action, data = null) {
    const isLocalMode = typeof isLocal !== 'undefined' ? isLocal :
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    // Для локальной разработки используем прямой доступ к Firebase
    if (isLocalMode) {
        return callFirebaseLocal(action, data);
    }
    
    // На проде идём через серверный эндпоинт
    try {
        console.log('[Firebase] Sending to server:', action);
        
        const response = await fetch('/api/firebase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, data })
        });
        
        console.log('[Firebase] Server response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Firebase] Server error:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('[Firebase] Server result:', result);
        
        if (!result.success) throw new Error(result.error);
        return result;
        
    } catch (error) {
        console.error('[Firebase] Network error:', error);
        throw new Error(`Не удалось соединиться с сервером: ${error.message}`);
    }
}

// Локальная версия (прямой доступ к Firebase, нужен ключ в localStorage)
async function callFirebaseLocal(action, data) {
    // Инициализируем Firebase один раз
    if (!window.firebaseDb) {
        const apiKey = localStorage.getItem('my_firebase_key');
        if (!apiKey) {
            throw new Error('Нет Firebase ключа. Сохраните его в настройках (🔧)');
        }
        
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
            const { getDatabase, ref, set, push, get, child } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
            
            const firebaseConfig = {
                apiKey: apiKey,
                authDomain: "prototypeciva.firebaseapp.com",
                databaseURL: "https://prototypeciva-default-rtdb.europe-west1.firebasedatabase.app",
                projectId: "prototypeciva",
                storageBucket: "prototypeciva.firebasestorage.app",
                appId: "1:191956270979:web:dc850a748171a8304080b6"
            };
            
            const app = initializeApp(firebaseConfig);
            window.firebaseDb = getDatabase(app);
            window.firebaseRef = ref;
            window.firebaseSet = set;
            window.firebasePush = push;
            window.firebaseGet = get;
            window.firebaseChild = child;
            console.log('[Firebase] Локальная инициализация успешна');
        } catch (e) {
            console.error('[Firebase] Ошибка инициализации:', e);
            throw new Error('Ошибка подключения к Firebase');
        }
    }
    
    if (action === 'save') {
        const profilesRef = window.firebaseRef(window.firebaseDb, 'dating_profiles');
        const newProfileRef = window.firebasePush(profilesRef);
        await window.firebaseSet(newProfileRef, {
            ...data,
            createdAt: Date.now()
        });
        return { success: true, id: newProfileRef.key };
        
    } else if (action === 'getAll') {
        const snapshot = await window.firebaseGet(window.firebaseChild(window.firebaseRef(window.firebaseDb), 'dating_profiles'));
        if (snapshot.exists()) {
            const profiles = snapshot.val();
            const profilesArray = Object.entries(profiles).map(([id, profile]) => ({ id, ...profile }));
            return { success: true, profiles: profilesArray };
        }
        return { success: true, profiles: [] };
    }
}

// Функции для использования в dating.js


async function getAllProfilesFromFirebase() {
    const result = await callFirebaseAPI('getAll');
    return result.profiles || [];
}

// Сохранение Firebase ключа (только для локальной разработки)
window.saveFirebaseKey = function() {
    const isLocalMode = typeof isLocal !== 'undefined' ? isLocal :
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    if (!isLocalMode) {
        alert('На сервере ключ хранится в переменной окружения, не нужно вводить вручную');
        return;
    }
    
    const input = document.getElementById('firebase-api-key');
    if (!input) return;
    const key = input.value.trim();
    const status = document.getElementById('firebase-key-status');
    
    if (key) {
        localStorage.setItem('my_firebase_key', key);
        if (status) {
            status.innerText = "✅ Firebase ключ сохранён (для локальной разработки)";
            status.style.color = "#4ade80";
        }
        // Сбрасываем инициализацию
        window.firebaseDb = null;
        alert('Ключ сохранён! Теперь Firebase работает локально.');
    } else {
        localStorage.removeItem('my_firebase_key');
        if (status) {
            status.innerText = "❌ Ключ удалён";
            status.style.color = "#e94560";
        }
        window.firebaseDb = null;
    }
};

// Ключ для хранения ID анкеты пользователя
const USER_PROFILE_ID_KEY = 'chatbot_firebase_profile_id';

// Получить сохранённый ID анкеты
function getMyProfileId() {
    return localStorage.getItem(USER_PROFILE_ID_KEY);
}

// Сохранить ID анкеты
function setMyProfileId(id) {
    localStorage.setItem(USER_PROFILE_ID_KEY, id);
}

// Обновить существующую анкету
async function updateProfileInFirebase(profileId, profileData) {
    const isLocalMode = typeof isLocal !== 'undefined' ? isLocal :
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    if (isLocalMode) {
        return updateProfileLocal(profileId, profileData);
    }
    
    const response = await fetch('/api/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: profileId, data: profileData })
    });
    
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result;
}

// Локальное обновление
async function updateProfileLocal(profileId, profileData) {
    if (!window.firebaseDb) {
        throw new Error('Firebase не инициализирован');
    }
    
    const profileRef = window.firebaseRef(window.firebaseDb, `dating_profiles/${profileId}`);
    await window.firebaseSet(profileRef, {
        ...profileData,
        updatedAt: Date.now()
    });
    return { success: true };
}

// Модифицируем функцию сохранения (создаёт новую, если нет ID)
async function saveProfileToFirebase(profileData) {
    const existingId = getMyProfileId();
    
    if (existingId) {
        // Обновляем существующую анкету
        await updateProfileInFirebase(existingId, {
            ...profileData,
            updatedAt: Date.now()
        });
        return existingId;
    } else {
        // Создаём новую
        const result = await callFirebaseAPI('save', profileData);
        if (result.id) {
            setMyProfileId(result.id);
        }
        return result.id;
    }
}

// Проверка при загрузке (только для лога)
if (typeof isLocal !== 'undefined' && isLocal && localStorage.getItem('my_firebase_key')) {
    console.log('[Firebase] Локальный режим, ключ есть');
}

// A cached older ui.js may still call this during initialization.
window.checkInviteAccess = async () => true;
