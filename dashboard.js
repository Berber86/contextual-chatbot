// Main workspace interactions. Existing chat and module functions remain the source of truth.
(function () {
    'use strict';

    function countActive(items) {
        return Array.isArray(items) ? items.filter(item => item && !item.superseded).length : 0;
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    }

    function russianCountLabel(count, forms) {
        const lastTwo = count % 100;
        const last = count % 10;
        if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
        if (last === 1) return forms[0];
        if (last >= 2 && last <= 4) return forms[1];
        return forms[2];
    }

    window.refreshMemoryOverview = function () {
        const facts = getFactsData() || {};
        const traits = getTraitsData() || {};
        const timeline = getTimelineData() || {};
        const hypotheses = getHypothesesData() || {};
        const social = getSocialData() || {};
        const factCount = countActive(facts.facts);
        const traitCount = countActive(traits.traits);
        const eventCount = countActive(timeline.events);
        const hasMemory = factCount + traitCount + eventCount + countActive(hypotheses.hypotheses) + countActive(social.contacts) > 0 ||
            Boolean(facts.legacy_text || traits.legacy_text || timeline.legacy_text);

        setText('memoryFacts', factCount);
        setText('memoryTraits', traitCount);
        setText('memoryEvents', eventCount);
        setText('memoryFactsLabel', currentLanguage === 'ru' ? russianCountLabel(factCount, ['факт', 'факта', 'фактов']) : t('memoryFactsLabel'));
        setText('memoryTraitsLabel', currentLanguage === 'ru' ? russianCountLabel(traitCount, ['черта', 'черты', 'черт']) : t('memoryTraitsLabel'));
        setText('memoryEventsLabel', currentLanguage === 'ru' ? russianCountLabel(eventCount, ['событие', 'события', 'событий']) : t('memoryEventsLabel'));
        const status = document.getElementById('memoryStatus');
        const summary = document.getElementById('memorySummary');
        const statusKey = hasMemory ? 'memoryFilledTag' : 'memoryEmptyTag';
        const summaryKey = hasMemory ? 'memoryFilledSummary' : 'memoryEmptySummary';
        if (status) {
            status.dataset.i18n = statusKey;
            status.textContent = t(statusKey);
        }
        if (summary) {
            summary.dataset.i18n = summaryKey;
            summary.textContent = t(summaryKey);
        }
    };

    window.updateWelcomeScreen = function () {
        const welcome = document.getElementById('welcomeScreen');
        const chat = document.getElementById('chatArea');
        if (welcome && chat) welcome.hidden = Boolean(chat.querySelector('.message.user'));
    };

    window.focusComposer = function () {
        const input = document.getElementById('messageInput');
        if (input) input.focus();
    };

    function closeNavigation(returnFocus) {
        const wasOpen = document.body.classList.contains('nav-open');
        document.body.classList.remove('nav-open');
        if (wasOpen && typeof closeSettingsMenu === 'function') closeSettingsMenu();
        const menuButton = document.getElementById('mobileMenuButton');
        if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
        if (wasOpen && returnFocus && menuButton) menuButton.focus();
    }

    function topDialog() {
        const dialogs = document.querySelectorAll('[data-workspace-dialog].active, .you-data-modal-overlay');
        return dialogs.length ? dialogs[dialogs.length - 1] : null;
    }

    function visibleFocusable(dialog) {
        return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
            .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    }

    function initDialogAccessibility() {
        const previousFocus = new Map();
        const observer = new MutationObserver(function (records) {
            records.forEach(function (record) {
                const dialog = record.target;
                const active = dialog.classList.contains('active');
                if (active && !previousFocus.has(dialog)) {
                    previousFocus.set(dialog, document.activeElement);
                    const preferred = dialog.querySelector('.modal-close, .reports-close-btn, .help-modal-close, .you-close-btn, .you-help-modal-close, .dating-close-btn, .privacy-cancel-btn, .dialogs-close-btn');
                    const focusTarget = preferred || visibleFocusable(dialog)[0];
                    if (focusTarget) focusTarget.focus({ preventScroll: true });
                } else if (!active && previousFocus.has(dialog)) {
                    const trigger = previousFocus.get(dialog);
                    previousFocus.delete(dialog);
                    // A close action may deliberately focus another control (e.g. "return to chat").
                    const focused = document.activeElement;
                    if (focused && focused !== document.body && !dialog.contains(focused) && focused.getClientRects().length && getComputedStyle(focused).visibility !== 'hidden') return;
                    const inClosedDrawer = trigger && window.innerWidth <= 760 && trigger.closest('#mainNavigation') && !document.body.classList.contains('nav-open');
                    if (trigger && !inClosedDrawer && trigger.isConnected && trigger.getClientRects().length && getComputedStyle(trigger).visibility !== 'hidden') {
                        trigger.focus({ preventScroll: true });
                    } else if (!topDialog()) {
                        const fallback = window.innerWidth <= 760 ? document.getElementById('mobileMenuButton') : document.getElementById('messageInput');
                        if (fallback) fallback.focus({ preventScroll: true });
                    }
                }
            });
        });
        document.querySelectorAll('[data-workspace-dialog]').forEach(dialog => observer.observe(dialog, { attributes: true, attributeFilter: ['class'] }));

        document.addEventListener('keydown', function (event) {
            const dialog = topDialog();
            if (!dialog) return;
            if (event.key === 'Tab') {
                const focusable = visibleFocusable(dialog);
                if (!focusable.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
                    event.preventDefault();
                    (event.shiftKey ? last : first).focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            } else if (event.key === 'Escape') {
                if (dialog.classList.contains('you-data-modal-overlay')) dialog.remove();
                else {
                    const closers = {
                        knowledgeModal: closeKnowledgeModal,
                        reportsModal: closeReportsModal,
                        helpModal: closeHelpModal,
                        youModal: closeYouModal,
                        youHelpModal: closeYouHelpModal,
                        datingModal: closeDatingModal,
                        privacyDisclaimer: cancelPrivacyDisclaimer,
                        dialogsModal: closeDialogsModal
                    };
                    if (closers[dialog.id]) closers[dialog.id]();
                }
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);
    }

    document.addEventListener('DOMContentLoaded', function () {
        const menuButton = document.getElementById('mobileMenuButton');
        const backdrop = document.getElementById('navBackdrop');
        const closeButton = document.getElementById('mobileNavClose');
        const navigation = document.getElementById('mainNavigation');
        const dropdown = document.getElementById('settingsDropdown');
        const localSettings = document.getElementById('localFirebaseSettings');

        if (localSettings) localSettings.hidden = !isLocal;
        initDialogAccessibility();
        if (menuButton) {
            menuButton.addEventListener('click', function () {
                const isOpen = document.body.classList.toggle('nav-open');
                menuButton.setAttribute('aria-expanded', String(isOpen));
                if (isOpen && navigation) {
                    const firstLink = navigation.querySelector('.nav-target');
                    if (firstLink) firstLink.focus();
                }
            });
        }
        if (backdrop) backdrop.addEventListener('click', () => closeNavigation(true));
        if (closeButton) closeButton.addEventListener('click', () => closeNavigation(true));
        if (navigation) navigation.addEventListener('click', function (event) {
            if (event.target.closest('.nav-target')) closeNavigation(false);
        });
        if (dropdown) dropdown.addEventListener('click', function (event) {
            if (event.target.closest('[data-close-settings]')) {
                closeSettingsMenu();
                closeNavigation(false);
            }
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeNavigation(true);
        });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 760) closeNavigation(false);
        });

        document.querySelectorAll('[data-prompt-key]').forEach(function (button) {
            button.addEventListener('click', function () {
                const input = document.getElementById('messageInput');
                if (!input) return;
                const prompt = t(button.dataset.promptKey);
                // Never discard a draft when a suggestion is selected.
                const draft = input.value.trim();
                input.value = draft ? `${draft}\n\n${prompt}` : prompt;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            });
        });

        window.refreshMemoryOverview();
        window.updateWelcomeScreen();
    });

    window.addEventListener('memory-updated', window.refreshMemoryOverview);
    window.addEventListener('storage', window.refreshMemoryOverview);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') window.refreshMemoryOverview();
    });
})();
