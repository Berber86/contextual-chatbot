// workspace.js — оболочка, навигация, стартовый экран и доступность.
(function () {
    'use strict';

    const PROMPTS = {
        ru: {
            thoughts: 'Помоги мне разобраться в мыслях: что меня сейчас беспокоит и с чего начать?',
            idea: 'У меня есть идея, которую хочу обсудить. Помоги развить её и понять следующий шаг.',
            memory: 'Что важного ты уже знаешь обо мне? Помоги связать это с тем, что происходит сейчас.'
        },
        en: {
            thoughts: 'Help me sort through my thoughts: what is on my mind right now, and where should I start?',
            idea: 'I have an idea I want to discuss. Help me develop it and figure out the next step.',
            memory: 'What important things do you already know about me? Help me connect them to what is happening now.'
        }
    };

    const DIALOG_MAP = [
        { id: 'knowledgeModal', close: 'closeKnowledgeModal', nav: 'knowledge' },
        { id: 'youModal', close: 'closeYouModal', nav: 'you' },
        { id: 'datingModal', close: 'closeDatingModal', nav: 'dating' },
        { id: 'reportsModal', close: 'closeReportsModal', nav: 'reports' },
        { id: 'dialogsModal', close: 'closeDialogsModal', nav: 'dialogs' },
        { id: 'helpModal', close: 'closeHelpModal', nav: null },
        { id: 'privacyDisclaimer', close: 'closePrivacyDisclaimer', nav: null },
        { id: 'youHelpModal', close: 'closeYouHelpModal', nav: null }
    ];

    const dialogStack = [];
    let lastDialogFocus = null;
    let lastNavFocus = null;

    function $(id) { return document.getElementById(id); }
    function translate(key) { return typeof t === 'function' ? t(key) : key; }

    // ---------- Composer ----------
    window.handleKeyDown = function (event) {
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        const input = $('messageInput');
        const form = input && input.closest('form');
        const processing = typeof isProcessing !== 'undefined' && isProcessing;
        if (form && input && input.value.trim() && !processing) {
            if (typeof form.requestSubmit === 'function') form.requestSubmit();
            else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    };

    window.updateComposerState = function () {
        const input = $('messageInput');
        const send = $('sendBtn');
        if (!input || !send) return;
        const processing = typeof isProcessing !== 'undefined' && isProcessing;
        send.disabled = processing || !input.value.trim();
        send.setAttribute('aria-busy', processing ? 'true' : 'false');
    };

    window.usePromptSuggestion = function (key) {
        const input = $('messageInput');
        if (!input) return;
        const lang = (typeof currentLanguage !== 'undefined' && PROMPTS[currentLanguage]) ? currentLanguage : 'ru';
        const prompt = PROMPTS[lang][key] || PROMPTS.ru[key];
        if (!prompt) return;
        input.value = prompt;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    };

    function syncConversationView() {
        const chatArea = $('chatArea');
        const welcome = $('chatWelcome');
        if (!chatArea || !welcome) return;
        const hasConversation = Boolean(chatArea.querySelector('.message.user, .message.assistant, .message.thinking, .typing-indicator'));
        welcome.hidden = hasConversation;
    }

    // ---------- Memory summary ----------
    window.refreshMemorySummary = function () {
        try {
            const facts = typeof getFactsData === 'function' ? (getFactsData().facts || []).filter(f => !f.superseded).length : 0;
            const traits = typeof getTraitsData === 'function' ? (getTraitsData().traits || []).filter(x => !x.superseded).length : 0;
            const contacts = typeof getSocialData === 'function' ? ((getSocialData().contacts || []).length) : 0;
            const factEl = $('memoryFactCount');
            const traitEl = $('memoryTraitCount');
            const contactEl = $('memoryContactCount');
            const summary = $('memorySummary');
            if (factEl) factEl.textContent = facts;
            if (traitEl) traitEl.textContent = traits;
            if (contactEl) contactEl.textContent = contacts;
            if (summary) {
                summary.textContent = (facts + traits + contacts) > 0
                    ? translate('memoryActiveSummary')
                    : translate('memoryEmptySummary');
            }
        } catch (error) {
            console.warn('[Workspace] Memory summary unavailable:', error.message);
        }
    };

    // ---------- Navigation ----------
    function setActiveNav(section) {
        document.querySelectorAll('[data-nav-section]').forEach(btn => {
            const active = btn.dataset.navSection === section;
            btn.classList.toggle('active', active);
            if (btn.classList.contains('mobile-nav-btn') || btn.classList.contains('side-nav-btn')) {
                btn.setAttribute('aria-current', active ? 'page' : 'false');
            }
        });
    }
    window.setActiveNav = setActiveNav;

    window.focusChat = function () {
        closeMobileNav();
        setActiveNav('chat');
        const input = $('messageInput');
        const chatArea = $('chatArea');
        if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
        if (input) input.focus({ preventScroll: true });
    };

    window.openMobileNav = function () {
        const sidebar = $('appSidebar');
        const scrim = $('sidebarScrim');
        if (!sidebar) return;
        lastNavFocus = document.activeElement;
        sidebar.classList.add('open');
        if (scrim) scrim.hidden = false;
        document.querySelectorAll('.mobile-menu-btn, .mobile-nav-btn[data-nav-section="more"]').forEach(btn => btn.setAttribute('aria-expanded', 'true'));
        const closeBtn = sidebar.querySelector('.sidebar-close');
        if (closeBtn) closeBtn.focus();
    };

    window.closeMobileNav = function () {
        const sidebar = $('appSidebar');
        const scrim = $('sidebarScrim');
        if (!sidebar || !sidebar.classList.contains('open')) return;
        sidebar.classList.remove('open');
        if (scrim) scrim.hidden = true;
        document.querySelectorAll('.mobile-menu-btn, .mobile-nav-btn[data-nav-section="more"]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
        if (lastNavFocus && typeof lastNavFocus.focus === 'function') lastNavFocus.focus({ preventScroll: true });
        lastNavFocus = null;
    };

    document.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-nav-section]');
        if (!btn) return;
        const section = btn.dataset.navSection;
        if (section === 'more') return;
        setActiveNav(section);
        if (section !== 'chat') closeMobileNav();
    });

    // ---------- Settings ----------
    window.closeSettingsMenu = function () {
        const dropdown = $('settingsDropdown');
        const devBox = $('dev-settings');
        const btn = $('settingsMenuBtn');
        if (dropdown) dropdown.classList.remove('open');
        if (devBox) devBox.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
        if (typeof closeAllLanguageDropdowns === 'function') closeAllLanguageDropdowns();
    };

    window.syncSettingsA11y = function () {
        const dropdown = $('settingsDropdown');
        const btn = $('settingsMenuBtn');
        if (dropdown && btn) btn.setAttribute('aria-expanded', dropdown.classList.contains('open') ? 'true' : 'false');
    };

    // ---------- Dialog accessibility ----------
    function focusableWithin(root) {
        return Array.from(root.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
            .filter(el => el.getClientRects().length > 0 && !el.closest('[hidden]'));
    }

    function trapTab(event, root) {
        const items = focusableWithin(root);
        if (!items.length) { event.preventDefault(); root.focus(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
            event.preventDefault(); first.focus();
        }
    }

    function closeTopDialog() {
        const top = dialogStack[dialogStack.length - 1];
        if (!top) return false;
        const meta = DIALOG_MAP.find(d => d.id === top.id);
        if (meta && typeof window[meta.close] === 'function') {
            window[meta.close]();
            return true;
        }
        top.classList.remove('active');
        return true;
    }

    function initDialogAccessibility() {
        DIALOG_MAP.forEach(meta => {
            const el = $(meta.id);
            if (!el) return;
            el.setAttribute('role', 'dialog');
            el.setAttribute('aria-modal', 'true');
            el.setAttribute('tabindex', '-1');
            const observer = new MutationObserver(() => {
                const active = el.classList.contains('active');
                const index = dialogStack.indexOf(el);
                if (active && index === -1) {
                    if (!dialogStack.length) lastDialogFocus = document.activeElement;
                    dialogStack.push(el);
                    if (meta.nav) setActiveNav(meta.nav);
                    requestAnimationFrame(() => {
                        const target = el.querySelector('.modal-close, .reports-close-btn, .dating-close-btn, .dialogs-close-btn, .help-modal-close, .you-close-btn, .privacy-accept-btn') || focusableWithin(el)[0] || el;
                        target.focus({ preventScroll: true });
                    });
                } else if (!active && index !== -1) {
                    dialogStack.splice(index, 1);
                    if (!dialogStack.length) {
                        setActiveNav('chat');
                        if (lastDialogFocus && typeof lastDialogFocus.focus === 'function') lastDialogFocus.focus({ preventScroll: true });
                        lastDialogFocus = null;
                    }
                }
            });
            observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        });
    }

    document.addEventListener('keydown', (event) => {
        const sidebar = $('appSidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            if (event.key === 'Escape') { event.preventDefault(); closeMobileNav(); return; }
            if (event.key === 'Tab') trapTab(event, sidebar);
            return;
        }
        if (dialogStack.length) {
            const top = dialogStack[dialogStack.length - 1];
            if (event.key === 'Escape') { event.preventDefault(); closeTopDialog(); return; }
            if (event.key === 'Tab') trapTab(event, top);
            return;
        }
        if (event.key === 'Escape') closeSettingsMenu();
    });

    // ---------- Boot ----------
    document.addEventListener('DOMContentLoaded', () => {
        syncConversationView();
        refreshMemorySummary();
        updateComposerState();
        initDialogAccessibility();

        const input = $('messageInput');
        if (input) input.addEventListener('input', updateComposerState);

        const chatArea = $('chatArea');
        if (chatArea) {
            new MutationObserver(() => {
                syncConversationView();
                updateComposerState();
            }).observe(chatArea, { childList: true });
        }

        window.addEventListener('memory:updated', refreshMemorySummary);
        window.addEventListener('storage', (event) => {
            if (!event.key || event.key.startsWith('chatbot_')) refreshMemorySummary();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') refreshMemorySummary();
        });

        // Keep the drawer from staying open after a resize to desktop.
        const mq = window.matchMedia('(min-width: 901px)');
        const onResize = () => { if (mq.matches) closeMobileNav(); };
        if (mq.addEventListener) mq.addEventListener('change', onResize);
        else mq.addListener(onResize);
    });
})();
