// dating.js - модуль знакомств для Memory Chatbot
// Генерация личностного эмбеддинга на основе 33 дихотомий
// + Двухуровневые описания профиля
// + Анализатор совместимости

// ==================== КОНСТАНТЫ ====================
const DATING_STORAGE_KEY = 'chatbot_dating_embedding';
const DATING_DESCRIPTIONS_KEY = 'chatbot_dating_descriptions';
const MIN_FACTS_REQUIRED = 50;
const EMBEDDING_PASSES = 3;

// 33 дихотомии личности
const DICHOTOMIES = [
    { id: 1, left: 'Воображение', right: 'Практичность' },
    { id: 2, left: 'Эстетика', right: 'Специализация' },
    { id: 3, left: 'Любопытство', right: 'Статус-кво' },
    { id: 4, left: 'Эмоц. сложность', right: 'Простота' },
    { id: 5, left: 'Дисциплина', right: 'Импульсивность' },
    { id: 6, left: 'Организованность', right: 'Хаос' },
    { id: 7, left: 'Надежность', right: 'Ненадежность' },
    { id: 8, left: 'Самоконтроль', right: 'Слабоволие' },
    { id: 9, left: 'Достижения', right: 'Комфорт' },
    { id: 10, left: 'Энергичность', right: 'Вялость' },
    { id: 11, left: 'Соц. смелость', right: 'Робость' },
    { id: 12, left: 'Уверенность', right: 'Самокритика' },
    { id: 13, left: 'Общительность', right: 'Замкнутость' },
    { id: 14, left: 'Доверие', right: 'Подозрительность' },
    { id: 15, left: 'Моральность', right: 'Гибкость' },
    { id: 16, left: 'Альтруизм', right: 'Эгоцентризм' },
    { id: 17, left: 'Сговорчивость', right: 'Конфликтность' },
    { id: 18, left: 'Скромность', right: 'Честолюбие' },
    { id: 19, left: 'Тревожность', right: 'Спокойствие' },
    { id: 20, left: 'Застенчивость', right: 'Раскованность' },
    { id: 21, left: 'Волатильность', right: 'Стабильность' },
    { id: 22, left: 'Уязвимость', right: 'Устойчивость' },
    { id: 23, left: 'Стресс-толерантность', right: 'Чувствительность' },
    { id: 24, left: 'Лидерство', right: 'Исполнительность' },
    { id: 25, left: 'Риск', right: 'Безопасность' },
    { id: 26, left: 'Свобода', right: 'Контроль' },
    { id: 27, left: 'Традиция', right: 'Прогресс' },
    { id: 28, left: 'Справедливость', right: 'Милосердие' },
    { id: 29, left: 'Лояльность', right: 'Универсализм' },
    { id: 30, left: 'Конкуренция', right: 'Кооперация' },
    { id: 31, left: 'Гедонизм', right: 'Аскетизм' },
    { id: 32, left: 'Оптимизм', right: 'Пессимизм' },
    { id: 33, left: 'Независимость', right: 'Зависимость' }
];

// ==================== СОСТОЯНИЕ ====================
let datingState = {
    isGenerating: false,
    currentPass: 0,
    passes: [],
    finalEmbedding: null,
    isGeneratingDescription: false,
    isAnalyzing: false,
    activeTab: 'profile' // 'profile' или 'compatibility'
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
    
    // Обновляем кнопки табов
    document.querySelectorAll('.dating-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    if (tab === 'profile') {
        checkDatingEligibility();
    } else if (tab === 'compatibility') {
        renderCompatibilityTab();
    }
}

// ==================== PROFILE TAB ====================

function checkDatingEligibility() {
    const container = document.getElementById('datingContent');
    if (!container) return;
    
    const factsData = getFactsData();
    const factsCount = factsData.facts ? factsData.facts.filter(f => !f.superseded).length : 0;
    
    console.log(`[Dating] Facts count: ${factsCount}/${MIN_FACTS_REQUIRED}`);
    
    const savedEmbedding = getSavedEmbedding();
    
    if (savedEmbedding) {
        renderSavedEmbedding(savedEmbedding);
    } else if (factsCount < MIN_FACTS_REQUIRED) {
        renderNotEnoughData(factsCount);
    } else {
        renderReadyToGenerate(factsCount);
    }
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
        </div>
    `;
}

function renderReadyToGenerate(factsCount) {
    const container = document.getElementById('datingContent');
    container.innerHTML = `
        <div class="dating-status dating-ready">
            <div class="dating-icon">✨</div>
            <h3>Готово к анализу!</h3>
            <p>Накоплено <strong>${factsCount} фактов</strong> о вас. Этого достаточно для создания личностного профиля.</p>
            <p class="dating-info">Анализ займёт около минуты. Будет выполнено 3 независимых прохода для повышения точности.</p>
            <button class="dating-generate-btn" onclick="startEmbeddingGeneration()">
                🧬 Создать мой профиль
            </button>
        </div>
    `;
}

function renderGeneratingState() {
    const container = document.getElementById('datingContent');
    container.innerHTML = `
        <div class="dating-status dating-generating">
            <div class="dating-spinner"></div>
            <h3>Анализ личности...</h3>
            <p class="dating-pass-info">Проход <span id="currentPassNum">${datingState.currentPass}</span> из ${EMBEDDING_PASSES}</p>
            <div class="dating-progress">
                <div class="dating-progress-bar" id="generationProgress" style="width: 0%"></div>
            </div>
            <p class="dating-hint">Анализируем ваши факты и черты личности по 33 измерениям...</p>
        </div>
    `;
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
    const descriptions = getSavedDescriptions();
    
    const createdDate = embedding.createdAt 
        ? new Date(embedding.createdAt).toLocaleDateString('ru-RU')
        : 'неизвестно';
    
    container.innerHTML = `
        <div class="dating-status dating-complete">
            <div class="dating-icon">🎯</div>
            <h3>Ваш личностный профиль</h3>
            <p class="dating-date">Создан: ${createdDate}</p>
            
            <div class="dating-top-traits">
                <h4>🏆 Ваши ключевые черты:</h4>
                ${topTraits.map(trait => renderTraitBar(trait)).join('')}
            </div>
            
            <div class="dating-actions">
                <button class="dating-btn dating-btn-copy" onclick="copyEmbeddingToClipboard()">
                    📋 Копировать профиль
                </button>
                <button class="dating-btn dating-btn-details" onclick="toggleFullEmbedding()">
                    📊 Все 33 измерения
                </button>
                <button class="dating-btn dating-btn-regenerate" onclick="confirmRegenerate()">
                    🔄 Пересоздать
                </button>
            </div>
            
            <div class="dating-full-embedding" id="fullEmbeddingView" style="display: none;">
                <h4>Полный профиль (33 дихотомии):</h4>
                <div class="dating-all-traits">
                    ${renderAllTraits(embedding)}
                </div>
            </div>
            
            <!-- Секция описаний -->
            <div class="dating-descriptions-section">
                <div class="dating-descriptions-header">
                    <h4>✍️ Описания профиля</h4>
                    <div class="dating-descriptions-info">
                        <span class="info-icon" title="Как это работает?">ℹ️</span>
                        <div class="info-tooltip">
                            <p><strong>🔒 Публичное описание</strong> — видят все пользователи. Анонимно, без личных деталей.</p>
                            <p><strong>🔓 Описание для мэтчей</strong> — видят только те, с кем произошёл взаимный интерес.</p>
                            <p>Вы можете редактировать оба описания и перегенерировать их сколько угодно раз.</p>
                        </div>
                    </div>
                </div>
                
                <!-- Публичное описание (Level 1) -->
                <div class="dating-description-block">
                    <div class="description-label">
                        <span class="label-icon">🔒</span>
                        <span class="label-text">Публичное описание</span>
                        <span class="label-hint">Видят все</span>
                    </div>
                    <div class="description-content">
                        <textarea 
                            id="descriptionLevel1" 
                            class="description-textarea"
                            placeholder="Нажмите 'Сгенерировать', чтобы создать анонимное описание..."
                            oninput="onDescriptionChange(1)"
                        >${descriptions.level1?.text || ''}</textarea>
                        <div class="description-actions">
                            <button class="desc-btn desc-btn-generate" onclick="generateDescription(1)" id="genBtn1">
                                ✨ Сгенерировать
                            </button>
                            <label class="desc-checkbox">
                                <input type="checkbox" id="enableLevel1" 
                                    ${descriptions.level1?.enabled ? 'checked' : ''} 
                                    onchange="toggleDescriptionEnabled(1)">
                                <span>Применить</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Описание для мэтчей (Level 2) -->
                <div class="dating-description-block">
                    <div class="description-label">
                        <span class="label-icon">🔓</span>
                        <span class="label-text">Описание для мэтчей</span>
                        <span class="label-hint">Видят после взаимного интереса</span>
                    </div>
                    <div class="description-content">
                        <textarea 
                            id="descriptionLevel2" 
                            class="description-textarea"
                            placeholder="Нажмите 'Сгенерировать', чтобы создать расширенное описание..."
                            oninput="onDescriptionChange(2)"
                        >${descriptions.level2?.text || ''}</textarea>
                        <div class="description-actions">
                            <button class="desc-btn desc-btn-generate" onclick="generateDescription(2)" id="genBtn2">
                                ✨ Сгенерировать
                            </button>
                            <label class="desc-checkbox">
                                <input type="checkbox" id="enableLevel2" 
                                    ${descriptions.level2?.enabled ? 'checked' : ''} 
                                    onchange="toggleDescriptionEnabled(2)">
                                <span>Применить</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="dating-prototype-note">
                    <span>🚧</span>
                    <p>Это прототип. Логика мэтчей и показа профилей другим пользователям будет добавлена позже. Пока вы можете подготовить свои описания.</p>
                </div>
            </div>
        </div>
    `;
}

// ==================== COMPATIBILITY TAB ====================

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
                <button class="dating-btn dating-btn-details" onclick="switchDatingTab('profile')">
                    ← Мой профиль
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="compat-container">
            <div class="compat-intro">
                <div class="dating-icon">🧲</div>
                <h3>Анализ совместимости</h3>
                <p>Вставьте эмбеддинг другого человека, чтобы узнать вашу совместимость. Можете также добавить его описание для более глубокого анализа.</p>
            </div>
            
            <!-- Поле для эмбеддинга -->
            <div class="compat-input-block">
                <label class="compat-label">
                    <span class="label-icon">🧬</span>
                    <span>Эмбеддинг кандидата</span>
                    <span class="label-required">*</span>
                </label>
                <input 
                    type="text" 
                    id="candidateEmbeddingInput" 
                    class="compat-embedding-input"
                    placeholder="DATING_EMBED_V1|..."
                    oninput="validateCandidateInput()"
                >
                <div class="compat-input-status" id="embedStatus"></div>
            </div>
            
            <!-- Поле для описания -->
            <div class="compat-input-block">
                <label class="compat-label">
                    <span class="label-icon">✍️</span>
                    <span>Описание кандидата</span>
                    <span class="label-optional">необязательно</span>
                </label>
                <textarea 
                    id="candidateDescriptionInput" 
                    class="compat-description-input"
                    placeholder="Любая информация о человеке: его описание профиля, что вы знаете о нём..."
                    rows="4"
                ></textarea>
            </div>
            
            <!-- Кнопка анализа -->
            <button class="dating-generate-btn compat-analyze-btn" id="analyzeBtn" onclick="runCompatibilityAnalysis()" disabled>
                🧲 Проанализировать совместимость
            </button>
            
            <!-- Результат -->
            <div class="compat-result" id="compatResult"></div>
        </div>
    `;
}

function validateCandidateInput() {
    const input = document.getElementById('candidateEmbeddingInput');
    const status = document.getElementById('embedStatus');
    const btn = document.getElementById('analyzeBtn');
    
    if (!input || !status || !btn) return;
    
    const value = input.value.trim();
    
    if (!value) {
        status.innerHTML = '';
        status.className = 'compat-input-status';
        btn.disabled = true;
        return;
    }
    
    const parsed = parseEmbeddingFromExport(value);
    
    if (parsed) {
        const date = new Date(parsed.createdAt).toLocaleDateString('ru-RU');
        status.innerHTML = `✅ Валидный эмбеддинг (${parsed.factsCount} фактов, создан ${date})`;
        status.className = 'compat-input-status status-valid';
        btn.disabled = false;
    } else {
        status.innerHTML = '❌ Неверный формат. Нужна строка вида DATING_EMBED_V1|...';
        status.className = 'compat-input-status status-invalid';
        btn.disabled = true;
    }
}

// ==================== COMPATIBILITY ANALYSIS ====================

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
    
    resultContainer.innerHTML = `
        <div class="compat-loading">
            <div class="dating-spinner"></div>
            <p>Изучаю кандидата и вашу совместимость...</p>
        </div>
    `;
    
    try {
        // Собираем ПОЛНЫЙ контекст о юзере (не эмбеддинг!)
        const userFacts = getFactsForPrompt(false);
        const userTraits = getTraitsForPrompt(false);
        const userTimeline = getTimelineForPrompt();
        const userSocial = getSocialForPrompt();
        const userHypotheses = getHypothesesForPrompt(false);
        const userStyle = localStorage.getItem(STORAGE_KEYS.style) || '';
        
        // Декодируем эмбеддинг кандидата в читаемый формат
        const candidateProfile = decodeCandidateEmbedding(candidateEmbedding);
        
        const prompt = buildCompatibilityPrompt({
            userFacts,
            userTraits,
            userTimeline,
            userSocial,
            userHypotheses,
            userStyle,
            candidateProfile,
            candidateDescription
        });
        
        console.log('[Dating] Running compatibility analysis...');
        
        // Стриминг результата
        const streamingDiv = document.createElement('div');
        streamingDiv.className = 'compat-analysis-text';
        resultContainer.innerHTML = '';
        resultContainer.appendChild(streamingDiv);
        
        const messages = [{ role: "user", content: prompt }];
        
        await streamResponseOpenRouter(
            messages,
            (partialText) => {
                streamingDiv.innerHTML = formatMessageMarkdown(partialText);
            },
            (finalText) => {
                streamingDiv.innerHTML = formatMessageMarkdown(finalText);
            },
            { temperature: 0.7 }
        );
        
        console.log('[Dating] Compatibility analysis complete');
        
    } catch (error) {
        console.error('[Dating] Compatibility analysis failed:', error);
        resultContainer.innerHTML = `
            <div class="compat-error">
                <p>❌ Ошибка анализа: ${error.message}</p>
                <button class="dating-btn" onclick="runCompatibilityAnalysis()">🔄 Попробовать снова</button>
            </div>
        `;
    } finally {
        datingState.isAnalyzing = false;
        btn.disabled = false;
        btn.innerHTML = '🧲 Проанализировать совместимость';
    }
}

function decodeCandidateEmbedding(embedding) {
    const lines = embedding.vectors.map((vec, idx) => {
        const d = DICHOTOMIES[idx];
        const value = vec.value;
        const spread = vec.spread;
        
        let dominant, intensity;
        if (value < -0.1) {
            dominant = d.left;
            intensity = Math.abs(value);
        } else if (value > 0.1) {
            dominant = d.right;
            intensity = value;
        } else {
            dominant = 'нейтрально';
            intensity = 0;
        }
        
        let reliability = 'достоверно';
        if (spread > 0.7) reliability = 'недостоверно';
        else if (spread > 0.5) reliability = 'сомнительно';
        else if (spread > 0.3) reliability = 'умеренно';
        
        return `${d.left} / ${d.right}: ${value > 0 ? '+' : ''}${value.toFixed(2)} → ${dominant} (${reliability})`;
    });
    
    // Выделяем ярко выраженные черты
    const strongTraits = embedding.vectors
        .map((vec, idx) => ({
            ...vec,
            dichotomy: DICHOTOMIES[idx],
            index: idx
        }))
        .filter(v => Math.abs(v.value) >= 0.3 && v.spread <= 0.5)
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    
    let summary = 'ВЫРАЖЕННЫЕ ЧЕРТЫ КАНДИДАТА:\n';
    if (strongTraits.length > 0) {
        summary += strongTraits.map(t => {
            const side = t.value < 0 ? t.dichotomy.left : t.dichotomy.right;
            return `• ${side}: ${Math.abs(t.value).toFixed(2)} (разброс ${t.spread.toFixed(2)})`;
        }).join('\n');
    } else {
        summary += '(нет ярко выраженных достоверных черт)';
    }
    
    return `${summary}\n\nПОЛНЫЙ ПРОФИЛЬ (33 дихотомии):\n${lines.join('\n')}`;
}

function buildCompatibilityPrompt(data) {
    const {
        userFacts,
        userTraits,
        userTimeline,
        userSocial,
        userHypotheses,
        userStyle,
        candidateProfile,
        candidateDescription
    } = data;
    
    const langName = getLanguageName();
    
    let candidateBlock = `=== ПСИХОЛОГИЧЕСКИЙ ПРОФИЛЬ КАНДИДАТА (из эмбеддинга) ===\n${candidateProfile}`;
    
    if (candidateDescription) {
        candidateBlock += `\n\n=== ОПИСАНИЕ КАНДИДАТА (от него/неё самого) ===\n${candidateDescription}`;
    }
    
    let styleBlock = '';
    if (userStyle && userStyle.trim()) {
        styleBlock = `

=== СТИЛЬ ОБЩЕНИЯ С ЭТИМ ПОЛЬЗОВАТЕЛЕМ ===
Пиши анализ в стиле, подходящем ЭТОМУ КОНКРЕТНОМУ пользователю:
${userStyle}`;
    }
    
    return `Ты — проницательный аналитик человеческих отношений. Пиши на ${langName}.
${styleBlock}

=== ТВОЯ ЗАДАЧА ===
Проанализируй совместимость пользователя (хозяина приложения) с кандидатом.

ВАЖНО:
- О пользователе ты знаешь ВСЁ — используй полный контекст ниже
- О кандидате ты знаешь только его эмбеддинг (33 измерения) и, возможно, описание
- Не используй эмбеддинг пользователя — он тебе не нужен, у тебя есть живые данные
- Пиши ДЛЯ пользователя — это его анализ, его взгляд, его язык

=== ВСЁ ЧТО ТЫ ЗНАЕШЬ О ПОЛЬЗОВАТЕЛЕ ===

**Факты:**
${userFacts || '(нет данных)'}

**Черты личности:**
${userTraits || '(нет данных)'}

**Хронология жизни:**
${userTimeline || '(нет данных)'}

**Социальные связи:**
${userSocial || '(нет данных)'}

**Гипотезы о пользователе:**
${userHypotheses || '(нет данных)'}

${candidateBlock}

=== СТРУКТУРА АНАЛИЗА ===

Напиши анализ совместимости в следующей структуре:

1. **Суть** (2-3 предложения) — кто этот кандидат в двух словах, первое впечатление от профиля

2. **Где совпадёте** (3-4 пункта) — конкретные точки совместимости. Опирайся на РЕАЛЬНЫЕ факты и черты пользователя, а не абстракции

3. **Где будет тереть** (3-4 пункта) — потенциальные трения. Будь честен, но не жесток

4. **Главное** (1-2 предложения) — чёткий вывод. Не отписка, а суть

=== ПРАВИЛА ===
- НЕ ставь числовой процент совместимости — это упрощение
- НЕ перечисляй дихотомии и числа — пользователь их не видит
- НЕ пиши длинных абзацев — короткие ёмкие фразы
- Используй конкретику из жизни пользователя, если она релевантна
- Если описания кандидата нет — честно скажи, что судишь только по цифрам
- Если у кандидата много недостоверных оценок (разброс > 0.5) — упомяни что портрет размыт
- Пиши как умный друг, не как психолог из учебника
- Адаптируй стиль под пользователя (если есть стиль общения)`;
}

// ==================== TRAIT RENDERING ====================

function renderTraitBar(trait) {
    const isLeftDominant = trait.value < 0;
    const intensity = Math.abs(trait.value);
    
    let reliabilityClass = 'high';
    if (trait.spread > 0.5) reliabilityClass = 'low';
    else if (trait.spread > 0.2) reliabilityClass = 'medium';
    
    return `
        <div class="trait-bar-container">
            <div class="trait-labels">
                <span class="trait-left ${isLeftDominant ? 'dominant' : ''}">${trait.left}</span>
                <span class="trait-right ${!isLeftDominant ? 'dominant' : ''}">${trait.right}</span>
            </div>
            <div class="trait-bar">
                <div class="trait-bar-fill ${isLeftDominant ? 'left' : 'right'}" 
                     style="width: ${intensity * 50}%; ${isLeftDominant ? 'right: 50%' : 'left: 50%'}">
                </div>
                <div class="trait-bar-center"></div>
            </div>
            <div class="trait-meta">
                <span class="trait-value">${trait.value > 0 ? '+' : ''}${trait.value.toFixed(2)}</span>
                <span class="trait-reliability reliability-${reliabilityClass}" title="Разброс: ${trait.spread.toFixed(2)}">
                    ${reliabilityClass === 'high' ? '✓' : reliabilityClass === 'medium' ? '~' : '?'}
                </span>
            </div>
        </div>
    `;
}

function renderAllTraits(embedding) {
    return embedding.vectors.map((vec, idx) => {
        const dich = DICHOTOMIES[idx];
        const isLeftDominant = vec.value < 0;
        
        let reliabilityClass = 'high';
        if (vec.spread > 0.5) reliabilityClass = 'low';
        else if (vec.spread > 0.2) reliabilityClass = 'medium';
        
        return `
            <div class="mini-trait">
                <span class="mini-trait-num">${idx + 1}.</span>
                <span class="mini-trait-left ${isLeftDominant ? 'active' : ''}">${dich.left}</span>
                <span class="mini-trait-value">${vec.value > 0 ? '+' : ''}${vec.value.toFixed(1)}</span>
                <span class="mini-trait-right ${!isLeftDominant ? 'active' : ''}">${dich.right}</span>
                <span class="mini-trait-spread reliability-${reliabilityClass}">(±${vec.spread.toFixed(2)})</span>
            </div>
        `;
    }).join('');
}

function toggleFullEmbedding() {
    const view = document.getElementById('fullEmbeddingView');
    if (view) {
        view.style.display = view.style.display === 'none' ? 'block' : 'none';
    }
}

function confirmRegenerate() {
    if (confirm('Пересоздать профиль? Текущий будет заменён.')) {
        localStorage.removeItem(DATING_STORAGE_KEY);
        const factsData = getFactsData();
        const factsCount = factsData.facts ? factsData.facts.filter(f => !f.superseded).length : 0;
        renderReadyToGenerate(factsCount);
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
            
            const embedding = await generateSingleEmbedding();
            
            if (embedding) {
                datingState.passes.push(embedding);
                console.log(`[Dating] Pass ${i} complete`);
            } else {
                throw new Error(`Pass ${i} failed to generate valid embedding`);
            }
            
            if (i < EMBEDDING_PASSES) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
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
        
        if (parsed && parsed.length === 33) {
            return parsed;
        } else {
            console.error('[Dating] Invalid embedding length:', parsed?.length);
            return null;
        }
    } catch (error) {
        console.error('[Dating] API call failed:', error);
        return null;
    }
}

function buildEmbeddingPrompt(facts, traits) {
    const dichotomyList = DICHOTOMIES.map(d => 
        `${d.id}. ${d.left} / ${d.right}`
    ).join('\n');
    
    return `Ты — психолог-аналитик. Проанализируй личность человека на основе фактов и черт характера.

=== ФАКТЫ О ЧЕЛОВЕКЕ ===
${facts || '(нет данных)'}

=== ЧЕРТЫ ЛИЧНОСТИ ===
${traits || '(нет данных)'}

=== ТВОЯ ЗАДАЧА ===
Оцени человека по 33 дихотомиям личности. Для каждой дихотомии выстави балл от -1.0 до +1.0 с шагом 0.1:
• -1.0 = крайне выражен ЛЕВЫЙ полюс
• 0.0 = нейтрально, баланс
• +1.0 = крайне выражен ПРАВЫЙ полюс

=== 33 ДИХОТОМИИ (левый полюс / правый полюс) ===
${dichotomyList}

=== ПРАВИЛА ===
1. Оценивай ТОЛЬКО на основе предоставленных данных
2. Если данных недостаточно для оценки — ставь 0.0
3. Будь консервативен: крайние значения (-1.0, +1.0) только при явных доказательствах
4. НЕ выдумывай и не додумывай

=== ФОРМАТ ОТВЕТА ===
Ответь СТРОГО в таком формате, без пояснений:

[1]:X.X
[2]:X.X
[3]:X.X
...
[33]:X.X

Где X.X — число от -1.0 до +1.0`;
}

function parseEmbeddingResponse(response) {
    const text = response.content || response;
    
    const pattern = /\[(\d+)\]\s*:\s*([-+]?\d+\.?\d*)/g;
    let match;
    
    const found = {};
    while ((match = pattern.exec(text)) !== null) {
        const index = parseInt(match[1]);
        const value = parseFloat(match[2]);
        
        if (index >= 1 && index <= 33 && !isNaN(value)) {
            found[index] = Math.max(-1, Math.min(1, value));
        }
    }
    
    const values = [];
    for (let i = 1; i <= 33; i++) {
        values.push(found[i] !== undefined ? found[i] : 0);
    }
    
    console.log(`[Dating] Parsed ${Object.keys(found).length}/33 values`);
    
    return values.length === 33 ? values : null;
}

function calculateFinalEmbedding(passes) {
    const vectors = [];
    
    for (let i = 0; i < 33; i++) {
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
        version: 1,
        createdAt: Date.now(),
        factsCount: getFactsData().facts?.filter(f => !f.superseded).length || 0,
        vectors: vectors
    };
}

function getTopTraits(embedding, count = 5) {
    const traits = embedding.vectors.map((vec, idx) => ({
        index: idx,
        value: vec.value,
        spread: vec.spread,
        left: DICHOTOMIES[idx].left,
        right: DICHOTOMIES[idx].right,
        score: Math.abs(vec.value) * (1 - Math.min(vec.spread, 1))
    }));
    
    const reliable = traits.filter(t => t.spread <= 0.7);
    reliable.sort((a, b) => b.score - a.score);
    
    return reliable.slice(0, count);
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
        const topTraits = embedding ? getTopTraits(embedding, 5) : [];
        
        const prompt = buildDescriptionPrompt(level, facts, traits, topTraits);
        
        console.log(`[Dating] Generating description level ${level}...`);
        
        const response = await callAPIForDating(prompt);
        const description = (response.content || response).trim();
        
        textarea.value = description;
        saveDescription(level, description);
        
        console.log(`[Dating] Description level ${level} generated`);
        
    } catch (error) {
        console.error(`[Dating] Description generation failed:`, error);
        alert('Ошибка генерации описания. Попробуйте ещё раз.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        textarea.disabled = false;
        datingState.isGeneratingDescription = false;
    }
}

function buildDescriptionPrompt(level, facts, traits, topTraits) {
    const topTraitsText = topTraits.map(t => {
        const dominant = t.value < 0 ? t.left : t.right;
        const intensity = Math.abs(t.value);
        return `- ${dominant} (выраженность: ${(intensity * 100).toFixed(0)}%)`;
    }).join('\n');
    
    if (level === 1) {
        return `Ты — талантливый копирайтер для сервиса знакомств. Напиши интригующее ПОЛНОСТЬЮ АНОНИМНОЕ описание человека.

=== ДАННЫЕ ===
**Черты личности:** ${traits || '(нет)'}
**Ключевые характеристики:** ${topTraitsText || '(нет)'}

=== ТРЕБОВАНИЯ ===
1. СТРОГАЯ АНОНИМНОСТЬ: только пол + художественно описанный возраст ("в расцвете сил", "на пороге новых открытий")
2. НЕ упоминай: профессию, город, имена, конкретные хобби, семейное положение
3. Пиши от третьего лица как нетворкер, представляющий человека
4. 3-5 предложений, с интригой и "изюминкой"

Напиши ТОЛЬКО описание.`;
        
    } else {
        return `Ты — талантливый копирайтер для сервиса знакомств. Напиши подробное описание для тех, с кем произошёл взаимный интерес.

=== ДАННЫЕ ===
**Факты:** ${facts || '(нет)'}
**Черты личности:** ${traits || '(нет)'}
**Ключевые характеристики:** ${topTraitsText || '(нет)'}

=== ТРЕБОВАНИЯ ===
1. Можно: сферу деятельности, интересы, ценности
2. НЕ упоминай: точный возраст, адреса, финансы, здоровье, конфликты
3. Пиши от третьего лица как нетворкер
4. 5-8 предложений, покажи глубину и уникальность

Напиши ТОЛЬКО описание.`;
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
    const descriptions = getSavedDescriptions();
    descriptions[`level${level}`] = {
        text: text,
        enabled: descriptions[`level${level}`]?.enabled || false,
        updatedAt: Date.now()
    };
    localStorage.setItem(DATING_DESCRIPTIONS_KEY, JSON.stringify(descriptions));
}

function toggleDescriptionEnabled(level) {
    const checkbox = document.getElementById(`enableLevel${level}`);
    if (!checkbox) return;
    
    const descriptions = getSavedDescriptions();
    descriptions[`level${level}`] = {
        ...descriptions[`level${level}`],
        enabled: checkbox.checked,
        updatedAt: Date.now()
    };
    localStorage.setItem(DATING_DESCRIPTIONS_KEY, JSON.stringify(descriptions));
}

function onDescriptionChange(level) {
    const textarea = document.getElementById(`descriptionLevel${level}`);
    if (!textarea) return;
    
    clearTimeout(window[`descSaveTimeout${level}`]);
    window[`descSaveTimeout${level}`] = setTimeout(() => {
        saveDescription(level, textarea.value);
    }, 1000);
}

function saveEmbedding(embedding) {
    localStorage.setItem(DATING_STORAGE_KEY, JSON.stringify(embedding));
    console.log('[Dating] Embedding saved');
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

// ==================== EXPORT/IMPORT ====================

function copyEmbeddingToClipboard() {
    const embedding = getSavedEmbedding();
    if (!embedding) {
        alert('Нет сохранённого профиля');
        return;
    }
    
    const exportString = formatEmbeddingForExport(embedding);
    
    navigator.clipboard.writeText(exportString).then(() => {
        const btn = document.querySelector('.dating-btn-copy');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Скопировано!';
            setTimeout(() => { btn.innerHTML = originalText; }, 2000);
        }
    }).catch(err => {
        console.error('[Dating] Copy failed:', err);
    });
}

function formatEmbeddingForExport(embedding) {
    const vectorsStr = embedding.vectors.map(v => 
        `${v.value.toFixed(2)},${v.spread.toFixed(2)}`
    ).join(';');
    
    return `DATING_EMBED_V1|${embedding.createdAt}|${embedding.factsCount}|${vectorsStr}`;
}

function parseEmbeddingFromExport(str) {
    if (!str || typeof str !== 'string') return null;
    
    const parts = str.trim().split('|');
    
    if (parts[0] !== 'DATING_EMBED_V1' || parts.length !== 4) {
        return null;
    }
    
    const createdAt = parseInt(parts[1]);
    const factsCount = parseInt(parts[2]);
    const vectorsStr = parts[3];
    
    if (isNaN(createdAt) || isNaN(factsCount)) return null;
    
    const vectors = vectorsStr.split(';').map(pair => {
        const [value, spread] = pair.split(',').map(parseFloat);
        if (isNaN(value) || isNaN(spread)) return null;
        return { value, spread };
    });
    
    if (vectors.length !== 33 || vectors.some(v => v === null)) {
        return null;
    }
    
    return { version: 1, createdAt, factsCount, vectors };
}

// ==================== API ====================

async function callAPIForDating(prompt) {
    const messages = [{ role: "user", content: prompt }];
    
    if (typeof callAPIOpenRouter === 'function') {
        return await callAPIOpenRouter(messages, true);
    }
    
    throw new Error('API function not available');
}

// ==================== ERRORS ====================

function renderGenerationError(message) {
    const container = document.getElementById('datingContent');
    container.innerHTML = `
        <div class="dating-status dating-error">
            <div class="dating-icon">❌</div>
            <h3>Ошибка генерации</h3>
            <p>${message}</p>
            <button class="dating-btn" onclick="checkDatingEligibility()">
                🔄 Попробовать снова
            </button>
        </div>
    `;
}

console.log('[dating.js] Loaded. Embedding + Descriptions + Compatibility analysis.');