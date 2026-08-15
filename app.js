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
    insightMode: "Режим инсайтов",
    
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
    hypothesesInfo: "<strong>💡 Гипотезы</strong> — неочевидные инсайты о вас, генерируются каждые 16 сообщений. Основаны на анализе фактов, черт и хронологии. Только для чтения.",
    socialInfo: "<strong>👥 Социальные связи</strong> — люди, упомянутые в ваших беседах. Нажмите на контакт, чтобы увидеть его профиль.",
    gapsInfo: "<strong>🔍 Белые пятна</strong> — важные темы о вас, которые остаются неизвестными. Обновляются каждые 6 сообщений. Только для чтения.",
    factsInfo: "<strong>📋 Факты</strong> — конкретная информация о вас: имя, работа, интересы, предпочтения. Каждый факт подтверждён цитатами.",
    traitsInfo: "<strong>🧠 Черты личности</strong> — ваши психологические особенности, стиль мышления, ценности. Могут объединяться в сложные характеристики.",
    timelineInfo: "<strong>📅 Хронология</strong> — события вашей жизни, текущие периоды, планы на будущее.",
    
    // Placeholders
    placeholderEmpty: "Пока ничего не накоплено...",
    placeholderFacts: "Факты о пользователе будут накапливаться здесь...",
    placeholderTraits: "Черты личности будут накапливаться здесь...",
    placeholderTimeline: "Хронология жизни будет здесь...",
    placeholderStyle: "Настройки стиля общения бота будут здесь...",
    placeholderHypotheses: "Неочевидные гипотезы о вас появятся здесь...",
    placeholderSocial: "Люди из вашей жизни появятся здесь...",
    placeholderGaps: "Важные неизвестные темы появятся здесь...",
    
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
    chatModel: 'chatbot_chat_model', // выбранная платная модель (hydra-gemini-3-pro | glm-5.2)
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
    translations: 'chatbot_translations'
};

// ==================== LIMITS ====================
const LIMITS = {
    facts: 100,
    traits: 50,
    timeline: 50,
    social: 20,
    hypotheses: 10,
    gaps: 5,
    evidencePerItem: 3
};

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
        if (translations[key]) {
            if (key.endsWith('Info')) {
                el.innerHTML = translations[key];
            } else {
                el.textContent = translations[key];
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            el.placeholder = translations[key];
        }
    });

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

// ==================== INVITE SYSTEM ====================
const INVITE_STORAGE_KEY = 'chatbot_invite_activated';
const INVITE_ODEX_KEY = 'chatbot_user_odex';

// Генерируем или получаем уникальный ID юзера
function getOrCreateUserOdex() {
    let odex = localStorage.getItem(INVITE_ODEX_KEY);
    if (!odex) {
        odex = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
        localStorage.setItem(INVITE_ODEX_KEY, odex);
    }
    return odex;
}

// Проверяем, активирован ли юзер
function isInviteActivated() {
    return localStorage.getItem(INVITE_STORAGE_KEY) === 'true';
}

// Сохраняем статус активации
function setInviteActivated(activated) {
    localStorage.setItem(INVITE_STORAGE_KEY, activated ? 'true' : 'false');
}

// Проверка кода на сервере
async function validateInviteCode(code) {
    try {
        const response = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'validate', code })
        });
        return await response.json();
    } catch (e) {
        console.error('[Invite] Validate error:', e);
        return { success: false, error: e.message };
    }
}

// Активация кода
async function activateInviteCode(code) {
    const odex = getOrCreateUserOdex();
    try {
        const response = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'activate', code, odex })
        });
        const result = await response.json();
        if (result.success) {
            setInviteActivated(true);
        }
        return result;
    } catch (e) {
        console.error('[Invite] Activate error:', e);
        return { success: false, error: e.message };
    }
}

// Проверка статуса юзера на сервере (при перезаходе)
async function checkUserActivation() {
    // Если уже активирован локально — доверяем
    if (isInviteActivated()) {
        return { activated: true };
    }
    
    const odex = getOrCreateUserOdex();
    try {
        const response = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'checkUser', odex })
        });
        const result = await response.json();
        if (result.success && result.activated) {
            setInviteActivated(true);
        }
        return result;
    } catch (e) {
        console.error('[Invite] Check user error:', e);
        return { activated: false };
    }
}

// Показать модалку ввода инвайт-кода
// Показать модалку ввода инвайт-кода
// Показать модалку ввода инвайт-кода
// Показать модалку ввода инвайт-кода
function showInviteModal() {
    const existing = document.getElementById('inviteModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'inviteModal';
    modal.className = 'invite-modal-overlay';
    
    modal.innerHTML = `
        <div class="invite-modal">
            <div class="invite-header">
                <span class="invite-icon">🧠</span>
                <h2>Memory Chatbot</h2>
                <p class="invite-tagline">ИИ, с которым не нужно начинать сначала</p>
            </div>
            
            <div class="invite-body">
                <div class="invite-section">
                    <h3>🎯 Знакомо?</h3>
                    <ul class="invite-audience">
                        <li>🙄 Ты устал каждый раз заново объяснять нейросетям (да и людям) контекст своей жизни и свои ценности.</li>
                        <li>🌪️ У тебя сложный внутренний мир, ты любишь рефлексировать, но тебе не об кого "постучать мысли".</li>
                        <li>🥱 Тебя тошнит от поверхностного Тиндера, где выбирают по фото, а не по глубине личности.</li>
                        <li>🧩 Тебе нужен собеседник для распутывания сложных жизненных узлов.</li>
                    </ul>
                </div>
                
                <div class="invite-section">
                    <h3>🔮 Твоя «Вторая голова»</h3>
                    <p>Это не Siri и не базовый ChatGPT, который забудет тебя через 10 сообщений. Это <strong>настоящий ИИ-союзник с долговременной памятью</strong>. Он непрерывно изучает то, как ты мыслишь, собирает твои черты характера в единый пазл и помогает смотреть на ситуации со стороны, учитывая <em>именно твой</em> контекст.</p>
                </div>
                
                <div class="invite-section">
                    <h3>🛡️ Параноидальная приватность</h3>
                    <p>Твои инсайты, слабости и истории принадлежат только тебе. Вся база знаний хранится <strong>строго локально на твоём устройстве</strong>. Наш сервер — это лишь слепой курьер для доставки сообщений (скоро с E2E-шифрованием). Мы физически не можем прочитать твою память.</p>
                </div>

                <div class="invite-section">
                    <h3>💎 Что внутри уже сейчас:</h3>
                    <ul class="invite-audience">
                        <li><strong>Умные отчёты:</strong> бот анализирует накопленные беседы и выдаёт глубокий разбор твоей личности и скрытых паттернов.</li>
                        <li><strong>Матрица совместимости:</strong> крутейшая побочная фича. Бот строит твой профиль по 50 шкалам и делает беспощадно точный анализ совместимости с другими участниками беты. Никаких фоток — только математика душ. Плюс встроенный защищённый мессенджер.</li>
                    </ul>
                </div>

                <div class="invite-section">
                    <h3>🚀 В ближайшем будущем</h3>
                    <p>ИИ станет твоим навигатором: алгоритмы профориентации, помощь в принятии тяжёлых решений и персональное развитие, основанное на твоей истинной природе, а не на мотивационных цитатах из интернета.</p>
                </div>
                
                <div class="invite-section invite-warning">
                    <h3>⚠️ Честное предупреждение</h3>
                    <p>Это <strong>закрытая бета-версия</strong> прототипа. Баги будут. Но если ты готов стать одним из первых исследователей этой технологии — добро пожаловать.</p>
                </div>
                
                <div class="invite-section invite-cta">
                    <h3>🎟️ Вход по инвайтам</h3>
                    <p>Нейросети требуют мощностей, поэтому пускаем дозированно.</p>
                    <p class="invite-hint">Получить код: <a href="https://t.me/Berberber85" target="_blank">@Berberber85</a> в Telegram</p>
                    
                    <input 
                        type="text" 
                        id="inviteCodeInput" 
                        class="invite-input" 
                        placeholder="ВВЕДИ КОД"
                        maxlength="20"
                        autocomplete="off"
                    >
                    <div class="invite-error" id="inviteError"></div>
                    <button class="invite-btn" id="inviteSubmitBtn" onclick="submitInviteCode()">
                        Активировать доступ
                    </button>
                </div>
            </div>
            
            <div class="invite-footer">
                <p>Все данные хранятся локально. <a href="#" onclick="alert('Автор: Сергей Маслаков\\nTelegram: @Berberber85\\nВерсия: Закрытая бета 1.3'); return false;">О проекте</a></p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Принудительно скроллим в самый верх (важно для мобилок)
    modal.scrollTop = 0;
    setTimeout(() => {
        modal.scrollTop = 0;
    }, 10);
    
    // Enter для отправки
    document.getElementById('inviteCodeInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitInviteCode();
    });
}

// Скрыть модалку
function hideInviteModal() {
    const modal = document.getElementById('inviteModal');
    if (modal) modal.remove();
}

// Обработка отправки кода
async function submitInviteCode() {
    const input = document.getElementById('inviteCodeInput');
    const btn = document.getElementById('inviteSubmitBtn');
    const errorEl = document.getElementById('inviteError');
    
    if (!input || !btn) return;
    
    const code = input.value.trim();
    if (!code) {
        if (errorEl) errorEl.textContent = 'Введите код';
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Проверяю...';
    if (errorEl) errorEl.textContent = '';
    
    const result = await activateInviteCode(code);
    
    if (result.success) {
        hideInviteModal();
        // Перезагружаем страницу или просто продолжаем
        window.location.reload();
    } else {
        btn.disabled = false;
        btn.textContent = 'Активировать';
        
        let errorMsg = 'Неверный код';
        if (result.error === 'Code already used' || result.reason === 'already_used') {
            errorMsg = 'Этот код уже использован';
        } else if (result.reason === 'not_found') {
            errorMsg = 'Код не найден';
        }
        
        if (errorEl) errorEl.textContent = errorMsg;
        input.select();
    }
}

// Главная проверка при загрузке
async function checkInviteAccess() {
    // Локальная разработка — пропускаем
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('[Invite] Local mode, skipping invite check');
        return true;
    }
    
    const status = await checkUserActivation();
    
    if (!status.activated) {
        showInviteModal();
        return false;
    }
    
    return true;
}

// Экспорт
window.checkInviteAccess = checkInviteAccess;
window.submitInviteCode = submitInviteCode;
window.isInviteActivated = isInviteActivated;