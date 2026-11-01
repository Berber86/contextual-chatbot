// goals.js — модуль «Цели» (🎯).
// Инкремент 1: пользователь сам создаёт цели и ведёт их чек-ины.
// Чата, LLM и профиля подстройки здесь пока нет — это следующие инкременты.

const GOALS_UI = {
    statusLabels: {
        active: '🎯 В работе',
        paused: '⏸ На паузе',
        done: '✅ Завершена',
        dropped: '⤵️ Снята'
    },
    stateLabels: {
        moved: 'Сдвинулось',
        stuck: 'Застряло',
        no_time: 'Не было времени'
    },
    stateHints: {
        moved: 'что именно получилось',
        stuck: 'что мешает',
        no_time: 'что забрало время'
    },
    horizonLabels: {
        week: 'Неделя',
        month: 'Месяц',
        quarter: 'Квартал',
        open: 'Без срока'
    },
    // Помощник формулировки: без LLM, просто наводящие начала фраз.
    whyStarts: [
        'Мне это важно, потому что…',
        'Если этого не будет, то…',
        'Я хочу этого для себя, а не для кого-то, потому что…'
    ],
    successStarts: [
        'Я пойму, что получилось, когда…',
        'Признак готовности для меня —…'
    ]
};

let goalsState = {
    view: 'list',
    selectedId: null,
    errors: []
};

// ==================== ОКНО ====================
function openGoalsModal() {
    const modal = document.getElementById('goalsModal');
    if (!modal) return;
    goalsState = { view: 'list', selectedId: null, errors: [] };
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    renderGoalsInterface();
}

function closeGoalsModal() {
    const modal = document.getElementById('goalsModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    goalsState = { view: 'list', selectedId: null, errors: [] };
}

function goalsGoList() {
    goalsState.view = 'list';
    goalsState.selectedId = null;
    goalsState.errors = [];
    renderGoalsInterface();
}

function goalsOpenGoal(id) {
    if (!getGoalById(id)) return;
    goalsState.view = 'goal';
    goalsState.selectedId = id;
    goalsState.errors = [];
    renderGoalsInterface();
}

function goalsStartCreate() {
    goalsState.view = 'create';
    goalsState.errors = [];
    renderGoalsInterface();
}

function goalsNotify(message, type = 'success') {
    if (typeof youShowToast === 'function') {
        youShowToast(message, type);
        return;
    }
    console.log(`[Goals] ${message}`);
}

// ==================== РЕНДЕР ====================
function renderGoalsInterface() {
    const body = document.getElementById('goalsBody');
    if (!body) return;

    if (goalsState.view === 'create') {
        body.innerHTML = renderGoalsCreate();
        return;
    }

    if (goalsState.view === 'goal') {
        const goal = getGoalById(goalsState.selectedId);
        if (!goal) {
            goalsGoList();
            return;
        }
        body.innerHTML = renderGoalDetails(goal);
        return;
    }

    body.innerHTML = renderGoalsList();
}

function renderGoalsList() {
    const goals = getGoals();
    const counts = getGoalCounts();
    const active = goals.filter(goal => goal.status === 'active');
    const paused = goals.filter(goal => goal.status === 'paused');
    const archived = goals.filter(goal => goal.status === 'done' || goal.status === 'dropped');

    const stats = [
        `${counts.active} в работе`,
        paused.length ? `${paused.length} на паузе` : '',
        archived.length ? `${archived.length} в архиве` : ''
    ].filter(Boolean).join(' · ');

    const toolbar = `
        <div class="goals-toolbar">
            <div class="goals-stats">${escapeHtml(stats)}</div>
            <div class="goals-toolbar-actions">
                <button type="button" class="goals-btn goals-btn-primary" onclick="goalsStartCreate()">+ Новая цель</button>
                <button type="button" class="goals-btn" onclick="goalsExport()">Экспорт</button>
                <label class="goals-btn goals-btn-file">
                    Импорт
                    <input type="file" accept="application/json,.json" onchange="goalsImportFile(this)">
                </label>
            </div>
        </div>
    `;

    if (goals.length === 0) {
        return toolbar + `
            <div class="goals-empty">
                <div class="goals-empty-icon">🎯</div>
                <h3>Пока ни одной цели</h3>
                <p>Цель — это то, что вы решили сами. Напишите, чего хотите, зачем это вам и как поймёте, что получилось.</p>
                <button type="button" class="goals-btn goals-btn-primary" onclick="goalsStartCreate()">Поставить первую цель</button>
            </div>
        `;
    }

    const activeWarn = active.length > GOALS_CONFIG.activeWarn
        ? `<div class="goals-note">${active.length} целей в работе одновременно — обычно это не помогает двигаться. Можно поставить часть на паузу, это не поражение.</div>`
        : '';

    return toolbar + activeWarn + `
        ${active.length ? `
            <div class="goals-section">
                <div class="goals-section-title">В работе</div>
                <div class="goals-grid">${active.map(renderGoalCard).join('')}</div>
            </div>
        ` : ''}
        ${paused.length ? `
            <div class="goals-section">
                <div class="goals-section-title">На паузе</div>
                <div class="goals-grid">${paused.map(renderGoalCard).join('')}</div>
            </div>
        ` : ''}
        ${archived.length ? `
            <div class="goals-section">
                <details class="goals-archive">
                    <summary>Архив · ${archived.length}</summary>
                    <div class="goals-grid">${archived.map(renderGoalCard).join('')}</div>
                </details>
            </div>
        ` : ''}
    `;
}

function renderGoalCard(goal) {
    const last = getGoalLastCheckin(goal.id);
    const stuckStreak = getGoalStuckStreak(goal.id);
    const lastLabel = last
        ? `${GOALS_UI.stateLabels[last.state] || last.state} · ${escapeHtml(formatTimestamp(last.at))}`
        : 'Чек-инов пока нет';
    const stepLabel = goal.nextStep && goal.nextStep.text
        ? escapeHtml(goal.nextStep.text)
        : 'Следующий шаг пока не выбран';

    const quick = goal.status === 'active'
        ? `<div class="goal-quick">
                ${GOALS_CONFIG.checkinStates.map(state => `
                    <button type="button" class="goal-quick-btn goal-quick-${state}"
                        onclick="goalsQuickCheckin('${escapeHtml(goal.id)}','${state}')">${GOALS_UI.stateLabels[state]}</button>
                `).join('')}
           </div>`
        : '';

    return `
        <article class="goal-card" data-status="${escapeHtml(goal.status)}">
            <div class="goal-card-top">
                <h3 class="goal-card-title">${escapeHtml(goal.title)}</h3>
                <span class="goal-status">${GOALS_UI.statusLabels[goal.status] || goal.status}</span>
            </div>
            <p class="goal-card-why">${escapeHtml(goal.why)}</p>
            <div class="goal-card-step">
                <span class="goal-card-step-label">Следующий шаг</span>
                <span class="goal-card-step-text ${goal.nextStep ? '' : 'is-empty'}">${stepLabel}</span>
            </div>
            <div class="goal-card-meta">
                <span>${lastLabel}</span>
                ${stuckStreak >= 2 ? '<span class="goal-flag">Два чек-ина без движения</span>' : ''}
            </div>
            ${quick}
            <div class="goal-card-actions">
                <button type="button" class="goals-btn goals-btn-ghost" onclick="goalsOpenGoal('${escapeHtml(goal.id)}')">Открыть</button>
            </div>
        </article>
    `;
}

function renderGoalDetails(goal) {
    const checkins = getGoalCheckins(goal.id).slice().reverse();
    const doneSteps = (Array.isArray(goal.doneSteps) ? goal.doneSteps : []).slice().reverse();
    const stuckStreak = getGoalStuckStreak(goal.id);

    const stuckNote = stuckStreak >= 2
        ? `<div class="goals-note">Два чек-ина подряд без движения. Это не провал: возможно, шаг слишком большой — или цель изменилась.</div>`
        : '';

    const stepBlock = `
        <section class="goal-block">
            <div class="goal-block-title">Следующий шаг</div>
            <p class="goal-block-hint">Один шаг за раз. Остальное подождёт.</p>
            <div class="goal-step-editor">
                <input id="goalStepInput" class="goal-input" type="text" maxlength="${GOALS_CONFIG.stepLimit}"
                    placeholder="Например: написать первое письмо"
                    value="${goal.nextStep ? escapeHtml(goal.nextStep.text) : ''}">
                <div class="goal-step-actions">
                    <button type="button" class="goals-btn" onclick="goalsSaveStep('${escapeHtml(goal.id)}')">Сохранить шаг</button>
                    ${goal.nextStep ? `<button type="button" class="goals-btn goals-btn-primary" onclick="goalsCompleteStep('${escapeHtml(goal.id)}')">Сделал</button>` : ''}
                </div>
            </div>
        </section>
    `;

    const checkinBlock = goal.status === 'active' ? `
        <section class="goal-block">
            <div class="goal-block-title">Чек-ин</div>
            <p class="goal-block-hint">Отметьте, что произошло с прошлого раза. Заметка необязательна.</p>
            <textarea id="goalCheckinNote" class="goal-input goal-textarea" maxlength="${GOALS_CONFIG.noteLimit}"
                placeholder="Например: отложил на четверг, потому что вечером не было сил"></textarea>
            <div class="goal-checkin-actions">
                ${GOALS_CONFIG.checkinStates.map(state => `
                    <button type="button" class="goals-btn goal-quick-${state}"
                        onclick="goalsCheckinFromDetail('${escapeHtml(goal.id)}','${state}')">${GOALS_UI.stateLabels[state]}</button>
                `).join('')}
            </div>
        </section>
    ` : '';

    const historyBlock = `
        <section class="goal-block">
            <div class="goal-block-title">История</div>
            ${doneSteps.length ? `
                <div class="goal-history-label">Сделанные шаги</div>
                <ul class="goal-history">
                    ${doneSteps.map(step => `<li>✓ ${escapeHtml(step.text)} <span class="goal-history-date">${escapeHtml(formatTimestamp(step.at))}</span></li>`).join('')}
                </ul>
            ` : ''}
            ${checkins.length ? `
                <div class="goal-history-label">Чек-ины</div>
                <ul class="goal-history">
                    ${checkins.map(checkin => `
                        <li>
                            <span class="goal-history-state goal-quick-${checkin.state}">${GOALS_UI.stateLabels[checkin.state] || checkin.state}</span>
                            ${checkin.note ? escapeHtml(checkin.note) : ''}
                            <span class="goal-history-date">${escapeHtml(formatTimestamp(checkin.at))}</span>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
            ${!doneSteps.length && !checkins.length ? '<p class="goal-block-hint">Пока пусто — первый чек-ин появится здесь.</p>' : ''}
        </section>
    `;

    const statusActions = goal.status === 'active'
        ? `<button type="button" class="goals-btn" onclick="goalsSetStatus('${escapeHtml(goal.id)}','paused')">На паузу</button>
           <button type="button" class="goals-btn" onclick="goalsFinish('${escapeHtml(goal.id)}','done')">Завершить</button>
           <button type="button" class="goals-btn goals-btn-ghost" onclick="goalsFinish('${escapeHtml(goal.id)}','dropped')">Снять</button>`
        : goal.status === 'paused'
            ? `<button type="button" class="goals-btn goals-btn-primary" onclick="goalsSetStatus('${escapeHtml(goal.id)}','active')">Вернуть в работу</button>
               <button type="button" class="goals-btn" onclick="goalsFinish('${escapeHtml(goal.id)}','done')">Завершить</button>
               <button type="button" class="goals-btn goals-btn-ghost" onclick="goalsFinish('${escapeHtml(goal.id)}','dropped')">Снять</button>`
            : `<button type="button" class="goals-btn" onclick="goalsSetStatus('${escapeHtml(goal.id)}','active')">Вернуть в работу</button>`;

    return `
        <div class="goals-detail-head">
            <button type="button" class="goals-btn goals-btn-ghost" onclick="goalsGoList()">← Все цели</button>
            <span class="goal-status">${GOALS_UI.statusLabels[goal.status] || goal.status}</span>
        </div>
        <h2 class="goals-detail-title">${escapeHtml(goal.title)}</h2>
        ${stuckNote}
        <section class="goal-block">
            <div class="goal-block-title">Зачем</div>
            <p class="goal-block-text">${escapeHtml(goal.why)}</p>
        </section>
        <section class="goal-block">
            <div class="goal-block-title">Как пойму, что получилось</div>
            <p class="goal-block-text">${escapeHtml(goal.success)}</p>
        </section>
        ${stepBlock}
        ${checkinBlock}
        ${historyBlock}
        <div class="goal-block-actions">${statusActions}</div>
        ${goal.archivedReason ? `<p class="goal-block-hint">Причина: ${escapeHtml(goal.archivedReason)}</p>` : ''}
    `;
}

function renderGoalsCreate() {
    const errors = goalsState.errors.map(renderGoalError).join('');

    return `
        <div class="goals-detail-head">
            <button type="button" class="goals-btn goals-btn-ghost" onclick="goalsGoList()">← Все цели</button>
        </div>
        <h2 class="goals-detail-title">Новая цель</h2>
        ${errors}
        <section class="goal-block">
            <label class="goal-block-title" for="goalTitleInput">Чего вы хотите</label>
            <input id="goalTitleInput" class="goal-input" type="text" maxlength="${GOALS_CONFIG.titleLimit}"
                placeholder="Например: выучить испанский до разговорного уровня">
        </section>
        <section class="goal-block">
            <label class="goal-block-title" for="goalWhyInput">Зачем это вам</label>
            <p class="goal-block-hint">Честный ответ здесь важнее красивого. Начните с подсказки, если сложно.</p>
            <div class="goal-chips">
                ${GOALS_UI.whyStarts.map(start => `
                    <button type="button" class="goal-chip" onclick="goalsInsertPhrase('goalWhyInput', ${JSON.stringify(start).replace(/"/g, '&quot;')})">${escapeHtml(start)}</button>
                `).join('')}
            </div>
            <textarea id="goalWhyInput" class="goal-input goal-textarea" maxlength="${GOALS_CONFIG.whyLimit}"></textarea>
        </section>
        <section class="goal-block">
            <label class="goal-block-title" for="goalSuccessInput">Как поймёте, что получилось</label>
            <p class="goal-block-hint">Качественный признак, без процентов и дедлайнов.</p>
            <div class="goal-chips">
                ${GOALS_UI.successStarts.map(start => `
                    <button type="button" class="goal-chip" onclick="goalsInsertPhrase('goalSuccessInput', ${JSON.stringify(start).replace(/"/g, '&quot;')})">${escapeHtml(start)}</button>
                `).join('')}
            </div>
            <textarea id="goalSuccessInput" class="goal-input goal-textarea" maxlength="${GOALS_CONFIG.successLimit}"></textarea>
        </section>
        <section class="goal-block">
            <label class="goal-block-title" for="goalHorizonInput">Горизонт</label>
            <select id="goalHorizonInput" class="goal-input">
                ${GOALS_CONFIG.horizons.map(horizon => `
                    <option value="${horizon}">${GOALS_UI.horizonLabels[horizon]}</option>
                `).join('')}
            </select>
        </section>
        <div class="goal-block-actions">
            <button type="button" class="goals-btn goals-btn-primary" onclick="goalsCreateFromForm()">Создать цель</button>
            <button type="button" class="goals-btn goals-btn-ghost" onclick="goalsGoList()">Отмена</button>
        </div>
    `;
}

function renderGoalError(code) {
    const messages = {
        title_required: 'Напишите, чего вы хотите.',
        why_required: 'Без «зачем» цель превращается в пункт списка. Добавьте хотя бы одну строку.',
        success_required: 'Опишите, как поймёте, что получилось.',
        duplicate_title: 'Такая цель уже есть.',
        limit_reached: `Больше ${GOALS_CONFIG.maxGoals} целей хранить нельзя — завершите или уберите старые.`,
        bad_json: 'Файл повреждён или это не файл целей.',
        bad_shape: 'В файле нет списка целей.'
    };
    return `<div class="goals-error">${escapeHtml(messages[code] || 'Не получилось сохранить цель.')}</div>`;
}

// ==================== ДЕЙСТВИЯ ====================
function goalsInsertPhrase(fieldId, phrase) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.value = field.value.trim() ? `${field.value.trim()} ${phrase}` : phrase;
    field.focus();
}

function goalsCreateFromForm() {
    const title = document.getElementById('goalTitleInput');
    const why = document.getElementById('goalWhyInput');
    const success = document.getElementById('goalSuccessInput');
    const horizon = document.getElementById('goalHorizonInput');

    const result = createGoal({
        title: title ? title.value : '',
        why: why ? why.value : '',
        success: success ? success.value : '',
        horizon: horizon ? horizon.value : 'open'
    });

    if (!result.ok) {
        goalsState.errors = result.errors || ['unknown'];
        goalsState.view = 'create';
        renderGoalsInterface();
        // Возвращаем введённое, чтобы человек не набирал заново.
        if (title) document.getElementById('goalTitleInput').value = title.value;
        if (why) document.getElementById('goalWhyInput').value = why.value;
        if (success) document.getElementById('goalSuccessInput').value = success.value;
        return;
    }

    goalsNotify('Цель создана. Осталось выбрать следующий шаг.');
    goalsState.errors = [];
    goalsOpenGoal(result.goal.id);
}

function goalsQuickCheckin(goalId, state) {
    const result = addGoalCheckin(goalId, state, '');
    if (!result.ok) {
        goalsNotify('Не удалось отметить чек-ин', 'warning');
        return;
    }
    goalsNotify(`Отмечено: ${GOALS_UI.stateLabels[state].toLowerCase()}`);
    renderGoalsInterface();
}

function goalsCheckinFromDetail(goalId, state) {
    const note = document.getElementById('goalCheckinNote');
    const result = addGoalCheckin(goalId, state, note ? note.value : '');
    if (!result.ok) {
        goalsNotify('Не удалось отметить чек-ин', 'warning');
        return;
    }
    goalsNotify(`Отмечено: ${GOALS_UI.stateLabels[state].toLowerCase()}`);
    renderGoalsInterface();
}

function goalsSaveStep(goalId) {
    const input = document.getElementById('goalStepInput');
    const result = setGoalNextStep(goalId, input ? input.value : '');
    if (!result.ok) {
        goalsNotify('Не удалось сохранить шаг', 'warning');
        return;
    }
    goalsNotify(result.goal.nextStep ? 'Шаг сохранён' : 'Шаг убран');
    renderGoalsInterface();
}

function goalsCompleteStep(goalId) {
    const result = completeGoalNextStep(goalId);
    if (!result.ok) {
        goalsNotify('Сначала задайте следующий шаг', 'warning');
        return;
    }
    goalsNotify('Шаг в истории. Что дальше?');
    renderGoalsInterface();
}

function goalsSetStatus(goalId, status) {
    const result = setGoalStatus(goalId, status);
    if (!result.ok) {
        goalsNotify('Не удалось изменить статус', 'warning');
        return;
    }
    goalsNotify(status === 'paused' ? 'Цель на паузе' : 'Цель снова в работе');
    renderGoalsInterface();
}

function goalsFinish(goalId, status) {
    const question = status === 'done'
        ? 'Что помогло дойти до результата? (необязательно)'
        : 'Почему снимаете цель? (необязательно)';
    let reason = '';
    try {
        reason = window.prompt(question, '') || '';
    } catch (e) {
        reason = '';
    }

    const result = setGoalStatus(goalId, status, reason);
    if (!result.ok) {
        goalsNotify('Не удалось изменить статус', 'warning');
        return;
    }
    goalsNotify(status === 'done' ? 'Цель завершена' : 'Цель снята. Это тоже нормально.');
    renderGoalsInterface();
}

// ==================== ЭКСПОРТ / ИМПОРТ ====================
function goalsExport() {
    try {
        const payload = exportGoalsPackage();
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `goals-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        goalsNotify('Файл с целями сохранён');
    } catch (e) {
        console.error('[Goals] Export failed:', e);
        goalsNotify('Не удалось сохранить файл', 'warning');
    }
}

function goalsImportFile(input) {
    const file = input && input.files ? input.files[0] : null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const result = importGoalsPackage(String(reader.result || ''));
        if (!result.ok) {
            goalsState.errors = result.errors || ['unknown'];
            goalsState.view = 'create';
            renderGoalsInterface();
            return;
        }
        const summary = result.imported
            ? `Добавлено целей: ${result.imported}, чек-инов: ${result.checkins}`
            : 'Новых целей в файле нет';
        goalsNotify(summary);
        goalsGoList();
    };
    reader.onerror = () => goalsNotify('Не удалось прочитать файл', 'warning');
    reader.readAsText(file);
    input.value = '';
}

// ==================== РЕАКЦИЯ НА ИЗМЕНЕНИЯ ====================
// Пока открыт список — держим его в актуальном состоянии (например, после импорта).
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('goals-updated', () => {
        const modal = document.getElementById('goalsModal');
        if (!modal || !modal.classList.contains('active')) return;
        if (goalsState.view !== 'list') return;
        renderGoalsInterface();
    });
}
