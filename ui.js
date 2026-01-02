// ui.js - интерфейсная логика для Memory Chatbot
// Все функции глобальные, использует функции из app.js и analytics.js

// ==================== INITIALIZATION & CONFIG ====================
const isLocal = window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1');

const CONFIG = {
    model_chat: "mistralai/devstral-2512:free",
    model_analysis: "xiaomi/mimo-v2-flash:free",
    
    apiUrl: isLocal ?
        "https://openrouter.ai/api/v1/chat/completions" :
        "/api/chat",
    
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

// Флаг, что приветствие уже было показано в этой сессии
let greetingShown = false;

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
        // На продакшене скрываем счетчики
        document.getElementById('countersContainer').style.display = 'none';
    }
    
    updateAskMeModeUI();
    
    // Инициализация розового окошка с ключом
    if (isLocal) initLocalDevSettings();
    
    // === Инициативное приветствие ===
    await showProactiveGreeting();
});

// ==================== PROACTIVE GREETING ====================
const GREETING_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 часа в миллисекундах
const GREETING_TIMESTAMP_KEY = 'chatbot_last_greeting';

async function showProactiveGreeting() {
    // Проверяем, что приветствие ещё не показывалось в этой сессии
    if (greetingShown) return;
    greetingShown = true;
    
    // Проверяем cooldown (4 часа с последнего приветствия)
    const lastGreeting = localStorage.getItem(GREETING_TIMESTAMP_KEY);
    if (lastGreeting) {
        const elapsed = Date.now() - parseInt(lastGreeting);
        if (elapsed < GREETING_COOLDOWN_MS) {
            console.log(`[Greeting] Cooldown active. ${Math.round((GREETING_COOLDOWN_MS - elapsed) / 60000)} min remaining`);
            return;
        }
    }
    
    // Проверяем наличие API ключа
    const apiKey = getApiKey();
    if (!apiKey) {
        console.log('[Greeting] No API key, skipping proactive greeting');
        return;
    }
    
    // На локалке проверяем что ключ валидный
    if (isLocal && (!apiKey || apiKey.length < 10)) {
        console.log('[Greeting] Invalid API key for local, skipping proactive greeting');
        return;
    }
    
    // Небольшая задержка для UX (чтобы страница успела загрузиться)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Собираем контекст
    const facts = getKnowledge('facts');
    const traits = getKnowledge('traits');
    const timeline = getKnowledge('timeline');
    const style = getKnowledge('style');
    const gaps = getGapsForPrompt();
    const hypotheses = getHypothesesForPrompt();
    const social = getSocialForPrompt();
    
    // Собираем временной контекст
    const timeContext = getTimeContext();
    
    // Проверяем, есть ли хоть какие-то данные о пользователе
    const hasData = [facts, traits, timeline].some(k => k && k.trim().length > 20);
    
    let prompt;
    const langName = getLanguageName();
    
    if (!hasData) {
        prompt = buildIntroductionPrompt(langName, timeContext);
    } else {
        prompt = buildPersonalizedGreetingPrompt(langName, timeContext, {
            facts, traits, timeline, style, gaps, hypotheses, social
        });
    }
    
    console.log('[Greeting] Generating proactive greeting...');
    console.log('[Greeting] Time context:', timeContext);
    showTypingIndicator();
    
    try {
        const response = await callAPI([
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user }
        ], null, false);
        
        hideTypingIndicator();
        
        const greeting = response.content || response;
        appendMessage('assistant', greeting, true);
        
        // Сохраняем timestamp успешного приветствия
        localStorage.setItem(GREETING_TIMESTAMP_KEY, Date.now().toString());
        
        console.log('[Greeting] Proactive greeting sent successfully');
        
    } catch (error) {
        hideTypingIndicator();
        console.error('[Greeting] Failed to generate greeting:', error.message);
    }
}

// ==================== TIME CONTEXT ====================
function getTimeContext() {
    const now = new Date();
    
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const dayOfMonth = now.getDate();
    const month = now.getMonth(); // 0 = January
    const year = now.getFullYear();
    
    // Время суток
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
    
    // Время года (для северного полушария как ориентир)
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
    
    // Дни недели
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[dayOfWeek];
    
    // Месяцы
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = months[month];
    
    // Особые временные контексты
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFriday = dayOfWeek === 5;
    const isMonday = dayOfWeek === 1;
    const isLateNight = hour >= 0 && hour < 5;
    const isEarlyMorning = hour >= 5 && hour < 7;
    
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
        isWeekend,
        isFriday,
        isMonday,
        isLateNight,
        isEarlyMorning,
        formatted: `${dayName}, ${monthName} ${dayOfMonth}, ${year} at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        languageCode: currentLanguage
    };
}

function formatTimeContextForPrompt(tc) {
    let text = `📅 Date: ${tc.dayName}, ${tc.monthName} ${tc.dayOfMonth}, ${tc.year}
🕐 Time: ${tc.hour}:${tc.minute.toString().padStart(2, '0')} (${tc.timeOfDay})
🗓️ Season: ${tc.season}
🌍 User's language/locale: ${tc.languageCode}`;

    // Добавляем особые контексты
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

Use this context to make your greeting feel ALIVE and PRESENT, not generic.

=== YOUR CAPABILITIES TO MENTION ===
1. 📋 You remember FACTS (name, job, interests, preferences)
2. 🧠 You learn PERSONALITY TRAITS (how they think, what they value)
3. 📅 You track their LIFE TIMELINE (events, plans, milestones)
4. 👥 You remember PEOPLE in their life (family, friends, colleagues)
5. 💡 You form INSIGHTS about them over time
6. 🎭 You adapt your COMMUNICATION STYLE to match them

=== GREETING REQUIREMENTS ===
1. Start with a time-appropriate greeting (good morning/evening/etc.)
2. If there's a relevant holiday — acknowledge it warmly
3. Briefly introduce your memory capabilities (what makes you special)
4. End with an inviting question or open invitation to chat

=== TONE ===
- Warm and welcoming, not robotic
- Naturally weave in time context — don't just list facts
- Be concise but memorable
- Match the cultural context of the language

=== EXAMPLES OF GOOD TIME-AWARE GREETINGS ===
✓ "Good evening! Burning the midnight oil? Perfect time for a chat. I'm an AI who actually remembers you..."
✓ "Happy Friday! Almost weekend — and I'm here whenever you need. Unlike other AIs, I remember everything..."
✓ "Доброй ночи! Не спится? Я тоже не сплю — и в отличие от других ботов, я запомню всё, что ты расскажешь..."
✓ "¡Feliz Navidad! 🎄 Un momento perfecto para conocernos. Soy un asistente que recuerda todo sobre ti..."`,
        
        user: `Generate a welcoming first message for a new user. Make it time-aware and culturally appropriate for ${langName} speakers. Be warm and inviting.`
    };
}

function buildPersonalizedGreetingPrompt(langName, timeContext, context) {
    const { facts, traits, timeline, style, gaps, hypotheses, social } = context;
    const timeContextText = formatTimeContextForPrompt(timeContext);
    
    let styleInstruction = '';
    if (style && style.trim()) {
        styleInstruction = `\n\n=== YOUR COMMUNICATION STYLE WITH THIS USER ===\n${style}`;
    }
    
    return {
        system: `You are a friendly AI assistant with persistent memory. A RETURNING user just opened the chat. You KNOW them!

IMPORTANT: Respond in ${langName}.
${styleInstruction}

=== CURRENT TIME CONTEXT ===
${timeContextText}

=== WHAT YOU KNOW ABOUT THIS USER ===

**Facts:**
${facts || '(limited facts)'}

**Personality Traits:**
${traits || '(still learning their personality)'}

**Life Timeline:**
${timeline || '(no timeline yet)'}

**People in Their Life:**
${social || '(no social connections recorded)'}

**Your Hypotheses About Them:**
${hypotheses || '(no hypotheses yet)'}

=== KNOWLEDGE GAPS (things you'd like to learn) ===
${gaps || '(no specific gaps identified)'}

=== YOUR TASK: CONTEXTUAL PERSONALIZED GREETING ===

Create a greeting that BRILLIANTLY CONNECTS:

1. **TIME CONTEXT** → What you know about them
   - Friday evening + they mentioned hating their job → "TGIF, right?"
   - Monday morning + they're not a morning person → "I'll keep it short..."
   - Late night + they have kids → "Rare quiet moment?"
   - Holiday + family mentioned → Connect them naturally
   - Their birthday if known → Celebrate!

2. **SEASONAL/HOLIDAY AWARENESS**
   - Consider if today (${timeContext.monthName} ${timeContext.dayOfMonth}) has a holiday relevant to ${langName} speakers
   - If there's an upcoming major holiday (2-3 days away) — you can mention anticipation
   - Connect holidays to what you know (they mentioned family → "готовишься к праздникам?")

3. **ONE KNOWLEDGE GAP** (optional, only if natural)
   - If a gap connects to time context, explore it subtly
   - Example: Gap is "weekend activities" + it's Saturday → perfect moment to ask

=== WHAT MAKES A GREAT GREETING ===
✓ Shows you REMEMBER specific things about them
✓ Feels contextually AWARE (time, day, season, culture)
✓ Makes them feel UNDERSTOOD, not surveilled
✓ Ends with something that invites response
✓ One cohesive message, not a list

=== WHAT TO AVOID ===
✗ Listing everything you know
✗ Being creepy ("I've been waiting for you...")
✗ Multiple questions
✗ Generic greetings ("How are you?")
✗ Mentioning "knowledge gaps" explicitly
✗ Forcing connections that don't fit

=== EXCELLENT EXAMPLES ===

For someone who mentioned they work in IT, on a Friday evening:
"Hey! Friday at 7pm — logging off the servers and into weekend mode? 😄 How'd the week treat you?"

For someone with a daughter, late at night:
"Тихий вечер! Дочка уже спит? Редкий момент для себя..."

For someone studying, on a Monday:
"Monday morning... I remember you mentioned exam season. Still in the thick of it?"

For someone during their cultural holiday:
"Happy Diwali! 🪔 With your family visiting, I imagine it's pretty festive at home?"`,
        
        user: `Generate a personalized, time-aware greeting for this returning user. Connect the current moment to what you know about them. Make them feel remembered and understood.`
    };
}

// ==================== SETTINGS MENU ====================
function initSettingsMenu() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsDropdown = document.getElementById('settingsDropdown');
    const languageSelectorMenu = document.getElementById('languageSelectorMenu');
    
    // Инициализируем языковой селектор в меню
    renderLanguageMenu();
    
    // Закрытие меню при клике вне его
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.settings-wrapper')) {
            settingsDropdown.classList.remove('open');
            closeAllLanguageDropdowns();
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            settingsDropdown.classList.remove('open');
            closeAllLanguageDropdowns();
        }
    });
}

function toggleSettingsMenu() {
    const settingsDropdown = document.getElementById('settingsDropdown');
    settingsDropdown.classList.toggle('open');
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
    if (dropdown) {
        dropdown.classList.toggle('open');
    }
}

async function selectLanguageFromMenu(langCode) {
    await selectLanguage(langCode);
    renderLanguageMenu(); // Обновляем меню после выбора
    closeAllLanguageDropdowns();
}

// ==================== ASK ME MODE ====================
function isAskMeModeAvailable() {
    const data = getGapsData();
    return data.gaps && data.gaps.length > 0;
}

function toggleAskMeMode() {
    if (!isAskMeModeAvailable()) {
        return;
    }
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
    
    // Обновляем счетчики только в локальном режиме
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
    document.getElementById('styleCounter').textContent = remaining;
}

function updateHypoCounter() {
    if (!isLocal) return;
    const counter = getMessageCounter();
    const remaining = CONFIG.hypothesesUpdateInterval - (counter % CONFIG.hypothesesUpdateInterval);
    document.getElementById('hypoCounter').textContent = remaining;
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
        chatArea.innerHTML = `
            <div class="message system">
                ${t('chatCleared')}
            </div>
        `;
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
        
        // Обновляем счетчики только в локальном режиме
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
let selectedContactId = null;

function openKnowledgeModal() {
    document.getElementById('knowledgeModal').classList.add('active');
    document.body.classList.add('modal-open');
    switchTab('facts');
}

function closeKnowledgeModal() {
    if (hasUnsavedChanges) {
        if (!confirm(t('confirmUnsavedClose'))) {
            return;
        }
    }
    hasUnsavedChanges = false;
    selectedContactId = null;
    document.getElementById('knowledgeModal').classList.remove('active');
    document.body.classList.remove('modal-open');
}

function switchTab(tab) {
    if (hasUnsavedChanges && tab !== currentTab) {
        if (!confirm(t('confirmUnsavedSwitch'))) {
            return;
        }
    }

    currentTab = tab;
    hasUnsavedChanges = false;
    selectedContactId = null;

    document.querySelectorAll('.modal-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });

    // Hide all info blocks
    document.getElementById('styleInfo').style.display = 'none';
    document.getElementById('hypothesesInfo').style.display = 'none';
    const socialInfo = document.getElementById('socialInfo');
    if (socialInfo) socialInfo.style.display = 'none';
    const gapsInfo = document.getElementById('gapsInfo');
    if (gapsInfo) gapsInfo.style.display = 'none';

    const textarea = document.getElementById('knowledgeTextarea');
    const socialContainer = document.getElementById('socialContainer');

    if (tab === 'social') {
        textarea.style.display = 'none';
        if (socialContainer) {
            socialContainer.style.display = 'flex';
        }
        if (socialInfo) {
            socialInfo.style.display = 'block';
        }
        renderSocialList();
        document.getElementById('readonlyIndicator').style.display = 'none';
        updateEditButtons(false);
        return;
    } else {
        textarea.style.display = 'block';
        if (socialContainer) {
            socialContainer.style.display = 'none';
        }
    }

    // Show relevant info block
    if (tab === 'style') {
        document.getElementById('styleInfo').style.display = 'block';
    } else if (tab === 'hypotheses') {
        document.getElementById('hypothesesInfo').style.display = 'block';
    } else if (tab === 'gaps') {
        if (gapsInfo) gapsInfo.style.display = 'block';
    }

    const content = getKnowledge(tab);
    const isReadonly = READONLY_TABS.includes(tab);
    
    textarea.value = content;
    updateTabPlaceholder();
    textarea.readOnly = isReadonly;
    textarea.classList.toggle('readonly', isReadonly);
    
    originalTabContent = content;

    document.getElementById('readonlyIndicator').style.display = isReadonly ? 'flex' : 'none';
    updateEditButtons(false);
}

function onTextareaChange() {
    if (READONLY_TABS.includes(currentTab)) return;
    
    const textarea = document.getElementById('knowledgeTextarea');
    const changed = textarea.value !== originalTabContent;
    hasUnsavedChanges = changed;
    updateEditButtons(changed);
}

function updateEditButtons(show) {
    if (READONLY_TABS.includes(currentTab) || currentTab === 'social') {
        document.getElementById('saveBtn').style.display = 'none';
        document.getElementById('cancelBtn').style.display = 'none';
        document.getElementById('editIndicator').classList.remove('visible');
        return;
    }
    
    document.getElementById('saveBtn').style.display = show ? 'block' : 'none';
    document.getElementById('cancelBtn').style.display = show ? 'block' : 'none';
    document.getElementById('editIndicator').classList.toggle('visible', show);
}

function saveChanges() {
    if (READONLY_TABS.includes(currentTab) || currentTab === 'social') return;
    
    const textarea = document.getElementById('knowledgeTextarea');
    setKnowledge(currentTab, textarea.value);
    originalTabContent = textarea.value;
    hasUnsavedChanges = false;
    updateEditButtons(false);
    console.log(`[Knowledge] Saved to category "${CATEGORY_NAMES[currentTab]}"`);
}

function cancelChanges() {
    const textarea = document.getElementById('knowledgeTextarea');
    textarea.value = originalTabContent;
    hasUnsavedChanges = false;
    updateEditButtons(false);
}

// ==================== SOCIAL UI (Accordion) ====================
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
        const isActive = contact.id === selectedContactId;
        
        return `
            <div class="social-contact-item ${isActive ? 'active' : ''}" data-contact-id="${contact.id}">
                <div class="social-contact-header" onclick="toggleContact('${contact.id}')">
                    <div class="contact-info">
                        <div class="contact-name">
                            <span>${sentiment}</span>
                            <span>${contact.name}</span>
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

function toggleContact(id) {
    if (selectedContactId === id) {
        selectedContactId = null;
    } else {
        selectedContactId = id;
    }
    renderSocialList();
}

function renderContactDetailsInner(contact) {
    const aliasesHtml = contact.aliases && contact.aliases.length > 0 ?
        `<div class="aliases">Also known as: ${contact.aliases.join(', ')}</div>` :
        '';
    
    // Функция для рендеринга списка с контейнером
    const renderItemsListWithContainer = (items, type) => {
        if (!items || items.length === 0) {
            return `<div class="${type}-item" style="color: #888; font-style: italic;">No data yet</div>`;
        }
        
        const itemsHtml = items.map(item => {
            const strengthIndicator = getStrengthIndicator(item.strength || 1);
            const evidenceHtml = item.evidence && item.evidence.length > 0 ?
                `<div class="fact-evidence">
                    <strong>${t('evidenceLabel')}:</strong>
                    ${item.evidence.map(e => `<div class="evidence-item">${e}</div>`).join('')}
                   </div>` :
                '';
            
            return `
                <div class="${type}-item">
                    <div class="fact-text">
                        <span class="strength-badge">${strengthIndicator}</span>
                        <span>${item.text}</span>
                    </div>
                    ${evidenceHtml}
                </div>
            `;
        }).join('');
        
        return `<div class="${type}-list-container">${itemsHtml}</div>`;
    };
    
    return `
        <div class="social-contact-details-content">
            <div class="contact-meta">
                <span>📋 ${t('contactRelation')}: <strong>${contact.relation || 'unknown'}</strong></span>
                <span>📅 ${t('contactCreated')}: #${contact.createdAt || 0}</span>
                <span>🕐 ${t('contactLastMentioned')}: #${contact.lastMentioned || contact.createdAt || 0}</span>
            </div>
            ${aliasesHtml}
            
            <div class="contact-section">
                <h4>📋 ${t('contactFacts')}</h4>
                ${renderItemsListWithContainer(contact.facts, 'fact')}
            </div>
            
            <div class="contact-section">
                <h4>🧠 ${t('contactTraits')}</h4>
                ${renderItemsListWithContainer(contact.traits, 'trait')}
            </div>
            
            <div class="contact-section">
                <h4>🤝 ${t('contactInteractions')}</h4>
                ${renderItemsListWithContainer(contact.interactions, 'interaction')}
            </div>
        </div>
    `;
}

// ==================== CHAT UI ====================
function appendMessage(role, content, save = true) {
    const chatArea = document.getElementById('chatArea');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.textContent = content;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    if (save) {
        addToHistory(role, content);
    }
}

function appendToolCall(toolName, args) {
    if (!CONFIG.showToolCalls) return;
    
    const chatArea = document.getElementById('chatArea');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message tool-call';
    msgDiv.textContent = `🔧 ${toolName}(${args.reason || ''})`;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function appendThinkingMessage(text) {
    const chatArea = document.getElementById('chatArea');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message thinking';
    msgDiv.id = 'thinkingMessage';
    msgDiv.textContent = text;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function removeThinkingMessage() {
    const msg = document.getElementById('thinkingMessage');
    if (msg) msg.remove();
}

function showTypingIndicator() {
    const chatArea = document.getElementById('chatArea');
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
    const inputForm = textarea.closest('.input-form');
    
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = newHeight + 'px';
        
        if (textarea.value.trim().length > 0) {
            inputForm.style.alignItems = 'flex-start';
        } else {
            inputForm.style.alignItems = 'flex-end';
        }
        
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    });
    
    textarea.addEventListener('focus', () => {
        inputForm.style.alignItems = 'flex-start';
        textarea.style.boxShadow = '0 -2px 10px rgba(233, 69, 96, 0.1)';
    });
    
    textarea.addEventListener('blur', () => {
        if (!textarea.value.trim()) {
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

// ==================== SYSTEM PROMPT BUILDING ====================
function buildSystemPrompt() {
    let prompt = CONFIG.baseSystemPrompt;
    
    const langName = getLanguageName();
    prompt += `\n\nIMPORTANT: Always respond in ${langName}.`;
    
    prompt += `

=== CRITICAL: PROACTIVE MEMORY USE ===
You have access to tools that retrieve information about the user. USE THEM AGGRESSIVELY.

YOUR MEMORY PHILOSOPHY:
• Check context BEFORE responding, not after realizing you needed it
• Multiple tool calls per message are ENCOURAGED
• Personalized responses require personalized context
• When in doubt, retrieve — it's free and makes you smarter
• Combine facts + traits + hypotheses + social for truly insightful responses
• Every conversation turn is a chance to demonstrate you KNOW this person

MINIMUM EXPECTED BEHAVIOR:
• Call at least ONE tool for any non-trivial message
• Call get_user_hypotheses before asking questions
• Call get_user_traits before giving advice
• Call get_user_facts when ANY personal topic arises
• Call get_user_social when ANY person is mentioned
• Call get_knowledge_gaps before asking ANY question to the user

=== KNOWLEDGE GAPS ("WHITE SPOTS") ===
You have access to a list of important topics we DON'T know about the user yet.
When formulating questions:
1. First call get_knowledge_gaps to see what's missing
2. Look for natural opportunities to explore these gaps
3. Weave gap exploration into the conversation organically
4. NEVER interrogate — gaps inform your curiosity, not dictate it
5. Your question should serve BOTH the current context AND gap discovery

You are not a generic assistant. You are THIS user's personal AI who deeply knows them.`;

    // ==================== ASK ME MODE INJECTION ====================
    if (askMeMode && isAskMeModeAvailable()) {
        const gaps = getGapsForPrompt();
        
        prompt += `

=== 🎤 ASK ME MODE: ACTIVE ===
The user has enabled "Ask Me Mode". They WANT you to ask questions to learn more about them.

=== CURRENT KNOWLEDGE GAPS TO EXPLORE ===
${gaps}

=== YOUR BEHAVIOR IN THIS MODE ===
1. End approximately 80% of your responses with a thoughtful question
2. The question MUST:
   - Flow naturally from your response (weave it into the conversation!)
   - Target one of the knowledge gaps listed above
   - Feel like genuine curiosity, not an interview
   - Be contextually relevant to what you just discussed
3. Skip the question ONLY if truly inappropriate (user is upset, crisis, etc.)
4. Questions should be open-ended, inviting reflection

=== HOW TO WEAVE QUESTIONS NATURALLY ===
Your question should feel like a natural extension of your response, not a tacked-on afterthought.

GOOD examples:
✓ "...that makes a lot of sense. I'm curious — when you face situations like this, do you usually talk it through with someone or process it on your own first?"
✓ "...sounds like a solid plan! What would make you feel like it was truly successful?"
✓ "...I can see why that matters to you. Has your perspective on this changed over time, or have you always felt this way?"

BAD examples:
✗ "Here's my answer. Now, unrelated question: what are your career goals?"
✗ "...anyway, tell me about your childhood."
✗ Asking multiple questions in one response
✗ Questions that ignore what the user just said

=== REMEMBER ===
• ONE question per response, maximum
• The question should make the user WANT to answer
• If a gap doesn't fit the current topic — wait for a better moment
• You're having a conversation, not conducting a survey`;
    }
    
    const style = getKnowledge('style');
    
    if (style && style.trim()) {
        prompt += `\n\n=== COMMUNICATION STYLE SETTINGS ===\nFollow these communication style recommendations for this user:\n\n${style}`;
        console.log('[Prompt] Communication style settings added');
    }
    
    return prompt;
}

// ==================== API REQUESTS ====================
// Вспомогательная функция для заголовков и тела запроса
function prepareRequestOptions(messages, tools = null, useAnalysisModel = false) {
    const headers = {
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href, // Нужно для OpenRouter
        'X-Title': 'Memory Chatbot'
    };
    
    // Если мы ДОМА — добавляем ключ вручную
    if (isLocal) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error("API Key is missing! Enter it in the Dev Settings box.");
        }
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Выбираем модель в зависимости от типа запроса
    const model = useAnalysisModel ? CONFIG.model_analysis : CONFIG.model_chat;
    
    const body = {
        model: model,
        messages: messages
    };
    
    if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = "auto"; // <--- ВАЖНО: Это заставляет модель использовать инструменты
    }
    
    return {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    };
}

async function callAPI(messages, tools = null, useAnalysisModel = false, retries = CONFIG.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[API] Attempt ${attempt}/${retries} to ${CONFIG.apiUrl} (Local: ${isLocal}, Model: ${useAnalysisModel ? 'analysis' : 'chat'})`);
            
            const options = prepareRequestOptions(messages, tools, useAnalysisModel);
            const response = await fetch(CONFIG.apiUrl, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                // Специальная обработка для 401 (нет доступа)
                if (response.status === 401 && isLocal) {
                    throw new Error("Invalid API Key in local settings. Check your key.");
                }
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message;
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error(`[API] Attempt ${attempt} error:`, error.message);
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// Используем ту же логику для перевода, чтобы он работал и локально
// Перевод интерфейса используем основную модель (chat)
async function callAPIWithoutLanguage(messages, retries = CONFIG.maxRetries) {
    return callAPI(messages, null, false, retries);
}

// Аналитические задачи используют аналитическую модель
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
    console.log('[JSON Parse] Input text length:', text?.length);
    
    try {
        let jsonStr = text;
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        
        const result = JSON.parse(jsonStr);
        console.log('[JSON Parse] SUCCESS');
        return result;
    } catch (error) {
        console.error('[JSON Parse] FAILED:', error.message);
        console.error('[JSON Parse] Text was:', text?.substring(0, 300));
        return null;
    }
}

// ==================== SEND MESSAGE WITH TOOL USE ====================
async function sendMessage(event) {
    event.preventDefault();
    
    if (isProcessing) return;

    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;

    isProcessing = true;
    document.getElementById('sendBtn').disabled = true;
    input.value = '';
    input.style.height = 'auto';

    appendMessage('user', message);
    showTypingIndicator();

    try {
        const response = await processMessageWithTools(message);
        
        hideTypingIndicator();
        removeThinkingMessage();
        appendMessage('assistant', response);

        const counter = incrementMessageCounter();
        console.log(`[Counter] Messages: ${counter}`);

        // Запускаем анализ для facts/traits/timeline (по ротации)
        runBackgroundAnalysis();
        
        if (shouldUpdateGaps()) {
            console.log('[Gaps] Time to update knowledge gaps!');
            await runGapsUpdate();
        }
        
        // Update Ask Me Mode availability after gaps update
        updateAskMeModeUI();

        if (shouldUpdateStyle()) {
            console.log('[Style] Time to update communication style!');
            await runStyleUpdate();
        }

        if (shouldUpdateHypotheses()) {
            console.log('[Hypotheses] Time to generate/update hypotheses!');
            await runHypothesesUpdate();
        }

    } catch (error) {
        hideTypingIndicator();
        removeThinkingMessage();
        console.error('[Chat] Error:', error);
        appendMessage('system', `Error: ${error.message}`);
    } finally {
        isProcessing = false;
        document.getElementById('sendBtn').disabled = false;
    }
}

async function processMessageWithTools(userMessage) {
    const history = getChatHistory();
    const systemPrompt = buildSystemPrompt();
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

        const response = await callAPI(apiMessages, tools, false); // Основная модель для диалога
        
        if (response.tool_calls && response.tool_calls.length > 0) {
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
                
                console.log(`[Tools] ${toolName} result:`, result);

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

// ==================== HELP MODAL ====================
function openHelpModal() {
    document.getElementById('helpModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeHelpModal() {
    document.getElementById('helpModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Закрытие по клику на оверлей
document.addEventListener('click', (e) => {
    if (e.target.id === 'helpModal') {
        closeHelpModal();
    }
});

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeHelpModal();
    }
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

// Эта функция должна быть глобальной, чтобы работать из onclick в HTML
window.saveLocalKey = function() {
    const input = document.getElementById('local-api-key');
    if (input) {
        const key = input.value.trim();
        if (key.startsWith('sk-or-')) {
            localStorage.setItem('my_openrouter_key', key);
            document.getElementById('key-status').innerText = "💾 Saved!";
            alert("API Key saved locally!");
        } else {
            alert("Key typically starts with 'sk-or-'. Please check.");
        }
    }
}

// Проверка загрузки
console.log('[ui.js] Загружен. UI функции доступны:',
    typeof appendMessage !== 'undefined',
    typeof sendMessage !== 'undefined',
    typeof toggleAskMeMode !== 'undefined',
    typeof showProactiveGreeting !== 'undefined'
);