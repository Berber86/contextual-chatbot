// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    loadLanguage();
    loadApiKey();
    loadChatHistory();
    autoResizeTextarea();
    updateStyleCounter();
    updateHypoCounter();
    updateGapsCounter();
    initLanguageDropdown();
    updateAskMeModeUI();
});

function loadLanguage() {
    const savedLang = localStorage.getItem(STORAGE_KEYS.language);
    if (savedLang) {
        currentLanguage = savedLang;
        const cachedTranslations = localStorage.getItem(`${STORAGE_KEYS.translations}_${savedLang}`);
        if (cachedTranslations) {
            translations = JSON.parse(cachedTranslations);
        }
    }
    applyTranslations();
    updateLanguageButton();
}

// ==================== API KEY ====================
function loadApiKey() {
    const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey);
    if (apiKey) {
        document.getElementById('apiKeyInput').value = apiKey;
        document.getElementById('apiStatus').textContent = t('apiKeySaved');
        document.getElementById('apiSection').classList.add('collapsed');
    }
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (apiKey) {
        localStorage.setItem(STORAGE_KEYS.apiKey, apiKey);
        document.getElementById('apiStatus').textContent = t('apiKeySaved');
    } else {
        localStorage.removeItem(STORAGE_KEYS.apiKey);
        document.getElementById('apiStatus').textContent = '';
    }
}

function toggleApiSection() {
    document.getElementById('apiSection').classList.toggle('collapsed');
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
    updateStyleCounter();
    updateHypoCounter();
    updateGapsCounter();
    return counter;
}

function updateStyleCounter() {
    const counter = getMessageCounter();
    const remaining = CONFIG.styleUpdateInterval - (counter % CONFIG.styleUpdateInterval);
    document.getElementById('styleCounter').textContent = remaining;
}

function updateHypoCounter() {
    const counter = getMessageCounter();
    const remaining = CONFIG.hypothesesUpdateInterval - (counter % CONFIG.hypothesesUpdateInterval);
    document.getElementById('hypoCounter').textContent = remaining;
}

function updateGapsCounter() {
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
        updateStyleCounter();
        updateHypoCounter();
        updateGapsCounter();
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
    const aliasesHtml = contact.aliases && contact.aliases.length > 0
        ? `<div class="aliases">Also known as: ${contact.aliases.join(', ')}</div>`
        : '';
    
    return `
        <div class="contact-meta">
            <span>📋 ${t('contactRelation')}: <strong>${contact.relation || 'unknown'}</strong></span>
            <span>📅 ${t('contactCreated')}: #${contact.createdAt || 0}</span>
            <span>🕐 ${t('contactLastMentioned')}: #${contact.lastMentioned || contact.createdAt || 0}</span>
        </div>
        ${aliasesHtml}
        
        <div class="contact-section">
            <h4>📋 ${t('contactFacts')}</h4>
            ${renderItemsList(contact.facts, 'fact')}
        </div>
        
        <div class="contact-section">
            <h4>🧠 ${t('contactTraits')}</h4>
            ${renderItemsList(contact.traits, 'trait')}
        </div>
        
        <div class="contact-section">
            <h4>🤝 ${t('contactInteractions')}</h4>
            ${renderItemsList(contact.interactions, 'interaction')}
        </div>
    `;
}

function renderItemsList(items, type) {
    if (!items || items.length === 0) {
        return `<div class="${type}-item" style="color: #888; font-style: italic;">No data yet</div>`;
    }
    
    return items.map(item => {
        const strengthIndicator = getStrengthIndicator(item.strength || 1);
        const evidenceHtml = item.evidence && item.evidence.length > 0
            ? `<div class="fact-evidence">
                <strong>${t('evidenceLabel')}:</strong>
                ${item.evidence.map(e => `<div class="evidence-item">${e}</div>`).join('')}
               </div>`
            : '';
        
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
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
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

function getLanguageInstruction() {
    if (currentLanguage === 'en') return '';
    return `\n\nIMPORTANT: Respond in ${getLanguageName()}.`;
}

// ==================== API REQUESTS ====================
async function callAPI(messages, tools = null, retries = CONFIG.maxRetries) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('API key not specified');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[API] Attempt ${attempt}/${retries}...`);
            
            const requestBody = {
                model: CONFIG.model,
                messages: messages
            };

            if (tools && tools.length > 0) {
                requestBody.tools = tools;
                requestBody.tool_choice = "auto";
            }

            const response = await fetch(CONFIG.apiUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.href,
                    "X-Title": "Memory Chatbot"
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
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
            
            if (attempt === retries) {
                throw error;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

async function callAPIWithoutLanguage(messages, retries = CONFIG.maxRetries) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('API key not specified');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(CONFIG.apiUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.href,
                    "X-Title": "Memory Chatbot"
                },
                body: JSON.stringify({
                    model: CONFIG.model,
                    messages: messages
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message;
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

async function callAPIWithRetry(prompt, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await callAPI([{ role: "user", content: prompt }], null);
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

    if (!getApiKey()) {
        alert(t('alertNoApiKey'));
        document.getElementById('apiSection').classList.remove('collapsed');
        return;
    }

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

        const response = await callAPI(apiMessages, tools);
        
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

// ==================== BACKGROUND ANALYSIS ====================
async function runBackgroundAnalysis() {
    const history = getChatHistory();
    
    if (history.length < 2) {
        console.log('[Analysis] Not enough messages for analysis');
        return;
    }
    
    const category = KNOWLEDGE_CATEGORIES[currentCategoryIndex];
    const categoryName = CATEGORY_NAMES[category];
    currentCategoryIndex = (currentCategoryIndex + 1) % KNOWLEDGE_CATEGORIES.length;
    
    console.log(`[Analysis] Starting analysis for category: ${categoryName}`);
    
    try {
        // Social обрабатывается своей функцией
        if (category === 'social') {
            await extractSocialInformation(history);
            return;
        }
        
        const extractedInfo = await extractInformation(history, category, categoryName);
        
        if (!extractedInfo || extractedInfo.trim().toLowerCase().includes('nothing') ||
            extractedInfo.trim().toLowerCase().includes('not found') ||
            extractedInfo.trim().length < 10) {
            console.log(`[Analysis] No new information found for category "${categoryName}"`);
            return;
        }
        
        console.log(`[Analysis] Extracted:`, extractedInfo);
        
        const currentKnowledge = getKnowledge(category);
        const updatedKnowledge = await mergeKnowledge(currentKnowledge, extractedInfo, categoryName);
        
        setKnowledge(category, updatedKnowledge);
        console.log(`[Analysis] Knowledge updated for category "${categoryName}"`);
        
    } catch (error) {
        console.error(`[Analysis] Analysis error:`, error.message);
    }
}

async function extractInformation(history, category, categoryName) {
    const dialogText = history.map(msg => {
        const speaker = msg.role === 'user' ? 'User' : 'Assistant';
        return `${speaker}: ${msg.content}`;
    }).join('\n\n');

    const langInstruction = currentLanguage !== 'en' 
        ? `Write your response in ${getLanguageName()}.` 
        : '';

    const prompt = `Analyze the following dialogue and extract ONLY ${categoryName}.

DIALOGUE:
${dialogText}

TASK:
Find and list only ${categoryName} that can be learned from this dialogue.
If nothing relevant is found — write "Nothing found".
Write concisely and to the point.
${langInstruction}`;

    console.log(`[Analysis] Extracting information: ${categoryName}...`);
    
    const response = await callAPI([{ role: "user", content: prompt }], null);
    return response.content || response;
}

async function mergeKnowledge(currentKnowledge, newInfo, categoryName) {
    if (!currentKnowledge.trim()) {
        return newInfo;
    }

    const langInstruction = currentLanguage !== 'en' 
        ? `Write your response in ${getLanguageName()}.` 
        : '';

    const prompt = `You have current knowledge about the user (${categoryName}) and new information.

CURRENT KNOWLEDGE:
${currentKnowledge}

NEW INFORMATION:
${newInfo}

TASK:
Merge this information into a single up-to-date list.
- Remove duplicates and anything not directly related to the topic (${categoryName})
- If new information contradicts old — keep the new one with a note about the contradiction
- Structure as you see fit
- Write concisely and informatively
- Don't make things up
${langInstruction}

Output only the final merged result.`;

    console.log(`[Analysis] Merging knowledge: ${categoryName}...`);
    
    const response = await callAPI([{ role: "user", content: prompt }], null);
    return response.content || response;
}

// ==================== SOCIAL EXTRACTION ====================
async function extractSocialInformation(history) {
    console.log('[SOCIAL] extractSocialInformation CALLED');
    console.log('[SOCIAL] History length:', history.length);
    
    if (history.length < 1) {
        console.log('[SOCIAL] No history, skipping');
        return;
    }

    const dialogText = history.map(msg => {
        const speaker = msg.role === 'user' ? 'User' : 'Assistant';
        return `${speaker}: ${msg.content}`;
    }).join('\n\n');

    console.log('[SOCIAL] Dialog:', dialogText.substring(0, 200) + '...');

    const currentData = getSocialData();
    console.log('[SOCIAL] Current contacts:', currentData.contacts.map(c => `${c.name}(${c.facts?.length || 0}f)`).join(', ') || 'none');
    
    let existingContactsList = '(no existing contacts yet)';
    if (currentData.contacts.length > 0) {
        existingContactsList = currentData.contacts.map(c => {
            const aliases = c.aliases && c.aliases.length > 0 
                ? ` (aliases: ${c.aliases.join(', ')})` 
                : '';
            return `• "${c.name}"${aliases} — ${c.relation}`;
        }).join('\n');
    }

    const langInstruction = currentLanguage !== 'en' 
        ? `Write your response in ${getLanguageName()}.` 
        : '';

    const prompt = `You are analyzing a conversation to extract information about PEOPLE mentioned by the user.

=== DIALOGUE ===
${dialogText}

=== EXISTING CONTACTS IN DATABASE ===
${existingContactsList}

=== YOUR TASK ===
Extract ALL information about people mentioned:
1. NEW people not in database → create new contact
2. EXISTING people (match by name/alias/relation) → ADD new facts to them via possibleMergeWith

=== CRITICAL RULES ===
• If user mentions someone who MIGHT be in database → SET possibleMergeWith to that contact's name
• "дочка", "daughter", "дочь" = same person if relation is family
• "wife", "жена", "супруга" = same person  
• When in doubt → MERGE (set possibleMergeWith)
• Extract EVERY fact, trait, interaction mentioned about ANY person
• Even small details matter: "she went to school", "he called", etc.

=== RESPONSE FORMAT ===
Return ONLY valid JSON, no markdown, no explanation:
{
    "contacts": [
        {
            "name": "Name as mentioned",
            "possibleAliases": ["other names"],
            "relation": "family/friend/colleague/other",
            "sentiment": "positive/neutral/negative",
            "facts": [{"text": "fact", "evidence": ["quote"]}],
            "traits": [{"text": "trait", "evidence": ["quote"]}],
            "interactions": [{"text": "interaction", "evidence": ["quote"]}],
            "possibleMergeWith": "EXISTING contact name OR null"
        }
    ]
}

If no people mentioned: {"contacts": []}
${langInstruction}`;

    console.log('[SOCIAL] Sending prompt to API...');

    try {
        const result = await callAPIWithRetry(prompt, 2);
        console.log('[SOCIAL] Raw API response:', result.substring(0, 500));
        
        const parsed = parseJSON(result);
        
        if (parsed && parsed.contacts) {
            console.log('[SOCIAL] Parsed contacts count:', parsed.contacts.length);
            
            if (parsed.contacts.length > 0) {
                parsed.contacts.forEach((c, i) => {
                    console.log(`[SOCIAL] Contact[${i}]: "${c.name}" mergeWith="${c.possibleMergeWith}" facts=${c.facts?.length || 0}`);
                });
                
                integrateSocialData(parsed.contacts);
            } else {
                console.log('[SOCIAL] No people mentioned in dialogue');
            }
        } else {
            console.log('[SOCIAL] Parse failed or no contacts field');
        }
    } catch (error) {
        console.error('[SOCIAL] Extraction failed:', error.message);
    }
}

function integrateSocialData(newContacts) {
    console.log('[INTEGRATE] =====================================');
    console.log('[INTEGRATE] Processing', newContacts.length, 'contacts');
    
    // КРИТИЧНО: Работаем с ОДНОЙ копией данных!
    const data = getSocialData();
    const messageCount = getMessageCounter();
    
    console.log('[INTEGRATE] BEFORE:', data.contacts.map(c => `${c.name}(${c.facts?.length || 0}f)`).join(', ') || 'empty');
    
    for (let i = 0; i < newContacts.length; i++) {
        const newContact = newContacts[i];
        console.log(`[INTEGRATE] --- Contact ${i + 1}: "${newContact.name}" ---`);
        
        let existingContact = null;
        
        // Поиск по possibleMergeWith
        if (newContact.possibleMergeWith) {
            existingContact = data.contacts.find(c => 
                c.name.toLowerCase() === newContact.possibleMergeWith.toLowerCase() ||
                (c.aliases || []).some(a => a.toLowerCase() === newContact.possibleMergeWith.toLowerCase())
            );
            console.log(`[INTEGRATE] Search by mergeWith "${newContact.possibleMergeWith}":`, existingContact ? 'FOUND' : 'NOT FOUND');
        }
        
        // Поиск по имени
        if (!existingContact) {
            existingContact = data.contacts.find(c => 
                c.name.toLowerCase() === newContact.name.toLowerCase() ||
                (c.aliases || []).some(a => a.toLowerCase() === newContact.name.toLowerCase())
            );
            console.log(`[INTEGRATE] Search by name "${newContact.name}":`, existingContact ? 'FOUND' : 'NOT FOUND');
        }
        
        // Поиск по алиасам
        if (!existingContact && newContact.possibleAliases) {
            for (const alias of newContact.possibleAliases) {
                existingContact = data.contacts.find(c => 
                    c.name.toLowerCase() === alias.toLowerCase() ||
                    (c.aliases || []).some(a => a.toLowerCase() === alias.toLowerCase())
                );
                if (existingContact) {
                    console.log(`[INTEGRATE] Search by alias "${alias}": FOUND`);
                    break;
                }
            }
        }
        
        // Fuzzy поиск
        if (!existingContact) {
            existingContact = findContactFuzzy(newContact.name, newContact.relation, data.contacts);
            if (existingContact) {
                console.log(`[INTEGRATE] Fuzzy search: FOUND "${existingContact.name}"`);
            }
        }
        
        if (existingContact) {
            console.log(`[INTEGRATE] >>> UPDATING "${existingContact.name}"`);
            updateExistingContactInPlace(data, existingContact.id, newContact, messageCount);
        } else {
            console.log(`[INTEGRATE] >>> CREATING "${newContact.name}"`);
            const contact = createNewContact(newContact, messageCount);
            data.contacts.push(contact);
        }
    }
    
    // Лимит контактов
    if (data.contacts.length > SOCIAL_CONFIG.maxContacts) {
        trimContacts(data);
    }
    
    // Проверка дублей
    checkForMerges(data);
    
    console.log('[INTEGRATE] AFTER:', data.contacts.map(c => `${c.name}(${c.facts?.length || 0}f)`).join(', '));
    
    // ОДНО сохранение в конце!
    console.log('[INTEGRATE] Saving...');
    setSocialData(data);
    
    // Верификация
    const verify = getSocialData();
    console.log('[INTEGRATE] VERIFY:', verify.contacts.map(c => `${c.name}(${c.facts?.length || 0}f)`).join(', '));
    console.log('[INTEGRATE] =====================================');
}

/**
 * Обновляет контакт НА МЕСТЕ в переданном объекте data
 */
function updateExistingContactInPlace(data, contactId, newData, messageCount) {
    const contact = data.contacts.find(c => c.id === contactId);
    
    if (!contact) {
        console.log('[UPDATE] ERROR: Contact not found!');
        return;
    }
    
    const factsBefore = contact.facts?.length || 0;
    const traitsBefore = contact.traits?.length || 0;
    
    contact.lastMentioned = messageCount;
    
    // Добавляем имя как алиас
    if (newData.name && 
        newData.name.toLowerCase() !== contact.name.toLowerCase() &&
        !(contact.aliases || []).map(a => a.toLowerCase()).includes(newData.name.toLowerCase())) {
        contact.aliases = contact.aliases || [];
        contact.aliases.push(newData.name);
        console.log(`[UPDATE] Added alias: "${newData.name}"`);
    }
    
    // Добавляем новые алиасы
    if (newData.possibleAliases) {
        contact.aliases = contact.aliases || [];
        for (const alias of newData.possibleAliases) {
            if (!contact.aliases.map(a => a.toLowerCase()).includes(alias.toLowerCase()) &&
                alias.toLowerCase() !== contact.name.toLowerCase()) {
                contact.aliases.push(alias);
            }
        }
    }
    
    // Обновляем sentiment
    if (newData.sentiment && newData.sentiment !== 'neutral') {
        contact.sentiment = newData.sentiment;
    }
    
    // Обновляем relation
    if (newData.relation && newData.relation !== 'unknown' && 
        (!contact.relation || contact.relation === 'unknown')) {
        contact.relation = newData.relation;
    }
    
    // МЕРЖИМ FACTS
    contact.facts = contact.facts || [];
    for (const newFact of (newData.facts || [])) {
        const exists = contact.facts.some(f => 
            f.text.toLowerCase().includes(newFact.text.toLowerCase().substring(0, 15)) ||
            newFact.text.toLowerCase().includes(f.text.toLowerCase().substring(0, 15))
        );
        if (!exists) {
            contact.facts.push({
                text: newFact.text,
                evidence: newFact.evidence || [],
                strength: (newFact.evidence || []).length || 1
            });
            console.log(`[UPDATE] +fact: "${newFact.text.substring(0, 40)}..."`);
        }
    }
    
    // МЕРЖИМ TRAITS
    contact.traits = contact.traits || [];
    for (const newTrait of (newData.traits || [])) {
        const exists = contact.traits.some(t => 
            t.text.toLowerCase().includes(newTrait.text.toLowerCase().substring(0, 15)) ||
            newTrait.text.toLowerCase().includes(t.text.toLowerCase().substring(0, 15))
        );
        if (!exists) {
            contact.traits.push({
                text: newTrait.text,
                evidence: newTrait.evidence || [],
                strength: (newTrait.evidence || []).length || 1
            });
            console.log(`[UPDATE] +trait: "${newTrait.text.substring(0, 40)}..."`);
        }
    }
    
    // МЕРЖИМ INTERACTIONS
    contact.interactions = contact.interactions || [];
    for (const newInt of (newData.interactions || [])) {
        const exists = contact.interactions.some(i => 
            i.text.toLowerCase().includes(newInt.text.toLowerCase().substring(0, 15)) ||
            newInt.text.toLowerCase().includes(i.text.toLowerCase().substring(0, 15))
        );
        if (!exists) {
            contact.interactions.push({
                text: newInt.text,
                evidence: newInt.evidence || [],
                strength: (newInt.evidence || []).length || 1
            });
            console.log(`[UPDATE] +interaction: "${newInt.text.substring(0, 40)}..."`);
        }
    }
    
    console.log(`[UPDATE] "${contact.name}": facts ${factsBefore}→${contact.facts.length}, traits ${traitsBefore}→${contact.traits.length}`);
}

function findContactFuzzy(name, relation, contacts) {
    if (!name || !contacts || contacts.length === 0) return null;
    
    const nameLower = name.toLowerCase().trim();
    
    const familySynonyms = [
        ['дочь', 'дочка', 'дочурка', 'daughter', 'ребёнок', 'ребенок', 'child', 'kid', 'girl'],
        ['сын', 'сынок', 'сынуля', 'son', 'ребёнок', 'ребенок', 'child', 'kid', 'boy'],
        ['жена', 'супруга', 'wife', 'spouse'],
        ['муж', 'супруг', 'husband', 'spouse'],
        ['мама', 'мать', 'mom', 'mother', 'мамочка', 'мамуля'],
        ['папа', 'отец', 'dad', 'father', 'папочка', 'батя'],
        ['бабушка', 'бабуля', 'grandmother', 'grandma', 'granny'],
        ['дедушка', 'дедуля', 'grandfather', 'grandpa', 'дед'],
        ['сестра', 'sister', 'сестрёнка', 'сестренка'],
        ['брат', 'brother', 'братик', 'братишка']
    ];
    
    let synonymGroup = null;
    for (const group of familySynonyms) {
        if (group.some(s => nameLower.includes(s) || s.includes(nameLower))) {
            synonymGroup = group;
            break;
        }
    }
    
    for (const contact of contacts) {
        const contactNameLower = contact.name.toLowerCase().trim();
        const contactAliases = (contact.aliases || []).map(a => a.toLowerCase().trim());
        const allContactNames = [contactNameLower, ...contactAliases];
        
        if (synonymGroup && (contact.relation === relation || contact.relation === 'family' || relation === 'family')) {
            for (const contactName of allContactNames) {
                if (synonymGroup.some(s => contactName.includes(s) || s.includes(contactName))) {
                    return contact;
                }
            }
        }
        
        if (nameLower.length >= 3) {
            for (const contactName of allContactNames) {
                if (contactName.length >= 3) {
                    if (contactName.includes(nameLower) || nameLower.includes(contactName)) {
                        return contact;
                    }
                }
            }
        }
    }
    
    return null;
}

function createNewContact(data, messageCount) {
    return {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        aliases: data.possibleAliases || [],
        relation: data.relation || 'unknown',
        sentiment: data.sentiment || 'neutral',
        facts: (data.facts || []).map(f => ({
            text: f.text,
            evidence: f.evidence || [],
            strength: (f.evidence || []).length || 1
        })),
        traits: (data.traits || []).map(t => ({
            text: t.text,
            evidence: t.evidence || [],
            strength: (t.evidence || []).length || 1
        })),
        interactions: (data.interactions || []).map(i => ({
            text: i.text,
            evidence: i.evidence || [],
            strength: (i.evidence || []).length || 1
        })),
        createdAt: messageCount,
        lastMentioned: messageCount
    };
}

function trimContacts(data) {
    const scored = data.contacts.map(c => ({
        contact: c,
        score: (c.facts?.length || 0) + (c.traits?.length || 0) + (c.interactions?.length || 0)
    }));
    
    scored.sort((a, b) => a.score - b.score);
    
    const toRemove = data.contacts.length - SOCIAL_CONFIG.maxContacts;
    for (let i = 0; i < toRemove; i++) {
        const idx = data.contacts.findIndex(c => c.id === scored[i].contact.id);
        if (idx !== -1) {
            console.log(`[TRIM] Removing: ${scored[i].contact.name}`);
            data.contacts.splice(idx, 1);
        }
    }
}

function checkForMerges(data) {
    if (data.contacts.length < 2) return;
    
    for (let i = 0; i < data.contacts.length; i++) {
        for (let j = i + 1; j < data.contacts.length; j++) {
            const c1 = data.contacts[i];
            const c2 = data.contacts[j];
            
            const c1Names = [c1.name.toLowerCase(), ...(c1.aliases || []).map(a => a.toLowerCase())];
            const c2Names = [c2.name.toLowerCase(), ...(c2.aliases || []).map(a => a.toLowerCase())];
            
            const overlap = c1Names.some(n => c2Names.includes(n));
            
            if (overlap) {
                console.log(`[MERGE] Merging: ${c1.name} + ${c2.name}`);
                
                c1.aliases = [...new Set([...(c1.aliases || []), c2.name, ...(c2.aliases || [])])];
                c1.aliases = c1.aliases.filter(a => a.toLowerCase() !== c1.name.toLowerCase());
                
                for (const f of (c2.facts || [])) {
                    if (!(c1.facts || []).some(x => x.text === f.text)) {
                        c1.facts = c1.facts || [];
                        c1.facts.push(f);
                    }
                }
                for (const t of (c2.traits || [])) {
                    if (!(c1.traits || []).some(x => x.text === t.text)) {
                        c1.traits = c1.traits || [];
                        c1.traits.push(t);
                    }
                }
                for (const int of (c2.interactions || [])) {
                    if (!(c1.interactions || []).some(x => x.text === int.text)) {
                        c1.interactions = c1.interactions || [];
                        c1.interactions.push(int);
                    }
                }
                
                c1.lastMentioned = Math.max(c1.lastMentioned || 0, c2.lastMentioned || 0);
                
                data.contacts.splice(j, 1);
                j--;
            }
        }
    }
}

// ==================== GAPS UPDATE ====================
async function runGapsUpdate() {
    const facts = getKnowledge('facts');
    const traits = getKnowledge('traits');
    const timeline = getKnowledge('timeline');
    const hypotheses = getHypothesesForPrompt();
    const social = getSocialForPrompt();
    
    // Проверяем достаточно ли данных
    const hasData = [facts, traits, timeline].filter(k => k && k.trim().length > 20).length;
    
    if (hasData < 1) {
        console.log('[Gaps] Not enough data to identify knowledge gaps');
        return;
    }
    
    const messageCount = getMessageCounter();
    
    console.log(`[Gaps] Generating fresh knowledge gaps...`);
    
    const langInstruction = currentLanguage !== 'en' ?
        `Write your response in ${getLanguageName()}.` :
        '';
    
    const prompt = `You are analyzing what IMPORTANT information is MISSING about a user to help them effectively.

=== WHAT WE KNOW ===

**Facts:**
${facts || '(none yet)'}

**Personality Traits:**
${traits || '(none yet)'}

**Life Timeline:**
${timeline || '(none yet)'}

**Hypotheses:**
${hypotheses || '(none yet)'}

**Social Connections:**
${social || '(none yet)'}

=== YOUR TASK ===
Generate exactly 5 "white spots" — important topics we DON'T know about this user but SHOULD know to help them better.

=== CRITICAL RULES ===
1. Look at what we KNOW and identify logical HOLES
2. If something is already covered in facts/traits/timeline — it's NOT a gap!
3. Focus on what would be PRACTICALLY USEFUL to know
4. Prioritize gaps that would help in everyday conversations

**What makes a GOOD gap:**
• "How do they handle stress?" (if not mentioned in traits)
• "What are their current goals?" (if not in timeline)
• "How do they make decisions?" (if pattern not visible)
• "What's their relationship with X like?" (if social mentions X but no details)

**What makes a BAD gap:**
• Something already answered in the facts above
• Trivia (favorite color, childhood pet name)
• Overly intimate (medical details, trauma)
• Too vague ("their past" — be specific!)

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown, no explanation):
{
    "gaps": [
        {
            "topic": "Specific question or topic we don't know",
            "priority": "high|medium|low",
            "reason": "Why knowing this would help (1-2 sentences)",
            "relatedTo": ["facts", "traits", "social", "timeline", "hypotheses"]
        }
    ]
}

Priority guide:
• high = would significantly improve assistance quality
• medium = useful context for better conversations  
• low = nice to know, not urgent

Exactly 5 gaps. No more, no less.
${langInstruction}`;
    
    try {
        const result = await callAPIWithRetry(prompt, 2);
        console.log('[Gaps] Raw response:', result.substring(0, 300));
        
        const parsed = parseJSON(result);
        
        if (parsed && parsed.gaps && Array.isArray(parsed.gaps)) {
            // Добавляем метаданные
            const gapsWithMeta = parsed.gaps.slice(0, 5).map(g => ({
                ...g,
                createdAt: messageCount
            }));
            
            const newData = {
                gaps: gapsWithMeta,
                lastUpdated: messageCount
            };
            
            setGapsData(newData);
            console.log(`[Gaps] Fresh gaps generated: ${gapsWithMeta.map(g => g.topic.substring(0, 30)).join(', ')}`);
        } else {
            console.log('[Gaps] Failed to parse response');
        }
    } catch (error) {
        console.error('[Gaps] Update failed:', error.message);
    }
}

// ==================== COMMUNICATION STYLE UPDATE ====================
async function runStyleUpdate() {
    const traits = getKnowledge('traits');
    
    if (!traits || traits.trim().length < 20) {
        console.log('[Style] Not enough personality trait data to generate style');
        return;
    }

    console.log('[Style] Generating communication style settings...');

    const langInstruction = currentLanguage !== 'en' 
        ? `Write your response in ${getLanguageName()}.` 
        : '';

    const prompt = `You are an expert in communication psychology. Carefully read the user personality dossier and formulate recommendations for communication style with them.

=== USER DOSSIER (personality traits) ===
${traits}

=== YOUR TASK ===
1. Analyze the user's personality
2. Form hypotheses about what communication style they need
3. Be insightful in this assessment
4. DON'T jump to quick conclusions
5. Weigh at least three arguments to justify each parameter

=== RESPONSE FORMAT ===
Provide a list of communication style parameters with ratings. For example:

🎯 RECOMMENDED COMMUNICATION STYLE:

• Formality: [0-100%] — brief justification
• Emotionality: [0-100%] — brief justification  
• Response detail: [0-100%] — brief justification
• Use of humor: [0-100%] — brief justification
• Support and empathy: [0-100%] — brief justification
• Directness: [0-100%] — brief justification
• Information delivery pace: [slow/medium/fast]

📝 SPECIAL RECOMMENDATIONS:
(What to consider, what to avoid, what to pay attention to)

Use this or a similar format. The main thing is that the recommendations are specific and actionable.
${langInstruction}`;

    try {
        const response = await callAPI([{ role: "user", content: prompt }], null);
        const styleRecommendations = response.content || response;
        
        setKnowledge('style', styleRecommendations);
        console.log('[Style] Style settings updated');
        
    } catch (error) {
        console.error('[Style] Style generation error:', error.message);
    }
}

// ==================== HYPOTHESES UPDATE ====================
async function runHypothesesUpdate() {
    const facts = getKnowledge('facts');
    const traits = getKnowledge('traits');
    const timeline = getKnowledge('timeline');
    
    const nonEmptyCount = [facts, traits, timeline].filter(k => k && k.trim().length > 10).length;
    
    if (nonEmptyCount < 2) {
        console.log('[Hypotheses] Not enough data (need at least 2 of 3 categories filled)');
        return;
    }

    const currentMessageCount = getMessageCounter();
    const currentData = getHypothesesData();
    const hypothesesCount = currentData.hypotheses.length;

    console.log(`[Hypotheses] Starting update cycle. Current count: ${hypothesesCount}`);

    if (hypothesesCount === 0) {
        console.log('[Hypotheses] No hypotheses yet, jumping to add...');
        await runAdditionStep(currentData, facts, traits, timeline, currentMessageCount);
        return;
    }

    let workingData = { ...currentData, hypotheses: [...currentData.hypotheses] };

    workingData = await runDeletionStep(workingData, facts, traits, timeline, currentMessageCount);
    workingData = await runDeepeningStep(workingData, facts, traits, timeline, currentMessageCount);
    workingData = await runAdditionStep(workingData, facts, traits, timeline, currentMessageCount);

    console.log(`[Hypotheses] Update cycle complete. Final count: ${workingData.hypotheses.length}`);
}

async function runDeletionStep(data, facts, traits, timeline, messageCount) {
    const count = data.hypotheses.length;
    
    if (count < 3) {
        console.log('[Hypotheses/Delete] Skipping deletion (< 3 hypotheses)');
        return data;
    }

    const deleteCount = count >= 10 ? 2 : 1;
    console.log(`[Hypotheses/Delete] Will attempt to delete ${deleteCount} hypothesis(es)`);

    const langInstruction = currentLanguage !== 'en' ? `Write your response in ${getLanguageName()}.` : '';

    const prompt = `You are a critical analyst reviewing hypotheses about a user. Your task is to identify hypotheses that should be DELETED.

=== CURRENT HYPOTHESES ===
${getHypothesesForPrompt()}

=== KNOWN FACTS ===
${facts || '(no facts)'}

=== PERSONALITY TRAITS ===
${traits || '(no traits)'}

=== LIFE TIMELINE ===
${timeline || '(no timeline)'}

=== YOUR TASK ===
Identify exactly ${deleteCount} hypothesis(es) to DELETE.

Criteria for deletion (in priority order):
1. PROVEN FALSE — directly contradicted by facts
2. OBSOLETE — superseded by newer, better hypotheses
3. REDUNDANT — too similar to another hypothesis
4. UNSUPPORTED — lowest evidence, never gained support
5. LEAST VALUABLE — if nothing else, pick the least insightful ones

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown, no explanation):
{
    "deletions": [
        {
            "index": 1,
            "reason": "Brief explanation why this should be deleted"
        }
    ]
}

Indices are 1-based (matching the hypothesis numbers above).
You MUST select exactly ${deleteCount} hypothesis(es) for deletion.
${langInstruction}`;

    try {
        const result = await callAPIWithRetry(prompt, 2);
        const parsed = parseJSON(result);
        
        if (parsed && parsed.deletions && parsed.deletions.length > 0) {
            const indicesToDelete = parsed.deletions
                .map(d => d.index - 1)
                .filter(i => i >= 0 && i < data.hypotheses.length)
                .sort((a, b) => b - a);
            
            for (const idx of indicesToDelete) {
                console.log(`[Hypotheses/Delete] Removing hypothesis #${idx + 1}`);
                data.hypotheses.splice(idx, 1);
            }
            
            setHypothesesData(data);
            console.log(`[Hypotheses/Delete] Deleted ${indicesToDelete.length} hypothesis(es).`);
        }
    } catch (error) {
        console.error('[Hypotheses/Delete] Step failed:', error.message);
    }

    return data;
}

async function runDeepeningStep(data, facts, traits, timeline, messageCount) {
    if (data.hypotheses.length === 0) return data;

    console.log('[Hypotheses/Deepen] Analyzing hypotheses for updates...');

    const langInstruction = currentLanguage !== 'en' ? `Write your response in ${getLanguageName()}.` : '';

    const prompt = `You are refining hypotheses about a user based on accumulated knowledge.

=== CURRENT HYPOTHESES ===
${getHypothesesForPrompt()}

=== CONTEXT ===
Facts: ${facts ? facts.substring(0, 500) + "..." : "none"}
Traits: ${traits ? traits.substring(0, 500) + "..." : "none"}
Timeline: ${timeline ? timeline.substring(0, 500) + "..." : "none"}

=== YOUR TASK ===
Review each hypothesis. Decide if it needs UPDATING based on the context.

For each hypothesis you update:
1. REFINE the text — make it more precise, nuanced, or expanded
2. ADJUST confidence — "low", "medium", "high", "very_high"
3. UPDATE evidence — add new supporting facts if found
4. ADJUST category — if a better category fits

IMPORTANT: Only update hypotheses that actually have NEW relevant information. Ignore the rest.

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown):
{
    "updates": [
        {
            "index": 1,
            "text": "Refined hypothesis text...",
            "confidence": "high",
            "evidence": ["evidence 1", "new evidence"],
            "category": "psychology",
            "reason": "Why updated"
        }
    ]
}

If no updates needed, return {"updates": []}.
Index is 1-based.
${langInstruction}`;

    try {
        const result = await callAPIWithRetry(prompt, 2);
        const parsed = parseJSON(result);
        
        if (parsed && parsed.updates && parsed.updates.length > 0) {
            for (const update of parsed.updates) {
                const idx = update.index - 1;
                if (idx >= 0 && idx < data.hypotheses.length) {
                    const h = data.hypotheses[idx];
                    
                    data.hypotheses[idx] = {
                        text: update.text || h.text,
                        confidence: update.confidence || h.confidence,
                        evidence: update.evidence || h.evidence,
                        category: update.category || h.category,
                        createdAt: h.createdAt,
                        updatedAt: messageCount,
                        revision: (h.revision || 1) + 1
                    };
                    
                    console.log(`[Hypotheses/Deepen] Updated hypothesis #${update.index}`);
                }
            }
            
            setHypothesesData(data);
            console.log(`[Hypotheses/Deepen] Updated ${parsed.updates.length} hypothesis(es).`);
        } else {
            console.log('[Hypotheses/Deepen] No updates needed.');
        }
    } catch (error) {
        console.error('[Hypotheses/Deepen] Step failed:', error.message);
    }

    return data;
}

async function runAdditionStep(data, facts, traits, timeline, messageCount) {
    console.log('[Hypotheses/Add] Generating 2 NEW hypotheses...');
    
    const langInstruction = currentLanguage !== 'en' ? `Write your response in ${getLanguageName()}.` : '';
    const existingHypotheses = data.hypotheses.length > 0 ? getHypothesesForPrompt() : '(no existing hypotheses)';
    
    const prompt = `You are an attentive analyst generating hypotheses about a user based on observed patterns.

=== EXISTING HYPOTHESES (Do NOT repeat these) ===
${existingHypotheses}

=== CONTEXT ===
Facts: ${facts || 'none'}
Traits: ${traits || 'none'}
Timeline: ${timeline || 'none'}

=== YOUR TASK ===
Generate exactly 2 NEW hypotheses about this user.

=== CRITICAL GUIDELINES ===
STAY GROUNDED:
• Base hypotheses on ACTUAL patterns visible in the data
• If something is directly stated in facts — it's NOT a hypothesis, skip it
• Prefer practical observations over deep psychological speculation
• "User might prefer X because they mentioned Y" > "User has deep-seated fear of Z"
• When evidence is weak, say so (low confidence)

GOOD HYPOTHESES:
• Connect dots between separate facts
• Explain observed behaviors or preferences
• Predict likely preferences or reactions
• Identify patterns the user might not notice themselves

BAD HYPOTHESES:
• Wild speculation without evidence
• Armchair psychology ("childhood trauma", "fear of abandonment")
• Restating known facts as hypotheses
• Overly dramatic interpretations

=== REQUIREMENTS ===
1. Must be distinct from existing hypotheses
2. Must have at least some supporting evidence from context
3. Should be useful for personalizing future conversations
4. Confidence should reflect actual evidence strength

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown):
{
    "new_hypotheses": [
        {
            "text": "Clear, grounded hypothesis...",
            "confidence": "low|medium|high",
            "evidence": ["specific fact or observation that supports this"],
            "category": "preferences|behavior|goals|relationships|communication|other"
        },
        {
            "text": "Another grounded hypothesis...",
            "confidence": "low|medium|high",
            "evidence": ["supporting observation"],
            "category": "category"
        }
    ]
}

Confidence guide:
• low = single weak hint, might be wrong
• medium = pattern from 2-3 observations
• high = strong pattern, multiple confirmations
${langInstruction}`;
    
    try {
        const result = await callAPIWithRetry(prompt, 2);
        const parsed = parseJSON(result);
        
        if (parsed && parsed.new_hypotheses && parsed.new_hypotheses.length > 0) {
            for (const newH of parsed.new_hypotheses) {
                const hypothesis = {
                    text: newH.text,
                    confidence: newH.confidence || 'medium',
                    evidence: newH.evidence || [],
                    category: newH.category || 'general',
                    createdAt: messageCount,
                    updatedAt: messageCount,
                    revision: 1
                };
                
                data.hypotheses.push(hypothesis);
                console.log(`[Hypotheses/Add] Added: "${hypothesis.text.substring(0, 30)}..."`);
            }
            
            setHypothesesData(data);
            console.log(`[Hypotheses/Add] Added ${parsed.new_hypotheses.length} hypothesis(es). Total: ${data.hypotheses.length}`);
        }
    } catch (error) {
        console.error('[Hypotheses/Add] Step failed:', error.message);
    }
    
    return data;
}