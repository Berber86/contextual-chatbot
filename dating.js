// dating.js - модуль знакомств для Memory Chatbot
// Генерация личностного эмбеддинга на основе 50 независимых шкал
// + Двухуровневые описания профиля
// + Анализатор совместимости
// + Генератор идеального партнёра

// ==================== КОНСТАНТЫ ====================
const DATING_STORAGE_KEY = 'chatbot_dating_embedding';
const DATING_DESCRIPTIONS_KEY = 'chatbot_dating_descriptions';
const DATING_IDEAL_KEY = 'chatbot_dating_ideal';
const MIN_FACTS_REQUIRED = 50;
const EMBEDDING_PASSES = 3;
const TOTAL_SCALES = 50;

// 50 независимых шкал личности
const SCALES = [
    { id: 1,  name: 'Любопытство',        emoji: '🔍', category: 'mind',     desc: 'Тяга к новому, исследовательский интерес' },
    { id: 2,  name: 'Аналитичность',      emoji: '🧩', category: 'mind',     desc: 'Склонность разбирать, структурировать, искать логику' },
    { id: 3,  name: 'Креативность',        emoji: '🎨', category: 'mind',     desc: 'Воображение, нестандартное мышление, генерация идей' },
    { id: 4,  name: 'Практичность',        emoji: '🔧', category: 'mind',     desc: 'Ориентация на результат, прикладное мышление' },
    { id: 5,  name: 'Рефлексивность',      emoji: '🪞', category: 'mind',     desc: 'Склонность к самоанализу и осмыслению опыта' },
    { id: 6,  name: 'Стратегичность',      emoji: '♟️', category: 'mind',     desc: 'Умение планировать вдолгую, видеть перспективу' },
    { id: 7,  name: 'Широта кругозора',    emoji: '🌐', category: 'mind',     desc: 'Разнообразие интересов и знаний' },
    { id: 8,  name: 'Глубина погружения',  emoji: '🔬', category: 'mind',     desc: 'Способность уходить в тему до деталей' },
    { id: 9,  name: 'Энергичность',        emoji: '⚡', category: 'energy',   desc: 'Общий уровень жизненной энергии и активности' },
    { id: 10, name: 'Инициативность',      emoji: '🚀', category: 'energy',   desc: 'Готовность начинать первым, не ждать' },
    { id: 11, name: 'Настойчивость',       emoji: '🏔️', category: 'energy',   desc: 'Упорство в достижении целей несмотря на трудности' },
    { id: 12, name: 'Амбициозность',       emoji: '🎯', category: 'energy',   desc: 'Масштаб целей и стремлений' },
    { id: 13, name: 'Склонность к риску',  emoji: '🎲', category: 'energy',   desc: 'Готовность действовать в условиях неопределённости' },
    { id: 14, name: 'Спонтанность',        emoji: '🌊', category: 'energy',   desc: 'Способность действовать по наитию, без плана' },
    { id: 15, name: 'Дисциплина',          emoji: '📏', category: 'energy',   desc: 'Систематичность, следование правилам и графикам' },
    { id: 16, name: 'Эмоциональная глубина',      emoji: '🌊', category: 'emotion', desc: 'Интенсивность и сложность переживаний' },
    { id: 17, name: 'Эмоциональная стабильность',  emoji: '⚓', category: 'emotion', desc: 'Устойчивость настроения, ровность' },
    { id: 18, name: 'Оптимизм',                    emoji: '☀️', category: 'emotion', desc: 'Позитивный взгляд на будущее и ситуации' },
    { id: 19, name: 'Тревожность',                 emoji: '😰', category: 'emotion', desc: 'Склонность к беспокойству и переживаниям' },
    { id: 20, name: 'Стрессоустойчивость',          emoji: '🛡️', category: 'emotion', desc: 'Способность сохранять функциональность под давлением' },
    { id: 21, name: 'Эмпатия',                     emoji: '💗', category: 'emotion', desc: 'Способность чувствовать и понимать чужие эмоции' },
    { id: 22, name: 'Уязвимость',                  emoji: '🦋', category: 'emotion', desc: 'Открытость к ранению, незащищённость' },
    { id: 23, name: 'Самоирония',                  emoji: '😏', category: 'emotion', desc: 'Способность смеяться над собой' },
    { id: 24, name: 'Чувствительность к красоте',  emoji: '✨', category: 'emotion', desc: 'Эстетическое восприятие, реакция на прекрасное' },
    { id: 25, name: 'Общительность',            emoji: '💬', category: 'social',   desc: 'Потребность и удовольствие от общения' },
    { id: 26, name: 'Социальная смелость',       emoji: '🎤', category: 'social',   desc: 'Уверенность в новых социальных ситуациях' },
    { id: 27, name: 'Лидерство',                emoji: '👑', category: 'social',   desc: 'Склонность вести, организовывать, направлять' },
    { id: 28, name: 'Командность',               emoji: '🤝', category: 'social',   desc: 'Способность и желание работать в команде' },
    { id: 29, name: 'Доверчивость',              emoji: '🤲', category: 'social',   desc: 'Готовность доверять людям по умолчанию' },
    { id: 30, name: 'Конфликтность',             emoji: '⚔️', category: 'social',   desc: 'Склонность к столкновениям и отстаиванию позиции' },
    { id: 31, name: 'Дипломатичность',           emoji: '🕊️', category: 'social',   desc: 'Умение сглаживать углы, находить компромиссы' },
    { id: 32, name: 'Потребность в одиночестве', emoji: '🏝️', category: 'social',   desc: 'Необходимость времени наедине с собой' },
    { id: 33, name: 'Щедрость',                 emoji: '🎁', category: 'social',   desc: 'Готовность отдавать время, ресурсы, внимание' },
    { id: 34, name: 'Чувство юмора',            emoji: '😄', category: 'social',   desc: 'Способность шутить и ценить юмор' },
    { id: 35, name: 'Самостоятельность',  emoji: '🦅', category: 'character', desc: 'Независимость в решениях и действиях' },
    { id: 36, name: 'Ответственность',    emoji: '⚖️', category: 'character', desc: 'Готовность отвечать за свои решения и обязательства' },
    { id: 37, name: 'Честность',          emoji: '💎', category: 'character', desc: 'Прямота, правдивость, нетерпимость к лжи' },
    { id: 38, name: 'Адаптивность',       emoji: '🌿', category: 'character', desc: 'Гибкость, способность подстраиваться под обстоятельства' },
    { id: 39, name: 'Перфекционизм',      emoji: '🎯', category: 'character', desc: 'Стремление к идеалу, внимание к деталям' },
    { id: 40, name: 'Самоконтроль',       emoji: '🧘', category: 'character', desc: 'Управление импульсами и желаниями' },
    { id: 41, name: 'Терпеливость',       emoji: '⏳', category: 'character', desc: 'Способность ждать и выдерживать медленный процесс' },
    { id: 42, name: 'Решительность',      emoji: '⚡', category: 'character', desc: 'Скорость и уверенность в принятии решений' },
    { id: 43, name: 'Ценность свободы',        emoji: '🕊️', category: 'values', desc: 'Важность личной свободы и автономии' },
    { id: 44, name: 'Ценность семьи',          emoji: '🏠', category: 'values', desc: 'Важность семейных связей и домашнего очага' },
    { id: 45, name: 'Ценность карьеры',        emoji: '📈', category: 'values', desc: 'Важность профессиональной реализации' },
    { id: 46, name: 'Ценность саморазвития',   emoji: '📚', category: 'values', desc: 'Стремление к росту, обучению, эволюции' },
    { id: 47, name: 'Ценность справедливости', emoji: '⚖️', category: 'values', desc: 'Важность честности и равенства в мире' },
    { id: 48, name: 'Ценность комфорта',       emoji: '🛋️', category: 'values', desc: 'Важность бытового и психологического комфорта' },
    { id: 49, name: 'Ценность впечатлений',    emoji: '🎢', category: 'values', desc: 'Важность нового опыта, путешествий, ощущений' },
    { id: 50, name: 'Духовность',              emoji: '🙏', category: 'values', desc: 'Внимание к смыслам, вера, философское мышление' }
];

const CATEGORY_LABELS = {
    mind: '🧠 Мышление и познание',
    energy: '⚡ Энергия и действие',
    emotion: '💫 Эмоции и внутренний мир',
    social: '👥 Социальное',
    character: '💪 Характер и воля',
    values: '💎 Ценности и ориентиры'
};

// ==================== СОСТОЯНИЕ ====================
let datingState = {
    isGenerating: false,
    currentPass: 0,
    passes: [],
    finalEmbedding: null,
    isGeneratingDescription: false,
    isAnalyzing: false,
    isGeneratingIdeal: false,
    activeTab: 'profile'
};

// ==================== UI ФУНКЦИИ ====================

function openDatingModal() {
    const modal = document.getElementById('datingModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        switchDatingTab(datingState.activeTab);
    }
}

function closeDatingModal() {
    const modal = document.getElementById('datingModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
    if (datingState.isGenerating) {
        datingState.isGenerating = false;
        datingState.currentPass = 0;
        datingState.passes = [];
    }
}

function switchDatingTab(tab) {
    datingState.activeTab = tab;
    document.querySelectorAll('.dating-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    if (tab === 'profile') checkDatingEligibility();
    else if (tab === 'ideal') renderIdealTab();
    else if (tab === 'compatibility') renderCompatibilityTab();
}

// ==================== PROFILE TAB ====================
// (полностью из твоей версии — без изменений)

function checkDatingEligibility() {
    const container = document.getElementById('datingContent');
    if (!container) return;
    const factsData = getFactsData();
    const factsCount = factsData.facts ? factsData.facts.filter(f => !f.superseded).length : 0;
    console.log(`[Dating] Facts count: ${factsCount}/${MIN_FACTS_REQUIRED}`);
    const savedEmbedding = getSavedEmbedding();
    if (savedEmbedding) renderSavedEmbedding(savedEmbedding);
    else if (factsCount < MIN_FACTS_REQUIRED) renderNotEnoughData(factsCount);
    else renderReadyToGenerate(factsCount);
}

function renderNotEnoughData(currentCount) {
    const container = document.getElementById('datingContent');
    container.innerHTML = `
        <div class="dating-status dating-not-ready">
            <div class="dating-icon">🔒</div>
            <h3>Недостаточно данных</h3>
            <p>Для создания вашего личностного профиля нужно накопить минимум <strong>${MIN_FACTS_REQUIRED} фактов</strong> о вас.</p>
            <div class="dating-progress">
                <div class="dating-progress-bar" style="width: ${(currentCount / MIN_FACTS_REQUIRED) * 100}%"></div>
            </div>
            <p class="dating-progress-text">${currentCount} / ${MIN_FACTS_REQUIRED} фактов</p>
            <p class="dating-hint">Продолжайте общаться с ассистентом, рассказывайте о себе, своих интересах и взглядах.</p>
        </div>`;
}

function renderReadyToGenerate(factsCount) {
    const container = document.getElementById('datingContent');
    container.innerHTML = `
        <div class="dating-status dating-ready">
            <div class="dating-icon">✨</div>
            <h3>Готово к анализу!</h3>
            <p>Накоплено <strong>${factsCount} фактов</strong> о вас. Этого достаточно для создания личностного профиля.</p>
            <p class="dating-info">Анализ займёт около минуты. Будет выполнено 3 независимых прохода для повышения точности.</p>
            <button class="dating-generate-btn" onclick="startEmbeddingGeneration()">🧬 Создать мой профиль</button>
        </div>`;
}

function renderGeneratingState() {
    const container = document.getElementById('datingContent');
    container.innerHTML = `
        <div class="dating-status dating-generating">
            <div class="dating-spinner"></div>
            <h3>Анализ личности...</h3>
            <p class="dating-pass-info">Проход <span id="currentPassNum">${datingState.currentPass}</span> из ${EMBEDDING_PASSES}</p>
            <div class="dating-progress"><div class="dating-progress-bar" id="generationProgress" style="width: 0%"></div></div>
            <p class="dating-hint">Анализируем ваши факты и черты по 50 измерениям...</p>
        </div>`;
}

function updateGenerationProgress(pass) {
    const passNum = document.getElementById('currentPassNum');
    const progressBar = document.getElementById('generationProgress');
    if (passNum) passNum.textContent = pass;
    if (progressBar) progressBar.style.width = `${(pass / EMBEDDING_PASSES) * 100}%`;
}

function renderSavedEmbedding(embedding) {
    const container = document.getElementById('datingContent');
    const topTraits = getTopTraits(embedding, 5);
    const highTraits = topTraits.filter(t => t.pole === 'high');
    const lowTraits = topTraits.filter(t => t.pole === 'low');
    const descriptions = getSavedDescriptions();
    const createdDate = embedding.createdAt ? new Date(embedding.createdAt).toLocaleDateString('ru-RU') : 'неизвестно';
    const reliableCount = embedding.vectors.filter(v => v.spread <= 0.1).length;
    const moderateCount = embedding.vectors.filter(v => v.spread > 0.1 && v.spread <= 0.2).length;
    const uncertainCount = embedding.vectors.filter(v => v.spread > 0.2).length;

    container.innerHTML = `
        <div class="dating-status dating-complete">
            <div class="dating-icon">🎯</div>
            <h3>Ваш личностный профиль</h3>
            <p class="dating-date">Создан: ${createdDate}</p>
            <p class="dating-reliability-summary">
                Достоверных: <strong class="text-good">${reliableCount}</strong>
                ${moderateCount > 0 ? ` · Умеренных: <strong>${moderateCount}</strong>` : ''}
                ${uncertainCount > 0 ? ` · Сомнительных: <strong class="text-warning">${uncertainCount}</strong>` : ''}
                <span class="text-muted"> из ${TOTAL_SCALES}</span>
            </p>
            <div class="dating-top-traits">
                ${highTraits.length > 0 ? `<h4>🔥 Ярко выражено:</h4>${highTraits.map(trait => renderScaleBar(trait)).join('')}` : `<h4>🔥 Ярко выражено:</h4><div class="no-notable-traits"><p>Нет достоверно высоких шкал (≥70% при разбросе ≤0.15)</p></div>`}
                ${lowTraits.length > 0 ? `<h4>🧊 Слабо выражено:</h4>${lowTraits.map(trait => renderScaleBar(trait)).join('')}` : `<h4>🧊 Слабо выражено:</h4><div class="no-notable-traits"><p>Нет достоверно низких шкал (≤30% при разбросе ≤0.15)</p></div>`}
            </div>
            <div class="dating-actions">
                <button class="dating-btn dating-btn-copy" onclick="copyEmbeddingToClipboard()">📋 Копировать профиль</button>
                <button class="dating-btn dating-btn-details" onclick="toggleFullEmbedding()">📊 Все 50 шкал</button>
                <button class="dating-btn dating-btn-regenerate" onclick="confirmRegenerate()">🔄 Пересоздать</button>
            </div>
            <div class="dating-full-embedding" id="fullEmbeddingView" style="display: none;">
                <h4>Полный профиль (50 шкал):</h4>
                <div class="dating-all-traits">${renderAllScales(embedding)}</div>
            </div>
            <div class="dating-descriptions-section">
                <div class="dating-descriptions-header">
                    <h4>✍️ Описания профиля</h4>
                    <div class="dating-descriptions-info">
                        <span class="info-icon" title="Как это работает?">ℹ️</span>
                        <div class="info-tooltip">
                            <p><strong>🔒 Публичное описание</strong> — видят все. Анонимно.</p>
                            <p><strong>🔓 Описание для мэтчей</strong> — только после взаимного интереса.</p>
                        </div>
                    </div>
                </div>
                <div class="dating-description-block">
                    <div class="description-label"><span class="label-icon">🔒</span><span class="label-text">Публичное описание</span><span class="label-hint">Видят все</span></div>
                    <div class="description-content">
                        <textarea id="descriptionLevel1" class="description-textarea" placeholder="Нажмите 'Сгенерировать'..." oninput="onDescriptionChange(1)">${descriptions.level1?.text || ''}</textarea>
                        <div class="description-actions">
                            <button class="desc-btn desc-btn-generate" onclick="generateDescription(1)" id="genBtn1">✨ Сгенерировать</button>
                            <label class="desc-checkbox"><input type="checkbox" id="enableLevel1" ${descriptions.level1?.enabled ? 'checked' : ''} onchange="toggleDescriptionEnabled(1)"><span>Применить</span></label>
                        </div>
                    </div>
                </div>
                <div class="dating-description-block">
                    <div class="description-label"><span class="label-icon">🔓</span><span class="label-text">Описание для мэтчей</span><span class="label-hint">Видят после взаимного интереса</span></div>
                    <div class="description-content">
                        <textarea id="descriptionLevel2" class="description-textarea" placeholder="Нажмите 'Сгенерировать'..." oninput="onDescriptionChange(2)">${descriptions.level2?.text || ''}</textarea>
                        <div class="description-actions">
                            <button class="desc-btn desc-btn-generate" onclick="generateDescription(2)" id="genBtn2">✨ Сгенерировать</button>
                            <label class="desc-checkbox"><input type="checkbox" id="enableLevel2" ${descriptions.level2?.enabled ? 'checked' : ''} onchange="toggleDescriptionEnabled(2)"><span>Применить</span></label>
                        </div>
                    </div>
                </div>
                <div class="dating-prototype-note"><span>🚧</span><p>Прототип. Мэтчи будут позже.</p></div>
            </div>
        </div>`;
}

// ==================== SCALE RENDERING ====================
// (полностью из твоей версии)

function renderScaleBar(trait) {
    const scale = SCALES[trait.index];
    if (!scale) { console.error('[Dating] Invalid scale index:', trait.index); return ''; }
    let reliabilityClass = 'high';
    if (trait.spread > 0.2) reliabilityClass = 'low';
    else if (trait.spread > 0.1) reliabilityClass = 'medium';
    const percent = (trait.value * 100).toFixed(0);
    const isLow = trait.pole === 'low';
    return `
        <div class="scale-bar-container ${isLow ? 'scale-low' : 'scale-high'}">
            <div class="scale-header">
                <span class="scale-emoji">${scale.emoji}</span>
                <span class="scale-name">${scale.name}</span>
                <span class="scale-pole-badge ${isLow ? 'pole-low' : 'pole-high'}">${isLow ? '▼ ' + percent + '%' : '▲ ' + percent + '%'}</span>
                <span class="trait-reliability reliability-${reliabilityClass}" title="Разброс: ${trait.spread.toFixed(2)}">${reliabilityClass === 'high' ? '✓' : reliabilityClass === 'medium' ? '~' : '?'}</span>
            </div>
            <div class="scale-bar">
                <div class="scale-bar-fill ${isLow ? 'fill-low' : 'fill-high'}" style="width: ${percent}%"></div>
                <div class="scale-bar-midpoint"></div>
            </div>
        </div>`;
}

function renderAllScales(embedding) {
    const categories = {};
    SCALES.forEach((scale, idx) => {
        if (!scale || idx >= embedding.vectors.length) return;
        if (!categories[scale.category]) categories[scale.category] = [];
        categories[scale.category].push({ scale, index: idx, value: embedding.vectors[idx]?.value ?? 0.5, spread: embedding.vectors[idx]?.spread ?? 0 });
    });
    let html = '';
    for (const [catKey, items] of Object.entries(categories)) {
        html += `<div class="scales-category"><div class="scales-category-header">${CATEGORY_LABELS[catKey] || catKey}</div>`;
        items.forEach(item => {
            let reliabilityClass = 'high';
            if (item.spread > 0.2) reliabilityClass = 'low';
            else if (item.spread > 0.1) reliabilityClass = 'medium';
            const percent = (item.value * 100).toFixed(0);
            html += `<div class="mini-scale"><span class="mini-scale-emoji">${item.scale.emoji}</span><span class="mini-scale-name">${item.scale.name}</span><div class="mini-scale-bar"><div class="mini-scale-fill" style="width: ${percent}%"></div></div><span class="mini-scale-value">${percent}%</span><span class="mini-scale-spread reliability-${reliabilityClass}">(±${item.spread.toFixed(2)})</span></div>`;
        });
        html += '</div>';
    }
    return html;
}

function toggleFullEmbedding() {
    const view = document.getElementById('fullEmbeddingView');
    if (view) view.style.display = view.style.display === 'none' ? 'block' : 'none';
}

function confirmRegenerate() {
    if (confirm('Пересоздать профиль? Текущий будет заменён.')) {
        localStorage.removeItem(DATING_STORAGE_KEY);
        localStorage.removeItem(DATING_IDEAL_KEY);
        const factsData = getFactsData();
        const factsCount = factsData.facts ? factsData.facts.filter(f => !f.superseded).length : 0;
        renderReadyToGenerate(factsCount);
    }
}

// ==================== TOP TRAITS (5 высоких + 5 низких) ====================
// (из твоей версии)

function getTopTraits(embedding, countPerPole = 5) {
    const traits = embedding.vectors.map((vec, idx) => ({
        index: idx, value: vec.value, spread: vec.spread,
        name: SCALES[idx].name, emoji: SCALES[idx].emoji, category: SCALES[idx].category
    }));
    const reliable = traits.filter(t => t.spread <= 0.15);
    const highPool = reliable.filter(t => t.value >= 0.7).sort((a, b) => b.value - a.value).slice(0, countPerPole).map(t => ({ ...t, pole: 'high' }));
    const lowPool = reliable.filter(t => t.value <= 0.5).sort((a, b) => a.value - b.value).slice(0, countPerPole).map(t => ({ ...t, pole: 'low' }));
    return [...highPool, ...lowPool];
}

// ==================== COMPATIBILITY TAB ====================
// (полностью из твоей версии — промпты без изменений)

function renderCompatibilityTab() {
    const container = document.getElementById('datingContent');
    if (!container) return;
    
    const savedEmbedding = getSavedEmbedding();
    
    if (!savedEmbedding) {
        container.innerHTML = `<div class="dating-status dating-not-ready"><div class="dating-icon">🔒</div><h3>Сначала создайте свой профиль</h3><p>Перейдите во вкладку "Мой профиль" и создайте личностный эмбеддинг.</p><button class="dating-btn dating-btn-details" onclick="switchDatingTab('profile')">← Мой профиль</button></div>`;
        return;
    }
    
    const savedIdeal = getSavedIdeal();
    const hasIdeal = savedIdeal && savedIdeal.searchScales;
    
    container.innerHTML = `
        <div class="compat-container">
            <div class="compat-intro">
                <div class="dating-icon">🧲</div>
                <h3>Анализ совместимости</h3>
                <p>Вставьте эмбеддинг другого человека. Можете добавить его описание для более глубокого анализа.</p>
            </div>
            
            <div class="compat-input-block">
                <label class="compat-label">
                    <span class="label-icon">🧬</span>
                    <span>Эмбеддинг кандидата</span>
                    <span class="label-required">*</span>
                </label>
                <input type="text" id="candidateEmbeddingInput" class="compat-embedding-input"
                    placeholder="DATING_EMBED_V2|..." oninput="validateCandidateInput()">
                <div class="compat-input-status" id="embedStatus"></div>
            </div>
            
            <div class="compat-input-block">
                <label class="compat-label">
                    <span class="label-icon">✍️</span>
                    <span>Описание кандидата</span>
                    <span class="label-optional">необязательно</span>
                </label>
                <textarea id="candidateDescriptionInput" class="compat-description-input"
                    placeholder="Любая информация о человеке..." rows="4"></textarea>
            </div>
            
            <!-- Две кнопки анализа -->
            <div class="compat-buttons">
                <button class="dating-generate-btn compat-analyze-btn" id="analyzeBtn" onclick="runCompatibilityAnalysis()" disabled>
                    🧲 Глубокий анализ
                </button>
                <button class="dating-generate-btn compat-analyze-btn compat-light-btn" id="analyzeLightBtn" onclick="runLightCompatibilityAnalysis()" disabled ${!hasIdeal ? 'title="Сначала определите идеал во вкладке 💫"' : ''}>
                    ⚡ Быстрый анализ
                </button>
            </div>
            ${!hasIdeal ? '<p class="compat-light-hint">⚡ Быстрый анализ доступен после заполнения вкладки "💫 Кто мне нужен?"</p>' : ''}
            
            <div class="compat-result" id="compatResult"></div>
        </div>`;
}

function validateCandidateInput() {
    const input = document.getElementById('candidateEmbeddingInput');
    const status = document.getElementById('embedStatus');
    const btn = document.getElementById('analyzeBtn');
    const btnLight = document.getElementById('analyzeLightBtn');
    
    if (!input || !status || !btn) return;
    
    const value = input.value.trim();
    
    if (!value) {
        status.innerHTML = '';
        status.className = 'compat-input-status';
        btn.disabled = true;
        if (btnLight) btnLight.disabled = true;
        return;
    }
    
    const parsed = parseEmbeddingFromExport(value);
    
    if (parsed) {
        const date = new Date(parsed.createdAt).toLocaleDateString('ru-RU');
        status.innerHTML = `✅ Валидный эмбеддинг v${parsed.version} (${parsed.factsCount} фактов, создан ${date})`;
        status.className = 'compat-input-status status-valid';
        btn.disabled = false;
        
        // Быстрый анализ доступен только если есть идеал
        const hasIdeal = getSavedIdeal()?.searchScales;
        if (btnLight) btnLight.disabled = !hasIdeal;
    } else {
        status.innerHTML = '❌ Неверный формат. Нужна строка DATING_EMBED_V2|...';
        status.className = 'compat-input-status status-invalid';
        btn.disabled = true;
        if (btnLight) btnLight.disabled = true;
    }
}

async function runCompatibilityAnalysis() {
    if (datingState.isAnalyzing) return;
    const embedInput = document.getElementById('candidateEmbeddingInput');
    const descInput = document.getElementById('candidateDescriptionInput');
    const resultContainer = document.getElementById('compatResult');
    const btn = document.getElementById('analyzeBtn');
    if (!embedInput || !resultContainer || !btn) return;
    const candidateEmbedding = parseEmbeddingFromExport(embedInput.value.trim());
    if (!candidateEmbedding) return;
    const candidateDescription = descInput?.value?.trim() || '';
    datingState.isAnalyzing = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Анализирую...';
    resultContainer.innerHTML = `<div class="compat-loading"><div class="dating-spinner"></div><p>Изучаю кандидата и вашу совместимость...</p></div>`;
    try {
        const userFacts = getFactsForPrompt(false);
        const userTraits = getTraitsForPrompt(false);
        const userTimeline = getTimelineForPrompt();
        const userSocial = getSocialForPrompt();
        const userHypotheses = getHypothesesForPrompt(false);
        const userStyle = localStorage.getItem(STORAGE_KEYS.style) || '';
        const candidateProfile = decodeCandidateEmbedding(candidateEmbedding);
        const prompt = buildCompatibilityPrompt({ userFacts, userTraits, userTimeline, userSocial, userHypotheses, userStyle, candidateProfile, candidateDescription });
        const streamingDiv = document.createElement('div');
        streamingDiv.className = 'compat-analysis-text';
        resultContainer.innerHTML = '';
        resultContainer.appendChild(streamingDiv);
        await streamResponseOpenRouter(
            [{ role: "user", content: prompt }],
            (partialText) => { streamingDiv.innerHTML = formatMessageMarkdown(partialText); },
            (finalText) => { streamingDiv.innerHTML = formatMessageMarkdown(finalText); },
            { temperature: 0.7 }
        );
    } catch (error) {
        resultContainer.innerHTML = `<div class="compat-error"><p>❌ Ошибка: ${error.message}</p><button class="dating-btn" onclick="runCompatibilityAnalysis()">🔄 Попробовать снова</button></div>`;
    } finally {
        datingState.isAnalyzing = false;
        btn.disabled = false;
        btn.innerHTML = '🧲 Проанализировать совместимость';
    }
}

async function runLightCompatibilityAnalysis() {
    if (datingState.isAnalyzing) return;
    
    const embedInput = document.getElementById('candidateEmbeddingInput');
    const descInput = document.getElementById('candidateDescriptionInput');
    const resultContainer = document.getElementById('compatResult');
    const btn = document.getElementById('analyzeLightBtn');
    
    if (!embedInput || !resultContainer || !btn) return;
    
    const candidateEmbedding = parseEmbeddingFromExport(embedInput.value.trim());
    if (!candidateEmbedding) return;
    
    const userEmbedding = getSavedEmbedding();
    if (!userEmbedding) return;
    
    const ideal = getSavedIdeal();
    if (!ideal || !ideal.searchScales) return;
    
    const candidateDescription = descInput?.value?.trim() || '';
    
    datingState.isAnalyzing = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Анализирую...';
    
    resultContainer.innerHTML = `
        <div class="compat-loading">
            <div class="dating-spinner"></div>
            <p>Быстрый анализ по шкалам...</p>
        </div>`;
    
    try {
        // Собираем матч-репорт: что совпало, что нет
        const matchReport = buildMatchReport(userEmbedding, candidateEmbedding, ideal);
        
        const prompt = buildLightCompatibilityPrompt(matchReport, candidateDescription, ideal.expectations);
        
        console.log('[Dating] Running light compatibility analysis...');
        
        const streamingDiv = document.createElement('div');
        streamingDiv.className = 'compat-analysis-text';
        resultContainer.innerHTML = '';
        resultContainer.appendChild(streamingDiv);
        
        await streamResponseOpenRouter(
            [{ role: "user", content: prompt }],
            (partialText) => { streamingDiv.innerHTML = formatMessageMarkdown(partialText); },
            (finalText) => { streamingDiv.innerHTML = formatMessageMarkdown(finalText); },
            { temperature: 0.7 }
        );
        
    } catch (error) {
        console.error('[Dating] Light analysis failed:', error);
        resultContainer.innerHTML = `
            <div class="compat-error">
                <p>❌ Ошибка: ${error.message}</p>
                <button class="dating-btn" onclick="runLightCompatibilityAnalysis()">🔄 Попробовать снова</button>
            </div>`;
    } finally {
        datingState.isAnalyzing = false;
        btn.disabled = false;
        btn.innerHTML = '⚡ Быстрый анализ';
    }
}

function buildMatchReport(userEmbed, candidateEmbed, ideal) {
    const report = {
        matchedHigh: [],    // Ожидали высокое — и оно высокое
        failedHigh: [],     // Ожидали высокое — а оно низкое/среднее
        matchedLow: [],     // Ожидали низкое — и оно низкое
        failedLow: [],      // Ожидали низкое — а оно высокое
        surprises: [],      // Неожиданно яркие или низкие шкалы вне ожиданий
        userHighlights: [], // Яркие черты юзера для контекста
        userLowlights: []   // Низкие черты юзера для контекста
    };
    
    // Проверяем HIGH ожидания (должно быть ≥ 0.7)
    for (const scaleId of ideal.searchScales.high) {
        const idx = scaleId - 1;
        const scale = SCALES[idx];
        if (!scale) continue;
        
        const candValue = candidateEmbed.vectors[idx]?.value ?? 0.5;
        const candSpread = candidateEmbed.vectors[idx]?.spread ?? 0;
        const reliable = candSpread <= 0.3;
        
        const entry = {
            id: scaleId,
            name: scale.name,
            emoji: scale.emoji,
            expected: '≥ 70%',
            actual: candValue,
            actualPercent: (candValue * 100).toFixed(0) + '%',
            reliable,
            spread: candSpread
        };
        
        if (candValue >= 0.7) {
            report.matchedHigh.push(entry);
        } else {
            entry.deficit = ((0.7 - candValue) * 100).toFixed(0) + '%';
            report.failedHigh.push(entry);
        }
    }
    
    // Проверяем LOW ожидания (должно быть ≤ 0.5)
    for (const scaleId of ideal.searchScales.low) {
        const idx = scaleId - 1;
        const scale = SCALES[idx];
        if (!scale) continue;
        
        const candValue = candidateEmbed.vectors[idx]?.value ?? 0.5;
        const candSpread = candidateEmbed.vectors[idx]?.spread ?? 0;
        const reliable = candSpread <= 0.3;
        
        const entry = {
            id: scaleId,
            name: scale.name,
            emoji: scale.emoji,
            expected: '≤ 50%',
            actual: candValue,
            actualPercent: (candValue * 100).toFixed(0) + '%',
            reliable,
            spread: candSpread
        };
        
        if (candValue <= 0.5) {
            report.matchedLow.push(entry);
        } else {
            entry.excess = ((candValue - 0.5) * 100).toFixed(0) + '%';
            report.failedLow.push(entry);
        }
    }
    
    // Сюрпризы: яркие черты кандидата которые не в ожиданиях
    const expectedIds = [...ideal.searchScales.high, ...ideal.searchScales.low];
    for (let idx = 0; idx < TOTAL_SCALES; idx++) {
        const scaleId = idx + 1;
        if (expectedIds.includes(scaleId)) continue;
        
        const candValue = candidateEmbed.vectors[idx]?.value ?? 0.5;
        const candSpread = candidateEmbed.vectors[idx]?.spread ?? 0;
        
        if (candSpread > 0.3) continue; // Только достоверные
        
        if (candValue >= 0.8 || candValue <= 0.15) {
            report.surprises.push({
                id: scaleId,
                name: SCALES[idx].name,
                emoji: SCALES[idx].emoji,
                value: candValue,
                percent: (candValue * 100).toFixed(0) + '%',
                pole: candValue >= 0.8 ? 'high' : 'low'
            });
        }
    }
    
    // Яркие черты юзера для контекста
    for (let idx = 0; idx < TOTAL_SCALES; idx++) {
        const userValue = userEmbed.vectors[idx]?.value ?? 0.5;
        const userSpread = userEmbed.vectors[idx]?.spread ?? 0;
        
        if (userSpread > 0.15) continue;
        
        if (userValue >= 0.75) {
            report.userHighlights.push({ name: SCALES[idx].name, emoji: SCALES[idx].emoji, percent: (userValue * 100).toFixed(0) + '%' });
        } else if (userValue <= 0.25) {
            report.userLowlights.push({ name: SCALES[idx].name, emoji: SCALES[idx].emoji, percent: (userValue * 100).toFixed(0) + '%' });
        }
    }
    
    return report;
}

function buildLightCompatibilityPrompt(report, candidateDescription, expectations) {
    const langName = getLanguageName();
    const userStyle = localStorage.getItem(STORAGE_KEYS.style) || '';
    
    let styleBlock = '';
    if (userStyle && userStyle.trim()) {
        styleBlock = `\n=== СТИЛЬ ОБЩЕНИЯ ===\nАдаптируй стиль под пользователя:\n${userStyle}\n`;
    }
    
    // Форматируем отчёт
    let matchSection = '';
    
    // Совпавшие HIGH
    if (report.matchedHigh.length > 0) {
        matchSection += '✅ СОВПАЛО (ожидали высокое — оно высокое):\n';
        matchSection += report.matchedHigh.map(e => 
            `• ${e.emoji} ${e.name}: ${e.actualPercent}${!e.reliable ? ' ⚠️ недостоверно' : ''}`
        ).join('\n');
    }
    
    // Не совпавшие HIGH
    if (report.failedHigh.length > 0) {
        matchSection += '\n\n❌ НЕ СОВПАЛО (ожидали высокое ≥70% — а оно ниже):\n';
        matchSection += report.failedHigh.map(e => 
            `• ${e.emoji} ${e.name}: ${e.actualPercent} (не хватает ${e.deficit})${!e.reliable ? ' ⚠️ недостоверно' : ''}`
        ).join('\n');
    }
    
    // Совпавшие LOW
    if (report.matchedLow.length > 0) {
        matchSection += '\n\n✅ СОВПАЛО (ожидали низкое — оно низкое):\n';
        matchSection += report.matchedLow.map(e => 
            `• ${e.emoji} ${e.name}: ${e.actualPercent}${!e.reliable ? ' ⚠️ недостоверно' : ''}`
        ).join('\n');
    }
    
    // Не совпавшие LOW
    if (report.failedLow.length > 0) {
        matchSection += '\n\n❌ НЕ СОВПАЛО (ожидали низкое ≤50% — а оно выше):\n';
        matchSection += report.failedLow.map(e => 
            `• ${e.emoji} ${e.name}: ${e.actualPercent} (превышение на ${e.excess})${!e.reliable ? ' ⚠️ недостоверно' : ''}`
        ).join('\n');
    }
    
    // Сюрпризы
    if (report.surprises.length > 0) {
        matchSection += '\n\n🎲 НЕОЖИДАННОСТИ (яркие черты вне ожиданий):\n';
        matchSection += report.surprises.map(e => 
            `• ${e.emoji} ${e.name}: ${e.percent} (${e.pole === 'high' ? 'очень высокое' : 'очень низкое'})`
        ).join('\n');
    }
    
    // Контекст юзера
    let userContext = '';
    if (report.userHighlights.length > 0 || report.userLowlights.length > 0) {
        userContext = '\n=== КЛЮЧЕВЫЕ ЧЕРТЫ ПОЛЬЗОВАТЕЛЯ (для контекста) ===\n';
        if (report.userHighlights.length > 0) {
            userContext += '🔥 Высокие: ' + report.userHighlights.map(e => `${e.emoji} ${e.name} ${e.percent}`).join(', ') + '\n';
        }
        if (report.userLowlights.length > 0) {
            userContext += '🧊 Низкие: ' + report.userLowlights.map(e => `${e.emoji} ${e.name} ${e.percent}`).join(', ') + '\n';
        }
    }
    
    // Описание кандидата
    let descBlock = '';
    if (candidateDescription) {
        descBlock = `\n=== ОПИСАНИЕ КАНДИДАТА ===\n${candidateDescription}\n`;
    }
    
    // Статистика
    const totalExpected = report.matchedHigh.length + report.failedHigh.length + report.matchedLow.length + report.failedLow.length;
    const totalMatched = report.matchedHigh.length + report.matchedLow.length;
    
    return `Ты — аналитик совместимости. Пиши на ${langName}. 
=== ЗАДАЧА ===
анализ совместимости на основе числовых данных.
У тебя есть: ожидания пользователя от партнёра, и результат проверки кандидата по этим ожиданиям.

=== ОЖИДАНИЯ ПОЛЬЗОВАТЕЛЯ ОТ ПАРТНЁРА ===
${expectations}
=== РЕЗУЛЬТАТ ПРОВЕРКИ КАНДИДАТА ===

Совпало: ${totalMatched} из ${totalExpected} ожиданий

${matchSection}
${descBlock}
=== СТРУКТУРА ОТВЕТА ===

1. **Счёт** — одна строка: сколько совпало из скольки, общее впечатление

2. **Где повезло** — что совпало и почему это хорошо для пользователя (учитывай его черты)

3. **Цена компромисса** — что НЕ совпало и чем конкретно это грозит в повседневной жизни. Не абстрактно, а практически: «это значит что...»

4. **Сюрпризы** — если есть неожиданные черты вне ожиданий, как они могут повлиять (и хорошо и плохо)

5. **Вердикт** — одно-два предложения. Стоит ли идти на этот компромисс?

=== ПРАВИЛА ===
- будь мета аналитичным. сравнивай не одно с другим, а связку одного со связкой другого.
- одидания юзера воспринимай не буквально, а векторно. не столько упоминац конкретные мелочи из ожиданий сколько их цельные смысловые сути
- Пиши коротко. Это БЫСТРЫЙ анализ, не эссе
- Не перечисляй шкалы и проценты — пользователь их не видит
- Называй черты человеческим языком
- Если много недостоверных оценок — скажи что портрет размыт
- Будь честен про компромиссы, но не жесток`;
}

function decodeCandidateEmbedding(embedding) {
    const allScales = SCALES.map((scale, idx) => ({
        name: scale.name, emoji: scale.emoji, category: scale.category,
        value: embedding.vectors[idx]?.value || 0.5, spread: embedding.vectors[idx]?.spread || 0
    }));
    const strong = allScales.filter(s => s.value >= 0.7 && s.spread <= 0.5).sort((a, b) => b.value - a.value);
    const weak = allScales.filter(s => s.value <= 0.2 && s.spread <= 0.5).sort((a, b) => a.value - b.value);
    const moderate = allScales.filter(s => s.spread > 0.4);
    let summary = '🔥 ЯРКО ВЫРАЖЕНО (достоверные, ≥70%):\n';
    summary += strong.length > 0 ? strong.map(s => `• ${s.emoji} ${s.name}: ${(s.value * 100).toFixed(0)}%`).join('\n') : '(нет)\n';
    summary += '\n\n🧊 СЛАБО ВЫРАЖЕНО (достоверные, ≤20%):\n';
    summary += weak.length > 0 ? weak.map(s => `• ${s.emoji} ${s.name}: ${(s.value * 100).toFixed(0)}%`).join('\n') : '(нет)\n';
    if (moderate.length > 0) {
        summary += `\n\n⚠️ НЕДОСТОВЕРНЫЕ ОЦЕНКИ (${moderate.length} из ${TOTAL_SCALES}):\n`;
        summary += moderate.map(s => `• ${s.name}: разброс ${s.spread.toFixed(2)}`).join('\n');
    }
    const byCategory = {};
    SCALES.forEach((scale, idx) => {
        if (!byCategory[scale.category]) byCategory[scale.category] = [];
        byCategory[scale.category].push({ name: scale.name, value: allScales[idx].value, spread: allScales[idx].spread });
    });
    summary += '\n\nПОЛНЫЙ ПРОФИЛЬ:\n';
    for (const [catKey, items] of Object.entries(byCategory)) {
        summary += `\n${CATEGORY_LABELS[catKey]}:\n`;
        items.forEach(item => {
            const rel = item.spread > 0.4 ? '⚠️' : item.spread > 0.2 ? '~' : '✓';
            summary += `  ${rel} ${item.name}: ${(item.value * 100).toFixed(0)}%\n`;
        });
    }
    return summary;
}

// ТВОЙ ПРОМПТ — БЕЗ ИЗМЕНЕНИЙ
function buildCompatibilityPrompt(data) {
    const { userFacts, userTraits, userTimeline, userSocial, userHypotheses, userStyle, candidateProfile, candidateDescription } = data;
    const langName = getLanguageName();
    let candidateBlock = `=== ПСИХОЛОГИЧЕСКИЙ ПРОФИЛЬ КАНДИДАТА (50 шкал) ===\n${candidateProfile}`;
    if (candidateDescription) candidateBlock += `\n\n=== ОПИСАНИЕ КАНДИДАТА ===\n${candidateDescription}`;
    let styleBlock = '';
    if (userStyle && userStyle.trim()) styleBlock = `\n\n=== СТИЛЬ ОБЩЕНИЯ С ЭТИМ ПОЛЬЗОВАТЕЛЕМ ===\nАдаптируй стиль анализа под этого пользователя:\n${userStyle}`;

    return `Ты — проницательный аналитик отношений. Пиши на ${langName}.
${styleBlock}

=== ЗАДАЧА ===
Проанализируй совместимость пользователя с кандидатом.

ВАЖНО:
- О пользователе ты знаешь ВСЁ из его данных — используй их
- О кандидате знаешь только эмбеддинг (50 шкал от 0 до 1) и возможно описание
- Каждая шкала: 0 = абсолютно не выражено, 1.0 = крайне ярко выражено

- И НИЗКИЕ значения важны: 0.4 тревожности = весьма спокойный человек
- НЕ используй эмбеддинг пользователя — у тебя есть живые данные о нём
- Пиши ДЛЯ пользователя — соблюдай поавила стиля оьщения с ним. 

=== ВСЁ О ПОЛЬЗОВАТЕЛЕ ===

**Факты:** ${userFacts || '(нет)'}
**Черты:** ${userTraits || '(нет)'}
**Хронология:** ${userTimeline || '(нет)'}
**Социальные связи:** ${userSocial || '(нет)'}
**Гипотезы:** ${userHypotheses || '(нет)'}

${candidateBlock}

=== СТРУКТУРА АНАЛИЗА ===

1. **Суть** (2-3 предложения) — кто этот кандидат, первое впечатление от профиля через призму мира и личности пользователя.

2. **Где совпадёте** (3-4 пункта)

3. **Где будет тереть** (3-4 пункта) — потенциальные трения. Честно, но не жестоко

3.5 интересные многомерные комбинации шкал и неочевидные наблюдения.

4. **Главное** (1-2 предложения) — чёткий вывод

=== ПРАВИЛА ===

- Используй валидную конкретику из жизни пользователя
- Если описания кандидата нет — скажи что судишь по цифрам
- Если у кандидата много недостоверных оценок — упомяни что портрет размыт
- Пиши как умный друг, адаптируй стиль под пользователя`;
}
// ==================== IDEAL PARTNER TAB ====================

function renderIdealTab() {
    const container = document.getElementById('datingContent');
    if (!container) return;
    
    const savedEmbedding = getSavedEmbedding();
    
    if (!savedEmbedding) {
        container.innerHTML = `
            <div class="dating-status dating-not-ready">
                <div class="dating-icon">🔒</div>
                <h3>Сначала создайте свой профиль</h3>
                <p>Перейдите во вкладку "Мой профиль".</p>
                <button class="dating-btn dating-btn-details" onclick="switchDatingTab('profile')">← Мой профиль</button>
            </div>`;
        return;
    }
    
    const savedIdeal = getSavedIdeal();
    
    if (savedIdeal) {
        renderSavedIdeal(savedIdeal);
    } else {
        renderIdealReady();
    }
}

function renderIdealReady() {
    const container = document.getElementById('datingContent');
    container.innerHTML = `
        <div class="dating-status dating-ready">
            <div class="dating-icon">💫</div>
            <h3>Кто вам нужен?</h3>
            <p>На основе вашего профиля мы определим, какой человек вам подходит.</p>
            <p class="dating-info">Двухшаговый анализ: сначала ожидания, затем конкретные шкалы для поиска.</p>
            <button class="dating-generate-btn" onclick="startIdealGeneration()">💫 Определить идеал</button>
        </div>`;
}

function renderIdealGenerating(step) {
    const container = document.getElementById('datingContent');
    const stepText = step === 1 ? 'Формулирую ожидания от партнёра...' : 'Подбираю шкалы для поиска...';
    container.innerHTML = `
        <div class="dating-status dating-generating">
            <div class="dating-spinner"></div>
            <h3>Анализ...</h3>
            <p class="dating-pass-info">Шаг ${step} из 2</p>
            <div class="dating-progress"><div class="dating-progress-bar" style="width: ${step * 50}%"></div></div>
            <p class="dating-hint">${stepText}</p>
        </div>`;
}

function renderSavedIdeal(ideal) {
    const container = document.getElementById('datingContent');
    const createdDate = ideal.createdAt ? new Date(ideal.createdAt).toLocaleDateString('ru-RU') : '?';
    
    const highScales = (ideal.searchScales?.high || []).map(id => {
        const scale = SCALES.find(s => s.id === id);
        return scale ? `<div class="ideal-scale-item ideal-high"><span>${scale.emoji}</span><span>${scale.name}</span><span class="ideal-badge badge-high">≥ 70%</span></div>` : '';
    }).join('');
    
    const lowScales = (ideal.searchScales?.low || []).map(id => {
        const scale = SCALES.find(s => s.id === id);
        return scale ? `<div class="ideal-scale-item ideal-low"><span>${scale.emoji}</span><span>${scale.name}</span><span class="ideal-badge badge-low">≤ 50%</span></div>` : '';
    }).join('');
    
    container.innerHTML = `
        <div class="dating-status dating-complete">
            <div class="dating-icon">💫</div>
            <h3>Кто вам нужен</h3>
            <p class="dating-date">Определено: ${createdDate}</p>
            
            <div class="ideal-expectations">
                <h4>🎯 Ваши ожидания от партнёра:</h4>
                <div class="ideal-expectations-text">${formatMessageMarkdown(ideal.expectations)}</div>
            </div>
            
            <div class="ideal-search-scales">
                <h4>🔍 Шкалы для поиска:</h4>
                ${highScales ? `<div class="ideal-scales-group"><div class="ideal-scales-label">🔥 Должно быть высоким (≥ 70%):</div><div class="ideal-scales-list">${highScales}</div></div>` : ''}
                ${lowScales ? `<div class="ideal-scales-group"><div class="ideal-scales-label">🧊 Должно быть низким (≤ 50%):</div><div class="ideal-scales-list">${lowScales}</div></div>` : ''}
            </div>
            
            <div class="dating-actions">
                <button class="dating-btn dating-btn-regenerate" onclick="confirmRegenerateIdeal()">🔄 Пересоздать</button>
            </div>
            
            <div class="dating-prototype-note"><span>🚧</span><p>В финальной версии эти шкалы будут использоваться для автоматического перебора кандидатов из базы.</p></div>
        </div>`;
}

function confirmRegenerateIdeal() {
    if (confirm('Пересоздать профиль идеального партнёра?')) {
        localStorage.removeItem(DATING_IDEAL_KEY);
        renderIdealReady();
    }
}

// ==================== IDEAL GENERATION ====================

async function startIdealGeneration() {
    if (datingState.isGeneratingIdeal) return;
    datingState.isGeneratingIdeal = true;
    
    try {
        const embedding = getSavedEmbedding();
        const topTraits = getTopTraits(embedding, 5);
        const highTraits = topTraits.filter(t => t.pole === 'high');
        const lowTraits = topTraits.filter(t => t.pole === 'low');
        
        // === ШАГ 1: Ожидания ===
        renderIdealGenerating(1);
        
        const userTraitsFormatted = formatTraitsForIdealPrompt(highTraits, lowTraits);
        const expectations = await generateExpectations(userTraitsFormatted);
        
        if (!expectations) throw new Error('Не удалось сформулировать ожидания');
        console.log('[Dating/Ideal] Step 1 done.');
        
        // === ШАГ 2: Шкалы поиска ===
        renderIdealGenerating(2);
        
        const searchScales = await generateSearchScales(expectations);
        
        if (!searchScales) throw new Error('Не удалось определить шкалы поиска');
        console.log('[Dating/Ideal] Step 2 done. High:', searchScales.high, 'Low:', searchScales.low);
        
        const ideal = {
            createdAt: Date.now(),
            expectations: expectations,
            searchScales: searchScales,
            sourceTraits: { high: highTraits.map(t => t.index), low: lowTraits.map(t => t.index) }
        };
        
        localStorage.setItem(DATING_IDEAL_KEY, JSON.stringify(ideal));
        renderSavedIdeal(ideal);
        
    } catch (error) {
        console.error('[Dating/Ideal] Failed:', error);
        const container = document.getElementById('datingContent');
        container.innerHTML = `<div class="dating-status dating-error"><div class="dating-icon">❌</div><h3>Ошибка</h3><p>${error.message}</p><button class="dating-btn" onclick="renderIdealReady()">🔄 Снова</button></div>`;
    } finally {
        datingState.isGeneratingIdeal = false;
    }
}

function formatTraitsForIdealPrompt(highTraits, lowTraits) {
    let text = '';
    if (highTraits.length > 0) {
        text += '🔥 ЯРКО ВЫРАЖЕНО у пользователя:\n';
        text += highTraits.map(t => {
            const scale = SCALES[t.index];
            return `• ${scale.emoji} ${scale.name}: ${(t.value * 100).toFixed(0)}% — ${scale.desc}`;
        }).join('\n');
    }
    if (lowTraits.length > 0) {
        text += '\n\n🧊 СЛАБО ВЫРАЖЕНО у пользователя:\n';
        text += lowTraits.map(t => {
            const scale = SCALES[t.index];
            return `• ${scale.emoji} ${scale.name}: ${(t.value * 100).toFixed(0)}% — ${scale.desc}`;
        }).join('\n');
    }
    return text;
}

async function generateExpectations(userTraitsFormatted) {
    const langName = getLanguageName();
    const userFacts = getFactsForPrompt(false);
    const userTraits = getTraitsForPrompt(false);
    const userStyle = localStorage.getItem(STORAGE_KEYS.style) || '';
    
    let styleBlock = '';
    if (userStyle && userStyle.trim()) {
        styleBlock = `\n=== СТИЛЬ ОБЩЕНИЯ С ЭТИМ ПОЛЬЗОВАТЕЛЕМ ===\nПиши в стиле, подходящем этому пользователю:\n${userStyle}`;
    }
    
    const prompt = `Ты — психолог, специалист по совместимости. Пиши на ${langName}.
${styleBlock}

=== ЗАДАЧА ===
На основе личностного профиля пользователя сформулируй 5 ключевых ожиданий от идеального партнёра.

=== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ===

**Ключевые шкалы (достоверные):**
${userTraitsFormatted}

**Факты о пользователе:**
${userFacts || '(нет)'}

**Черты личности:**
${userTraits || '(нет)'}

=== ПРАВИЛА ===
1. Анализируй ПЕРЕКРЁСТНО: как высокие и низкие шкалы вместе формируют потребности
2. Например: высокая Уязвимость + низкая Стрессоустойчивость → нужен стабильный, терпеливый партнёр
3. Учитывай и ДОПОЛНЯЮЩИЕ черты (то чего не хватает) и РЕЗОНИРУЮЩИЕ (общее)
4. Каждое ожидание — 2-3 предложения с обоснованием
5. Пиши конкретно, не общие фразы типа "добрый и понимающий"
6. Используй конкретику из фактов и черт пользователя где уместно

=== ФОРМАТ ===
Ровно 5 ожиданий, каждое с заголовком:

**1. [Краткое название]**
Описание и обоснование...

**2. [Краткое название]**
...`;

    try {
        const response = await callAPIForDating(prompt);
        return (response.content || response).trim();
    } catch (error) {
        console.error('[Dating/Ideal] Expectations failed:', error);
        return null;
    }
}

async function generateSearchScales(expectations) {
    const scaleList = SCALES.map(s => `${s.id}. ${s.emoji} ${s.name} — ${s.desc}`).join('\n');
    
    const prompt = `Ты — аналитик для системы мэтчинга. На основе ожиданий от партнёра определи конкретные шкалы.

=== ОЖИДАНИЯ ОТ ПАРТНЁРА ===
${expectations}

=== ДОСТУПНЫЕ ШКАЛЫ (50 штук, каждая от 0.0 до 1.0) ===
${scaleList}

=== ЗАДАЧА ===
Выбери шкалы для фильтрации кандидатов:

1. **HIGH** — 10 шкал, которые у партнёра ДОЛЖНЫ БЫТЬ ВЫСОКИМИ (≥ 70%, т.е. значение ≥ 0.7)
2. **LOW** — 5 шкал, которые у партнёра ДОЛЖНЫ БЫТЬ НИЗКИМИ (≤ 50%, т.е. значение ≤ 0.5)

=== ПРАВИЛА ===
- Выбирай СТРОГО из списка шкал выше (по ID)
- HIGH = именно 10 шкал
- LOW = именно 5 шкал
- Не дублируй шкалы между HIGH и LOW

=== ФОРМАТ ОТВЕТА ===
Строго JSON, без пояснений:

{
    "high": [id1, id2, id3, id4, id5, id6, id7, id8, id9, id10],
    "low": [id1, id2, id3, id4, id5]
}`;
    
    try {
        const response = await callAPIForDating(prompt);
        const text = (response.content || response).trim();
        
        console.log('[Dating/Ideal] Raw search scales response:', text.substring(0, 300));
        
        // Свой парсинг JSON — не зависим от parseJSON из ui.js
        let parsed = null;
        try {
            // Пробуем напрямую
            parsed = JSON.parse(text);
        } catch (e1) {
            // Ищем JSON в тексте
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                } catch (e2) {
                    // Ищем в code block
                    const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
                    if (codeMatch) {
                        try {
                            parsed = JSON.parse(codeMatch[1].trim());
                        } catch (e3) {
                            console.error('[Dating/Ideal] All JSON parse attempts failed');
                        }
                    }
                }
            }
        }
        
        if (!parsed || !parsed.high || !parsed.low) {
            console.error('[Dating/Ideal] Invalid parsed result:', parsed);
            return null;
        }
        
        const validHigh = parsed.high
            .map(id => parseInt(id))
            .filter(id => !isNaN(id) && id >= 1 && id <= TOTAL_SCALES)
            .slice(0, 10);
        
        const validLow = parsed.low
            .map(id => parseInt(id))
            .filter(id => !isNaN(id) && id >= 1 && id <= TOTAL_SCALES && !validHigh.includes(id))
            .slice(0, 5);
        
        console.log('[Dating/Ideal] Validated — High:', validHigh, 'Low:', validLow);
        
        if (validHigh.length < 5 || validLow.length < 2) {
            console.error('[Dating/Ideal] Too few valid scales:', validHigh.length, validLow.length);
            return null;
        }
        
        return { high: validHigh, low: validLow };
        
    } catch (error) {
        console.error('[Dating/Ideal] Search scales failed:', error);
        return null;
    }
}

function getSavedIdeal() {
    const data = localStorage.getItem(DATING_IDEAL_KEY);
    if (!data) return null;
    try { return JSON.parse(data); }
    catch (e) { return null; }
}

// ==================== EMBEDDING GENERATION ====================
// (из твоей версии — промпты без изменений)

async function startEmbeddingGeneration() {
    if (datingState.isGenerating) return;
    datingState.isGenerating = true;
    datingState.currentPass = 0;
    datingState.passes = [];
    renderGeneratingState();
    try {
        for (let i = 1; i <= EMBEDDING_PASSES; i++) {
            datingState.currentPass = i;
            updateGenerationProgress(i);
            console.log(`[Dating] Starting pass ${i}/${EMBEDDING_PASSES}`);
            const embedding = await generateSingleEmbedding();
            if (embedding) datingState.passes.push(embedding);
            else throw new Error(`Pass ${i} failed`);
            if (i < EMBEDDING_PASSES) await new Promise(resolve => setTimeout(resolve, 1000));
        }
        const finalEmbedding = calculateFinalEmbedding(datingState.passes);
        saveEmbedding(finalEmbedding);
        renderSavedEmbedding(finalEmbedding);
        console.log('[Dating] Embedding generation complete!');
    } catch (error) {
        console.error('[Dating] Generation failed:', error);
        renderGenerationError(error.message);
    } finally {
        datingState.isGenerating = false;
    }
}

async function generateSingleEmbedding() {
    const facts = getFactsForPrompt(false);
    const traits = getTraitsForPrompt(false);
    const prompt = buildEmbeddingPrompt(facts, traits);
    try {
        const response = await callAPIForDating(prompt);
        const parsed = parseEmbeddingResponse(response);
        if (parsed && parsed.length === TOTAL_SCALES) return parsed;
        else { console.error('[Dating] Invalid embedding length:', parsed?.length); return null; }
    } catch (error) { console.error('[Dating] API call failed:', error); return null; }
}

// ТВОЙ ПРОМПТ — БЕЗ ИЗМЕНЕНИЙ
function buildEmbeddingPrompt(facts, traits) {
    const scaleList = SCALES.map(s => `${s.id}. ${s.emoji} ${s.name} — ${s.desc}`).join('\n');
    return `Ты — психолог-аналитик. Оцени личность человека по 50 независимым шкалам.

=== ФАКТЫ О ЧЕЛОВЕКЕ ===
${facts || '(нет данных)'}

=== ЧЕРТЫ ЛИЧНОСТИ ===
${traits || '(нет данных)'}

=== ТВОЯ ЗАДАЧА ===
Оцени человека по каждой из 50 шкал.
Каждая шкала НЕЗАВИСИМАЯ — от 0.0 до 1.0:
• 0.0 = совсем не выражено
• 0.5 = умеренно / неопределённо
• 1.0 = ярко выражено

ВАЖНО: Шкалы НЕ противоположны друг другу. Человек МОЖЕТ быть одновременно и креативным (0.8) и практичным (0.9). Оценивай каждую шкалу отдельно.

=== 50 ШКАЛ ===
${scaleList}

=== ПРАВИЛА ===
1. Оценивай ТОЛЬКО на основе предоставленных данных
2. Если данных нет — ставь 0.5 (неопределённость, не ноль!)
3. Крайние значения (0.0–0.1 или 0.9–1.0) только при очевидных доказательствах
4. НЕ выдумывай и не додумывай

=== ФОРМАТ ОТВЕТА ===
Строго:

[1]:X.X
[2]:X.X
...
[50]:X.X

Где X.X — число от 0.0 до 1.0. Без пояснений.`;
}

function parseEmbeddingResponse(response) {
    const text = response.content || response;
    const pattern = /\[(\d+)\]\s*:\s*([-+]?\d+\.?\d*)/g;
    let match;
    const found = {};
    while ((match = pattern.exec(text)) !== null) {
        const index = parseInt(match[1]);
        const value = parseFloat(match[2]);
        if (index >= 1 && index <= TOTAL_SCALES && !isNaN(value)) found[index] = Math.max(0, Math.min(1, value));
    }
    const values = [];
    for (let i = 1; i <= TOTAL_SCALES; i++) values.push(found[i] !== undefined ? found[i] : 0.5);
    console.log(`[Dating] Parsed ${Object.keys(found).length}/${TOTAL_SCALES} values`);
    return values.length === TOTAL_SCALES ? values : null;
}

function calculateFinalEmbedding(passes) {
    const vectors = [];
    for (let i = 0; i < TOTAL_SCALES; i++) {
        const values = passes.map(p => p[i]);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const spread = Math.max(...values) - Math.min(...values);
        vectors.push({ value: Math.round(avg * 100) / 100, spread: Math.round(spread * 100) / 100, raw: values });
    }
    return { version: 2, createdAt: Date.now(), factsCount: getFactsData().facts?.filter(f => !f.superseded).length || 0, vectors };
}

// ==================== DESCRIPTIONS ====================
// (из твоей версии — промпты без изменений)

async function generateDescription(level) {
    if (datingState.isGeneratingDescription) return;
    const btn = document.getElementById(`genBtn${level}`);
    const textarea = document.getElementById(`descriptionLevel${level}`);
    if (!btn || !textarea) return;
    datingState.isGeneratingDescription = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-spinner"></span> Генерация...';
    btn.disabled = true;
    textarea.disabled = true;
    try {
        const facts = getFactsForPrompt(false);
        const traits = getTraitsForPrompt(false);
        const embedding = getSavedEmbedding();
        const topTraits = embedding ? getTopTraits(embedding, 7) : [];
        const prompt = buildDescriptionPrompt(level, facts, traits, topTraits);
        const response = await callAPIForDating(prompt);
        const description = (response.content || response).trim();
        textarea.value = description;
        saveDescription(level, description);
    } catch (error) {
        console.error(`[Dating] Description failed:`, error);
        alert('Ошибка генерации. Попробуйте ещё раз.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        textarea.disabled = false;
        datingState.isGeneratingDescription = false;
    }
}

// ТВОИ ПРОМПТЫ — БЕЗ ИЗМЕНЕНИЙ
function buildDescriptionPrompt(level, facts, traits, topTraits) {
    const highTraits = topTraits.filter(t => t.pole === 'high');
    const lowTraits = topTraits.filter(t => t.pole === 'low');
    let traitsText = '';
    if (highTraits.length > 0) traitsText += 'Ярко выражено:\n' + highTraits.map(t => `- ${t.emoji} ${t.name}: ${(t.value * 100).toFixed(0)}%`).join('\n');
    if (lowTraits.length > 0) traitsText += '\nСлабо выражено:\n' + lowTraits.map(t => `- ${t.emoji} ${t.name}: ${(t.value * 100).toFixed(0)}%`).join('\n');
    
    if (level === 1) {
        return `Напиши интригующее АНОНИМНОЕ описание человека для сервиса знакомств.

**Черты:** ${traits || '(нет)'}
**Ключевые шкалы:**
${traitsText || '(нет)'}

Требования:
- Только пол + художественный возраст
- НЕ упоминай профессию, город, имена, семью
- От третьего лица, как нетворкер
- 3-5 предложений, с изюминкой

Только текст описания.`;
    } else {
        return `Напиши описание человека для тех, с кем произошёл взаимный интерес.

**Факты:** ${facts || '(нет)'}
**Черты:** ${traits || '(нет)'}
**Ключевые шкалы:**
${traitsText || '(нет)'}

Требования:
- Можно: сферу деятельности, интересы, ценности
- НЕ упоминай: адреса, финансы, здоровье, конфликты
- От третьего лица, как нетворкер
- 5-8 предложений

Только текст описания.`;
    }
}

// ==================== STORAGE ====================
// (из твоей версии)

function getSavedDescriptions() {
    const data = localStorage.getItem(DATING_DESCRIPTIONS_KEY);
    if (!data) return { level1: { text: '', enabled: false }, level2: { text: '', enabled: false } };
    try { return JSON.parse(data); }
    catch (e) { return { level1: { text: '', enabled: false }, level2: { text: '', enabled: false } }; }
}

function saveDescription(level, text) {
    const d = getSavedDescriptions();
    d[`level${level}`] = { text, enabled: d[`level${level}`]?.enabled || false, updatedAt: Date.now() };
    localStorage.setItem(DATING_DESCRIPTIONS_KEY, JSON.stringify(d));
}

function toggleDescriptionEnabled(level) {
    const cb = document.getElementById(`enableLevel${level}`);
    if (!cb) return;
    const d = getSavedDescriptions();
    d[`level${level}`] = { ...d[`level${level}`], enabled: cb.checked, updatedAt: Date.now() };
    localStorage.setItem(DATING_DESCRIPTIONS_KEY, JSON.stringify(d));
}

function onDescriptionChange(level) {
    const ta = document.getElementById(`descriptionLevel${level}`);
    if (!ta) return;
    clearTimeout(window[`descSaveTimeout${level}`]);
    window[`descSaveTimeout${level}`] = setTimeout(() => saveDescription(level, ta.value), 1000);
}

function saveEmbedding(embedding) {
    localStorage.setItem(DATING_STORAGE_KEY, JSON.stringify(embedding));
    console.log('[Dating] Embedding saved (v2, 50 scales)');
}

function getSavedEmbedding() {
    const data = localStorage.getItem(DATING_STORAGE_KEY);
    if (!data) return null;
    try { return JSON.parse(data); }
    catch (e) { return null; }
}

// ==================== EXPORT/IMPORT ====================
// (из твоей версии)

function copyEmbeddingToClipboard() {
    const embedding = getSavedEmbedding();
    if (!embedding) { alert('Нет профиля'); return; }
    navigator.clipboard.writeText(formatEmbeddingForExport(embedding)).then(() => {
        const btn = document.querySelector('.dating-btn-copy');
        if (btn) { const orig = btn.innerHTML; btn.innerHTML = '✅ Скопировано!'; setTimeout(() => { btn.innerHTML = orig; }, 2000); }
    }).catch(err => { console.error('[Dating] Copy failed:', err); });
}

function formatEmbeddingForExport(embedding) {
    const vectorsStr = embedding.vectors.map(v => `${v.value.toFixed(2)},${v.spread.toFixed(2)}`).join(';');
    return `DATING_EMBED_V2|${embedding.createdAt}|${embedding.factsCount}|${vectorsStr}`;
}

function parseEmbeddingFromExport(str) {
    if (!str || typeof str !== 'string') return null;
    const parts = str.trim().split('|');
    if ((parts[0] !== 'DATING_EMBED_V1' && parts[0] !== 'DATING_EMBED_V2') || parts.length !== 4) return null;
    const version = parts[0] === 'DATING_EMBED_V2' ? 2 : 1;
    const createdAt = parseInt(parts[1]);
    const factsCount = parseInt(parts[2]);
    if (isNaN(createdAt) || isNaN(factsCount)) return null;
    const vectors = parts[3].split(';').map(pair => {
        const [value, spread] = pair.split(',').map(parseFloat);
        if (isNaN(value) || isNaN(spread)) return null;
        return { value, spread };
    });
    if (vectors.some(v => v === null)) return null;
    const expectedLength = version === 2 ? 50 : 33;
    if (vectors.length !== expectedLength) return null;
    return { version, createdAt, factsCount, vectors };
}

// ==================== API ====================

async function callAPIForDating(prompt) {
    if (typeof callAPIOpenRouter === 'function') {
        return await callAPIOpenRouter([{ role: "user", content: prompt }], true);
    }
    throw new Error('API not available');
}

// ==================== ERRORS ====================

function renderGenerationError(message) {
    const container = document.getElementById('datingContent');
    container.innerHTML = `
        <div class="dating-status dating-error">
            <div class="dating-icon">❌</div>
            <h3>Ошибка</h3>
            <p>${message}</p>
            <button class="dating-btn" onclick="checkDatingEligibility()">🔄 Снова</button>
        </div>`;
}

// ==================== INIT ====================

console.log('[dating.js] v2.1 loaded. 50 scales + Ideal Partner + Compatibility.');