// ui.js - интерфейсная логика для Memory Chatbot
// Two-Stage Response Architecture: Context Analysis → Personalized Response (Streaming)

// ==================== INITIALIZATION & CONFIG ====================
const isLocal = window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1');

const CONFIG = {
  //  model_chat: "mistralai/devstral-2512:free",
    model_chat: "xiaomi/mimo-v2-flash:free",
   // model_chat: "nex-agi/deepseek-v3.1-nex-n1:free",
    model_analysis: "xiaomi/mimo-v2-flash:free",
    
    apiUrl: isLocal ?
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

// Флаг, что приветствие уже было показано в этой сессии
let greetingShown = false;

// Cooldown для приветствий
const GREETING_COOLDOWN_MS = 1 * 60 * 60 * 1; // 4 часа
const GREETING_TIMESTAMP_KEY = 'chatbot_last_greeting';
const GREETING_HISTORY_KEY = 'chatbot_greeting_history';
const MAX_GREETING_HISTORY = 5;


document.addEventListener('DOMContentLoaded', async () => {
    loadLanguage();
    loadChatHistory();
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
    
    // Инициализация розового окошка с ключом
    if (isLocal) initLocalDevSettings();
    
    // === Инициативное приветствие ===
    await showProactiveGreeting();
});

// ==================== PROACTIVE GREETING ====================
// ==================== PROACTIVE GREETING ====================

// ==================== GREETING HISTORY ====================
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

// ==================== PROACTIVE GREETING ====================
// ==================== PROACTIVE GREETING ====================
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
    if (!apiKey) {
        console.log('[Greeting] No API key, skipping proactive greeting');
        return;
    }
    
    if (isLocal && (!apiKey || apiKey.length < 10)) {
        console.log('[Greeting] Invalid API key for local, skipping proactive greeting');
        return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Используем фильтрацию для facts, traits, hypotheses
    const facts = getFactsForPrompt(true);
    const traits = getTraitsForPrompt(true);
    const hypotheses = getHypothesesForPrompt(true);
    
    // Без фильтрации
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
    
    console.log('[Greeting] Generating proactive greeting with streaming (filtered context)...');
    
    // Показываем typing indicator пока готовимся
    showTypingIndicator();
    
    try {
        const messages = [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user }
        ];
        
        // Убираем typing indicator перед стримингом
        hideTypingIndicator();
        
        // Создаём элемент для стриминга
        const streamingElement = createStreamingMessage();
        
        let finalGreeting = '';
        
        // Генерируем случайный сид для гарантии разнообразия
        const randomSeed = Math.floor(Math.random() * 100000000);
        
        await streamResponse(
            messages,
            (partialText) => {
                updateStreamingMessage(streamingElement, partialText);
            },
            (finalText) => {
                finalGreeting = finalText;
                finalizeStreamingMessage(streamingElement, finalText);
            },
            // Передаем настройки температуры и сида
            { temperature: 0.90, seed: randomSeed }
        );
        
        // Сохраняем приветствие в историю для будущего разнообразия
        if (finalGreeting) {
            saveGreetingToHistory(finalGreeting);
        }
        
        localStorage.setItem(GREETING_TIMESTAMP_KEY, Date.now().toString());
        
        console.log(`[Greeting] Proactive greeting sent successfully (Temp: 0.90, Seed: ${randomSeed})`);
        
    } catch (error) {
        hideTypingIndicator();
        
        // Удаляем streaming message если есть
        const streamingMsg = document.getElementById('streamingMessage');
        if (streamingMsg) streamingMsg.remove();
        
        console.error('[Greeting] Streaming failed, trying fallback:', error.message);
        
        // Fallback на обычный запрос без стриминга
        try {
            const response = await callAPI([
                { role: "system", content: prompt.system },
                { role: "user", content: prompt.user }
            ], null, false);
            
            const greeting = response.content || response;
            appendMessage('assistant', greeting, true);
            
            // Сохраняем приветствие в историю
            saveGreetingToHistory(greeting);
            
            localStorage.setItem(GREETING_TIMESTAMP_KEY, Date.now().toString());
            
            console.log('[Greeting] Fallback greeting sent successfully');
            
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

be natural. Be warm. будь не слишком тривиальным. но и не перегружай приветствие контекстуальными отсылками и следи чтобы в
нём не было бреда и бредовых фраз. Show you KNOW them from a NEW angle.


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
        if (!e.target.closest('.settings-wrapper')) {
            const dropdown = document.getElementById('settingsDropdown');
            if (dropdown) dropdown.classList.remove('open');
            closeAllLanguageDropdowns();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const dropdown = document.getElementById('settingsDropdown');
            if (dropdown) dropdown.classList.remove('open');
            closeAllLanguageDropdowns();
        }
    });
}

function toggleSettingsMenu() {
    const settingsDropdown = document.getElementById('settingsDropdown');
    if (settingsDropdown) settingsDropdown.classList.toggle('open');
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
    return history ? JSON.parse(history) : [];
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
    history.forEach(msg => {
        appendMessage(msg.role, msg.content, false);
    });
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

// ==================== STREAMING RESPONSE ====================
// ==================== STREAMING RESPONSE ====================
async function streamResponse(messages, onChunk, onComplete, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'Memory Chatbot'
    };
    
    if (isLocal) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error("API Key is missing!");
        }
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const apiUrl = isLocal ?
        'https://openrouter.ai/api/v1/chat/completions' :
        CONFIG.apiUrl;
    
    // Формируем тело запроса, объединяя базовые параметры и переданные опции
    const requestBody = {
        model: CONFIG.model_chat,
        messages: messages,
        stream: true,
        ...options // Здесь подставятся temperature: 1.3 и seed
    };
    
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
                    const content = json.choices?.[0]?.delta?.content;
                    
                    if (content) {
                        fullText += content;
                        onChunk(fullText);
                    }
                } catch (e) {
                    // Ignore parse errors for incomplete chunks
                }
            }
        }
    }
    
    onComplete(fullText);
    return fullText;
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

async function findRelevantContext(userMessage, history) {
    // Используем фильтрацию для facts, traits, hypotheses
    const allFacts = getFactsForPrompt(true);
    const allTraits = getTraitsForPrompt(true);
    const allHypotheses = getHypothesesForPrompt(true);
    
    // Без фильтрации
    const allTimeline = getTimelineForPrompt();
    const allSocial = getSocialForPrompt();
    const gaps = getGapsForPrompt();
    
    const recentHistory = history.slice(-4).map(m =>
        `${m.role.toUpperCase()}: ${m.content}`
    ).join('\n');
    
    const timeContext = getTimeContext();
    const timeInfo = `${timeContext.dayName}, ${timeContext.timeOfDay}, ${timeContext.season}`;
    
    const analysisPrompt = `You are a context analyst for a personal AI assistant.
Find connections between the user's message and their memory — but ONLY if genuinely relevant.

=== USER'S MESSAGE ===
"${userMessage}"

=== RECENT CONVERSATION ===
${recentHistory || '(start of conversation)'}

=== TIME CONTEXT ===
${timeInfo}

=== USER MEMORY ===
Facts: ${allFacts || '(none)'}
Traits: ${allTraits || '(none)'}
Timeline: ${allTimeline || '(none)'}
Social: ${allSocial || '(none)'}
Hypotheses: ${allHypotheses || '(none)'}
Gaps: ${gaps || '(none)'}

=== ANALYSIS RULES ===
1. NOT every message needs memory references
2. Simple questions deserve simple answers
3. Only flag connections that would GENUINELY improve the response
4. Empty arrays are FINE — don't force connections
5. Quality over quantity — max 1-2 items per category

Return ONLY valid JSON:
{
    "message_type": "simple_question|emotional|advice_seeking|sharing|complex|casual_chat",
    "needs_personalization": true/false,
    "personalization_intensity": "none|light|moderate|heavy",
    "user_intent": "brief intent",
    "emotional_undertone": "emotion or neutral",
    "key_fact": "ONE most relevant fact, or null",
    "key_trait": "ONE trait that affects HOW to respond, or null",
    "key_person": "relevant person, or null",
    "key_insight": "relevant hypothesis/pattern, or null",
    "suggested_angle": "how to be personal WITHOUT listing facts, or null",
    "gap_opportunity": "only if VERY natural, or null",
    "tone": "warm|playful|serious|supportive|matter-of-fact|neutral"
}`;
    
    try {
        console.log('[Stage1] Analyzing context (with filtered memory)...');
        
        const response = await callAPI(
            [{ role: "user", content: analysisPrompt }],
            null,
            true
        );
        
        const parsed = parseJSON(response.content || response);
        
        if (parsed) {
            console.log('[Stage1] Analysis:', parsed);
            return parsed;
        }
        return null;
        
    } catch (error) {
        console.error('[Stage1] Failed:', error.message);
        return null;
    }
}

async function generateResponseWithContext(userMessage, history, contextAnalysis, targetGap = null) {
    const style = localStorage.getItem(STORAGE_KEYS.style) || '';
    const langName = getLanguageName();
    const archetype = pickResponseArchetype();
    const qp = decideQuestionPolicyForThisTurn();
    const timeContext = getTimeContext();
    
    let contextBlock = '';
    
    if (contextAnalysis) {
        const intensity = contextAnalysis.personalization_intensity || 'light';
        const needsPersonalization = contextAnalysis.needs_personalization !== false;
        
        if (!needsPersonalization || intensity === 'none') {
            contextBlock = `
=== CONTEXT ===
Message type: ${contextAnalysis.message_type || 'general'}
Tone: ${contextAnalysis.tone || 'neutral'}
Note: This is a simple message. Respond naturally WITHOUT forcing memory references.
`;
        } else if (intensity === 'light') {
            contextBlock = `
=== CONTEXT (use lightly) ===
Intent: ${contextAnalysis.user_intent || 'respond helpfully'}
Tone: ${contextAnalysis.tone || 'warm'}
${contextAnalysis.key_fact ? `Relevant fact: ${contextAnalysis.key_fact}` : ''}
${contextAnalysis.key_trait ? `Consider trait: ${contextAnalysis.key_trait}` : ''}
${contextAnalysis.suggested_angle ? `Angle: ${contextAnalysis.suggested_angle}` : ''}

Rule: Use AT MOST one memory reference, and only if it flows naturally.
`;
        } else {
            contextBlock = `
=== CONTEXT ===
Intent: ${contextAnalysis.user_intent}
Emotional undertone: ${contextAnalysis.emotional_undertone || 'neutral'}
Tone: ${contextAnalysis.tone || 'warm'}

${contextAnalysis.key_fact ? `• Fact: ${contextAnalysis.key_fact}` : ''}
${contextAnalysis.key_trait ? `• Trait: ${contextAnalysis.key_trait}` : ''}
${contextAnalysis.key_person ? `• Person: ${contextAnalysis.key_person}` : ''}
${contextAnalysis.key_insight ? `• Insight: ${contextAnalysis.key_insight}` : ''}
${contextAnalysis.suggested_angle ? `\n💡 Angle: ${contextAnalysis.suggested_angle}` : ''}
${contextAnalysis.gap_opportunity ? `\n🎯 Gap opportunity: ${contextAnalysis.gap_opportunity}` : ''}

Rule: Pick 1-2 elements MAX that genuinely add value. Don't force them.
`;
        }
    } else {
        contextBlock = `
=== CONTEXT ===
No specific context found. Respond naturally and helpfully.
`;
    }
    
    let styleBlock = style?.trim() ? `\n=== STYLE ===\n${style}\n` : '';
    
    let questionRule = '';
    
    if (targetGap && qp.modeLabel === 'ASK_ME' && qp.shouldAsk) {
        questionRule = `
=== ASK ME MODE: ACTIVE ===
YOUR GOAL: Fill a specific memory gap about: "${targetGap.topic}"
REASON: ${targetGap.reason}

INSTRUCTION:
1. First, answer the user's current message naturally.
2. Then, create a SEMANTIC BRIDGE to the target topic:
   - If there is a connection (even a loose one), use it (e.g. "Speaking of...", "That reminds me of...").
   - If the topics are totally unrelated, use a "Pivot" phrase (e.g. "On a totally different note...", "This popped into my head...").
   - DO NOT make a jarring transition like "Cool cat. When did your grandma die?". Acknowledge the shift if necessary.
   - в идеале стремись к тому чтобы семантический мост был сам по себе интересным и обоснованным
3. Ask the question about "${targetGap.topic}".
`;
    } else if (qp.modeLabel === 'ASK_ME' && qp.shouldAsk) {
        questionRule = `\nQuestion: You MAY end with ONE question about them (Ask Me Mode is on).`;
    } else if (!qp.shouldAsk) {
        questionRule = `\nQuestion: Do NOT ask questions in this response.`;
    }
    
    const systemPrompt = `You are a personal AI who knows this user. Respond in ${langName}.

${contextBlock}
${styleBlock}
=== APPROACH ===
Archetype: ${archetype}
${questionRule}

=== KEY RULES ===
1. LESS IS MORE — one natural reference beats three forced ones
2. If context doesn't fit naturally, DON'T USE IT
3. Simple messages get simple responses
4. Sound like a friend, not a database query
5. Vary your style — not every response needs to be "personalized"

Sometimes the best response is just helpful, without proving you have memory.`;
    
    const apiMessages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-8).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        })),
        { role: "user", content: userMessage }
    ];
    
    console.log('[Stage2] Generating response (intensity: ' +
        (contextAnalysis?.personalization_intensity || 'unknown') + ')');
    
    const response = await callAPI(apiMessages, null, false);
    return response.content || response;
}

async function processMessageWithTwoStages(userMessage) {
    const history = getChatHistory();
    
    // ========== STAGE 1: CONTEXT ANALYSIS ==========
    updateThinkingMessage(t('analyzingContext') || '🔍 Understanding context...');
    
    const contextAnalysis = await findRelevantContext(userMessage, history);
    
    let targetGap = null;
    
    const isSensitiveContext = contextAnalysis && (
        contextAnalysis.message_type === 'emotional' || 
        contextAnalysis.message_type === 'complex' ||
        contextAnalysis.emotional_undertone === 'sad' ||
        contextAnalysis.emotional_undertone === 'angry' ||
        contextAnalysis.emotional_undertone === 'anxious'
    );

    if (askMeMode && isAskMeModeAvailable() && !isSensitiveContext) {
        targetGap = selectGapForQuestion();
        if (targetGap) {
            console.log(`[AskMe] Targeted gap: "${targetGap.topic}"`);
        }
    }

    // ========== STAGE 2: STREAMING RESPONSE ==========
    removeThinkingMessage();
    
    const streamingElement = createStreamingMessage();
    
    try {
        const style = localStorage.getItem(STORAGE_KEYS.style) || '';
        const langName = getLanguageName();
        const archetype = pickResponseArchetype();
        const qp = decideQuestionPolicyForThisTurn();
        
        let contextBlock = '';
        
        if (contextAnalysis) {
            const intensity = contextAnalysis.personalization_intensity || 'light';
            const needsPersonalization = contextAnalysis.needs_personalization !== false;
            
            if (!needsPersonalization || intensity === 'none') {
                contextBlock = `
=== CONTEXT ===
Message type: ${contextAnalysis.message_type || 'general'}
Tone: ${contextAnalysis.tone || 'neutral'}
Note: This is a simple message. Respond naturally WITHOUT forcing memory references.
`;
            } else if (intensity === 'light') {
                contextBlock = `
=== CONTEXT (use lightly) ===
Intent: ${contextAnalysis.user_intent || 'respond helpfully'}
Tone: ${contextAnalysis.tone || 'warm'}
${contextAnalysis.key_fact ? `Relevant fact: ${contextAnalysis.key_fact}` : ''}
${contextAnalysis.key_trait ? `Consider trait: ${contextAnalysis.key_trait}` : ''}
${contextAnalysis.suggested_angle ? `Angle: ${contextAnalysis.suggested_angle}` : ''}

Rule: Use AT MOST one memory reference, and only if it flows naturally.
`;
            } else {
                contextBlock = `
=== CONTEXT ===
Intent: ${contextAnalysis.user_intent}
Emotional undertone: ${contextAnalysis.emotional_undertone || 'neutral'}
Tone: ${contextAnalysis.tone || 'warm'}

${contextAnalysis.key_fact ? `• Fact: ${contextAnalysis.key_fact}` : ''}
${contextAnalysis.key_trait ? `• Trait: ${contextAnalysis.key_trait}` : ''}
${contextAnalysis.key_person ? `• Person: ${contextAnalysis.key_person}` : ''}
${contextAnalysis.key_insight ? `• Insight: ${contextAnalysis.key_insight}` : ''}
${contextAnalysis.suggested_angle ? `\n💡 Angle: ${contextAnalysis.suggested_angle}` : ''}
${contextAnalysis.gap_opportunity ? `\n🎯 Gap opportunity: ${contextAnalysis.gap_opportunity}` : ''}

Rule: Pick 1-2 elements MAX that genuinely add value. Don't force them.
`;
            }
        } else {
            contextBlock = `
=== CONTEXT ===
No specific context found. Respond naturally and helpfully.
`;
        }
        
        let styleBlock = style?.trim() ? `\n=== STYLE ===\n${style}\n` : '';
        
        let questionRule = '';
        
        if (targetGap && qp.modeLabel === 'ASK_ME' && qp.shouldAsk) {
            questionRule = `
=== ASK ME MODE: ACTIVE ===
YOUR GOAL: Fill a specific memory gap about: "${targetGap.topic}"
REASON: ${targetGap.reason}

INSTRUCTION:
1. First, answer the user's current message naturally.
2. Then, create a SEMANTIC BRIDGE to the target topic.
3. Ask the question about "${targetGap.topic}".
`;
        } else if (qp.modeLabel === 'ASK_ME' && qp.shouldAsk) {
            questionRule = `\nQuestion: You MAY end with ONE question about them (Ask Me Mode is on).`;
        } else if (!qp.shouldAsk) {
            questionRule = `\nQuestion: Do NOT ask questions in this response.`;
        }
        
        const systemPrompt = `You are a personal AI who knows this user. Respond in ${langName}.

${contextBlock}
${styleBlock}
=== APPROACH ===
Archetype: ${archetype}
${questionRule}

=== KEY RULES ===
1. LESS IS MORE — one natural reference beats three forced ones
2. If context doesn't fit naturally, DON'T USE IT
3. Simple messages get simple responses
4. Sound like a friend, not a database query
5. Vary your style — not every response needs to be "personalized"
6. твой ответ не должен звучать как бред
7. не используй слишком много отсылок к контексту в своем ответе

Sometimes the best response is just helpful, without proving you have memory.`;
        
        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...history.slice(-8).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            { role: "user", content: userMessage }
        ];
        
        console.log('[Stage2] Streaming response...');
        
        const fullResponse = await streamResponse(
            apiMessages,
            (partialText) => {
                updateStreamingMessage(streamingElement, partialText);
            },
            (finalText) => {
                finalizeStreamingMessage(streamingElement, finalText);
            }
        );
        
        return fullResponse;
        
    } catch (error) {
        console.error('[Streaming] Failed, falling back:', error.message);
        
        if (streamingElement) {
            streamingElement.remove();
        }
        
        const response = await generateResponseWithContext(userMessage, history, contextAnalysis, targetGap);
        appendMessage('assistant', response, true);
        return response;
    }
}

// ==================== LEGACY: TOOLS-BASED PROCESSING ====================
async function processMessageWithTools(userMessage) {
    const history = getChatHistory();
    const systemPrompt = buildSystemPromptLegacy();
    const tools = getToolDefinitions();
    
    let apiMessages = [
        { role: "system", content: systemPrompt },
        ...history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        })),
        { role: "user", content: userMessage }
    ];

    let iterations = 0;

    while (iterations < CONFIG.maxToolIterations) {
        iterations++;
        console.log(`[Tools] Iteration ${iterations}/${CONFIG.maxToolIterations}`);

        const response = await callAPI(apiMessages, tools, false);
        
        if (response.tool_calls?.length > 0) {
            console.log('[Tools] Model requested tools:', response.tool_calls);
            
            removeThinkingMessage();
            appendThinkingMessage(t('thinkingMessage'));

            apiMessages.push({
                role: "assistant",
                content: response.content || null,
                tool_calls: response.tool_calls
            });

            for (const toolCall of response.tool_calls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
                
                appendToolCall(toolName, toolArgs);
                  const result = executeTool(toolName, toolArgs);
                console.log(`[Tools] ${toolName} result:`, result?.substring?.(0, 100) || result);
                
                apiMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: result
                });
                }
                
                continue;
                }
                
                console.log(`[Tools] Final response after ${iterations} iteration(s)`);
                return response.content || '';
                }
                
                throw new Error('Tool iteration limit exceeded');
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
                function prepareRequestOptions(messages, tools = null, useAnalysisModel = false) {
                    const headers = {
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.href,
                        'X-Title': 'Memory Chatbot'
                    };
                    
                    if (isLocal) {
                        const apiKey = getApiKey();
                        if (!apiKey) {
                            throw new Error("API Key is missing! Enter it in the Dev Settings box.");
                        }
                        headers['Authorization'] = `Bearer ${apiKey}`;
                    }
                    
                    const model = useAnalysisModel ? CONFIG.model_analysis : CONFIG.model_chat;
                    
                    const body = { model, messages };
                    
                    if (tools && tools.length > 0) {
                        body.tools = tools;
                        body.tool_choice = "auto";
                    }
                    
                    return {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(body)
                    };
                }
                
                async function callAPI(messages, tools = null, useAnalysisModel = false, retries = CONFIG.maxRetries) {
                    for (let attempt = 1; attempt <= retries; attempt++) {
                        try {
                            const modelType = useAnalysisModel ? 'analysis' : 'chat';
                            console.log(`[API] Attempt ${attempt}/${retries} (Model: ${modelType})`);
                            
                            const options = prepareRequestOptions(messages, tools, useAnalysisModel);
                            const response = await fetch(CONFIG.apiUrl, options);
                            
                            if (!response.ok) {
                                const errorText = await response.text();
                                if (response.status === 401 && isLocal) {
                                    throw new Error("Invalid API Key. Check your key.");
                                }
                                throw new Error(`HTTP ${response.status}: ${errorText}`);
                            }
                            
                            const data = await response.json();
                            
                            // Основной формат OpenRouter
                            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                                return data.choices[0].message;
                            }
                            
                            // Альтернативный формат
                            if (data.choices && data.choices.length > 0 && data.choices[0].text) {
                                return { content: data.choices[0].text, role: 'assistant' };
                            }
                            
                            // Прямой content
                            if (data.content) {
                                return { content: data.content, role: 'assistant' };
                            }
                            
                            // Если data.message существует
                            if (data.message && typeof data.message === 'string') {
                                return { content: data.message, role: 'assistant' };
                            }
                            
                            // Ошибка от API
                            if (data.error) {
                                throw new Error(data.error.message || JSON.stringify(data.error));
                            }
                            
                            console.error('[API] Cannot parse response structure:', Object.keys(data));
                            throw new Error('Could not parse API response');
                            
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
                            const response = await callAPI([{ role: "user", content: prompt }], null, useAnalysisModel);
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
                
                // ==================== LOCAL DEV SETTINGS ====================
                function initLocalDevSettings() {
                    const devBox = document.getElementById('dev-settings');
                    if (devBox) {
                        devBox.style.display = 'block';
                        
                        const savedKey = localStorage.getItem('my_openrouter_key');
                        const statusSpan = document.getElementById('key-status');
                        const input = document.getElementById('local-api-key');
                        
                        if (savedKey && input) {
                            input.value = savedKey;
                            if (statusSpan) statusSpan.innerText = "✅ Loaded";
                        }
                    }
                }
                
                window.saveLocalKey = function() {
                    const input = document.getElementById('local-api-key');
                    if (input) {
                        const key = input.value.trim();
                        if (key.startsWith('sk-or-')) {
                            localStorage.setItem('my_openrouter_key', key);
                            const status = document.getElementById('key-status');
                            if (status) status.innerText = "💾 Saved!";
                            alert("API Key saved locally!");
                        } else {
                            alert("Key typically starts with 'sk-or-'. Please check.");
                        }
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
                
                // ==================== INITIALIZATION COMPLETE ====================
                console.log('[ui.js] Loaded. Two-Stage Response Architecture with Streaming active.');
                console.log('[ui.js] Debug commands: debugTwoStage("message"), debugMemory()');              