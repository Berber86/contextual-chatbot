// ==================== CONFIGURATION ====================

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
    btnClearChat: "🗑️ Очистить чат",
    btnClearKnowledge: "⚠️ Очистить знания",
    btnSend: "Отправить",
    btnClose: "✕ Закрыть",
    btnCancel: "Отмена",
    btnSave: "💾 Сохранить",
    
    // Counters
    counterStyle: "🎭 Стиль:",
    counterHypotheses: "💡 Гипотезы:",
    counterGaps: "🔍 Пробелы:",
    
    // Ask Me Mode
    askMeMode: "Режим 'Спроси меня'",
    askMeModeTooltip: "ИИ будет заканчивать ответы вопросами, чтобы узнать о вас больше",
    askMeModeDisabled: "Нужны сначала пробелы в знаниях (подождите 6 сообщений)",
    
    // Chat
    welcomeMessage: "Привет! Я ваш персональный помощник. Расскажите о себе, и я запомню важную информацию.",
    inputPlaceholder: "Введите сообщение...",
    thinkingMessage: "💭 Запоминаю информацию о вас...",
    chatCleared: "Чат очищен. История удалена.",
    
    // Modal
    modalTitle: "📚 База знаний",
    
    // Tabs
    tabFacts: "📋 Факты",
    tabTraits: "🧠 Черты личности",
    tabTimeline: "📅 Хронология",
    tabSocial: "👥 Социальные связи",
    tabStyle: "🎭 Стиль общения",
    tabHypotheses: "💡 Гипотезы",
    tabGaps: "🔍 Белые пятна",
    
    // Tab Info
    styleInfo: "<strong>ℹ️ Стиль общения</strong> — автоматически генерируется каждые 10 сообщений на основе анализа черт личности. Вы можете редактировать настройки вручную.",
    hypothesesInfo: "<strong>💡 Гипотезы</strong> — неочевидные инсайты о вас, генерируются каждые 16 сообщений. Основаны на анализе фактов, черт и хронологии. Только для чтения — ИИ уточняет их автоматически.",
    socialInfo: "<strong>👥 Социальные связи</strong> — люди, упомянутые в ваших беседах. Нажмите на контакт, чтобы увидеть его профиль. Факты подтверждены цитатами из ваших сообщений.",
    gapsInfo: "<strong>🔍 Белые пятна</strong> — важные темы о вас, которые остаются неизвестными. ИИ использует их, чтобы задавать лучшие вопросы. Обновляются каждые 6 сообщений. Только для чтения.",
    
    // Placeholders
    placeholderEmpty: "Пока ничего не накоплено...",
    placeholderFacts: "Факты о пользователе будут накапливаться здесь...\n\nНапример:\n- Имя, возраст\n- Местоположение\n- Профессия\n- Хобби и интересы",
    placeholderTraits: "Черты личности будут накапливаться здесь...\n\nНапример:\n- Интроверт/экстраверт\n- Стиль мышления\n- Эмоциональные характеристики\n- Ценности и приоритеты",
    placeholderTimeline: "Хронология жизни будет здесь...\n\nНапример:\n- Ключевые события\n- Периоды жизни\n- Планы на будущее",
    placeholderStyle: "Настройки стиля общения бота будут здесь...\n\nАвтоматически генерируются каждые 10 сообщений.\nВы можете редактировать вручную.",
    placeholderHypotheses: "Неочевидные гипотезы о вас появятся здесь...\n\nГенерируются каждые 16 сообщений на основе накопленных знаний.\n\nЭто инсайты ИИ, которые выходят за рамки очевидных фактов.",
    placeholderSocial: "Люди из вашей жизни появятся здесь...\n\nУпомянутые друзья, семья, коллеги и другие будут отслеживаться с их деталями.",
    placeholderGaps: "Важные неизвестные темы появятся здесь...\n\nЭто области, где больше информации помогло бы ИИ лучше вам помогать.\n\nГенерируются каждые 6 сообщений.",
    
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
    confirmClearKnowledge: "Очистить ВСЕ накопленные знания о пользователе (включая социальные связи)?",
    confirmUnsavedClose: "Есть несохранённые изменения. Закрыть без сохранения?",
    confirmUnsavedSwitch: "Есть несохранённые изменения. Переключить вкладку без сохранения?",
    
    // Help Modal (русская версия)
    helpTitle: "🧠 Чат-бот с памятью",
    helpWhatIs: "Что это?",
    helpWhatIsText: "Персональный AI-ассистент, который <strong>запоминает</strong> информацию о вас. Чем больше общаетесь — тем лучше он вас понимает.",
    helpWhatRemembers: "Что он запоминает?",
    helpFacts: "Факты — имя, работа, интересы, предпочтения",
    helpTraits: "Черты личности — как вы думаете, что цените",
    helpTimeline: "Хронология — события, планы, важные даты",
    helpPeople: "Люди — семья, друзья, коллеги из ваших рассказов",
    helpInsights: "Инсайты — паттерны и наблюдения о вас",
    helpAskMe: "Режим 'Спроси меня'",
    helpAskMeText: "Включите переключатель — бот будет задавать вопросы, чтобы узнать вас лучше. Вопросы вплетаются естественно в разговор.",
    helpPrivacy: "Приватность",
    helpPrivacyText1: "Все данные хранятся только на вашем устройстве.",
    helpPrivacyText2: "Автор бота технически не может прочитать вашу переписку — она не отправляется лишь на серверы разработчиков ИИ и провайдеров .",
    helpPrivacyText3: "Сообщения обрабатываются через OpenRouter для работы ИИ.",
    helpPrivacyText4: "Нажмите 'Очистить знания' чтобы удалить всеинакопленнвеищнанич бота из Вашего браузера мгновенно.",
    helpRoadmap: "Что ждать дальше?",
    helpRoadmapSync: "Синхронизация между устройствами (опционально)",
    helpRoadmapExport: "Экспорт/импорт базы знаний",
    helpRoadmapSettings: "Больше настроек персонализации",
    helpRoadmapMobile: "Мобильное приложение",
    helpAuthor: "Автор",
    helpVersion: "Версия 1.2 · 2026",
    
    // Alerts
    alertNoApiKey: "Пожалуйста, введите ваш ключ OpenRouter API",
    alertKnowledgeCleared: "Знания очищены",
    
    // Other
    translatingInterface: "Перевод интерфейса..."
};

let currentLanguage = 'ru';
let translations = { ...DEFAULT_TRANSLATIONS };

// ==================== STORAGE KEYS ====================
const STORAGE_KEYS = {
    apiKey: 'chatbot_api_key',
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
    translations: 'chatbot_translations'
};

// ==================== KNOWLEDGE CATEGORIES ====================
const KNOWLEDGE_CATEGORIES = ['facts', 'traits', 'timeline', 'social'];

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
const READONLY_TABS = ['hypotheses', 'gaps'];

// ==================== STATE VARIABLES ====================
let currentCategoryIndex = 0;
let isProcessing = false;
let currentTab = 'facts';
let originalTabContent = '';
let hasUnsavedChanges = false;
let askMeMode = false;

// ==================== LANGUAGE FUNCTIONS (UPDATED FOR NEW UI) ====================
function initLanguageDropdown() {
    // Эта функция больше не нужна в новом интерфейсе
    // Вместо неё используется renderLanguageMenu() в ui.js
    console.log('[Language] initLanguageDropdown() is deprecated in new UI');
}

function toggleLanguageDropdown() {
    // Эта функция больше не нужна в новом интерфейсе
    console.log('[Language] toggleLanguageDropdown() is deprecated in new UI');
}

// Close dropdown when clicking outside - УДАЛЕНО, так как нет dropdown в старом стиле

async function selectLanguage(langCode) {
    if (langCode === currentLanguage) {
        return;
    }

    const lang = LANGUAGES.find(l => l.code === langCode);
    if (!lang) return;

    // Check if we have cached translations
    const cachedTranslations = localStorage.getItem(`${STORAGE_KEYS.translations}_${langCode}`);
    
    if (cachedTranslations) {
        translations = JSON.parse(cachedTranslations);
        currentLanguage = langCode;
        localStorage.setItem(STORAGE_KEYS.language, langCode);
        applyTranslations();
        updateLanguageButton();
        console.log(`[Language] Loaded cached translations for ${langCode}`);
        return;
    }

    // Need to translate via API
    if (!getApiKey()) {
        alert('Please enter API key first to translate interface');
        return;
    }

    await translateInterface(langCode);
}

async function translateInterface(langCode) {
    const lang = LANGUAGES.find(l => l.code === langCode);
    
    // Show loading overlay
    const overlay = document.getElementById('translatingOverlay');
    document.getElementById('translatingText').textContent = 
        `Translating to ${lang.name}...`;
    overlay.classList.add('active');

    try {
        const prompt = `Translate the following UI texts to ${lang.name} (${langCode}). 
Return ONLY a valid JSON object with the same keys but translated values.
Keep emojis in place. Preserve HTML tags like <strong>.
Do not add any explanation, just the JSON.

${JSON.stringify(DEFAULT_TRANSLATIONS, null, 2)}`;

        const response = await callAPIWithoutLanguage([{ role: "user", content: prompt }]);
        const responseText = response.content || response;
        
        // Parse JSON from response
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        
        const newTranslations = JSON.parse(jsonStr);
        
        // Save translations
        localStorage.setItem(`${STORAGE_KEYS.translations}_${langCode}`, JSON.stringify(newTranslations));
        
        translations = newTranslations;
        currentLanguage = langCode;
        localStorage.setItem(STORAGE_KEYS.language, langCode);
        
        applyTranslations();
        updateLanguageButton();
        
        console.log(`[Language] Translated to ${langCode}:`, translations);
        
    } catch (error) {
        console.error('[Language] Translation error:', error);
        alert(`Translation failed: ${error.message}`);
    } finally {
        overlay.classList.remove('active');
    }
}

function applyTranslations() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            if (key === 'styleInfo' || key === 'hypothesesInfo' || key === 'socialInfo' || key === 'gapsInfo') {
                el.innerHTML = translations[key];
            } else {
                el.textContent = translations[key];
            }
        }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            el.placeholder = translations[key];
        }
    });

    // Update current tab placeholder
    if (currentTab) {
        updateTabPlaceholder();
    }

    // initLanguageDropdown(); // УДАЛЕНО - больше не инициализируем старый dropdown
}

function updateLanguageButton() {
    // Эта функция больше не нужна, так как нет отдельной кнопки языка
    // Язык теперь в меню настроек
    console.log('[Language] updateLanguageButton() is deprecated in new UI');
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

// ==================== LANGUAGE LOADING ====================
// В функции loadLanguage() в app.js добавь:
function loadLanguage() {
    const savedLang = localStorage.getItem(STORAGE_KEYS.language);
    if (savedLang) {
        currentLanguage = savedLang;
        const cachedTranslations = localStorage.getItem(`${STORAGE_KEYS.translations}_${savedLang}`);
        if (cachedTranslations) {
            translations = JSON.parse(cachedTranslations);
        }
    } else {
        // Если язык не сохранён, используем русский по умолчанию
        currentLanguage = 'ru';
        const cachedTranslations = localStorage.getItem(`${STORAGE_KEYS.translations}_ru`);
        if (cachedTranslations) {
            translations = JSON.parse(cachedTranslations);
        } else {
            // Если нет кэшированных переводов на русский, используем дефолтные
            translations = { ...DEFAULT_TRANSLATIONS };
        }
    }
    applyTranslations();
}


function getApiKey() {
    // Определяем, локально ли мы (должно быть согласовано с ui.js)
    const isLocal = window.location.hostname.includes('localhost') ||
        window.location.hostname.includes('127.0.0.1');
    
    if (isLocal) {
        // Локально: ищем ключ в LocalStorage
        const key = localStorage.getItem('my_openrouter_key');
        return key ? key.trim() : null;
    }
    // На сервере: ключ подставит бэкенд, нам он тут не нужен
    return 'server-side';
}

// ==================== TOOL DEFINITIONS ====================
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
            const facts = getKnowledge('facts');
            return facts || 'No facts accumulated yet. User dossier is empty.';
        
        case 'get_user_timeline':
            const timeline = getKnowledge('timeline');
            return timeline || 'No timeline data yet. User life events not recorded.';
        
        case 'get_user_traits':
            const traits = getKnowledge('traits');
            return traits || 'No personality analysis yet. Traits not recorded.';
        
        case 'get_user_hypotheses':
            const hypotheses = getHypothesesForDisplay();
            return hypotheses || 'No hypotheses generated yet. Need more conversation data.';
        
        case 'get_user_social':
            const social = getSocialForPrompt();
            return social || 'No social connections recorded yet. User hasn\'t mentioned other people.';
        
        case 'get_knowledge_gaps':
            const gaps = getGapsForPrompt();
            return gaps || 'No knowledge gaps identified yet. Continue learning about the user.';
        
        default:
            return `Unknown tool: ${name}`;
    }
}

// ==================== KNOWLEDGE STORAGE ====================
function getKnowledge(category) {
    if (category === 'hypotheses') {
        return getHypothesesForDisplay();
    }
    if (category === 'social') {
        return getSocialForDisplay();
    }
    if (category === 'gaps') {
        return getGapsForDisplay();
    }
    return localStorage.getItem(STORAGE_KEYS[category]) || '';
}

function setKnowledge(category, content) {
    if (category === 'hypotheses' || category === 'social' || category === 'gaps') {
        return; // These have their own setters
    }
    localStorage.setItem(STORAGE_KEYS[category], content);
}

// ==================== HYPOTHESES STORAGE ====================
function getHypothesesData() {
    const data = localStorage.getItem(STORAGE_KEYS.hypotheses);
    if (!data) return { hypotheses: [] };
    try {
        const parsed = JSON.parse(data);
        // Migration from old format
        if (parsed.hypotheses && parsed.hypotheses.length > 0 && !parsed.hypotheses[0].confidence) {
            parsed.hypotheses = parsed.hypotheses.map(h => ({
                text: h.text,
                confidence: 'medium',
                evidence: [],
                category: 'general',
                createdAt: h.createdAt || 0,
                updatedAt: h.updatedAt || 0,
                revision: 1
            }));
            setHypothesesData(parsed);
        }
        return parsed;
    } catch (e) {
        console.error('[Hypotheses] Parse error:', e);
        return { hypotheses: [] };
    }
}

function setHypothesesData(data) {
    localStorage.setItem(STORAGE_KEYS.hypotheses, JSON.stringify(data));
}

function getHypothesesForDisplay() {
    const data = getHypothesesData();
    if (data.hypotheses.length === 0) return '';
    
    const confidenceEmoji = {
        'low': '🔴',
        'medium': '🟡', 
        'high': '🟢',
        'very_high': '🌟'
    };
    
    return data.hypotheses.map((h, i) => {
        const conf = confidenceEmoji[h.confidence] || '⚪';
        const evidence = h.evidence && h.evidence.length > 0 
            ? h.evidence.join(', ') 
            : 'No direct evidence yet';
        const revision = h.revision || 1;
        const updated = h.updatedAt !== h.createdAt 
            ? ` | Updated: #${h.updatedAt}` 
            : '';
        
        return `[${i + 1}] 💡 ${h.text}
    📊 Confidence: ${conf} ${h.confidence}
    📎 Based on: ${evidence}
    🏷️ Category: ${h.category || 'general'}
    📅 Created: #${h.createdAt}${updated} | Revision: ${revision}`;
    }).join('\n\n');
}

function getHypothesesForPrompt() {
    const data = getHypothesesData();
    if (data.hypotheses.length === 0) return '(no hypotheses yet)';
    
    return data.hypotheses.map((h, i) => {
        const evidence = h.evidence && h.evidence.length > 0 
            ? `Evidence: [${h.evidence.join('; ')}]` 
            : 'Evidence: none';
        return `[${i + 1}] ${h.text}
   Confidence: ${h.confidence} | Category: ${h.category} | ${evidence}
   Created: msg #${h.createdAt} | Updated: msg #${h.updatedAt} | Revisions: ${h.revision || 1}`;
    }).join('\n\n');
}

function getHypothesesCount() {
    return getHypothesesData().hypotheses.length;
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
    
    const priorityEmoji = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
    };
    
    return data.gaps.map((g, i) => {
        const prio = priorityEmoji[g.priority] || '⚪';
        const related = g.relatedTo && g.relatedTo.length > 0 
            ? g.relatedTo.join(', ') 
            : 'general';
        
        return `[${i + 1}] ${prio} ${g.topic}
    💭 Why important: ${g.reason}
    🏷️ Related to: ${related}
    📅 Added: #${g.createdAt || data.lastUpdated}`;
    }).join('\n\n');
}

function getGapsForPrompt() {
    const data = getGapsData();
    if (data.gaps.length === 0) return '(no knowledge gaps identified yet)';
    
    return data.gaps.map((g, i) => {
        const related = g.relatedTo && g.relatedTo.length > 0 
            ? `[${g.relatedTo.join(', ')}]` 
            : '';
        return `${i + 1}. [${g.priority}] ${g.topic}
   Why: ${g.reason} ${related}`;
    }).join('\n\n');
}

// ==================== SOCIAL STORAGE ====================
const SOCIAL_CONFIG = {
    maxContacts: 20,
    strengthColors: {
        1: '🔴',
        2: '🟡', 
        3: '🟢'
    },
    sentimentEmoji: {
        positive: '💚',
        neutral: '😐',
        negative: '💔'
    }
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
}

function getStrengthIndicator(strength) {
    const s = Math.min(Math.max(strength, 1), 3);
    const color = SOCIAL_CONFIG.strengthColors[s] || SOCIAL_CONFIG.strengthColors[1];
    return `${color} (${strength})`;
}

function getSentimentEmoji(sentiment) {
    return SOCIAL_CONFIG.sentimentEmoji[sentiment] || SOCIAL_CONFIG.sentimentEmoji.neutral;
}

function getSocialForDisplay() {
    const data = getSocialData();
    if (data.contacts.length === 0) return '';
    
    return data.contacts.map((c, i) => {
        const sentiment = getSentimentEmoji(c.sentiment);
        const factsCount = c.facts ? c.facts.length : 0;
        const traitsCount = c.traits ? c.traits.length : 0;
        
        return `[${i + 1}] ${sentiment} ${c.name}
    📋 Relation: ${c.relation || 'unknown'}
    📊 Facts: ${factsCount} | Traits: ${traitsCount}
    📅 Last mentioned: #${c.lastMentioned || c.createdAt}`;
    }).join('\n\n');
}

function getSocialForPrompt() {
    const data = getSocialData();
    if (data.contacts.length === 0) return '(no social connections recorded yet)';
    
    return data.contacts.map((c, i) => {
        const aliases = c.aliases && c.aliases.length > 0 
            ? `(also known as: ${c.aliases.join(', ')})` 
            : '';
        
        const factsText = c.facts && c.facts.length > 0
            ? c.facts.map(f => `  • ${f.text} [strength: ${f.strength}]`).join('\n')
            : '  (no facts)';
            
        const traitsText = c.traits && c.traits.length > 0
            ? c.traits.map(t => `  • ${t.text} [strength: ${t.strength}]`).join('\n')
            : '  (no traits)';
            
        const interactionsText = c.interactions && c.interactions.length > 0
            ? c.interactions.map(int => `  • ${int.text} [strength: ${int.strength}]`).join('\n')
            : '  (no interactions)';
        
        return `[${i + 1}] ${c.name} ${aliases}
Relation: ${c.relation || 'unknown'} | Sentiment: ${c.sentiment || 'neutral'}
Facts:
${factsText}
Traits:
${traitsText}
Interactions:
${interactionsText}
Last mentioned: msg #${c.lastMentioned || c.createdAt}`;
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
        if (c.aliases && c.aliases.some(a => a.toLowerCase() === nameLower)) return true;
        return false;
    });
}

function getSocialCount() {
    return getSocialData().contacts.length;
}