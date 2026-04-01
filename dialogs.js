// dialogs.js — модуль личных диалогов
// Изолирован, чтобы не конфликтовать с ui.js / app.js

(() => {
    'use strict';

    // ==================== CONFIG ====================
    const DIALOGS_CONFIG = {
        contactsKey: 'chatbot_dialogs_contacts',
        historyPrefix: 'chatbot_dialogs_history_',
        maxMessagesPerDialog: 50,
        maxMessageLength: 512,
        pollMinMs: 60000,
        pollMaxMs: 120000,
        startupCheckDelayMs: 2000  // задержка перед проверкой при запуске
    };

    // ==================== STATE ====================
    let dialogsCurrentPartnerId = null;
    let dialogsPollingTimer = null;
    let dialogsHasSentMessageInSession = false;
    let dialogsIsCheckingMessages = false;

    // ==================== HELPERS ====================
    function dialogsIsLocalMode() {
        return typeof isLocal !== 'undefined'
            ? isLocal
            : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    }

    function dialogsEscapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function dialogsShortText(text, max = 44) {
        const str = String(text || '').replace(/\s+/g, ' ').trim();
        if (str.length <= max) return str;
        return str.slice(0, max - 1) + '…';
    }

    function dialogsFormatDateTime(ts) {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function dialogsRandomPollDelay() {
        const { pollMinMs, pollMaxMs } = DIALOGS_CONFIG;
        return Math.floor(Math.random() * (pollMaxMs - pollMinMs + 1)) + pollMinMs;
    }

    function dialogsGetMyProfileId() {
        if (typeof getMyProfileId === 'function') {
            return getMyProfileId();
        }
        return localStorage.getItem('chatbot_firebase_profile_id');
    }

    function dialogsHistoryKey(partnerId) {
        return `${DIALOGS_CONFIG.historyPrefix}${partnerId}`;
    }

    function dialogsSafeJsonParse(raw, fallback) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    // ==================== LOCAL STORAGE ====================
    function dialogsGetContacts() {
        const raw = localStorage.getItem(DIALOGS_CONFIG.contactsKey);
        const parsed = raw ? dialogsSafeJsonParse(raw, {}) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    }

    function dialogsSaveContacts(contacts) {
        localStorage.setItem(DIALOGS_CONFIG.contactsKey, JSON.stringify(contacts));
        dialogsUpdateUnreadBadge();
    }

    function dialogsGetHistory(partnerId) {
        if (!partnerId) return [];
        const raw = localStorage.getItem(dialogsHistoryKey(partnerId));
        const parsed = raw ? dialogsSafeJsonParse(raw, []) : [];
        return Array.isArray(parsed) ? parsed : [];
    }

    function dialogsSaveHistory(partnerId, messages) {
        if (!partnerId) return;
        let safe = Array.isArray(messages) ? messages : [];
        if (safe.length > DIALOGS_CONFIG.maxMessagesPerDialog) {
            safe = safe.slice(-DIALOGS_CONFIG.maxMessagesPerDialog);
        }
        localStorage.setItem(dialogsHistoryKey(partnerId), JSON.stringify(safe));
    }

    // ==================== EMOJI NAME GENERATION ====================
    function dialogsHashString(str) {
        let hash = 0;
        const s = String(str || '');
        for (let i = 0; i < s.length; i++) {
            hash = ((hash << 5) - hash) + s.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    function dialogsGenerateEmojiNameFromEmbedding(embeddingStr, profileId = '') {
        try {
            if (typeof parseEmbeddingFromExport !== 'function' || !Array.isArray(SCALES)) {
                return '❓❓❓';
            }

            const parsed = parseEmbeddingFromExport(embeddingStr);
            if (!parsed || !Array.isArray(parsed.vectors) || parsed.vectors.length === 0) {
                return '❓❓❓';
            }

            const ranked = parsed.vectors
                .map((v, idx) => ({
                    idx,
                    value: typeof v?.value === 'number' ? v.value : 0.5,
                    emoji: SCALES[idx]?.emoji || '❓'
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);

            if (ranked.length === 0) return '❓❓❓';

            const hash = dialogsHashString(profileId || embeddingStr);
            const picks = [];
            const used = new Set();

            const offsets = [0, 3, 6, 1, 4, 7, 2, 5, 8, 9];
            for (let i = 0; i < offsets.length && picks.length < 3; i++) {
                const index = (hash + offsets[i]) % ranked.length;
                if (!used.has(index)) {
                    used.add(index);
                    picks.push(ranked[index].emoji);
                }
            }

            while (picks.length < 3) picks.push('❓');
            return picks.join('');
        } catch (e) {
            console.error('[Dialogs] Emoji name generation failed:', e);
            return '❓❓❓';
        }
    }

    // ==================== FIREBASE API ====================
    async function dialogsEnsureLocalFirebase() {
        if (window.firebaseDb && window.firebaseRef && window.firebaseSet && window.firebasePush && window.firebaseGet && window.firebaseChild) {
            return;
        }

        const apiKey = localStorage.getItem('my_firebase_key');
        if (!apiKey) {
            throw new Error('Нет Firebase ключа для локальной разработки');
        }

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
    }

    async function dialogsFirebaseLocal(action, data = null, id = null) {
        await dialogsEnsureLocalFirebase();

        if (action === 'getProfile') {
            const snapshot = await window.firebaseGet(
                window.firebaseChild(window.firebaseRef(window.firebaseDb), `dating_profiles/${id}`)
            );
            return { success: true, profile: snapshot.exists() ? snapshot.val() : null };
        }

        if (action === 'sendMessage') {
            const inboxRef = window.firebaseRef(window.firebaseDb, `messages/${data.to}`);
            const newMsgRef = window.firebasePush(inboxRef);
            await window.firebaseSet(newMsgRef, {
                from: id,
                text: data.text,
                timestamp: data.timestamp,
                createdAt: Date.now()
            });
            return { success: true, id: newMsgRef.key };
        }

        if (action === 'getMessages') {
            const snapshot = await window.firebaseGet(
                window.firebaseChild(window.firebaseRef(window.firebaseDb), `messages/${id}`)
            );

            const messages = snapshot.exists()
                ? Object.entries(snapshot.val()).map(([msgId, msg]) => ({ id: msgId, ...msg }))
                : [];

            return { success: true, messages };
        }

        if (action === 'deleteMessages') {
            const ids = Array.isArray(data?.messageIds) ? data.messageIds : [];
            await Promise.all(
                ids.map(msgId =>
                    window.firebaseSet(
                        window.firebaseRef(window.firebaseDb, `messages/${id}/${msgId}`),
                        null
                    )
                )
            );
            return { success: true };
        }

        throw new Error(`Unsupported local dialogs action: ${action}`);
    }

    async function dialogsFirebaseRequest(action, data = null, id = null) {
        const localMode = dialogsIsLocalMode();

        if (localMode) {
            return dialogsFirebaseLocal(action, data, id);
        }

        const response = await fetch('/api/firebase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, data, id })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }

        return result;
    }

    // ==================== CONTACTS ====================
    async function dialogsEnsureContactCached(partnerId, fallbackEmbedding = '', fallbackDescription = '') {
        if (!partnerId) return null;

        const contacts = dialogsGetContacts();
        if (contacts[partnerId] && contacts[partnerId].name) {
            return contacts[partnerId];
        }

        let profile = null;

        try {
            const res = await dialogsFirebaseRequest('getProfile', null, partnerId);
            profile = res.profile || null;
        } catch (e) {
            console.warn('[Dialogs] Could not fetch profile for contact:', partnerId, e.message);
        }

        const embedding = profile?.embedding || fallbackEmbedding || '';
        const description = profile?.descriptionLevel1 || fallbackDescription || '';
        const name = embedding
            ? dialogsGenerateEmojiNameFromEmbedding(embedding, partnerId)
            : '❓❓❓';

        const existing = contacts[partnerId] || {};

        const contact = {
            id: partnerId,
            name: existing.name || name,
            embedding: existing.embedding || embedding,
            description: existing.description || description,
            unread: existing.unread || 0,
            lastMessage: existing.lastMessage || '',
            lastTimestamp: existing.lastTimestamp || 0,
            createdAt: existing.createdAt || Date.now()
        };

        contacts[partnerId] = contact;
        dialogsSaveContacts(contacts);

        return contact;
    }

    function dialogsUpsertContactMeta(partnerId, patch) {
        if (!partnerId) return;
        const contacts = dialogsGetContacts();
        const existing = contacts[partnerId] || {
            id: partnerId,
            name: '❓❓❓',
            embedding: '',
            description: '',
            unread: 0,
            lastMessage: '',
            lastTimestamp: 0,
            createdAt: Date.now()
        };

        contacts[partnerId] = { ...existing, ...patch };
        dialogsSaveContacts(contacts);
    }

    // ==================== BADGE ====================
function dialogsUpdateUnreadBadge() {
    const badge = document.getElementById('dialogsUnreadBadge');
    const emoji = document.getElementById('dialogsHeaderEmoji');
    
    const contacts = dialogsGetContacts();
    const totalUnread = Object.values(contacts).reduce((sum, c) => sum + (c.unread || 0), 0);
    
    if (badge) {
        if (totalUnread > 0) {
            badge.style.display = 'block'; // ← было 'flex', теперь 'block'
            badge.textContent = totalUnread > 99 ? '99+' : String(totalUnread);
        } else {
            badge.style.display = 'none';
            badge.textContent = '';
        }
    }
    
    if (emoji) {
        emoji.textContent = totalUnread > 0 ? '📩' : '💬';
    }
}

    // ==================== RENDER ====================
    function dialogsRenderList() {
        const container = document.getElementById('dialogsListContent');
        if (!container) return;

        const myId = dialogsGetMyProfileId();
        const contacts = dialogsGetContacts();
        const list = Object.values(contacts).sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));

        let html = '';

        if (!myId) {
            html += `
                <div class="dialogs-empty" style="margin-bottom: 12px;">
                    Чтобы писать и получать сообщения, сначала опубликуйте свою анкету во вкладке знакомств.
                </div>
            `;
        }

        if (list.length === 0) {
            html += `
                <div class="dialogs-empty">
                    Пока нет диалогов. После анализа совместимости можно нажать «Написать кандидату».
                </div>
            `;
            container.innerHTML = html;
            return;
        }

        html += list.map(contact => `
            <div class="dialogs-contact-item" onclick="openChatWith('${dialogsEscapeHtml(contact.id)}')">
                <div class="dialogs-contact-avatar">${dialogsEscapeHtml(contact.name || '❓❓❓')}</div>
                <div class="dialogs-contact-info">
                    <div class="dialogs-contact-top">
                        <strong>${dialogsEscapeHtml(contact.name || '❓❓❓')}</strong>
                        <span class="dialogs-contact-time">${contact.lastTimestamp ? dialogsFormatDateTime(contact.lastTimestamp) : ''}</span>
                    </div>
                    <div class="dialogs-contact-bottom">
                        <span class="dialogs-contact-msg">${dialogsEscapeHtml(contact.lastMessage || 'Пустой диалог')}</span>
                        ${contact.unread > 0 ? `<span class="dialogs-badge">${contact.unread}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    function dialogsRenderCurrentChat() {
        const area = document.getElementById('dialogsMessagesArea');
        const title = document.getElementById('dialogsChatTitle');
        if (!area || !dialogsCurrentPartnerId) return;

        const contacts = dialogsGetContacts();
        const contact = contacts[dialogsCurrentPartnerId] || null;
        const history = dialogsGetHistory(dialogsCurrentPartnerId);

        if (title) {
            title.textContent = contact?.name || '❓❓❓';
        }

        if (history.length === 0) {
            area.innerHTML = `<div class="dialogs-empty">Напишите первое сообщение.</div>`;
            return;
        }

        area.innerHTML = history.map(msg => {
            const mine = msg.direction === 'out';
            return `
                <div class="dialogs-msg-wrapper ${mine ? 'mine' : 'theirs'}">
                    <div class="dialogs-msg-bubble">
                        <div class="dialogs-msg-text">${dialogsEscapeHtml(msg.text).replace(/\n/g, '<br>')}</div>
                        <div class="dialogs-msg-time">${dialogsFormatDateTime(msg.timestamp)}</div>
                    </div>
                </div>
            `;
        }).join('');

        area.scrollTop = area.scrollHeight;
    }

    function dialogsRefreshVisibleUI() {
        const modal = document.getElementById('dialogsModal');
        if (!modal || !modal.classList.contains('active')) {
            dialogsUpdateUnreadBadge();
            return;
        }

        const listScreen = document.getElementById('dialogsListScreen');
        const chatScreen = document.getElementById('dialogsChatScreen');

        if (listScreen?.classList.contains('active')) {
            dialogsRenderList();
        }

        if (chatScreen?.classList.contains('active') && dialogsCurrentPartnerId) {
            dialogsRenderCurrentChat();
        }

        dialogsUpdateUnreadBadge();
    }

    // ==================== SCREENS ====================
    function openDialogsModal() {
        const modal = document.getElementById('dialogsModal');
        if (!modal) return;
        modal.classList.add('active');
        showDialogsList();
    }

    function closeDialogsModal() {
        const modal = document.getElementById('dialogsModal');
        if (!modal) return;
        modal.classList.remove('active');
    }

    function showDialogsList() {
        const listScreen = document.getElementById('dialogsListScreen');
        const chatScreen = document.getElementById('dialogsChatScreen');

        dialogsCurrentPartnerId = null;

        if (listScreen) listScreen.classList.add('active');
        if (chatScreen) chatScreen.classList.remove('active');

        dialogsRenderList();
    }

    async function openChatWith(partnerId, fallbackEmbedding = '', fallbackDescription = '') {
        if (!partnerId) return;

        const myId = dialogsGetMyProfileId();
        if (!myId) {
            alert('Сначала опубликуйте свою анкету во вкладке знакомств.');
            return;
        }

        await dialogsEnsureContactCached(partnerId, fallbackEmbedding, fallbackDescription);

        const contacts = dialogsGetContacts();
        const contact = contacts[partnerId] || null;

        dialogsCurrentPartnerId = partnerId;

        if (contact) {
            dialogsUpsertContactMeta(partnerId, { unread: 0 });
        }

        const listScreen = document.getElementById('dialogsListScreen');
        const chatScreen = document.getElementById('dialogsChatScreen');

        if (listScreen) listScreen.classList.remove('active');
        if (chatScreen) chatScreen.classList.add('active');

        dialogsRenderCurrentChat();

        const input = document.getElementById('dialogsMessageInput');
        if (input) {
            input.focus();
        }
    }

    // ==================== SEND ====================
    function updateDialogsCharCount() {
        const input = document.getElementById('dialogsMessageInput');
        const counter = document.getElementById('dialogsCharCount');
        if (!input || !counter) return;

        const len = input.value.length;
        counter.textContent = `${len} / ${DIALOGS_CONFIG.maxMessageLength}`;
        counter.style.color = len >= DIALOGS_CONFIG.maxMessageLength ? '#e94560' : '';
    }

    async function sendDialogMessage() {
        if (!dialogsCurrentPartnerId) return;

        const myId = dialogsGetMyProfileId();
        if (!myId) {
            alert('Сначала опубликуйте свою анкету во вкладке знакомств.');
            return;
        }

        const input = document.getElementById('dialogsMessageInput');
        const btn = document.getElementById('dialogsSendBtn');
        if (!input || !btn) return;

        const text = input.value.trim();
        if (!text) return;

        if (text.length > DIALOGS_CONFIG.maxMessageLength) {
            alert(`Максимальная длина сообщения — ${DIALOGS_CONFIG.maxMessageLength} символов.`);
            return;
        }

        btn.disabled = true;
        input.disabled = true;

        try {
            const timestamp = Date.now();

            await dialogsFirebaseRequest('sendMessage', {
                to: dialogsCurrentPartnerId,
                text,
                timestamp
            }, myId);

            const history = dialogsGetHistory(dialogsCurrentPartnerId);
            history.push({
                localId: `out_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
                direction: 'out',
                text,
                timestamp
            });
            dialogsSaveHistory(dialogsCurrentPartnerId, history);

            dialogsUpsertContactMeta(dialogsCurrentPartnerId, {
                lastMessage: `Вы: ${dialogsShortText(text, 36)}`,
                lastTimestamp: timestamp
            });

            input.value = '';
            updateDialogsCharCount();
            dialogsRenderCurrentChat();
            dialogsRenderList();

            if (!dialogsHasSentMessageInSession) {
                dialogsHasSentMessageInSession = true;
                dialogsSchedulePolling();
            }
        } catch (e) {
            console.error('[Dialogs] Send error:', e);
            alert(`Ошибка отправки: ${e.message}`);
        } finally {
            btn.disabled = false;
            input.disabled = false;
            input.focus();
        }
    }

    // ==================== RECEIVE ====================
    function dialogsMessageAlreadySaved(history, msg) {
        return history.some(h =>
            (h.serverId && h.serverId === msg.id) ||
            (
                h.direction === 'in' &&
                h.timestamp === msg.timestamp &&
                h.text === msg.text
            )
        );
    }

    function dialogsSetCheckButtonState(text, disabled) {
        const btn = document.getElementById('checkMessagesBtn');
        if (!btn) return;
        btn.textContent = text;
        btn.disabled = !!disabled;
    }

    async function checkNewMessages(manual = false) {
        if (dialogsIsCheckingMessages) return;

        const myId = dialogsGetMyProfileId();
        if (!myId) {
            if (manual) {
                alert('Сначала опубликуйте свою анкету во вкладке знакомств.');
            }
            return;
        }

        dialogsIsCheckingMessages = true;
        if (manual) dialogsSetCheckButtonState('⏳ Проверяю…', true);

        try {
            const res = await dialogsFirebaseRequest('getMessages', null, myId);
            let incoming = Array.isArray(res.messages) ? res.messages : [];

            if (incoming.length === 0) {
                if (manual) dialogsSetCheckButtonState('Писем нет', true);
                return;
            }

            incoming.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            const uniqueSenders = [...new Set(incoming.map(m => m.from).filter(Boolean))];
            for (const senderId of uniqueSenders) {
                await dialogsEnsureContactCached(senderId);
            }

            const contacts = dialogsGetContacts();
            const idsToDelete = [];

            for (const msg of incoming) {
                if (!msg.id || !msg.from || typeof msg.text !== 'string') continue;

                const partnerId = msg.from;
                const history = dialogsGetHistory(partnerId);

                if (!dialogsMessageAlreadySaved(history, msg)) {
                    history.push({
                        localId: `in_${msg.id}`,
                        serverId: msg.id,
                        direction: 'in',
                        text: msg.text,
                        timestamp: msg.timestamp || Date.now()
                    });
                    dialogsSaveHistory(partnerId, history);
                }

                const existing = contacts[partnerId] || {
                    id: partnerId,
                    name: '❓❓❓',
                    embedding: '',
                    description: '',
                    unread: 0,
                    createdAt: Date.now()
                };

                const isOpenNow = dialogsCurrentPartnerId === partnerId &&
                    document.getElementById('dialogsChatScreen')?.classList.contains('active');

                contacts[partnerId] = {
                    ...existing,
                    lastMessage: dialogsShortText(msg.text, 44),
                    lastTimestamp: msg.timestamp || Date.now(),
                    unread: isOpenNow ? 0 : ((existing.unread || 0) + 1)
                };

                idsToDelete.push(msg.id);
            }

            dialogsSaveContacts(contacts);

            if (idsToDelete.length > 0) {
                await dialogsFirebaseRequest('deleteMessages', { messageIds: idsToDelete }, myId);
            }

            dialogsRefreshVisibleUI();

            if (manual) {
                dialogsSetCheckButtonState(`Найдено: ${idsToDelete.length}`, true);
            }
        } catch (e) {
            console.error('[Dialogs] Check messages error:', e);
            if (manual) {
                dialogsSetCheckButtonState('Ошибка проверки', true);
            }
        } finally {
            dialogsIsCheckingMessages = false;

            if (manual) {
                setTimeout(() => {
                    dialogsSetCheckButtonState('🔄 Проверить письма', false);
                }, 1200);
            }
        }
    }

    // ==================== POLLING ====================
    function dialogsSchedulePolling() {
        if (!dialogsHasSentMessageInSession) return;

        if (dialogsPollingTimer) {
            clearTimeout(dialogsPollingTimer);
            dialogsPollingTimer = null;
        }

        const delay = dialogsRandomPollDelay();
        dialogsPollingTimer = setTimeout(async () => {
            await checkNewMessages(false);
            dialogsSchedulePolling();
        }, delay);

        console.log(`[Dialogs] Next auto-check in ${Math.round(delay / 1000)} sec`);
    }

    // ==================== STARTUP CHECK ====================
    // Однократная фоновая проверка при запуске, БЕЗ запуска таймера поллинга
    async function dialogsStartupCheck() {
        const myId = dialogsGetMyProfileId();
        if (!myId) {
            console.log('[Dialogs] Startup check skipped: no profile ID');
            return;
        }

        console.log('[Dialogs] Startup check: looking for new messages...');

        try {
            await checkNewMessages(false);
            console.log('[Dialogs] Startup check complete');
        } catch (e) {
            console.warn('[Dialogs] Startup check failed (non-critical):', e.message);
        }
    }

    // ==================== COMPATIBILITY ====================
    async function analyzeCurrentChatPartner() {
        if (!dialogsCurrentPartnerId) return;

        let contacts = dialogsGetContacts();
        let contact = contacts[dialogsCurrentPartnerId];

        if (!contact || !contact.embedding) {
            contact = await dialogsEnsureContactCached(dialogsCurrentPartnerId);
            contacts = dialogsGetContacts();
            contact = contacts[dialogsCurrentPartnerId];
        }

        if (!contact || !contact.embedding) {
            alert('Не удалось получить данные кандидата для анализа.');
            return;
        }

        closeDialogsModal();

        if (typeof openDatingModal === 'function') openDatingModal();
        if (typeof switchDatingTab === 'function') switchDatingTab('compatibility');

        window.currentCandidateId = dialogsCurrentPartnerId;
        window.currentCandidateEmbed = contact.embedding;

        setTimeout(() => {
            const embedInput = document.getElementById('candidateEmbeddingInput');
            const descInput = document.getElementById('candidateDescriptionInput');

            if (embedInput) {
                embedInput.value = contact.embedding;
                if (typeof validateCandidateInput === 'function') {
                    validateCandidateInput();
                }
            }

            if (descInput && contact.description) {
                descInput.value = contact.description;
            }
        }, 150);
    }

    function startDialogFromDating() {
        const candidateId = window.currentCandidateId;
        const candidateEmbed = window.currentCandidateEmbed || '';
        const candidateDescription = window.currentCandidateDescription || '';

        if (!candidateId) {
            alert('У этого кандидата нет ID профиля. Нельзя открыть переписку.');
            return;
        }

        closeDatingModal?.();
        openDialogsModal();
        openChatWith(candidateId, candidateEmbed, candidateDescription);
    }

    // ==================== INIT ====================
    function dialogsBindInputHandlers() {
        const input = document.getElementById('dialogsMessageInput');
        if (!input || input.dataset.dialogsBound === '1') return;

        input.dataset.dialogsBound = '1';

        input.addEventListener('input', updateDialogsCharCount);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendDialogMessage();
            }
        });
    }

    function dialogsInit() {
        dialogsBindInputHandlers();
        dialogsUpdateUnreadBadge();

        // Однократная проверка входящих при запуске (с задержкой, чтобы не мешать загрузке)
        // НЕ запускает таймер поллинга — он стартует только при отправке сообщения
        setTimeout(() => {
            dialogsStartupCheck();
        }, DIALOGS_CONFIG.startupCheckDelayMs);
    }

    document.addEventListener('DOMContentLoaded', dialogsInit);

    // ==================== GLOBAL EXPORTS ====================
    window.openDialogsModal = openDialogsModal;
    window.closeDialogsModal = closeDialogsModal;
    window.showDialogsList = showDialogsList;
    window.openChatWith = openChatWith;
    window.updateDialogsCharCount = updateDialogsCharCount;
    window.sendDialogMessage = sendDialogMessage;
    window.checkNewMessages = checkNewMessages;
    window.analyzeCurrentChatPartner = analyzeCurrentChatPartner;
    window.startDialogFromDating = startDialogFromDating;

    console.log('[dialogs.js] Loaded safely. No global collisions.');
})();