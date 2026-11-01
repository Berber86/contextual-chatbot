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

        if (!confirm(t("confirmUnsavedSwitch"))) return;

    }


    currentTab = tab;

    hasUnsavedChanges = false;

    selectedItemId = null;


    document.querySelectorAll(".modal-tab").forEach(t => {

        t.classList.toggle("active", t.dataset.tab === tab);

    });


    ["styleInfo", "hypothesesInfo", "socialInfo", "gapsInfo", "factsInfo", "traitsInfo", "timelineInfo", "personaPromptInfo", "personaNotesInfo"].forEach(id => {

        const el = document.getElementById(id);

        if (el) el.style.display = "none";

    });


    const textarea = document.getElementById("knowledgeTextarea");

    const personaPromptTextarea = document.getElementById("personaPromptTextarea");

    const personaNotesContainer = document.getElementById("personaNotesContainer");

    const structuredContainer = document.getElementById("structuredContainer");

    const socialContainer = document.getElementById("socialContainer");

    const readonlyIndicator = document.getElementById("readonlyIndicator");


    const structuredTabs = ["facts", "traits", "timeline", "hypotheses", "gaps"];

    const isStructured = structuredTabs.includes(tab);

    const isSocial = tab === "social";

    const isTextarea = tab === "style";

    const isPersonaPrompt = tab === "personaPrompt";

    const isPersonaNotes = tab === "personaNotes";


    if (textarea) textarea.style.display = isTextarea ? "block" : "none";

    if (personaPromptTextarea) personaPromptTextarea.style.display = isPersonaPrompt ? "block" : "none";

    if (personaNotesContainer) personaNotesContainer.style.display = isPersonaNotes ? "block" : "none";

    if (structuredContainer) structuredContainer.style.display = isStructured ? "block" : "none";

    if (socialContainer) socialContainer.style.display = isSocial ? "flex" : "none";


    const infoId = `${tab}Info`;

    const infoEl = document.getElementById(infoId);

    if (infoEl) infoEl.style.display = "block";


    if (isStructured) {

        renderStructuredContent(tab);

        if (readonlyIndicator) readonlyIndicator.style.display = "flex";

        updateEditButtons(false);

    } else if (isSocial) {

        renderSocialList();

        if (readonlyIndicator) readonlyIndicator.style.display = "flex";

        updateEditButtons(false);

    } else if (isTextarea) {

        const content = localStorage.getItem(STORAGE_KEYS.style) || "";

        textarea.value = content;

        textarea.readOnly = false;

        textarea.classList.remove("readonly");

        if (readonlyIndicator) readonlyIndicator.style.display = "none";

        updateEditButtons(true);

    } else if (isPersonaPrompt) {

        const content = getPersonaPrompt();

        personaPromptTextarea.value = content;

        personaPromptTextarea.readOnly = !isPersonaModeEnabled();

        personaPromptTextarea.classList.toggle("readonly", !isPersonaModeEnabled());

        if (readonlyIndicator) readonlyIndicator.style.display = isPersonaModeEnabled() ? "none" : "flex";

        updateEditButtons(isPersonaModeEnabled());

    } else if (isPersonaNotes) {

        renderPersonaNotes();

        if (readonlyIndicator) readonlyIndicator.style.display = "flex";

        updateEditButtons(false);

    }


    updateEditIndicator();

}

function renderKnowledgeTabHeader(tab) {
    const stats = getKnowledgeTabStats(tab);
    return `
        <div class="knowledge-tab-header">
            <div class="knowledge-tab-title-row">
                <div class="knowledge-tab-icon">${stats.icon}</div>
                <div>
                    <h3>${escapeHtml(stats.title)}</h3>
                    <p>${escapeHtml(stats.detail)}</p>
                </div>
            </div>
            <div class="knowledge-tab-badges">
                <span class="knowledge-count-badge">${stats.active}</span>
                ${stats.archived ? `<span class="knowledge-archived-badge">${stats.archived} устар.</span>` : ''}
            </div>
        </div>
    `;
}
