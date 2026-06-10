// dating.js - модуль знакомств для Memory Chatbot
// Генерация личностного эмбеддинга на основе 50 независимых шкал
// + Двухуровневые описания профиля
// + Анализатор совместимости (3 режима)
// + Генератор идеального партнёра
// + УЧЁТ ДОСТОВЕРНОСТИ ШКАЛ КАНДИДАТА ЧЕРЕЗ ДИАПАЗОНЫ
// + V3 формат с требованиями к партнёру
// + Режим "Взаимность и Динамика"
// + АВТОМАТИЗИРОВАННЫЙ ПОТОК (V2 -> V3) и ФОНОВАЯ СИНХРОНИЗАЦИЯ

// ==================== КОНСТАНТЫ ====================
const DATING_STORAGE_KEY = 'chatbot_dating_embedding';
const DATING_DESCRIPTIONS_KEY = 'chatbot_dating_descriptions';
const DATING_IDEAL_KEY = 'chatbot_dating_ideal';
const MIN_FACTS_REQUIRED = 50;
const EMBEDDING_PASSES = 3;
const TOTAL_SCALES = 50;
const DATING_USER_PROFILE_KEY = 'chatbot_dating_user_profile';

const DATING_RELIABILITY = {
    high: 0.15,
    medium: 0.20,
    lowCutoff: 0.40,
    highCutoff: 0.70
};

// 50 независимых шкал личности
const SCALES = [
    { id: 1,  name: 'Любопытство',        emoji: '🔍', category: 'mind',     desc: 'Тяга к новому, исследовательский интерес' },
    { id: 2,  name: 'Аналитичность',      emoji: '🧩', category: 'mind',     desc: 'Склонность разбирать, структурировать, искать логику' },
    { id: 3,  name: 'Креативность',       emoji: '🎨', category: 'mind',     desc: 'Воображение, нестандартное мышление, генерация идей' },
    { id: 4,  name: 'Практичность',       emoji: '🔧', category: 'mind',     desc: 'Ориентация на результат, прикладное мышление' },
    { id: 5,  name: 'Рефлексивность',     emoji: '🪞', category: 'mind',     desc: 'Склонность к самоанализу и осмыслению опыта' },
    { id: 6,  name: 'Стратегичность',     emoji: '♟️', category: 'mind',     desc: 'Умение планировать вдолгую, видеть перспективу' },
    { id: 7,  name: 'Широта кругозора',   emoji: '🌐', category: 'mind',     desc: 'Разнообразие интересов и знаний' },
    { id: 8,  name: 'Глубина погружения', emoji: '🔬', category: 'mind',     desc: 'Способность уходить в тему до деталей' },
    { id: 9,  name: 'Энергичность',       emoji: '⚡', category: 'energy',   desc: 'Общий уровень жизненной энергии и активности' },
    { id: 10, name: 'Инициативность',     emoji: '🚀', category: 'energy',   desc: 'Готовность начинать первым, не ждать' },
    { id: 11, name: 'Настойчивость',      emoji: '🏔️', category: 'energy',   desc: 'Упорство в достижении целей несмотря на трудности' },
    { id: 12, name: 'Амбициозность',      emoji: '🎯', category: 'energy',   desc: 'Масштаб целей и стремлений' },
    { id: 13, name: 'Склонность к риску', emoji: '🎲', category: 'energy',   desc: 'Готовность действовать в условиях неопределённости' },
    { id: 14, name: 'Спонтанность',       emoji: '🌊', category: 'energy',   desc: 'Способность действовать по наитию, без плана' },
    { id: 15, name: 'Дисциплина',         emoji: '📏', category: 'energy',   desc: 'Систематичность, следование правилам и графикам' },
    { id: 16, name: 'Эмоциональная глубина',     emoji: '🌊', category: 'emotion', desc: 'Интенсивность и сложность переживаний' },
    { id: 17, name: 'Эмоциональная стабильность', emoji: '⚓', category: 'emotion', desc: 'Устойчивость настроения, ровность' },
    { id: 18, name: 'Оптимизм',                   emoji: '☀️', category: 'emotion', desc: 'Позитивный взгляд на будущее и ситуации' },
    { id: 19, name: 'Тревожность',                emoji: '😰', category: 'emotion', desc: 'Склонность к беспокойству и переживаниям' },
    { id: 20, name: 'Стрессоустойчивость',        emoji: '🛡️', category: 'emotion', desc: 'Способность сохранять функциональность под давлением' },
    { id: 21, name: 'Эмпатия',                    emoji: '💗', category: 'emotion', desc: 'Способность чувствовать и понимать чужие эмоции' },
    { id: 22, name: 'Уязвимость',                 emoji: '🦋', category: 'emotion', desc: 'Открытость к ранению, незащищённость' },
    { id: 23, name: 'Самоирония',                 emoji: '😏', category: 'emotion', desc: 'Способность смеяться над собой' },
    { id: 24, name: 'Чувствительность к красоте', emoji: '✨', category: 'emotion', desc: 'Эстетическое восприятие, реакция на прекрасное' },
    { id: 25, name: 'Общительность',             emoji: '💬', category: 'social',   desc: 'Потребность и удовольствие от общения' },
    { id: 26, name: 'Социальная смелость',        emoji: '🎤', category: 'social',   desc: 'Уверенность в новых социальных ситуациях' },
    { id: 27, name: 'Лидерство',                  emoji: '👑', category: 'social',   desc: 'Склонность вести, организовывать, направлять' },
    { id: 28, name: 'Командность',                emoji: '🤝', category: 'social',   desc: 'Способность и желание работать в команде' },
    { id: 29, name: 'Доверчивость',               emoji: '🤲', category: 'social',   desc: 'Готовность доверять людям по умолчанию' },
    { id: 30, name: 'Конфликтность',              emoji: '⚔️', category: 'social',   desc: 'Склонность к столкновениям и отстаиванию позиции' },
    { id: 31, name: 'Дипломатичность',            emoji: '🕊️', category: 'social',   desc: 'Умение сглаживать углы, находить компромиссы' },
    { id: 32, name: 'Потребность в одиночестве',  emoji: '🏝️', category: 'social',   desc: 'Необходимость времени наедине с собой' },
    { id: 33, name: 'Щедрость',                   emoji: '🎁', category: 'social',   desc: 'Готовность отдавать время, ресурсы, внимание' },
    { id: 34, name: 'Чувство юмора',              emoji: '😄', category: 'social',   desc: 'Способность шутить и ценить юмор' },
    { id: 35, name: 'Самостоятельность',          emoji: '🦅', category: 'character', desc: 'Независимость в решениях и действиях' },
    { id: 36, name: 'Ответственность',            emoji: '⚖️', category: 'character', desc: 'Готовность отвечать за свои решения и обязательства' },
    { id: 37, name: 'Честность',                  emoji: '💎', category: 'character', desc: 'Прямота, правдивость, нетерпимость к лжи' },
    { id: 38, name: 'Адаптивность',               emoji: '🌿', category: 'character', desc: 'Гибкость, способность подстраиваться под обстоятельства' },
    { id: 39, name: 'Перфекционизм',              emoji: '🎯', category: 'character', desc: 'Стремление к идеалу, внимание к деталям' },
    { id: 40, name: 'Самоконтроль',               emoji: '🧘', category: 'character', desc: 'Управление импульсами и желаниями' },
    { id: 41, name: 'Терпеливость',               emoji: '⏳', category: 'character', desc: 'Способность ждать и выдерживать медленный процесс' },
    { id: 42, name: 'Решительность',              emoji: '⚡', category: 'character', desc: 'Скорость и уверенность в принятии решений' },
    { id: 43, name: 'Ценность свободы',           emoji: '🕊️', category: 'values', desc: 'Важность личной свободы и автономии' },
    { id: 44, name: 'Ценность семьи',             emoji: '🏠', category: 'values', desc: 'Важность семейных связей и домашнего очага' },
    { id: 45, name: 'Ценность карьеры',           emoji: '📈', category: 'values', desc: 'Важность профессиональной реализации' },
    { id: 46, name: 'Ценность саморазвития',      emoji: '📚', category: 'values', desc: 'Стремление к росту, обучению, эволюции' },
    { id: 47, name: 'Ценность справедливости',    emoji: '⚖️', category: 'values', desc: 'Важность честности и равенства в мире' },
    { id: 48, name: 'Ценность комфорта',          emoji: '🛋️', category: 'values', desc: 'Важность бытового и психологического комфорта' },
    { id: 49, name: 'Ценность впечатлений',       emoji: '🎢', category: 'values', desc: 'Важность нового опыта, путешествий, ощущений' },
    { id: 50, name: 'Духовность',                 emoji: '🙏', category: 'values', desc: 'Внимание к смыслам, вера, философское мышление' }
];

const CATEGORY_LABELS = {
    mind: '🧠 Мышление и познание',
    energy: '⚡ Энергия и действие',
    emotion: '💫 Эмоции и внутренний мир',
    social: '👥 Социальное',
    character: '💪 Характер и воля',
    values: '💎 Ценности и ориентиры'
};

// ==================== HELPERS ====================

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
}

function getScaleRange(vec) {
    const value = vec?.value ?? 0.5;
    const spread = vec?.spread ?? 0;
    return {
        value,
        spread,
        min: clamp01(value - spread),
        max: clamp01(value + spread)
    };
}

function getReliabilityLevel(spread) {
    if (spread <= DATING_RELIABILITY.high) return 'high';
    if (spread <= DATING_RELIABILITY.medium) return 'medium';
    return 'low';
}

function isScaleReliable(spread) {
    return spread <= DATING_RELIABILITY.medium;
}

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
    
    const compatBtn = document.getElementById('compatTabBtn');
    if (compatBtn) compatBtn.style.display = 'none';
    
    // Возвращаем активный таб на "Мой профиль"
    datingState.activeTab = 'profile';
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
    
    const ideal = getSavedIdeal();
    const exportVersion = (ideal && ideal.searchScales) ? 'V3 (с требованиями)' : 'V2';
    
    // Получаем анкетные данные
    const userProfile = getUserProfile();
    const profileComplete = isProfileComplete();
    
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
                ${
                    highTraits.length > 0
                        ? `<h4>🔥 Ярко выражено:</h4>${highTraits.map(trait => renderScaleBar(trait)).join('')}`
                        : `<h4>🔥 Ярко выражено:</h4><div class="no-notable-traits"><p>Нет достоверно высоких шкал (≥70% при разбросе ≤0.15)</p></div>`
                }
                ${
                    lowTraits.length > 0
                        ? `<h4>🧊 Слабо выражено:</h4>${lowTraits.map(trait => renderScaleBar(trait)).join('')}`
                        : `<h4>🧊 Слабо выражено:</h4><div class="no-notable-traits"><p>Нет достоверно низких шкал (≤40% при разбросе ≤0.15)</p></div>`
                }
            </div>
            <div class="dating-actions">
                <button class="dating-btn dating-btn-copy" onclick="copyEmbeddingToClipboard()">📋 Копировать профиль (${exportVersion})</button>
                <button class="dating-btn dating-btn-details" onclick="toggleFullEmbedding()">📊 Все 50 шкал</button>
                <button class="dating-btn dating-btn-regenerate" onclick="confirmRegenerate()">🔄 Пересоздать</button>
                
                ${getMyProfileId() 
                    ? `<button class="dating-btn dating-btn-publish" onclick="publishMyProfileToFirebase()" style="background: transparent; border: 1px solid #4CAF50; color: #4CAF50;">
                        ✅ Анкета опубликована (Синхронизировать)
                       </button>` 
                    : `<button class="dating-btn dating-btn-publish" onclick="publishMyProfileToFirebase()" style="background:#4CAF50; color: white;">
                        🌍 Опубликовать анкету (Видна в поиске)
                       </button>`
                }
                
                <button class="dating-btn dating-btn-refresh" onclick="refreshCandidateList()">🔄 Найти кандидатов</button>
            </div>
            <div class="dating-full-embedding" id="fullEmbeddingView" style="display: none;">
                <h4>Полный профиль (50 шкал):</h4>
                <div class="dating-all-traits">${renderAllScales(embedding)}</div>
            </div>
            
            <!-- ===== АНКЕТНЫЕ ДАННЫЕ ===== -->
            <div class="dating-profile-section">
                <h4>👤 Анкетные данные</h4>
                <div id="profileFormContainer">
                    ${renderProfileForm(userProfile, profileComplete)}
                </div>
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
                    <div class="description-label">
                        <span class="label-icon">🔒</span>
                        <span class="label-text">Публичное описание</span>
                        <span class="label-hint">Видят все</span>
                    </div>
                    <div class="description-content">
                        <textarea id="descriptionLevel1" class="description-textarea" placeholder="Нажмите 'Сгенерировать'..." oninput="onDescriptionChange(1)">${descriptions.level1?.text || ''}</textarea>
                        <div class="description-actions">
                            <button class="desc-btn desc-btn-generate" onclick="generateDescription(1)" id="genBtn1">✨ Сгенерировать</button>
                            <label class="desc-checkbox">
                                <input type="checkbox" id="enableLevel1" ${descriptions.level1?.enabled ? 'checked' : ''} onchange="toggleDescriptionEnabled(1)">
                                <span>Применить</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="dating-description-block">
                    <div class="description-label">
                        <span class="label-icon">🔓</span>
                        <span class="label-text">Описание для мэтчей</span>
                        <span class="label-hint">Видят после взаимного интереса</span>
                    </div>
                    <div class="description-content">
                        <textarea id="descriptionLevel2" class="description-textarea" placeholder="Нажмите 'Сгенерировать'..." oninput="onDescriptionChange(2)">${descriptions.level2?.text || ''}</textarea>
                        <div class="description-actions">
                            <button class="desc-btn desc-btn-generate" onclick="generateDescription(2)" id="genBtn2">✨ Сгенерировать</button>
                            <label class="desc-checkbox">
                                <input type="checkbox" id="enableLevel2" ${descriptions.level2?.enabled ? 'checked' : ''} onchange="toggleDescriptionEnabled(2)">
                                <span>Применить</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="dating-prototype-note">
                    <span>🚧</span>
                    <p>Прототип. Мэтчи будут позже.</p>
                </div>
            </div>
        </div>`;
}

function renderProfileForm(profile, isComplete) {
    if (isComplete) {
        const genderText = {
            male: 'Мужской',
            female: 'Женский',
            unspecified: 'Не указан'
        } [profile.userGender] || 'Не указан';
        
        const targetGenderText = profile.targetGender.map(g => {
            if (g === 'male') return 'Мужчины';
            if (g === 'female') return 'Женщины';
            return 'Не указывать';
        }).join(', ');
        
        return `
            <div class="profile-readonly">
                <div class="profile-field"><strong>Ваш пол:</strong> ${genderText}</div>
                <div class="profile-field"><strong>Ваш возраст:</strong> ${profile.userAge} лет</div>
                <div class="profile-field"><strong>Ищете:</strong> ${targetGenderText}</div>
                <div class="profile-field"><strong>Возраст партнёра:</strong> ${profile.targetAgeMin} – ${profile.targetAgeMax} лет</div>
                <button class="dating-btn dating-btn-edit-profile" onclick="editProfile()">✏️ Редактировать</button>
                
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">
                        Ваш ID: <strong>${getMyProfileId() || 'Анкета не опубликована'}</strong><br>
                        <em>Сохраните этот ID. Если очистите кэш или зайдете с другого устройства, сможете восстановить доступ к чатам.</em>
                    </div>
                    <button class="dating-btn" onclick="restoreProfileId()" style="background: transparent; border: 1px solid #6366f1; padding: 6px 12px; font-size: 13px;">🔄 Восстановить по ID</button>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="profile-edit-form">
                <div class="profile-field">
                    <label>Ваш пол:</label>
                    <select id="profileUserGender">
                        <option value="">-- выберите --</option>
                        <option value="male" ${profile.userGender === 'male' ? 'selected' : ''}>Мужской</option>
                        <option value="female" ${profile.userGender === 'female' ? 'selected' : ''}>Женский</option>
                        <option value="unspecified" ${profile.userGender === 'unspecified' ? 'selected' : ''}>Не указывать</option>
                    </select>
                </div>
                <div class="profile-field">
                    <label>Ваш возраст (лет):</label>
                    <input type="number" id="profileUserAge" min="18" max="120" value="${profile.userAge || ''}" placeholder="18–120">
                </div>
                <div class="profile-field">
                    <label>Кого ищете:</label>
                    <div class="profile-checkboxes">
                        <label><input type="checkbox" value="male" ${profile.targetGender.includes('male') ? 'checked' : ''}> Мужчины</label>
                        <label><input type="checkbox" value="female" ${profile.targetGender.includes('female') ? 'checked' : ''}> Женщины</label>
                        <label><input type="checkbox" value="unspecified" ${profile.targetGender.includes('unspecified') ? 'checked' : ''}> Не указывать (всем)</label>
                    </div>
                </div>
                <div class="profile-field">
                    <label>Возраст партнёра:</label>
                    <div class="profile-range">
                        <input type="number" id="profileTargetAgeMin" min="18" max="120" value="${profile.targetAgeMin || 18}" placeholder="от">
                        <span>–</span>
                        <input type="number" id="profileTargetAgeMax" min="18" max="120" value="${profile.targetAgeMax || 80}" placeholder="до">
                    </div>
                </div>
                <button class="dating-btn dating-btn-save-profile" onclick="saveProfileData()">💾 Сохранить анкету</button>
                
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <button class="dating-btn" onclick="restoreProfileId()" style="background: transparent; border: 1px solid #6366f1; padding: 6px 12px; font-size: 13px;">🔄 Восстановить старый ID</button>
                </div>
            </div>
        `;
    }
}

function restoreProfileId() {
    const id = prompt("Введите ваш ID анкеты (его можно найти на старом устройстве в этом же меню):");
    if (id && id.trim()) {
        localStorage.setItem('chatbot_firebase_profile_id', id.trim());
        alert("ID восстановлен! Теперь нажмите кнопку синхронизации, чтобы обновить данные.");
        checkDatingEligibility();
    }
}

function saveProfileData() {
    const genderSelect = document.getElementById('profileUserGender');
    const ageInput = document.getElementById('profileUserAge');
    const targetGenderChecks = document.querySelectorAll('#profileFormContainer input[type="checkbox"][value]');
    const targetAgeMin = document.getElementById('profileTargetAgeMin');
    const targetAgeMax = document.getElementById('profileTargetAgeMax');
    
    if (!genderSelect || !ageInput || !targetAgeMin || !targetAgeMax) {
        alert('Ошибка: не все поля найдены');
        return;
    }
    
    const userGender = genderSelect.value;
    const userAge = parseInt(ageInput.value);
    const targetAgeMinVal = parseInt(targetAgeMin.value);
    const targetAgeMaxVal = parseInt(targetAgeMax.value);
    
    if (!userGender) {
        alert('Пожалуйста, укажите ваш пол');
        return;
    }
    if (isNaN(userAge) || userAge < 18 || userAge > 120) {
        alert('Возраст должен быть от 18 до 120 лет');
        return;
    }
    if (isNaN(targetAgeMinVal) || targetAgeMinVal < 18 || targetAgeMinVal > 120) {
        alert('Минимальный возраст партнёра должен быть от 18 до 120');
        return;
    }
    if (isNaN(targetAgeMaxVal) || targetAgeMaxVal < 18 || targetAgeMaxVal > 120) {
        alert('Максимальный возраст партнёра должен быть от 18 до 120');
        return;
    }
    if (targetAgeMinVal > targetAgeMaxVal) {
        alert('Минимальный возраст не может быть больше максимального');
        return;
    }
    
    const targetGender = [];
    targetGenderChecks.forEach(cb => {
        if (cb.checked) targetGender.push(cb.value);
    });
    if (targetGender.length === 0) {
        alert('Укажите хотя бы один вариант "Кого ищете"');
        return;
    }
    
    const profile = {
        userGender,
        userAge,
        targetGender,
        targetAgeMin: targetAgeMinVal,
        targetAgeMax: targetAgeMaxVal
    };
    saveUserProfile(profile);
    
    const container = document.getElementById('profileFormContainer');
    if (container) {
        const updatedProfile = getUserProfile();
        container.innerHTML = renderProfileForm(updatedProfile, true);
    }
    
    alert('Анкетные данные сохранены!');
    
    // ТИХАЯ АВТО-СИНХРОНИЗАЦИЯ
    if (getMyProfileId()) {
        publishMyProfileToFirebase(true);
    }
}

function editProfile() {
    const profile = getUserProfile();
    const container = document.getElementById('profileFormContainer');
    if (container) {
        container.innerHTML = renderProfileForm(profile, false);
    }
}

// ==================== SCALE RENDERING ====================

function renderScaleBar(trait) {
    const scale = SCALES[trait.index];
    if (!scale) {
        console.error('[Dating] Invalid scale index:', trait.index);
        return '';
    }

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
                <span class="scale-pole-badge ${isLow ? 'pole-low' : 'pole-high'}">
                    ${isLow ? '▼ ' + percent + '%' : '▲ ' + percent + '%'}
                </span>
                <span class="trait-reliability reliability-${reliabilityClass}" title="Разброс: ${trait.spread.toFixed(2)}">
                    ${reliabilityClass === 'high' ? '✓' : reliabilityClass === 'medium' ? '~' : '?'}
                </span>
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

        categories[scale.category].push({
            scale,
            index: idx,
            value: embedding.vectors[idx]?.value ?? 0.5,
            spread: embedding.vectors[idx]?.spread ?? 0
        });
    });

    let html = '';

    for (const [catKey, items] of Object.entries(categories)) {
        html += `<div class="scales-category"><div class="scales-category-header">${CATEGORY_LABELS[catKey] || catKey}</div>`;

        items.forEach(item => {
            let reliabilityClass = 'high';
            if (item.spread > 0.2) reliabilityClass = 'low';
            else if (item.spread > 0.1) reliabilityClass = 'medium';

            const percent = (item.value * 100).toFixed(0);

            html += `
                <div class="mini-scale">
                    <span class="mini-scale-emoji">${item.scale.emoji}</span>
                    <span class="mini-scale-name">${item.scale.name}</span>
                    <div class="mini-scale-bar">
                        <div class="mini-scale-fill" style="width: ${percent}%"></div>
                    </div>
                    <span class="mini-scale-value">${percent}%</span>
                    <span class="mini-scale-spread reliability-${reliabilityClass}">(±${item.spread.toFixed(2)})</span>
                </div>`;
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

// ==================== TOP TRAITS ====================

function getTopTraits(embedding, countPerPole = 5) {
    const traits = embedding.vectors.map((vec, idx) => ({
        index: idx,
        value: vec.value,
        spread: vec.spread,
        name: SCALES[idx].name,
        emoji: SCALES[idx].emoji,
        category: SCALES[idx].category
    }));

    const reliable = traits.filter(t => t.spread <= DATING_RELIABILITY.high);

    const highPool = reliable
        .filter(t => t.value >= DATING_RELIABILITY.highCutoff)
        .sort((a, b) => b.value - a.value)
        .slice(0, countPerPole)
        .map(t => ({ ...t, pole: 'high' }));

    const lowPool = reliable
        .filter(t => t.value <= DATING_RELIABILITY.lowCutoff)
        .sort((a, b) => a.value - b.value)
        .slice(0, countPerPole)
        .map(t => ({ ...t, pole: 'low' }));

    return [...highPool, ...lowPool];
}

// ==================== COMPATIBILITY TAB ====================

function validateCandidateInput() {
    const input = document.getElementById('candidateEmbeddingInput');
    const status = document.getElementById('embedStatus');
    const btn = document.getElementById('analyzeBtn');
    const btnLight = document.getElementById('analyzeLightBtn');
    const btnMutual = document.getElementById('analyzeMutualBtn');
    const btnQuestion = document.getElementById('analyzeQuestionBtn');
    const questionInput = document.getElementById('candidateQuestionInput');
    const mutualHint = document.getElementById('mutualHint');

    if (!input || !status || !btn) return;

    const value = input.value.trim();

    if (!value) {
        status.innerHTML = '';
        status.className = 'compat-input-status';
        btn.disabled = true;
        if (btnLight) btnLight.disabled = true;
        if (btnMutual) btnMutual.disabled = true;
        if (btnQuestion) btnQuestion.disabled = true;
        if (mutualHint) mutualHint.style.display = 'none';
        return;
    }

    const parsed = parseEmbeddingFromExport(value);

    if (parsed) {
        const date = new Date(parsed.createdAt).toLocaleDateString('ru-RU');
        const isV3 = parsed.version === 3 && parsed.requirements;

        let statusText = `✅ Эмбеддинг v${parsed.version} (${parsed.factsCount} фактов, создан ${date})`;
        if (isV3) {
            statusText += ` + Требования (H:${parsed.requirements.high.length}, L:${parsed.requirements.low.length})`;
        }

        status.innerHTML = statusText;
        status.className = 'compat-input-status status-valid';

        btn.disabled = false;
        if (btnQuestion) {
            const has50CandidateScales = parsed.vectors && parsed.vectors.length === TOTAL_SCALES;
            btnQuestion.disabled = !has50CandidateScales || !(questionInput?.value?.trim());
            btnQuestion.title = has50CandidateScales
                ? 'Ответить на свободный вопрос по 50 шкалам кандидата'
                : 'Для 4-го отчёта нужен эмбеддинг V2/V3 с 50 шкалами';
        }

        const hasUserIdeal = getSavedIdeal()?.searchScales;
        if (btnLight) btnLight.disabled = !hasUserIdeal;

        if (btnMutual) {
            const mutualAvailable = isV3 && hasUserIdeal;
            btnMutual.disabled = !mutualAvailable;

            if (mutualHint) {
                if (!isV3 && hasUserIdeal) {
                    mutualHint.style.display = 'block';
                    mutualHint.innerHTML = 'ℹ️ У кандидата эмбеддинг V2 (без требований). Для «Взаимность и Динамика» нужен V3.';
                } else if (!hasUserIdeal) {
                    mutualHint.style.display = 'block';
                    mutualHint.innerHTML = 'ℹ️ Заполните вкладку «💫 Кто мне нужен», чтобы разблокировать быстрый чек и взаимность.';
                } else {
                    mutualHint.style.display = 'none';
                }
            }
        }
    } else {
        status.innerHTML = '❌ Неверный формат. Нужна строка DATING_EMBED_V2|... или DATING_EMBED_V3|...';
        status.className = 'compat-input-status status-invalid';
        btn.disabled = true;
        if (btnLight) btnLight.disabled = true;
        if (btnMutual) btnMutual.disabled = true;
        if (btnQuestion) btnQuestion.disabled = true;
        if (mutualHint) mutualHint.style.display = 'none';
    }
}

function buildMatchReport(userEmbed, candidateEmbed, ideal) {
    const report = {
        matchedHigh: [],
        failedHigh: [],
        uncertainHigh: [],
        matchedLow: [],
        failedLow: [],
        uncertainLow: [],
        surprises: [],
        uncertainExpected: [],
        userHighlights: [],
        userLowlights: []
    };

    const HIGH_THRESHOLD = DATING_RELIABILITY.highCutoff;
    const LOW_THRESHOLD = 0.5;

    // HIGH expectations
    for (const scaleId of ideal.searchScales.high) {
        const idx = scaleId - 1;
        const scale = SCALES[idx];
        if (!scale) continue;

        const range = getScaleRange(candidateEmbed.vectors[idx]);
        const reliability = getReliabilityLevel(range.spread);

        const entry = {
            id: scaleId,
            name: scale.name,
            emoji: scale.emoji,
            expected: 'high',
            actual: range.value,
            actualPercent: formatPercent(range.value),
            spread: range.spread,
            reliability,
            min: range.min,
            max: range.max,
            minPercent: formatPercent(range.min),
            maxPercent: formatPercent(range.max)
        };

        if (range.min >= HIGH_THRESHOLD) {
            report.matchedHigh.push(entry);
        } else if (range.max < HIGH_THRESHOLD) {
            entry.deficit = formatPercent(HIGH_THRESHOLD - range.max);
            report.failedHigh.push(entry);
        } else {
            report.uncertainHigh.push(entry);
            if (reliability === 'low') {
                report.uncertainExpected.push(entry);
            }
        }
    }

    // LOW expectations
    for (const scaleId of ideal.searchScales.low) {
        const idx = scaleId - 1;
        const scale = SCALES[idx];
        if (!scale) continue;

        const range = getScaleRange(candidateEmbed.vectors[idx]);
        const reliability = getReliabilityLevel(range.spread);

        const entry = {
            id: scaleId,
            name: scale.name,
            emoji: scale.emoji,
            expected: 'low',
            actual: range.value,
            actualPercent: formatPercent(range.value),
            spread: range.spread,
            reliability,
            min: range.min,
            max: range.max,
            minPercent: formatPercent(range.min),
            maxPercent: formatPercent(range.max)
        };

        if (range.max <= LOW_THRESHOLD) {
            report.matchedLow.push(entry);
        } else if (range.min > LOW_THRESHOLD) {
            entry.excess = formatPercent(range.min - LOW_THRESHOLD);
            report.failedLow.push(entry);
        } else {
            report.uncertainLow.push(entry);
            if (reliability === 'low') {
                report.uncertainExpected.push(entry);
            }
        }
    }

    // Surprises: only reliable enough
    const expectedIds = [...ideal.searchScales.high, ...ideal.searchScales.low];
    for (let idx = 0; idx < TOTAL_SCALES; idx++) {
        const scaleId = idx + 1;
        if (expectedIds.includes(scaleId)) continue;

        const range = getScaleRange(candidateEmbed.vectors[idx]);
        if (!isScaleReliable(range.spread)) continue;

        if (range.min >= 0.8) {
            report.surprises.push({
                id: scaleId,
                name: SCALES[idx].name,
                emoji: SCALES[idx].emoji,
                value: range.value,
                percent: formatPercent(range.value),
                pole: 'high',
                reliability: getReliabilityLevel(range.spread)
            });
        } else if (range.max <= DATING_RELIABILITY.lowCutoff) {
            report.surprises.push({
                id: scaleId,
                name: SCALES[idx].name,
                emoji: SCALES[idx].emoji,
                value: range.value,
                percent: formatPercent(range.value),
                pole: 'low',
                reliability: getReliabilityLevel(range.spread)
            });
        }
    }

    // User highlights / lowlights for context
    for (let idx = 0; idx < TOTAL_SCALES; idx++) {
        const userValue = userEmbed.vectors[idx]?.value ?? 0.5;
        const userSpread = userEmbed.vectors[idx]?.spread ?? 0;

        if (userSpread > DATING_RELIABILITY.high) continue;

        if (userValue >= 0.75) {
            report.userHighlights.push({
                name: SCALES[idx].name,
                emoji: SCALES[idx].emoji,
                percent: formatPercent(userValue)
            });
        } else if (userValue <= DATING_RELIABILITY.lowCutoff) {
            report.userLowlights.push({
                name: SCALES[idx].name,
                emoji: SCALES[idx].emoji,
                percent: formatPercent(userValue)
            });
        }
    }

    return report;
}

function summarizeMatchForPrompt(report, direction) {
    const good = report.matchedHigh.length + report.matchedLow.length;
    const bad = report.failedHigh.length + report.failedLow.length;
    const uncertain = report.uncertainHigh.length + report.uncertainLow.length;

    const dirLabel = direction === 'reverse' ? 'Пользователь → Кандидат' : 'Кандидат → Пользователь';

    let text = `[${dirLabel}] Совпадений: ${good}, Несовпадений: ${bad}, Неясно: ${uncertain}\n`;

    if (report.matchedHigh.length) {
        text += `  ✅ Высокие совпадения: ${report.matchedHigh.map(i => `${i.emoji} ${i.name} (${i.actualPercent})`).join(', ')}\n`;
    }
    if (report.matchedLow.length) {
        text += `  ✅ Низкие совпадения: ${report.matchedLow.map(i => `${i.emoji} ${i.name} (${i.actualPercent})`).join(', ')}\n`;
    }
    if (report.failedHigh.length) {
        text += `  ❌ Не хватает (ожидалось высокое): ${report.failedHigh.map(i => `${i.emoji} ${i.name} (${i.actualPercent}, нужно ≥70%)`).join(', ')}\n`;
    }
    if (report.failedLow.length) {
        text += `  ❌ Лишнее (ожидалось низкое): ${report.failedLow.map(i => `${i.emoji} ${i.name} (${i.actualPercent}, нужно ≤50%)`).join(', ')}\n`;
    }
    if (report.uncertainHigh.length) {
        text += `  ⚠️ Неясно (высокие): ${report.uncertainHigh.map(i => `${i.emoji} ${i.name} (${i.minPercent}–${i.maxPercent})`).join(', ')}\n`;
    }
    if (report.uncertainLow.length) {
        text += `  ⚠️ Неясно (низкие): ${report.uncertainLow.map(i => `${i.emoji} ${i.name} (${i.minPercent}–${i.maxPercent})`).join(', ')}\n`;
    }
    if (report.surprises.length) {
        text += `  🎲 Неожиданности: ${report.surprises.map(i => `${i.emoji} ${i.name} ${i.percent} (${i.pole})`).join(', ')}\n`;
    }

    return text;
}

function formatMatchReportDetailed(report) {
    let sections = '';

    if (report.matchedHigh.length > 0) {
        sections += '✅ СОВПАЛО ПО ВЫСОКИМ ОЖИДАНИЯМ:\n';
        sections += report.matchedHigh.map(e =>
            `• ${e.emoji} ${e.name}: уверенно высокое (${e.minPercent}–${e.maxPercent})`
        ).join('\n') + '\n\n';
    }

    if (report.failedHigh.length > 0) {
        sections += '❌ НЕ СОВПАЛО ПО ВЫСОКИМ ОЖИДАНИЯМ:\n';
        sections += report.failedHigh.map(e =>
            `• ${e.emoji} ${e.name}: не дотягивает (${e.minPercent}–${e.maxPercent})`
        ).join('\n') + '\n\n';
    }

    if (report.uncertainHigh.length > 0) {
        sections += '⚠️ НЕЯСНО ПО ВЫСОКИМ ОЖИДАНИЯМ:\n';
        sections += report.uncertainHigh.map(e =>
            `• ${e.emoji} ${e.name}: размыто (${e.minPercent}–${e.maxPercent}, ±${e.spread.toFixed(2)})`
        ).join('\n') + '\n\n';
    }

    if (report.matchedLow.length > 0) {
        sections += '✅ СОВПАЛО ПО НИЗКИМ ОЖИДАНИЯМ:\n';
        sections += report.matchedLow.map(e =>
            `• ${e.emoji} ${e.name}: уверенно низкое (${e.minPercent}–${e.maxPercent})`
        ).join('\n') + '\n\n';
    }

    if (report.failedLow.length > 0) {
        sections += '❌ НЕ СОВПАЛО ПО НИЗКИМ ОЖИДАНИЯМ:\n';
        sections += report.failedLow.map(e =>
            `• ${e.emoji} ${e.name}: выше желаемого (${e.minPercent}–${e.maxPercent})`
        ).join('\n') + '\n\n';
    }

    if (report.uncertainLow.length > 0) {
        sections += '⚠️ НЕЯСНО ПО НИЗКИМ ОЖИДАНИЯМ:\n';
        sections += report.uncertainLow.map(e =>
            `• ${e.emoji} ${e.name}: размыто (${e.minPercent}–${e.maxPercent}, ±${e.spread.toFixed(2)})`
        ).join('\n') + '\n\n';
    }

    if (report.surprises.length > 0) {
        sections += '🎲 НЕОЖИДАННОСТИ:\n';
        sections += report.surprises.map(e =>
            `• ${e.emoji} ${e.name}: ${e.percent} (${e.pole === 'high' ? 'очень высокое' : 'низкое'})`
        ).join('\n') + '\n\n';
    }

    return sections;
}

function getProfilePublishStatus() {
    const profileId = getMyProfileId();
    if (profileId) {
        return `<span style="font-size:12px; color:#4ade80; margin-left:10px;">✅ Анкета опубликована</span>`;
    }
    return `<span style="font-size:12px; color:#f59e0b; margin-left:10px;">⚠️ Не опубликовано</span>`;
}

function appendCompatibilityActions(resultContainer) {
    if (!resultContainer) return;
    
    const oldActions = resultContainer.querySelector('.compat-report-actions');
    if (oldActions) oldActions.remove();
    
    const canWrite = !!window.currentCandidateId;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'compat-report-actions';
    actionsDiv.innerHTML = `
        <button class="dating-btn dating-btn-regenerate" onclick="closeDatingModal()">✕ Закрыть отчёт</button>
        <button class="dating-btn dating-btn-copy" onclick="startDialogFromDating()" ${canWrite ? '' : 'disabled title="У этого кандидата нет ID профиля"'}>💬 Написать кандидату</button>
    `;
    
    resultContainer.appendChild(actionsDiv);
}

function decodeCandidateEmbedding(embedding) {
    const allScales = SCALES.map((scale, idx) => {
        const range = getScaleRange(embedding.vectors[idx]);
        return {
            name: scale.name,
            emoji: scale.emoji,
            category: scale.category,
            value: range.value,
            spread: range.spread,
            min: range.min,
            max: range.max,
            reliability: getReliabilityLevel(range.spread)
        };
    });

    const strong = allScales
        .filter(s => s.min >= DATING_RELIABILITY.highCutoff && s.spread <= DATING_RELIABILITY.medium)
        .sort((a, b) => b.value - a.value);

    const weak = allScales
        .filter(s => s.max <= DATING_RELIABILITY.lowCutoff && s.spread <= DATING_RELIABILITY.medium)
        .sort((a, b) => a.value - b.value);

    const uncertain = allScales.filter(s => s.spread > DATING_RELIABILITY.medium);

    let summary = '🔥 ЯРКО ВЫРАЖЕНО (только достаточно достоверные):\n';
    summary += strong.length > 0
        ? strong.map(s => `• ${s.emoji} ${s.name}: ${formatPercent(s.value)} (диапазон ${formatPercent(s.min)}–${formatPercent(s.max)})`).join('\n')
        : '(нет)\n';

    summary += '\n\n🧊 СЛАБО ВЫРАЖЕНО (только достаточно достоверные):\n';
    summary += weak.length > 0
        ? weak.map(s => `• ${s.emoji} ${s.name}: ${formatPercent(s.value)} (диапазон ${formatPercent(s.min)}–${formatPercent(s.max)})`).join('\n')
        : '(нет)\n';

    if (uncertain.length > 0) {
        summary += `\n\n⚠️ НЕДОСТАТОЧНО ДОСТОВЕРНЫЕ ШКАЛЫ (${uncertain.length} из ${TOTAL_SCALES}):\n`;
        summary += uncertain
            .map(s => `• ${s.emoji} ${s.name}: ${formatPercent(s.value)}, возможный диапазон ${formatPercent(s.min)}–${formatPercent(s.max)}, отклонение ${s.spread.toFixed(2)}`)
            .join('\n');
    }

    const byCategory = {};
    SCALES.forEach((scale, idx) => {
        if (!byCategory[scale.category]) byCategory[scale.category] = [];
        byCategory[scale.category].push({
            name: scale.name,
            value: allScales[idx].value,
            spread: allScales[idx].spread,
            min: allScales[idx].min,
            max: allScales[idx].max
        });
    });

    summary += '\n\nПОЛНЫЙ ПРОФИЛЬ:\n';
    for (const [catKey, items] of Object.entries(byCategory)) {
        summary += `\n${CATEGORY_LABELS[catKey]}:\n`;
        items.forEach(item => {
            const rel = item.spread > DATING_RELIABILITY.medium ? '⚠️' : item.spread > DATING_RELIABILITY.high ? '~' : '✓';
            summary += `  ${rel} ${item.name}: ${formatPercent(item.value)} (диапазон ${formatPercent(item.min)}–${formatPercent(item.max)})\n`;
        });
    }

    return summary;
}


function formatCandidateScalesForQuestion(embedding, includeMedium = false) {
    const rows = [];
    const skipped = {
        medium: [],
        low: []
    };

    SCALES.forEach((scale, idx) => {
        const range = getScaleRange(embedding.vectors[idx]);
        const reliability = getReliabilityLevel(range.spread);

        if (reliability === 'low') {
            skipped.low.push(scale.id);
            return;
        }

        if (reliability === 'medium' && !includeMedium) {
            skipped.medium.push(scale.id);
            return;
        }

        const reliabilityText = reliability === 'high'
            ? 'высокая достоверность'
            : 'средняя достоверность / использовать осторожно';

        rows.push(
            `${scale.id}. ${scale.emoji} ${scale.name}: ${formatPercent(range.value)} ` +
            `(диапазон ${formatPercent(range.min)}–${formatPercent(range.max)}, ` +
            `spread ±${range.spread.toFixed(2)}, ${reliabilityText}) — ${scale.desc}`
        );
    });

    return {
        text: rows.join('\n') || '(нет шкал достаточной достоверности для передачи в отчёт)',
        includedCount: rows.length,
        skipped
    };
}
function getCandidateQuestionProfileBlock(useDescription, candidateDescription) {
    const info = getCompatProfileInfo();
    const candidateLine = `${info.candidateGender ? formatGenderText(info.candidateGender) : 'пол неизвестен'}, ${info.candidateAge || 'возраст неизвестен'} лет`;

    let block = `=== ПОЛ И ВОЗРАСТ КАНДИДАТА ===\n`;
    block += `Кандидат: ${candidateLine}\n\n`;

    block += `КРИТИЧЕСКИ ВАЖНО ПРО ПОЛ И ВОЗРАСТ КАНДИДАТА:\n`;
    block += `- Пол и возраст кандидата — не декоративные данные, а ключ к интерпретации его шкал.\n`;
    block += `- Одна и та же шкала в 22, 35 и 50 лет может означать разные жизненные проявления.\n`;
    block += `- Одна и та же шкала у мужчины/женщины/неуказанного пола может иметь разный социальный контекст и разные поведенческие проявления.\n`;
    block += `- НЕ используй пол, возраст, эмбеддинг или личностные данные владельца аккаунта. Этот отчёт только о кандидате.\n`;
    block += `- Если пол/возраст кандидата неизвестны, явно отметь это как ограничение и не притворяйся, что знаешь.\n`;

    if (useDescription && candidateDescription && candidateDescription.trim()) {
        block += `\nЕсли в описании кандидата есть пол/возраст или жизненная стадия — извлеки это и используй при интерпретации.\n`;
    }

    return block;
}
function buildCandidateQuestionPrompt(candidateEmbedding, question, candidateDescription, useDescription, includeMediumReliability = false) {
    const langName = getLanguageName();
    const userStyle = localStorage.getItem(STORAGE_KEYS.style) || '';
    const candidateScalesData = formatCandidateScalesForQuestion(candidateEmbedding, includeMediumReliability);
    const profileBlock = getCandidateQuestionProfileBlock(useDescription, candidateDescription);

    let styleBlock = '';
    if (userStyle && userStyle.trim()) {
        styleBlock = `\n=== СТИЛЬ ОТВЕТА ===\nПиши в стиле, подходящем пользователю:\n${userStyle}\n`;
    }

    let descriptionBlock = '';
    if (useDescription && candidateDescription && candidateDescription.trim()) {
        descriptionBlock = `\n=== ОПИСАНИЕ КАНДИДАТА (учитывать как дополнительный контекст) ===\n${candidateDescription.trim()}\n`;
    } else {
        descriptionBlock = '\n=== ОПИСАНИЕ КАНДИДАТА ===\nОписание намеренно НЕ учитывается в этом отчёте. Отвечай только по анкетному полу/возрасту, если они известны из профиля, и по переданным шкалам.\n';
    }

    const omittedMediumCount = candidateScalesData.skipped.medium.length;
    const omittedLowCount = candidateScalesData.skipped.low.length;

    return `Ты — аккуратный психологический аналитик. Пиши на ${langName}.
${styleBlock}

=== РЕЖИМ ОТЧЁТА ===
Это 4-й отчёт по кандидату: свободный вопрос пользователя о кандидате.
КРИТИЧЕСКИ ВАЖНО:
- НЕ анализируй совместимость с владельцем аккаунта. Этот отчёт только о кандидате.
- Используй только переданные ниже шкалы кандидата. Это НЕ все 50 шкал: низкодостоверные шкалы специально исключены, среднедостоверные ${includeMediumReliability ? 'включены по запросу пользователя' : 'тоже исключены по умолчанию'}.
- Низкодостоверные шкалы НИКОГДА не используй даже как косвенный аргумент

${profileBlock}

=== ВОПРОС ПОЛЬЗОВАТЕЛЯ О КАНДИДАТЕ ===
${question}

=== ПЕРЕДАННЫЕ ШКАЛЫ КАНДИДАТА ===
Передано шкал: ${candidateScalesData.includedCount} из ${TOTAL_SCALES}.
Режим достоверности: ${includeMediumReliability ? 'высокая + средняя достоверность' : 'только высокая достоверность'}.

${candidateScalesData.text}


=== КАК ОТВЕЧАТЬ ===
1. Сначала молча хорошо обдумай вопрос: какие из ПЕРЕДАННЫХ шкал релевантны, какие комбинации важны, где данные надёжны, а где даже переданные средние шкалы требуют осторожности.
2. Пол и возраст кандидата должны явно влиять на интерпретацию. Не добавляй их одной формальной фразой — привяжи к ним ключевые выводы
4. В ответе явно выдели главное предположение/вывод по вопросу.
5. Обязательно называй ключевые использованные шкалы и их примерные проценты.
6. Для среднедостоверных шкал, если они включены, всегда пиши осторожно: «умеренный сигнал», «может проявляться так-то, но не твёрдый факт».
8. Если описание включено и противоречит шкалам — отметь противоречие, но не отменяй шкалы без причины.
9. Если невозможно честно ответить по этим данным — скажи, что можно и нельзя вывести.
10. Пиши обычным текстом, без таблиц.`;
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
        return scale
            ? `<div class="ideal-scale-item ideal-high"><span>${scale.emoji}</span><span>${scale.name}</span><span class="ideal-badge badge-high">≥ 70%</span></div>`
            : '';
    }).join('');

    const lowScales = (ideal.searchScales?.low || []).map(id => {
        const scale = SCALES.find(s => s.id === id);
        return scale
            ? `<div class="ideal-scale-item ideal-low"><span>${scale.emoji}</span><span>${scale.name}</span><span class="ideal-badge badge-low">≤ 50%</span></div>`
            : '';
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

            <div class="dating-prototype-note">
                <span>🚧</span>
                <p>В финальной версии эти шкалы будут использоваться для автоматического перебора кандидатов из базы.</p>
            </div>
        </div>`;
}

function confirmRegenerateIdeal() {
    if (confirm('Пересоздать профиль идеального партнёра?')) {
        localStorage.removeItem(DATING_IDEAL_KEY);
        renderIdealReady();
    }
}

// ==================== IDEAL GENERATION ====================

async function startIdealGeneration(isAutoFlow = false) {
    if (datingState.isGeneratingIdeal) return;
    datingState.isGeneratingIdeal = true;

    try {
        const embedding = getSavedEmbedding();
        const topTraits = getTopTraits(embedding, 5);
        const highTraits = topTraits.filter(t => t.pole === 'high');
        const lowTraits = topTraits.filter(t => t.pole === 'low');

        renderIdealGenerating(1);

        const userTraitsFormatted = formatTraitsForIdealPrompt(highTraits, lowTraits);
        const expectations = await generateExpectations(userTraitsFormatted);

        if (!expectations) throw new Error('Не удалось сформулировать ожидания');
        console.log('[Dating/Ideal] Step 1 done.');

        renderIdealGenerating(2);

        const searchScales = await generateSearchScales(expectations);

        if (!searchScales) throw new Error('Не удалось определить шкалы поиска');
        console.log('[Dating/Ideal] Step 2 done. High:', searchScales.high, 'Low:', searchScales.low);

        const ideal = {
            createdAt: Date.now(),
            expectations: expectations,
            searchScales: searchScales,
            sourceTraits: {
                high: highTraits.map(t => t.index),
                low: lowTraits.map(t => t.index)
            }
        };

        localStorage.setItem(DATING_IDEAL_KEY, JSON.stringify(ideal));
        renderSavedIdeal(ideal);

        // ТИХАЯ СИНХРОНИЗАЦИЯ, ЕСЛИ АНКЕТА УЖЕ ЕСТЬ
        if (getMyProfileId() && isProfileComplete()) {
            console.log('[Dating] Auto-syncing V3 to server...');
            publishMyProfileToFirebase(true);
        }

        // ВОЗВРАТ В ПРОФИЛЬ ПРИ АВТОМАТИЧЕСКОМ ПОТОКЕ
        if (isAutoFlow) {
            console.log('[Dating] V3 generated automatically. Returning to Profile tab.');
            switchDatingTab('profile');
        }

    } catch (error) {
        console.error('[Dating/Ideal] Failed:', error);
        const container = document.getElementById('datingContent');
        container.innerHTML = `
            <div class="dating-status dating-error">
                <div class="dating-icon">❌</div>
                <h3>Ошибка</h3>
                <p>${error.message}</p>
                <button class="dating-btn" onclick="renderIdealReady()">🔄 Снова</button>
            </div>`;
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
3. Учитывай и ДОПОЛНЯЮЩИЕ черты (то, чего не хватает) и РЕЗОНИРУЮЩИЕ (общее)
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

1. **HIGH** — 10 шкал, которые у партнёра ДОЛЖНЫ БЫТЬ ВЫСОКИМИ (≥ 70%, то есть значение ≥ 0.7)
2. **LOW** — 5 шкал, которые у партнёра ДОЛЖНЫ БЫТЬ НИЗКИМИ (≤ 50%, то есть значение ≤ 0.5)

=== ПРАВИЛА ===
- Выбирай СТРОГО из списка шкал выше (по ID)
- HIGH = именно 10 шкал
- LOW = именно 5 шкал
- Не дублируй шкалы между HIGH и LOW
- Ты почти наверняка захочешь положить в LOW конфликтность, тревожность и другие черты, которые никто бы не хотел видеть в партнёре, но твоя задача определить желаемые низкие черты именно из предоставленных ожиданий, а не из перечисления общепопулярных низких качеств

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

        let parsed = null;
        try {
            parsed = JSON.parse(text);
        } catch (e1) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                } catch (e2) {
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
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

// ==================== EMBEDDING GENERATION ====================

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
            
            const embedding = await generateSingleEmbedding(i);
            
            if (embedding) {
                datingState.passes.push(embedding);
            } else {
                throw new Error(`Проход ${i} не удался после нескольких попыток. Сервер перегружен или ИИ выдал неверный формат.`);
            }
            
            if (i < EMBEDDING_PASSES) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        const finalEmbedding = calculateFinalEmbedding(datingState.passes);
        saveEmbedding(finalEmbedding);
        renderSavedEmbedding(finalEmbedding);
        
        console.log('[Dating] Embedding generation complete!');

        // АВТОМАТИЧЕСКИЙ ПЕРЕХОД И СОЗДАНИЕ ИДЕАЛА (V3)
        console.log('[Dating] V2 generated. Seamlessly starting V3...');
        switchDatingTab('ideal');
        await startIdealGeneration(true); // true = автоматический поток
        
    } catch (error) {
        console.error('[Dating] Generation failed:', error);
        renderGenerationError(error.message);
    } finally {
        datingState.isGenerating = false;
    }
}

async function generateSingleEmbedding(passNumber) {
    const facts = getFactsForPrompt(false);
    const traits = getTraitsForPrompt(false);
    const prompt = buildEmbeddingPrompt(facts, traits);
    
    const MAX_ATTEMPTS = 3;
    
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            console.log(`[Dating] Pass ${passNumber}, Attempt ${attempt}/${MAX_ATTEMPTS}`);
            
            const response = await callAPIForDating(prompt);
            const parsed = parseEmbeddingResponse(response);
            
            if (parsed && parsed.length === TOTAL_SCALES) {
                return parsed;
            }
            
            console.warn(`[Dating] Invalid embedding length on attempt ${attempt}:`, parsed?.length);
            
            if (typeof switchToNextModel === 'function' && attempt < MAX_ATTEMPTS) {
                console.log('[Dating] Bad format received. Forcing model switch...');
                switchToNextModel();
            }
            
        } catch (error) {
            console.error(`[Dating] API call failed on attempt ${attempt}:`, error);
        }
        
        if (attempt < MAX_ATTEMPTS) {
            console.log(`[Dating] Retrying in ${2000 * attempt}ms...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
    
    return null;
}

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

        if (index >= 1 && index <= TOTAL_SCALES && !isNaN(value)) {
            found[index] = Math.max(0, Math.min(1, value));
        }
    }

    const values = [];
    for (let i = 1; i <= TOTAL_SCALES; i++) {
        values.push(found[i] !== undefined ? found[i] : 0.5);
    }

    console.log(`[Dating] Parsed ${Object.keys(found).length}/${TOTAL_SCALES} values`);
    return values.length === TOTAL_SCALES ? values : null;
}

function calculateFinalEmbedding(passes) {
    const vectors = [];

    for (let i = 0; i < TOTAL_SCALES; i++) {
        const values = passes.map(p => p[i]);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const spread = Math.max(...values) - Math.min(...values);

        vectors.push({
            value: Math.round(avg * 100) / 100,
            spread: Math.round(spread * 100) / 100,
            raw: values
        });
    }

    return {
        version: 2,
        createdAt: Date.now(),
        factsCount: getFactsData().facts?.filter(f => !f.superseded).length || 0,
        vectors
    };
}

// ==================== DESCRIPTIONS ====================

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
        
        // ТИХАЯ АВТО-СИНХРОНИЗАЦИЯ
        if (getMyProfileId() && isProfileComplete()) {
            publishMyProfileToFirebase(true);
        }
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

function buildDescriptionPrompt(level, facts, traits, topTraits) {
    const highTraits = topTraits.filter(t => t.pole === 'high');
    const lowTraits = topTraits.filter(t => t.pole === 'low');

    let traitsText = '';
    if (highTraits.length > 0) {
        traitsText += 'Ярко выражено:\n' + highTraits.map(t => `- ${t.emoji} ${t.name}: ${(t.value * 100).toFixed(0)}%`).join('\n');
    }
    if (lowTraits.length > 0) {
        traitsText += '\nСлабо выражено:\n' + lowTraits.map(t => `- ${t.emoji} ${t.name}: ${(t.value * 100).toFixed(0)}%`).join('\n');
    }

    if (level === 1) {
        return `Напиши интригующее АНОНИМНОЕ описание человека для сервиса знакомств.

**Черты:** ${traits || '(нет)'}
**Ключевые шкалы:**
${traitsText || '(нет)'}

Требования:
- Только пол + художественный возраст
- НЕ упоминай профессию, город, имена, семью и прочее, что может даже косвенно послужить зацепкой для деанонимизации
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
- НЕ упоминай: адреса, финансы, здоровье, конфликты, любую палящую информацию
- От третьего лица, как нетворкер
- 5-8 предложений

Только текст описания.`;
    }
}

// ==================== STORAGE ====================

function getSavedDescriptions() {
    const data = localStorage.getItem(DATING_DESCRIPTIONS_KEY);
    if (!data) {
        return {
            level1: { text: '', enabled: false },
            level2: { text: '', enabled: false }
        };
    }
    try {
        return JSON.parse(data);
    } catch (e) {
        return {
            level1: { text: '', enabled: false },
            level2: { text: '', enabled: false }
        };
    }
}

function saveDescription(level, text) {
    const d = getSavedDescriptions();
    d[`level${level}`] = {
        text,
        enabled: d[`level${level}`]?.enabled || false,
        updatedAt: Date.now()
    };
    localStorage.setItem(DATING_DESCRIPTIONS_KEY, JSON.stringify(d));
}

function toggleDescriptionEnabled(level) {
    const cb = document.getElementById(`enableLevel${level}`);
    if (!cb) return;

    const d = getSavedDescriptions();
    d[`level${level}`] = {
        ...d[`level${level}`],
        enabled: cb.checked,
        updatedAt: Date.now()
    };
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
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

// ==================== USER PROFILE (AGE, GENDER, PREFERENCES) ====================

function getUserProfile() {
    const data = localStorage.getItem(DATING_USER_PROFILE_KEY);
    if (!data) {
        return {
            userGender: null, // 'male', 'female', 'unspecified'
            userAge: null, // number
            targetGender: [], // ['male', 'female', 'unspecified']
            targetAgeMin: 18,
            targetAgeMax: 80,
            updatedAt: null
        };
    }
    try {
        return JSON.parse(data);
    } catch (e) {
        return {
            userGender: null,
            userAge: null,
            targetGender: [],
            targetAgeMin: 18,
            targetAgeMax: 80,
            updatedAt: null
        };
    }
}

function saveUserProfile(profile) {
    profile.updatedAt = Date.now();
    localStorage.setItem(DATING_USER_PROFILE_KEY, JSON.stringify(profile));
}

function isProfileComplete() {
    const profile = getUserProfile();
    if (!profile.userAge || profile.userAge < 18 || profile.userAge > 120) return false;
    if (!profile.userGender) return false;
    if (!profile.targetGender || profile.targetGender.length === 0) return false;
    if (profile.targetAgeMin === undefined || profile.targetAgeMax === undefined) return false;
    if (profile.targetAgeMin < 18 || profile.targetAgeMax > 120 || profile.targetAgeMin > profile.targetAgeMax) return false;
    return true;
}

// ==================== EXPORT / IMPORT (V3 SUPPORT) ====================

function formatEmbeddingForExport(embedding) {
    const vectorsStr = embedding.vectors.map(v => `${v.value.toFixed(2)},${v.spread.toFixed(2)}`).join(';');

    // Пытаемся найти требования к партнеру
    const ideal = getSavedIdeal();
    let suffix = '';
    let version = 'DATING_EMBED_V2';

    // Если есть требования (High/Low), переходим на V3
    if (ideal && ideal.searchScales && ideal.searchScales.high && ideal.searchScales.low) {
        version = 'DATING_EMBED_V3';
        const highStr = ideal.searchScales.high.join(',');
        const lowStr = ideal.searchScales.low.join(',');
        suffix = `|${highStr}|${lowStr}`;
    }

    return `${version}|${embedding.createdAt}|${embedding.factsCount}|${vectorsStr}${suffix}`;
}

function parseEmbeddingFromExport(str) {
    if (!str || typeof str !== 'string') return null;

    const parts = str.trim().split('|');

    // Проверяем префикс
    if (!parts[0].startsWith('DATING_EMBED_V')) return null;

    const versionStr = parts[0];
    const version = parseInt(versionStr.replace('DATING_EMBED_V', ''));

    if (isNaN(version) || version < 1 || version > 3) return null;

    // Валидация количества частей
    if (version <= 2 && parts.length !== 4) return null;
    if (version === 3 && parts.length !== 6) return null;

    const createdAt = parseInt(parts[1]);
    const factsCount = parseInt(parts[2]);

    if (isNaN(createdAt) || isNaN(factsCount)) return null;

    // Парсинг векторов
    const vectors = parts[3].split(';').map(pair => {
        const [value, spread] = pair.split(',').map(parseFloat);
        if (isNaN(value) || isNaN(spread)) return null;
        return { value, spread };
    });

    if (vectors.some(v => v === null)) return null;

    // Проверка количества шкал
    const expectedLength = version >= 2 ? 50 : 33;
    if (vectors.length !== expectedLength) return null;

    // Парсинг требований (только для V3)
    let requirements = null;
    if (version === 3) {
        try {
            const high = parts[4].split(',').map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 1 && n <= TOTAL_SCALES);
            const low = parts[5].split(',').map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 1 && n <= TOTAL_SCALES);
            if (high.length > 0 && low.length > 0) {
                requirements = { high, low };
            }
        } catch (e) {
            console.warn('[Dating] Failed to parse V3 requirements, treating as V2');
        }
    }

    return { version, createdAt, factsCount, vectors, requirements };
}

function copyEmbeddingToClipboard() {
    const embedding = getSavedEmbedding();
    if (!embedding) {
        alert('Нет профиля');
        return;
    }

    const exportStr = formatEmbeddingForExport(embedding);
    const ideal = getSavedIdeal();
    const isV3 = ideal && ideal.searchScales;

    navigator.clipboard.writeText(exportStr).then(() => {
        const btn = document.querySelector('.dating-btn-copy');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = isV3 ? '✅ Скопировано (V3 + требования)!' : '✅ Скопировано (V2)!';
            setTimeout(() => {
                btn.innerHTML = orig;
            }, 2500);
        }
    }).catch(err => {
        console.error('[Dating] Copy failed:', err);
        // Fallback
        try {
            const textarea = document.createElement('textarea');
            textarea.value = exportStr;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('Профиль скопирован!');
        } catch (e2) {
            alert('Не удалось скопировать. Текст: ' + exportStr.substring(0, 50) + '...');
        }
    });
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

// ==================== PRIVACY DISCLAIMER ====================

const PRIVACY_ACCEPTED_KEY = 'chatbot_dating_privacy_accepted';

function isPrivacyAccepted() {
    return localStorage.getItem(PRIVACY_ACCEPTED_KEY) === 'true';
}

function showPrivacyDisclaimer(callback) {
    if (isPrivacyAccepted()) {
        callback();
        return;
    }
    
    // Сохраняем callback для вызова после принятия
    window._privacyCallback = callback;
    
    const overlay = document.getElementById('privacyDisclaimer');
    if (overlay) {
        overlay.classList.add('active');
    }
}

function acceptPrivacyDisclaimer() {
    localStorage.setItem(PRIVACY_ACCEPTED_KEY, 'true');
    
    const overlay = document.getElementById('privacyDisclaimer');
    if (overlay) {
        overlay.classList.remove('active');
    }
    
    // Вызываем сохранённый callback
    if (window._privacyCallback) {
        const cb = window._privacyCallback;
        window._privacyCallback = null;
        // Небольшая задержка, чтобы модалка успела закрыться
        setTimeout(cb, 200);
    }
}

// ==================== FIREBASE PUBLIC ACTIONS ====================

async function publishMyProfileToFirebase(isSilent = false) {
    const embedding = getSavedEmbedding();
    if (!embedding) {
        if (!isSilent) alert('Сначала создайте личностный профиль (вкладка "Мой профиль")');
        return;
    }
    
    const userProfile = getUserProfile();
    if (!isProfileComplete()) {
        if (!isSilent) alert('Сначала заполните анкетные данные (пол, возраст, кого ищете)');
        return;
    }
    
    const descriptions = getSavedDescriptions();
    const exportStr = formatEmbeddingForExport(embedding);
    
    const profileData = {
        embedding: exportStr,
        descriptionLevel1: descriptions.level1?.text || '',
        descriptionLevel2: descriptions.level2?.text || '',
        userGender: userProfile.userGender,
        userAge: userProfile.userAge,
        targetGender: userProfile.targetGender,
        targetAgeMin: userProfile.targetAgeMin,
        targetAgeMax: userProfile.targetAgeMax
    };
    
    try {
        await saveProfileToFirebase(profileData);
        if (!isSilent) alert('✅ Анкета опубликована/обновлена!');
        
        // Перерисовываем UI, чтобы обновилась кнопка
        const container = document.getElementById('datingContent');
        if (container && datingState.activeTab === 'profile') {
            checkDatingEligibility();
        }
    } catch (e) {
        if (!isSilent) alert('Ошибка публикации. Убедитесь, что Firebase инициализирован.');
    }
}

// ==================== FILTER PROFILES ====================
function filterProfiles(profiles, userProfile) {
    if (!userProfile.userGender || !userProfile.targetGender) return [];
    const targetGenders = userProfile.targetGender;
    const targetAgeMin = userProfile.targetAgeMin;
    const targetAgeMax = userProfile.targetAgeMax;
    const userGender = userProfile.userGender;
    
    return profiles.filter(profile => {
        // Пол кандидата должен быть в targetGender пользователя (или unspecified)
        if (!targetGenders.includes(profile.userGender) && !targetGenders.includes('unspecified')) {
            if (profile.userGender !== 'unspecified') return false;
        }
        // Возраст кандидата в диапазоне
        if (profile.userAge < targetAgeMin || profile.userAge > targetAgeMax) return false;
        // Пол пользователя должен быть в targetGender кандидата (или unspecified у кандидата)
        if (!profile.targetGender.includes(userGender) && !profile.targetGender.includes('unspecified')) {
            if (userGender !== 'unspecified') return false;
        }
        return true;
    });
}

function renderCandidateSearchCard(profile, tier) {
    const genderIcon = profile.userGender === 'male' ? '♂' : profile.userGender === 'female' ? '♀' : '◇';
    const genderText = profile.userGender === 'male'
        ? 'Мужчина'
        : profile.userGender === 'female'
            ? 'Женщина'
            : 'Пол не указан';
    const ageText = profile.userAge ? `${profile.userAge} лет` : 'возраст не указан';
    const description = profile.descriptionLevel1?.trim()
        ? profile.descriptionLevel1.trim()
        : 'Публичное описание пока не заполнено.';
    const safeDescription = typeof escapeHtml === 'function'
        ? escapeHtml(description)
        : description.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

    return `
        <article class="candidate-card candidate-card-${tier}">
            <div class="candidate-card-main">
                <div class="candidate-avatar" aria-hidden="true">${genderIcon}</div>
                <div class="candidate-info">
                    <div class="candidate-meta-row">
                        <span class="candidate-meta-primary">${genderText}, ${ageText}</span>
                        <span class="candidate-match-badge">${profile.matchCount} совп.</span>
                    </div>
                    <p class="candidate-description">${safeDescription}</p>
                </div>
            </div>
            <button class="dating-btn candidate-analyze-btn" onclick="openCompatibilityWithProfile('${profile.id}')">
                📊 Открыть анализ
            </button>
        </article>`;
}

function renderCandidateGroup(title, profiles, tier) {
    if (!profiles.length) return '';
    return `
        <section class="candidate-group candidate-group-${tier}">
            <h4>${title}</h4>
            <div class="candidate-list">
                ${profiles.map(profile => renderCandidateSearchCard(profile, tier)).join('')}
            </div>
        </section>`;
}

// ==================== REFRESH CANDIDATES ====================
async function refreshCandidateList() {
    const container = document.getElementById('datingContent');
    if (!container) return;
    
    const userProfile = getUserProfile();
    if (!isProfileComplete()) {
        container.innerHTML = `<div class="dating-status dating-not-ready">
            <div class="dating-icon">⚠️</div>
            <h3>Сначала заполните анкетные данные</h3>
            <p>Перейдите во вкладку "Мой профиль" и укажите свой пол, возраст и кого ищете.</p>
        </div>`;
        return;
    }
    
    container.innerHTML = `<div class="dating-loading"><div class="dating-spinner"></div><p>Загрузка анкет...</p></div>`;
    
    try {
        const allProfiles = await getAllProfilesFromFirebase();
        const filtered = filterProfiles(allProfiles, userProfile);
        
        const myEmbedding = getSavedEmbedding();
        const myIdeal = getSavedIdeal();
        
        const scored = filtered.map(profile => {
            let matchCount = 0;
            if (myIdeal && myIdeal.searchScales && profile.embedding) {
                const candidateEmbed = parseEmbeddingFromExport(profile.embedding);
                if (candidateEmbed && candidateEmbed.vectors) {
                    for (const scaleId of myIdeal.searchScales.high) {
                        const idx = scaleId - 1;
                        const val = candidateEmbed.vectors[idx]?.value || 0.5;
                        if (val >= 0.7) matchCount++;
                    }
                    for (const scaleId of myIdeal.searchScales.low) {
                        const idx = scaleId - 1;
                        const val = candidateEmbed.vectors[idx]?.value || 0.5;
                        if (val <= 0.5) matchCount++;
                    }
                }
            }
            return { ...profile, matchCount };
        });
        
        window.lastProfiles = scored;
        
        const high = scored.filter(p => p.matchCount >= 7);
        const medium = scored.filter(p => p.matchCount >= 4 && p.matchCount < 7);
        const low = scored.filter(p => p.matchCount < 4);
        
        let html = `
            <div class="compat-container candidate-search-results">
                <div class="candidate-search-header">
                    <div>
                        <h3>📋 Найдено анкет: ${scored.length}</h3>
                        <p>Сортировка основана на шкалах из вкладки «Кто мне нужен». Откройте кандидата, чтобы выбрать конкретный режим отчёта.</p>
                    </div>
                    <button class="dating-btn dating-btn-details" onclick="refreshCandidateList()">🔄 Обновить</button>
                </div>
                ${renderCandidateGroup('🔥 Сильное совпадение', high, 'high')}
                ${renderCandidateGroup('🟡 Компромисс', medium, 'medium')}
                ${renderCandidateGroup('⚪ Низкое совпадение', low, 'low')}
                ${scored.length === 0 ? `
                    <div class="candidate-empty-state">
                        <div class="dating-icon">🛰️</div>
                        <h3>Пока нет подходящих анкет</h3>
                        <p>Опубликуйте свою анкету или попробуйте обновить список позже.</p>
                    </div>` : ''}
            </div>`;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div class="dating-status dating-error"><div class="dating-icon">❌</div><p>Ошибка: ${e.message}</p><button class="dating-btn" onclick="refreshCandidateList()">🔄 Повторить</button></div>`;
    }
}

// Открыть вкладку совместимости с данными выбранного профиля
function openCompatibilityWithProfile(profileId) {
    const profile = window.lastProfiles?.find(p => p.id === profileId);
    if (!profile) {
        alert('Профиль не найден');
        return;
    }
    
    window.currentCompatibilityProfileId = profileId;
    window.currentCompatibilityProfileData = profile || null;
    
    // ДОБАВИТЬ ЭТО: Для корректной работы кнопки "Написать"
    window.currentCandidateId = profileId;
    window.currentCandidateEmbed = profile.embedding;
    
    // Показываем вкладку совместимости
    const compatBtn = document.getElementById('compatTabBtn');
    if (compatBtn) compatBtn.style.display = 'block';
    
    // Переключаем таб на совместимость
    switchDatingTab('compatibility');
    
    // Ждём рендеринга вкладки
    setTimeout(() => {
        const embedInput = document.getElementById('candidateEmbeddingInput');
        const descInput = document.getElementById('candidateDescriptionInput');
        
        if (embedInput && profile.embedding) {
            embedInput.value = profile.embedding;
            // Запускаем валидацию, чтобы кнопки разблокировались
            if (typeof validateCandidateInput === 'function') {
                validateCandidateInput();
            }
        }
        
        if (descInput) {
            if (profile.descriptionLevel1 && profile.descriptionLevel1.trim()) {
                descInput.value = profile.descriptionLevel1;
            } else {
                // Формируем описание из пола и возраста
                let genderText = '';
                if (profile.userGender === 'male') genderText = 'Мужчина';
                else if (profile.userGender === 'female') genderText = 'Женщина';
                else genderText = 'Пол не указан';
                descInput.value = `${genderText}, ${profile.userAge} лет.`;
            }
        }
    }, 150);
}

// ==================== COMPATIBILITY TAB RENDER ====================

function renderCompatibilityTab() {
    const container = document.getElementById('datingContent');
    if (!container) return;

    const savedEmbedding = getSavedEmbedding();

    if (!savedEmbedding) {
        container.innerHTML = `
            <div class="dating-status dating-not-ready">
                <div class="dating-icon">🔒</div>
                <h3>Сначала создайте свой профиль</h3>
                <p>Перейдите во вкладку "Мой профиль" и создайте личностный эмбеддинг.</p>
                <button class="dating-btn dating-btn-details" onclick="switchDatingTab('profile')">← Мой профиль</button>
            </div>`;
        return;
    }

    const savedIdeal = getSavedIdeal();
    const hasIdeal = savedIdeal && savedIdeal.searchScales;

    container.innerHTML = `
        <div class="compat-container compat-redesign">
            <section class="compat-intro">
                <div class="dating-icon" aria-hidden="true">🧲</div>
                <div>
                    <h3>Анализ кандидата</h3>
                    <p>Вставьте эмбеддинг кандидата, добавьте описание при необходимости и выберите один из четырёх режимов отчёта.</p>
                </div>
                <div class="compat-mode-summary" aria-label="Режимы анализа">
                    <span>🧠 глубокий</span>
                    <span>⚡ быстрый</span>
                    <span>💞 взаимность</span>
                    <span>❓ свой вопрос</span>
                </div>
            </section>

            <section class="compat-panel compat-panel-required">
                <label class="compat-label" for="candidateEmbeddingInput">
                    <span class="label-icon">🧬</span>
                    <span>Эмбеддинг кандидата</span>
                    <span class="label-required">обязательно</span>
                </label>
                <input
                    type="text"
                    id="candidateEmbeddingInput"
                    class="compat-embedding-input"
                    placeholder="DATING_EMBED_V2|... или DATING_EMBED_V3|..."
                    oninput="validateCandidateInput()"
                >
                <div class="compat-input-status" id="embedStatus"></div>
            </section>

            <section class="compat-panel">
                <label class="compat-label" for="candidateDescriptionInput">
                    <span class="label-icon">✍️</span>
                    <span>Описание кандидата</span>
                    <span class="label-optional">необязательно</span>
                </label>
                <textarea
                    id="candidateDescriptionInput"
                    class="compat-description-input"
                    placeholder="Короткое описание, возраст, пол, важный контекст или самопрезентация кандидата..."
                    rows="4"
                ></textarea>
            </section>

            <section class="compat-panel compat-profile-toggle">
                <label class="compat-toggle-label">
                    <input type="checkbox" id="compatProfileMode" onchange="onCompatProfileModeChange()">
                    <span class="compat-toggle-slider"></span>
                    <span class="compat-toggle-text">
                        <span class="toggle-title">Учитывать анкетный профиль в 1–3 отчётах</span>
                        <span class="toggle-desc">Для глубокого, быстрого и взаимного анализа: пол, возраст и описание меняют трактовку шкал. 4-й отчёт использует только данные кандидата.</span>
                    </span>
                </label>
                <div class="compat-profile-preview" id="compatProfilePreview" style="display: none;"></div>
            </section>

            <section class="compat-panel compat-question-block">
                <label class="compat-label" for="candidateQuestionInput">
                    <span class="label-icon">❓</span>
                    <span>Свой вопрос о кандидате</span>
                    <span class="label-optional">4-й отчёт</span>
                </label>
                <textarea
                    id="candidateQuestionInput"
                    class="compat-description-input compat-question-input"
                    placeholder="Например: насколько ему/ей можно доверять? как человек будет вести себя в конфликте? где скрытый риск?"
                    rows="2"
                    oninput="validateCandidateInput()"
                ></textarea>
                <div class="compat-option-row">
                    <label class="compat-mini-toggle">
                        <input type="checkbox" id="candidateQuestionUseDescription" checked>
                        <span>Учитывать описание кандидата</span>
                    </label>
                    <label class="compat-mini-toggle">
                        <input type="checkbox" id="candidateQuestionIncludeMedium">
                        <span>Добавить среднюю достоверность</span>
                    </label>
                </div>
                <div class="compat-data-note">По умолчанию используются только высокодостоверные шкалы кандидата. Средние включаются вручную, низкодостоверные не отправляются никогда. Данные владельца аккаунта и V3-требования здесь игнорируются.</div>
            </section>

            <div class="compat-buttons-grid" aria-label="Выбор отчёта">
                <button class="dating-generate-btn compat-btn" id="analyzeBtn" onclick="showPrivacyDisclaimer(() => runCompatibilityAnalysis())" disabled>
                    <span class="compat-btn-title">🧠 Глубокий разбор</span>
                    <span class="compat-btn-subtitle">Контекст пользователя + кандидат</span>
                </button>
                <button class="dating-generate-btn compat-btn compat-light-btn" id="analyzeLightBtn" onclick="showPrivacyDisclaimer(() => runLightCompatibilityAnalysis())" disabled ${!hasIdeal ? 'title="Сначала определите идеал во вкладке 💫"' : ''}>
                    <span class="compat-btn-title">⚡ Быстрый чек</span>
                    <span class="compat-btn-subtitle">Сверка с вашим идеалом</span>
                </button>
                <button class="dating-generate-btn compat-btn compat-mutual-btn" id="analyzeMutualBtn" onclick="showPrivacyDisclaimer(() => runMutualAnalysis())" disabled title="Нужен эмбеддинг V3 у обоих">
                    <span class="compat-btn-title">💞 Взаимность</span>
                    <span class="compat-btn-subtitle">Обе стороны + динамика</span>
                </button>
                <button class="dating-generate-btn compat-btn compat-question-btn" id="analyzeQuestionBtn" onclick="showPrivacyDisclaimer(() => runCandidateQuestionAnalysis())" disabled title="Задайте вопрос выше">
                    <span class="compat-btn-title">❓ Ответить на вопрос</span>
                    <span class="compat-btn-subtitle">Только шкалы кандидата</span>
                </button>
            </div>

            <div id="mutualHint" class="compat-light-hint" style="display:none">
                ℹ️ Для анализа «Взаимность» оба профиля должны быть формата V3 (создаётся автоматически, если заполнена вкладка «💫 Кто мне нужен»).
            </div>

            ${!hasIdeal ? '<p class="compat-light-hint">⚡ Быстрый чек и 💞 Взаимность доступны после заполнения вкладки "💫 Кто мне нужен?"</p>' : ''}

            <div class="compat-result" id="compatResult"></div>
        </div>`;
}

// ==================== PROFILE MODE HELPERS ====================

function isCompatProfileMode() {
    const cb = document.getElementById('compatProfileMode');
    return cb ? cb.checked : false;
}

function onCompatProfileModeChange() {
    const preview = document.getElementById('compatProfilePreview');
    if (!preview) return;

    if (isCompatProfileMode()) {
        const info = getCompatProfileInfo();
        preview.style.display = 'block';
        preview.innerHTML = info.html;
    } else {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

function getCompatProfileInfo() {
    // Данные юзера
    const userProfile = getUserProfile();
    const userGenderText = formatGenderText(userProfile.userGender);
    const userAge = userProfile.userAge || '?';

    // Данные кандидата из эмбеддинга и полей формы
    const embedInput = document.getElementById('candidateEmbeddingInput');
    const embedStr = embedInput?.value?.trim() || '';

    let candidateGender = '?';
    let candidateAge = '?';
    let candidateFromFirebase = false;

    // Пробуем получить из Firebase данных (если кандидат из списка)
    if (window.currentCompatibilityProfileData) {
        const p = window.currentCompatibilityProfileData;
        if (p.userGender) candidateGender = formatGenderText(p.userGender);
        if (p.userAge) candidateAge = p.userAge;
        candidateFromFirebase = true;
    }

    // Если нет данных из Firebase, пробуем из описания
    const descInput = document.getElementById('candidateDescriptionInput');
    const desc = descInput?.value?.trim() || '';

    let html = `
        <div class="profile-preview-grid">
            <div class="profile-preview-col">
                <div class="profile-preview-title">🧑 Вы:</div>
                <div class="profile-preview-value">${userGenderText}, ${userAge} лет</div>
            </div>
            <div class="profile-preview-col">
                <div class="profile-preview-title">👤 Кандидат:</div>
                <div class="profile-preview-value">${candidateGender}, ${candidateAge} лет</div>
                ${!candidateFromFirebase && candidateGender === '?' ? '<div class="profile-preview-hint">Пол/возраст не определены — укажите в описании</div>' : ''}
            </div>
        </div>
    `;

    return {
        html,
        userGender: userProfile.userGender,
        userAge: userAge,
        candidateGender: candidateFromFirebase ? window.currentCompatibilityProfileData.userGender : null,
        candidateAge: candidateFromFirebase ? window.currentCompatibilityProfileData.userAge : null,
        candidateDescription: desc
    };
}

function formatGenderText(gender) {
    const map = {
        male: 'Мужчина',
        female: 'Женщина',
        unspecified: 'Не указан'
    };
    return map[gender] || '?';
}

function buildProfileContextBlock() {
    const info = getCompatProfileInfo();

    let block = '\n=== ПРОФИЛИ УЧАСТНИКОВ (ОБЯЗАТЕЛЬНО УЧИТЫВАТЬ!) ===\n';
    block += `\n👤 ПОЛЬЗОВАТЕЛЬ: ${formatGenderText(info.userGender)}, ${info.userAge} лет`;
    block += `\n👤 КАНДИДАТ: ${info.candidateGender ? formatGenderText(info.candidateGender) : 'пол неизвестен'}, ${info.candidateAge || 'возраст неизвестен'} лет`;

    if (info.candidateDescription) {
        block += `\n\n📝 ОПИСАНИЕ КАНДИДАТА:\n${info.candidateDescription}`;
    }

    block += `\n
⚠️ КРИТИЧЕСКИ ВАЖНЫЕ ИНСТРУКЦИИ:
1. Пол и возраст РАДИКАЛЬНО меняют интерпретацию шкал:
   - Высокая эмпатия у мужчины и у женщины — разные социальные контексты
   - Амбициозность в 22 и в 48 — совершенно разные жизненные стадии
   - Спонтанность в 25 — свобода, в 50 — возможно кризис или второе дыхание
   - Потребность в одиночестве у интроверта-мужчины и экстраверта-женщины — разные причины

2. Учитывай ВОЗРАСТНУЮ ДИНАМИКУ:
   - Разница в возрасте влияет на баланс сил, жизненные приоритеты, энергию
   - Одинаковые шкалы при разном возрасте = разный жизненный опыт за ними
   - Ценности в 20 лет ещё формируются, в 40 — уже проверены жизнью

3. Учитывай ГЕНДЕРНУЮ СПЕЦИФИКУ:
   - Не стереотипы, а статистические различия в социализации
   - Как общество воспринимает эту черту у этого пола
   - Как это влияет на динамику КОНКРЕТНОЙ пары (М+Ж, М+М, Ж+Ж)

4. Если есть ОПИСАНИЕ кандидата — это ЖИВЫЕ данные, они важнее абстрактных шкал:
   - Используй описание для конкретизации числовых данных
   - Ищи подтверждения или противоречия между описанием и шкалами
   - Описание даёт контекст, который шкалы не улавливают
`;

    return block;
}

// ==================== УСИЛЕННЫЕ ПРОМПТЫ ====================

function buildCompatibilityPromptEnhanced(data) {
    const {
        userFacts, userTraits, userTimeline, userSocial,
        userHypotheses, userStyle, candidateProfile, candidateDescription
    } = data;

    const langName = getLanguageName();
    const profileBlock = buildProfileContextBlock();

    let candidateBlock = `=== ПСИХОЛОГИЧЕСКИЙ ПРОФИЛЬ КАНДИДАТА (50 шкал) ===\n${candidateProfile}`;

    let styleBlock = '';
    if (userStyle && userStyle.trim()) {
        styleBlock = `\n\n=== СТИЛЬ ОБЩЕНИЯ С ЭТИМ ПОЛЬЗОВАТЕЛЕМ ===\nАдаптируй стиль анализа под этого пользователя:\n${userStyle}`;
    }

    return `Ты — проницательный аналитик отношений. Пиши на ${langName}.
${styleBlock}
${profileBlock}

=== ЗАДАЧА ===
Проанализируй совместимость пользователя с кандидатом.

ВАЖНО:
- О пользователе ты знаешь ВСЁ из его данных — используй их
- О кандидате знаешь эмбеддинг (50 шкал), пол, возраст и возможно описание
- Каждая шкала: 0 = абсолютно не выражено, 1.0 = крайне ярко выражено
- Отклонение 0.05 — очень точная оценка, 0.15 — умеренная, 0.25 — неточная
- И НИЗКИЕ значения важны: 0.4 тревожности = весьма спокойный человек
- НЕ используй эмбеддинг пользователя — у тебя есть живые данные о нём
- Пиши ДЛЯ пользователя

=== ВСЁ О ПОЛЬЗОВАТЕЛЕ ===

**Факты:** ${userFacts || '(нет)'}
**Черты:** ${userTraits || '(нет)'}
**Хронология:** ${userTimeline || '(нет)'}
**Социальные связи:** ${userSocial || '(нет)'}
**Гипотезы:** ${userHypotheses || '(нет)'}

${candidateBlock}

=== СТРУКТУРА АНАЛИЗА ===

1. **Суть** (2-3 предложения) — кто этот кандидат С УЧЁТОМ его пола и возраста. Как эти шкалы выглядят в человеке именно этого пола и возраста?
2. **Где совпадёте** (3-4 пункта) — учитывай, что совпадение шкал может означать разное для людей разного пола/возраста
3. **Где будет тереть** (3-4 пункта) — гендерная и возрастная динамика может усиливать или смягчать трения
3.5 **Интересные комбинации** шкал с учётом того, как они проявляются у людей этого типа
4. **Главное** (1-2 предложения)

=== ПРАВИЛА ===
- Используй валидную конкретику из жизни пользователя
- не используй таблицы. отаечац лишь обычным текстом
- ОБЯЗАТЕЛЬНО учитывай пол и возраст обоих участников при интерпретации КАЖДОЙ шкалы
- Если описание кандидата есть — опирайся на него как на первичный источник, шкалы — как уточнение
- Если у шкалы кандидата большое отклонение (>0.20) — не считай её твёрдым фактом
- Пиши как умный друг, адаптируй стиль под пользователя`;
}

function buildLightCompatibilityPromptEnhanced(report, candidateDescription, expectations) {
    const langName = getLanguageName();
    const userStyle = localStorage.getItem(STORAGE_KEYS.style) || '';
    const profileBlock = buildProfileContextBlock();

    let styleBlock = '';
    if (userStyle && userStyle.trim()) {
        styleBlock = `\n=== СТИЛЬ ОБЩЕНИЯ ===\nАдаптируй стиль под пользователя:\n${userStyle}\n`;
    }

    const matchSection = formatMatchReportDetailed(report);

    let userContext = '';
    if (report.userHighlights.length > 0 || report.userLowlights.length > 0) {
        userContext = '\n=== КЛЮЧЕВЫЕ ЧЕРТЫ ПОЛЬЗОВАТЕЛЯ ===\n';
        if (report.userHighlights.length > 0) {
            userContext += '🔥 Высокие: ' + report.userHighlights.map(e => `${e.emoji} ${e.name} ${e.percent}`).join(', ') + '\n';
        }
        if (report.userLowlights.length > 0) {
            userContext += '🧊 Низкие: ' + report.userLowlights.map(e => `${e.emoji} ${e.name} ${e.percent}`).join(', ') + '\n';
        }
    }

    const totalExpected =
        report.matchedHigh.length + report.failedHigh.length + report.uncertainHigh.length +
        report.matchedLow.length + report.failedLow.length + report.uncertainLow.length;
    const totalMatched = report.matchedHigh.length + report.matchedLow.length;
    const totalUncertain = report.uncertainHigh.length + report.uncertainLow.length;

    return `Ты — аналитик совместимости. Пиши на ${langName}.
${styleBlock}
${profileBlock}

=== ЗАДАЧА ===
Быстрый анализ совместимости на основе ожиданий пользователя и проверки кандидата.

=== ОЖИДАНИЯ ПОЛЬЗОВАТЕЛЯ ОТ ПАРТНЁРА ===
${expectations}

=== РЕЗУЛЬТАТ ПРОВЕРКИ КАНДИДАТА ===
Надёжно совпало: ${totalMatched}
Неопределённых: ${totalUncertain}
Всего проверенных: ${totalExpected}

${matchSection}
${userContext}

=== СТРУКТУРА ОТВЕТА ===
1. **Счёт** — общее впечатление С УЧЁТОМ пола/возраста обоих
2. **Где повезло** — как совпадения проявятся у людей именно этого пола и возраста
3. **Цена компромисса** — как несовпадения будут ощущаться с учётом гендерной и возрастной динамики
4. **Что нельзя утверждать** — размытые шкалы
5. **Вердикт** — с учётом всего контекста

=== ПРАВИЛА ===
- КАЖДОЕ совпадение и несовпадение интерпретируй через призму пола и возраста
- Описание кандидата (если есть) важнее абстрактных шкал
- не используй таьлицы! отвечай лишь оьвчным текстом.
- Пиши коротко, но с пониманием контекста`;
}

function buildMutualDynamicsPromptEnhanced(data) {
    const langName = getLanguageName();
    const userStyle = localStorage.getItem(STORAGE_KEYS.style) || '';
    const profileBlock = buildProfileContextBlock();

    let styleBlock = '';
    if (userStyle && userStyle.trim()) {
        styleBlock = `\n=== СТИЛЬ ОБЩЕНИЯ ===\nАдаптируй тон анализа под пользователя:\n${userStyle}\n`;
    }

    const reverseDetailed = formatMatchReportDetailed(data.reverseReport);

    let dynamicsContext = '';
    if (data.directReport.userHighlights.length > 0 || data.directReport.userLowlights.length > 0) {
        dynamicsContext += '\n--- Ключевые черты ПОЛЬЗОВАТЕЛЯ ---\n';
        if (data.directReport.userHighlights.length > 0) {
            dynamicsContext += '🔥 Высокие: ' + data.directReport.userHighlights.map(e => `${e.emoji} ${e.name} ${e.percent}`).join(', ') + '\n';
        }
        if (data.directReport.userLowlights.length > 0) {
            dynamicsContext += '🧊 Низкие: ' + data.directReport.userLowlights.map(e => `${e.emoji} ${e.name} ${e.percent}`).join(', ') + '\n';
        }
    }
    if (data.reverseReport.userHighlights.length > 0 || data.reverseReport.userLowlights.length > 0) {
        dynamicsContext += '\n--- Ключевые черты КАНДИДАТА ---\n';
        if (data.reverseReport.userHighlights.length > 0) {
            dynamicsContext += '🔥 Высокие: ' + data.reverseReport.userHighlights.map(e => `${e.emoji} ${e.name} ${e.percent}`).join(', ') + '\n';
        }
        if (data.reverseReport.userLowlights.length > 0) {
            dynamicsContext += '🧊 Низкие: ' + data.reverseReport.userLowlights.map(e => `${e.emoji} ${e.name} ${e.percent}`).join(', ') + '\n';
        }
    }

    return `Ты — эксперт по динамике отношений. Пиши на ${langName}.
${styleBlock}
${profileBlock}

=== КОНТЕКСТ ===

**Что пользователь ищет в партнёре:**
"${data.userIdealText}"

=== ДАННЫЕ СОВМЕСТИМОСТИ ===

**1. Как КАНДИДАТ подходит пользователю (→):**
${data.directSummary}

**2. Как ПОЛЬЗОВАТЕЛЬ подходит кандидату (←):**
${data.reverseSummary}

**Детальный разбор обратного мэтча:**
${reverseDetailed}

${dynamicsContext}

=== ЗАДАЧА ===

Три части. Каждая — с ОБЯЗАТЕЛЬНЫМ учётом пола и возраста обоих.

---

**Часть 1: Зачем он/она вам (кратко)**
2-3 предложения. Как кандидат ЭТОГО пола и возраста закрывает ваши потребности?

---

**Часть 2: Зачем вы ему/ей (ГЛАВНАЯ ЧАСТЬ)**
- В чём вы станете подарком для человека ЭТОГО типа?
- Где можете разочаровать — с учётом гендерных ожиданий?
- Асимметрия: кто вкладывает больше?
- Вердикт взаимности

---

**Часть 3: Динамика (Прогноз)**

🗓 **Первые 2 недели:**
- Что зацепит? Учитывай: мужчина/женщина в этом возрасте ищут разное в первые дни
- Какие шкалы создадут магнетизм?

🗓 **Через полгода:**
- Какие Failed-шкалы вылезут? Как пол и возраст усилят или смягчат это?
- 1-2 конкретных сценария конфликта

🗓 **Через 3 года:**
- На чём будет держаться союз людей ЭТОГО типа?
- Главный риск на длинной дистанции с учётом возрастной динамики

---

**Итог:** Метафора + главный совет.

=== ПРАВИЛА ===
- не создавай таблицы! отвечай лишь обычным текстом!
- Пол и возраст должны ЯВНО влиять на каждый тезис
- Описание кандидата — первичный источник, шкалы — уточнение
- О кандидате не додумывай сверх данных
- Выбирай ключевые шкалы, не перечисляй все
- Часть 2 — самая подробная`;
}

// ==================== ФУНКЦИИ АНАЛИЗА ====================

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
    window.currentCandidateDescription = candidateDescription;

    const profileMode = isCompatProfileMode();

    datingState.isAnalyzing = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Анализирую...';

    resultContainer.innerHTML = `
        <div class="compat-loading">
            <div class="dating-spinner"></div>
            <p>${profileMode ? 'Глубокий анализ с учётом профилей...' : 'Изучаю совместимость...'}</p>
        </div>`;

    try {
        const userFacts = getFactsForPrompt(false);
        const userTraits = getTraitsForPrompt(false);
        const userTimeline = getTimelineForPrompt();
        const userSocial = getSocialForPrompt();
        const userHypotheses = getHypothesesForPrompt(false);
        const userStyle = localStorage.getItem(STORAGE_KEYS.style) || '';
        const candidateProfile = decodeCandidateEmbedding(candidateEmbedding);

        const promptData = {
            userFacts, userTraits, userTimeline, userSocial,
            userHypotheses, userStyle, candidateProfile, candidateDescription
        };

        const prompt = buildCompatibilityPromptEnhanced(promptData);

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

        appendCompatibilityActions(resultContainer);

    } catch (error) {
        resultContainer.innerHTML = `
            <div class="compat-error">
                <p>❌ Ошибка: ${error.message}</p>
                <button class="dating-btn" onclick="runCompatibilityAnalysis()">🔄 Попробовать снова</button>
            </div>`;
    } finally {
        datingState.isAnalyzing = false;
        btn.disabled = false;
        btn.innerHTML = '🧠 Глубокий разбор';
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
    const profileMode = isCompatProfileMode();

    datingState.isAnalyzing = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Анализирую...';

    resultContainer.innerHTML = `
        <div class="compat-loading">
            <div class="dating-spinner"></div>
            <p>${profileMode ? 'Быстрый чек с учётом профилей...' : 'Быстрый анализ...'}</p>
        </div>`;

    try {
        const matchReport = buildMatchReport(userEmbedding, candidateEmbedding, ideal);

        const prompt = buildLightCompatibilityPromptEnhanced(matchReport, candidateDescription, ideal.expectations);

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
        resultContainer.innerHTML = `
            <div class="compat-error">
                <p>❌ Ошибка: ${error.message}</p>
                <button class="dating-btn" onclick="runLightCompatibilityAnalysis()">🔄 Попробовать снова</button>
            </div>`;
    } finally {
        datingState.isAnalyzing = false;
        btn.disabled = false;
        btn.innerHTML = '⚡ Быстрый чек';
    }
}


async function runCandidateQuestionAnalysis() {
    if (datingState.isAnalyzing) return;

    const embedInput = document.getElementById('candidateEmbeddingInput');
    const descInput = document.getElementById('candidateDescriptionInput');
    const questionInput = document.getElementById('candidateQuestionInput');
    const useDescriptionInput = document.getElementById('candidateQuestionUseDescription');
    const includeMediumInput = document.getElementById('candidateQuestionIncludeMedium');
    const resultContainer = document.getElementById('compatResult');
    const btn = document.getElementById('analyzeQuestionBtn');

    if (!embedInput || !questionInput || !resultContainer || !btn) return;

    const candidateEmbedding = parseEmbeddingFromExport(embedInput.value.trim());
    if (!candidateEmbedding) return;
    if (!candidateEmbedding.vectors || candidateEmbedding.vectors.length !== TOTAL_SCALES) {
        alert('Для этого отчёта нужен эмбеддинг кандидата V2/V3 с 50 шкалами. Старый формат V1 не подходит.');
        return;
    }

    const question = questionInput.value.trim();
    if (!question) {
        alert('Введите свой вопрос о кандидате');
        questionInput.focus();
        return;
    }

    const candidateDescription = descInput?.value?.trim() || '';
    const useDescription = !!useDescriptionInput?.checked;
    const includeMediumReliability = !!includeMediumInput?.checked;

    datingState.isAnalyzing = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Думаю...';

    resultContainer.innerHTML = `
        <div class="compat-loading">
            <div class="dating-spinner"></div>
            <p>${includeMediumReliability ? 'Отвечаю по высоко- и среднедостоверным шкалам...' : 'Отвечаю только по высокодостоверным шкалам...'}</p>
        </div>`;

    try {
        const prompt = buildCandidateQuestionPrompt(
            candidateEmbedding,
            question,
            candidateDescription,
            useDescription,
            includeMediumReliability
        );

        const streamingDiv = document.createElement('div');
        streamingDiv.className = 'compat-analysis-text';
        resultContainer.innerHTML = '';
        resultContainer.appendChild(streamingDiv);

        await streamResponseOpenRouter(
            [{ role: "user", content: prompt }],
            (partialText) => { streamingDiv.innerHTML = formatMessageMarkdown(partialText); },
            (finalText) => { streamingDiv.innerHTML = formatMessageMarkdown(finalText); },
            { temperature: 0.55 }
        );

        appendCompatibilityActions(resultContainer);

    } catch (error) {
        resultContainer.innerHTML = `
            <div class="compat-error">
                <p>❌ Ошибка: ${error.message}</p>
                <button class="dating-btn" onclick="runCandidateQuestionAnalysis()">🔄 Попробовать снова</button>
            </div>`;
    } finally {
        datingState.isAnalyzing = false;
        btn.disabled = false;
        btn.innerHTML = '❓ Ответить на вопрос';
        validateCandidateInput();
    }
}

async function runMutualAnalysis() {
    if (datingState.isAnalyzing) return;

    const embedInput = document.getElementById('candidateEmbeddingInput');
    const descInput = document.getElementById('candidateDescriptionInput');
    const resultContainer = document.getElementById('compatResult');
    const btn = document.getElementById('analyzeMutualBtn');

    if (!embedInput || !resultContainer || !btn) return;

    const candidateEmbedding = parseEmbeddingFromExport(embedInput.value.trim());
    if (!candidateEmbedding || !candidateEmbedding.requirements) {
        alert('Ошибка: У кандидата нет требований (нужен V3 эмбеддинг)');
        return;
    }

    const userEmbedding = getSavedEmbedding();
    const userIdeal = getSavedIdeal();

    if (!userEmbedding || !userIdeal || !userIdeal.searchScales) {
        alert('Ошибка: Заполните свой профиль и вкладку «Кто мне нужен»');
        return;
    }

    const profileMode = isCompatProfileMode();

    datingState.isAnalyzing = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Прогнозирую...';

    resultContainer.innerHTML = `
        <div class="compat-loading">
            <div class="dating-spinner"></div>
            <p>${profileMode ? 'Моделирую динамику с учётом профилей...' : 'Моделирую динамику...'}</p>
        </div>`;

    try {
        const directMatchReport = buildMatchReport(userEmbedding, candidateEmbedding, userIdeal);
        const directSummary = summarizeMatchForPrompt(directMatchReport, 'direct');

        const candidateIdealFake = { searchScales: candidateEmbedding.requirements };
        const reverseMatchReport = buildMatchReport(candidateEmbedding, userEmbedding, candidateIdealFake);
        const reverseSummary = summarizeMatchForPrompt(reverseMatchReport, 'reverse');

        const candidateDescription = descInput?.value?.trim() || '';
        const userFacts = getFactsForPrompt(false);
        const userTraits = getTraitsForPrompt(false);

        const promptData = {
            userIdealText: userIdeal.expectations,
            directSummary, reverseSummary,
            directReport: directMatchReport,
            reverseReport: reverseMatchReport,
            candidateDescription, userFacts, userTraits
        };

        const prompt = buildMutualDynamicsPromptEnhanced(promptData);

        const streamingDiv = document.createElement('div');
        streamingDiv.className = 'compat-analysis-text';
        resultContainer.innerHTML = '';
        resultContainer.appendChild(streamingDiv);

        await streamResponseOpenRouter(
            [{ role: "user", content: prompt }],
            (partialText) => { streamingDiv.innerHTML = formatMessageMarkdown(partialText); },
            (finalText) => { streamingDiv.innerHTML = formatMessageMarkdown(finalText); },
            { temperature: 0.8 }
        );

    } catch (error) {
        resultContainer.innerHTML = `
            <div class="compat-error">
                <p>❌ Ошибка: ${error.message}</p>
                <button class="dating-btn" onclick="runMutualAnalysis()">🔄 Попробовать снова</button>
            </div>`;
    } finally {
        datingState.isAnalyzing = false;
        btn.disabled = false;
        btn.innerHTML = '💞 Взаимность и Динамика';
    }
}

// ==================== INIT ====================

console.log('[dating.js] v3.2 loaded. V2->V3 Autoflow + Silent Sync Patched + Full Code Maintained.');
