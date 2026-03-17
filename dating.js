// dating.js - модуль знакомств для Memory Chatbot
// Генерация личностного эмбеддинга на основе 33 дихотомий
// + Двухуровневые описания профиля

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
    isGeneratingDescription: false
};

// ==================== UI ФУНКЦИИ ====================

function openDatingModal() {
    const modal = document.getElementById('datingModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        checkDatingEligibility();
    }
}

function closeDatingModal() {
    const modal = document.getElementById('datingModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
    
    // Сбрасываем состояние если генерация не завершена
    if (datingState.isGenerating) {
        datingState.isGenerating = false;
        datingState.currentPass = 0;
        datingState.passes = [];
    }
}

function checkDatingEligibility() {
    const container = document.getElementById('datingContent');
    if (!container) return;
    
    const factsData = getFactsData();
    const factsCount = factsData.facts ? factsData.facts.filter(f => !f.superseded).length : 0;
    
    console.log(`[Dating] Facts count: ${factsCount}/${MIN_FACTS_REQUIRED}`);
    
    // Проверяем, есть ли уже сохранённый эмбеддинг
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
    
    // Получаем топ-5 самых выраженных и достоверных полюсов
    const topTraits = getTopTraits(embedding, 5);
    
    // Получаем сохранённые описания
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
                
                <!-- Примечание о прототипе -->
                <div class="dating-prototype-note">
                    <span>🚧</span>
                    <p>Это прототип. Логика мэтчей и показа профилей другим пользователям будет добавлена позже. Пока вы можете подготовить свои описания.</p>
                </div>
            </div>
        </div>
    `;
}

function renderTraitBar(trait) {
    const percentage = ((trait.value + 1) / 2) * 100; // Конвертируем -1..1 в 0..100
    const isLeftDominant = trait.value < 0;
    const dominantSide = isLeftDominant ? trait.left : trait.right;
    const intensity = Math.abs(trait.value);
    
    // Определяем цвет по достоверности
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
        const intensity = Math.abs(vec.value);
        
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

// ==================== ГЕНЕРАЦИЯ ЭМБЕДДИНГА ====================

async function startEmbeddingGeneration() {
    if (datingState.isGenerating) return;
    
    datingState.isGenerating = true;
    datingState.currentPass = 0;
    datingState.passes = [];
    
    renderGeneratingState();
    
    try {
        // Выполняем 3 независимых прохода
        for (let i = 1; i <= EMBEDDING_PASSES; i++) {
            datingState.currentPass = i;
            updateGenerationProgress(i);
            
            console.log(`[Dating] Starting pass ${i}/${EMBEDDING_PASSES}`);
            
            const embedding = await generateSingleEmbedding();
            
            if (embedding) {
                datingState.passes.push(embedding);
                console.log(`[Dating] Pass ${i} complete:`, embedding.slice(0, 3));
            } else {
                throw new Error(`Pass ${i} failed to generate valid embedding`);
            }
            
            // Небольшая пауза между запросами
            if (i < EMBEDDING_PASSES) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Вычисляем финальный эмбеддинг
        const finalEmbedding = calculateFinalEmbedding(datingState.passes);
        
        // Сохраняем
        saveEmbedding(finalEmbedding);
        
        // Отображаем результат
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
    const values = [];
    
    // Паттерн: [номер]:значение или [номер]: значение
    const pattern = /\[(\d+)\]\s*:\s*([-+]?\d+\.?\d*)/g;
    let match;
    
    const found = {};
    while ((match = pattern.exec(text)) !== null) {
        const index = parseInt(match[1]);
        const value = parseFloat(match[2]);
        
        if (index >= 1 && index <= 33 && !isNaN(value)) {
            // Ограничиваем значение диапазоном [-1, 1]
            found[index] = Math.max(-1, Math.min(1, value));
        }
    }
    
    // Собираем в массив по порядку
    for (let i = 1; i <= 33; i++) {
        if (found[i] !== undefined) {
            values.push(found[i]);
        } else {
            console.warn(`[Dating] Missing value for dichotomy ${i}`);
            values.push(0); // Дефолт если не найдено
        }
    }
    
    console.log(`[Dating] Parsed ${Object.keys(found).length}/33 values`);
    
    return values.length === 33 ? values : null;
}

function calculateFinalEmbedding(passes) {
    const vectors = [];
    
    for (let i = 0; i < 33; i++) {
        const values = passes.map(p => p[i]);
        
        // Среднее значение
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        
        // Разброс (макс - мин)
        const spread = Math.max(...values) - Math.min(...values);
        
        vectors.push({
            value: Math.round(avg * 100) / 100, // Округляем до 2 знаков
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
        // Оценка: выраженность × достоверность
        score: Math.abs(vec.value) * (1 - Math.min(vec.spread, 1))
    }));
    
    // Фильтруем недостоверные (spread > 0.7)
    const reliable = traits.filter(t => t.spread <= 0.7);
    
    // Сортируем по score
    reliable.sort((a, b) => b.score - a.score);
    
    return reliable.slice(0, count);
}

// ==================== ГЕНЕРАЦИЯ ОПИСАНИЙ ====================

async function generateDescription(level) {
    if (datingState.isGeneratingDescription) return;
    
    const btn = document.getElementById(`genBtn${level}`);
    const textarea = document.getElementById(`descriptionLevel${level}`);
    
    if (!btn || !textarea) return;
    
    datingState.isGeneratingDescription = true;
    
    // UI feedback
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
        
        // Обновляем textarea
        textarea.value = description;
        
        // Сохраняем
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
    // Форматируем топ черты для промпта
    const topTraitsText = topTraits.map(t => {
        const dominant = t.value < 0 ? t.left : t.right;
        const intensity = Math.abs(t.value);
        return `- ${dominant} (выраженность: ${(intensity * 100).toFixed(0)}%)`;
    }).join('\n');
    
    if (level === 1) {
        // Публичное анонимное описание
        return `Ты — талантливый копирайтер для сервиса знакомств. Твоя задача — написать интригующее, но ПОЛНОСТЬЮ АНОНИМНОЕ описание человека.

=== ДАННЫЕ О ЧЕЛОВЕКЕ ===

**Черты личности:**
${traits || '(нет данных)'}

**Ключевые характеристики (из психологического профиля):**
${topTraitsText || '(нет данных)'}

=== ТРЕБОВАНИЯ К ОПИСАНИЮ ===

1. **СТРОГАЯ АНОНИМНОСТЬ:**
   - Укажи только пол (если понятен из данных) и ХУДОЖЕСТВЕННО описанный примерный возраст (не цифрами! например: "в расцвете сил", "на пороге новых открытий", "с мудростью прожитых лет")
   - НЕ упоминай: профессию, место работы, город, имена, конкретные хобби, которые могут идентифицировать
   - НЕ упоминай: семейное положение, детей, конкретные события из жизни

2. **СТИЛЬ:**
   - Пиши от третьего лица, как будто ты нетворкер, представляющий интересного человека
   - Создай интригу и "изюминку" — что-то, что зацепит
   - Используй метафоры и образы вместо конкретики
   - Тон: тёплый, заинтересованный, с лёгкой загадочностью

3. **СТРУКТУРА:**
   - 3-5 предложений
   - Начни с "крючка" — интригующей характеристики
   - Закончи чем-то, что вызывает желание узнать больше

4. **ПРИМЕРЫ ХОРОШЕГО ОПИСАНИЯ:**
   - "Человек, который умеет находить красоту в повседневности и превращать рутину в приключение..."
   - "Редкое сочетание внутренней силы и искренней открытости миру..."

=== ФОРМАТ ОТВЕТА ===
Напиши ТОЛЬКО само описание, без заголовков и пояснений. 3-5 предложений.`;
        
    } else {
        // Описание для мэтчей (более открытое)
        return `Ты — талантливый копирайтер для сервиса знакомств. Твоя задача — написать более подробное описание человека, которое увидят только те, с кем произошёл взаимный интерес.

=== ДАННЫЕ О ЧЕЛОВЕКЕ ===

**Факты:**
${facts || '(нет данных)'}

**Черты личности:**
${traits || '(нет данных)'}

**Ключевые характеристики (из психологического профиля):**
${topTraitsText || '(нет данных)'}

=== ТРЕБОВАНИЯ К ОПИСАНИЮ ===

1. **УРОВЕНЬ ОТКРЫТОСТИ:**
   - Можно упомянуть сферу деятельности (но не конкретное место работы)
   - Можно упомянуть основные интересы и хобби
   - Можно намекнуть на жизненные ценности и приоритеты
   - НЕ упоминай: точный возраст, адреса, полные имена других людей, компрометирующую информацию

2. **БЕЗОПАСНОСТЬ:**
   - Не включай ничего, что может навредить человеку
   - Не упоминай финансовое положение напрямую
   - Не упоминай проблемы со здоровьем
   - Не упоминай конфликты и негативный опыт

3. **СТИЛЬ:**
   - Пиши от третьего лица, как нетворкер
   - Покажи человека с лучшей стороны, но честно
   - Подчеркни уникальность и глубину личности
   - Тон: тёплый, уважительный, с энтузиазмом

4. **СТРУКТУРА:**
   - 5-8 предложений
   - Раскрой 2-3 грани личности
   - Покажи, что делает этого человека интересным собеседником/партнёром
   - Закончи позитивной нотой

=== ФОРМАТ ОТВЕТА ===
Напиши ТОЛЬКО само описание, без заголовков и пояснений. 5-8 предложений.`;
    }
}

// ==================== ХРАНЕНИЕ ОПИСАНИЙ ====================

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
        console.error('[Dating] Failed to parse descriptions:', e);
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
    
    console.log(`[Dating] Description level ${level} enabled: ${checkbox.checked}`);
}

function onDescriptionChange(level) {
    const textarea = document.getElementById(`descriptionLevel${level}`);
    if (!textarea) return;
    
    // Автосохранение с debounce
    clearTimeout(window[`descSaveTimeout${level}`]);
    window[`descSaveTimeout${level}`] = setTimeout(() => {
        saveDescription(level, textarea.value);
        console.log(`[Dating] Description level ${level} auto-saved`);
    }, 1000);
}

// ==================== ХРАНЕНИЕ ЭМБЕДДИНГА ====================

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
        console.error('[Dating] Failed to parse saved embedding:', e);
        return null;
    }
}

// ==================== КОПИРОВАНИЕ ====================

function copyEmbeddingToClipboard() {
    const embedding = getSavedEmbedding();
    if (!embedding) {
        alert('Нет сохранённого профиля');
        return;
    }
    
    // Формируем строку для копирования
    const exportString = formatEmbeddingForExport(embedding);
    
    navigator.clipboard.writeText(exportString).then(() => {
        // Показываем уведомление
        const btn = document.querySelector('.dating-btn-copy');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Скопировано!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        }
    }).catch(err => {
        console.error('[Dating] Copy failed:', err);
        alert('Не удалось скопировать. Попробуйте ещё раз.');
    });
}

function formatEmbeddingForExport(embedding) {
    // Формат: DATING_EMBED_V1|timestamp|factsCount|v1,s1;v2,s2;...;v33,s33
    const vectorsStr = embedding.vectors.map(v => 
        `${v.value.toFixed(2)},${v.spread.toFixed(2)}`
    ).join(';');
    
    return `DATING_EMBED_V1|${embedding.createdAt}|${embedding.factsCount}|${vectorsStr}`;
}

function parseEmbeddingFromExport(str) {
    // Парсинг строки экспорта
    const parts = str.split('|');
    
    if (parts[0] !== 'DATING_EMBED_V1' || parts.length !== 4) {
        return null;
    }
    
    const createdAt = parseInt(parts[1]);
    const factsCount = parseInt(parts[2]);
    const vectorsStr = parts[3];
    
    const vectors = vectorsStr.split(';').map(pair => {
        const [value, spread] = pair.split(',').map(parseFloat);
        return { value, spread };
    });
    
    if (vectors.length !== 33) {
        return null;
    }
    
    return {
        version: 1,
        createdAt,
        factsCount,
        vectors
    };
}

// ==================== API ВЫЗОВ ====================

async function callAPIForDating(prompt) {
    // Используем OpenRouter для анализа (как в ui.js)
    const messages = [{ role: "user", content: prompt }];
    
    // Вызываем через существующую функцию
    if (typeof callAPIOpenRouter === 'function') {
        return await callAPIOpenRouter(messages, true); // useAnalysisModel = true
    }
    
    // Fallback если функция недоступна
    throw new Error('API function not available');
}

// ==================== ОШИБКИ ====================

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

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

console.log('[dating.js] Loaded. Personality embedding + descriptions module ready.');