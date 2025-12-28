// ==================== CONFIGURATION ====================
const CONFIG = {
    model: "mistralai/devstral-2512:free",
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    maxRetries: 3,
    baseSystemPrompt: "You are a friendly assistant. Be an attentive and caring conversationalist.",
    styleUpdateInterval: 10,
    hypothesesUpdateInterval: 16,
    gapsUpdateInterval: 6,
    maxHypotheses: 10,
    maxGaps: 5,
    maxToolIterations: 5,
    showToolCalls: true
};

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
    apiKeyTitle: "🔑 OpenRouter API Key",
    apiKeyPlaceholder: "Enter your API key...",
    apiKeySaved: "✓ Key saved",
    
    // Buttons
    btnKnowledge: "📚 User Knowledge",
    btnClearChat: "🗑️ Clear Chat",
    btnClearKnowledge: "⚠️ Clear Knowledge",
    btnSend: "Send",
    btnClose: "✕ Close",
    btnCancel: "Cancel",
    btnSave: "💾 Save",
    
    // Counters
    counterStyle: "🎭 Style:",
    counterHypotheses: "💡 Hypotheses:",
    counterGaps: "🔍 Gaps:",
    
    // Ask Me Mode
    askMeMode: "Ask Me Mode",
    askMeModeTooltip: "AI will end responses with questions to learn more about you",
    askMeModeDisabled: "Need knowledge gaps first (wait for 6 messages)",
    
    // Chat
    welcomeMessage: "Hello! I'm your personal assistant. Tell me about yourself, and I'll remember important information.",
    inputPlaceholder: "Enter message...",
    thinkingMessage: "💭 Remembering information about you...",
    chatCleared: "Chat cleared. History deleted.",
    
    // Modal
    modalTitle: "📚 Knowledge Base",
    
    // Tabs
    tabFacts: "📋 Facts",
    tabTraits: "🧠 Personality Traits",
    tabTimeline: "📅 Timeline",
    tabSocial: "👥 Social",
    tabStyle: "🎭 Communication Style",
    tabHypotheses: "💡 Hypotheses",
    tabGaps: "🔍 White Spots",
    
    // Tab Info
    styleInfo: "<strong>ℹ️ Communication Style</strong> — automatically generated every 10 messages based on personality trait analysis. You can edit settings manually.",
    hypothesesInfo: "<strong>💡 Hypotheses</strong> — non-obvious insights about you, generated every 16 messages. Based on facts, traits, and timeline analysis. Read-only — the AI refines these automatically.",
    socialInfo: "<strong>👥 Social Connections</strong> — people mentioned in your conversations. Click on a contact to see their profile. Facts are backed by quotes from your messages.",
    gapsInfo: "<strong>🔍 White Spots</strong> — important topics about you that remain unknown. The AI uses these to ask better questions. Updated every 6 messages. Read-only.",
    
    // Placeholders
    placeholderEmpty: "Nothing accumulated yet...",
    placeholderFacts: "User facts will be accumulated here...\n\nFor example:\n- Name, age\n- Location\n- Profession\n- Hobbies and interests",
    placeholderTraits: "Personality traits will be accumulated here...\n\nFor example:\n- Introvert/extrovert\n- Thinking style\n- Emotional characteristics\n- Values and priorities",
    placeholderTimeline: "Life timeline will be here...\n\nFor example:\n- Key events\n- Life periods\n- Future plans",
    placeholderStyle: "Bot communication style settings will be here...\n\nAutomatically generated every 10 messages.\nYou can edit manually.",
    placeholderHypotheses: "Non-obvious hypotheses about you will appear here...\n\nGenerated every 16 messages based on accumulated knowledge.\n\nThese are AI insights that go beyond obvious facts.",
    placeholderSocial: "People from your life will appear here...\n\nMentioned friends, family, colleagues, and others will be tracked with their details.",
    placeholderGaps: "Important unknown topics will appear here...\n\nThese are areas where more information would help the AI assist you better.\n\nGenerated every 6 messages.",
    
    // Social Tab
    noContactSelected: "← Select a contact to view details",
    noContacts: "No contacts yet. Mention people in your conversations!",
    contactFacts: "Facts",
    contactTraits: "Personality",
    contactInteractions: "Interactions",
    contactRelation: "Relationship",
    contactSentiment: "Sentiment",
    contactLastMentioned: "Last mentioned",
    contactCreated: "First mentioned",
    evidenceLabel: "Based on",
    
    // Indicators
    unsavedChanges: "⚠️ Unsaved changes",
    readOnly: "🔒 Read-only",
    
    // Confirmations
    confirmClearChat: "Clear chat history?",
    confirmClearKnowledge: "Clear ALL accumulated knowledge about the user (including social connections)?",
    confirmUnsavedClose: "There are unsaved changes. Close without saving?",
    confirmUnsavedSwitch: "There are unsaved changes. Switch tab without saving?",
    
    // Alerts
    alertNoApiKey: "Please enter your OpenRouter API key",
    alertKnowledgeCleared: "Knowledge cleared",
    
    // Other
    translatingInterface: "Translating interface..."
};

let currentLanguage = 'en';
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

// ==================== LANGUAGE FUNCTIONS ====================
function initLanguageDropdown() {
    const dropdown = document.getElementById('languageDropdown');
    dropdown.innerHTML = LANGUAGES.map(lang => `
        <div class="language-option ${lang.code === currentLanguage ? 'active' : ''}" 
             onclick="selectLanguage('${lang.code}')">
            <span class="flag">${lang.flag}</span>
            <span class="name">${lang.name}</span>
        </div>
    `).join('');
}

function toggleLanguageDropdown() {
    const dropdown = document.getElementById('languageDropdown');
    dropdown.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.language-selector')) {
        document.getElementById('languageDropdown').classList.remove('open');
    }
});

async function selectLanguage(langCode) {
    if (langCode === currentLanguage) {
        document.getElementById('languageDropdown').classList.remove('open');
        return;
    }

    const lang = LANGUAGES.find(l => l.code === langCode);
    if (!lang) return;

    document.getElementById('languageDropdown').classList.remove('open');

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

    initLanguageDropdown();
}

function updateLanguageButton() {
    const lang = LANGUAGES.find(l => l.code === currentLanguage);
    if (lang) {
        document.getElementById('currentFlag').textContent = lang.flag;
        document.getElementById('currentLangName').textContent = lang.name;
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
    return localStorage.getItem(STORAGE_KEYS.apiKey) || '';
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