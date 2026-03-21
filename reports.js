// reports.js - модуль генерации отчётов
// Двухрежимный: пользовательский (preset) и тестовый (custom)

// ==================== КОНСТАНТЫ ====================
const REPORTS_STORAGE_KEY = 'chatbot_reports_history';
const REPORTS_MODE_KEY = 'chatbot_reports_mode'; // 'user' или 'test'

// Предустановленные отчёты
const PRESET_REPORTS = [
    {
        id: 'lower_expectations',
        title: 'Кто подходит для жизни, а не для «вау»?',
        icon: '🏡',
        description: 'Анализ того, какие качества партнёра принесут достаточное тихое счастье, а не яркую влюблённость',
        requiredContext: ['ctx_embedding', 'ctx_ideal', 'ctx_expectations'],
        prompt: `Найди три места где пользователь может обманывать сам себя в отношении качеств идеального партнёра. Но не пиши об этом, а сразу начни с того что предоставь три другие возможно даже прямо противоположные от ожиданий конкретных качества действительно нужного ему партнёра. Ответь простым понятным языком без каких либо цифр и процентов.`,
        maxTokens: 5000,
        temperature: 0.2
    }
    // Здесь будут добавляться другие пресеты
];

// ==================== СОСТОЯНИЕ ====================
let reportsState = {
    isGenerating: false,
    mode: 'user' // 'user' или 'test'
};

// ==================== UI ФУНКЦИИ ====================

function openReportsModal() {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Загружаем режим
        const savedMode = localStorage.getItem(REPORTS_MODE_KEY) || 'user';
        reportsState.mode = savedMode;
        
        renderReportsInterface();
    }
}

function closeReportsModal() {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

function switchReportsMode(mode) {
    reportsState.mode = mode;
    localStorage.setItem(REPORTS_MODE_KEY, mode);
    renderReportsInterface();
}

function renderReportsInterface() {
    const container = document.querySelector('.reports-modal');
    if (!container) return;
    
    if (reportsState.mode === 'user') {
        renderUserMode(container);
    } else {
        renderTestMode(container);
    }
}

// ==================== ПОЛЬЗОВАТЕЛЬСКИЙ РЕЖИМ ====================

function renderUserMode(container) {
    const hasEmbedding = !!getSavedEmbedding();
    const hasIdeal = !!(getSavedIdeal()?.searchScales);
    const hasExpectations = !!(getSavedIdeal()?.expectations);
    
    container.innerHTML = `
        <div class="reports-header">
            <h2>📊 Готовые отчёты</h2>
            <div class="reports-header-actions">
                <button class="reports-mode-toggle" onclick="switchReportsMode('test')" title="Режим разработчика">
                    🔧
                </button>
                <button class="reports-close-btn" onclick="closeReportsModal()">✕</button>
            </div>
        </div>
        
        <div class="reports-user-content">
            ${PRESET_REPORTS.map(preset => renderPresetCard(preset, {hasEmbedding, hasIdeal, hasExpectations})).join('')}
        </div>
        
        <!-- Результат (общий для обоих режимов) -->
        <div class="reports-result-section" id="reportsResultSection" style="display: none;">
            <div class="reports-section-title">📄 Результат:</div>
            <div class="reports-result" id="reportsResult"></div>
            <div class="reports-result-actions">
                <button class="reports-btn" onclick="copyReportToClipboard()">📋 Копировать</button>
                <button class="reports-btn reports-btn-secondary" onclick="clearReportResult()">🗑️ Очистить</button>
            </div>
        </div>
    `;
}

function renderPresetCard(preset, availability) {
    const canGenerate = preset.requiredContext.every(ctx => {
        if (ctx === 'ctx_embedding') return availability.hasEmbedding;
        if (ctx === 'ctx_ideal') return availability.hasIdeal;
        if (ctx === 'ctx_expectations') return availability.hasExpectations;
        return false;
    });
    
    const missingData = preset.requiredContext.filter(ctx => {
        if (ctx === 'ctx_embedding') return !availability.hasEmbedding;
        if (ctx === 'ctx_ideal') return !availability.hasIdeal;
        if (ctx === 'ctx_expectations') return !availability.hasExpectations;
        return false;
    });
    
    const missingHints = {
        'ctx_embedding': 'Создайте эмбеддинг во вкладке "🎯 Мой профиль"',
        'ctx_ideal': 'Заполните "💫 Кто мне нужен?"',
        'ctx_expectations': 'Заполните "💫 Кто мне нужен?"'
    };
    
    return `
        <div class="preset-card ${canGenerate ? '' : 'preset-disabled'}">
            <div class="preset-icon">${preset.icon}</div>
            <div class="preset-info">
                <h3 class="preset-title">${preset.title}</h3>
                <p class="preset-description">${preset.description}</p>
                ${!canGenerate ? `
                    <div class="preset-requirements">
                        <span class="req-label">⚠️ Требуется:</span>
                        ${missingData.map(ctx => `<span class="req-hint">${missingHints[ctx]}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <button 
                class="preset-generate-btn" 
                ${canGenerate ? '' : 'disabled'} 
                onclick="generatePresetReport('${preset.id}')"
            >
                ${canGenerate ? '🚀 Сгенерировать' : '🔒 Недоступно'}
            </button>
        </div>
    `;
}

async function generatePresetReport(presetId) {
    const preset = PRESET_REPORTS.find(p => p.id === presetId);
    if (!preset) return;
    
    // Собираем нужный контекст
    const context = [];
    
    if (preset.requiredContext.includes('ctx_embedding')) {
        const embedding = getSavedEmbedding();
        if (embedding) {
            context.push({
                title: '🧬 ЛИЧНОСТНЫЙ ЭМБЕДДИНГ (50 ШКАЛ)',
                content: formatEmbeddingForReport(embedding)
            });
        }
    }
    
    if (preset.requiredContext.includes('ctx_ideal')) {
        const ideal = getSavedIdeal();
        if (ideal?.searchScales) {
            context.push({
                title: '💫 ШКАЛЫ ИДЕАЛЬНОГО ПАРТНЁРА',
                content: formatIdealScalesForReport(ideal.searchScales)
            });
        }
    }
    
    if (preset.requiredContext.includes('ctx_expectations')) {
        const ideal = getSavedIdeal();
        if (ideal?.expectations) {
            context.push({
                title: '🎯 ОЖИДАНИЯ ОТ ПАРТНЁРА',
                content: ideal.expectations
            });
        }
    }
    
    // Генерируем отчёт
    await generateReportWithContext(context, preset.prompt, preset.maxTokens, preset.temperature);
}

// ==================== ТЕСТОВЫЙ РЕЖИМ ====================

function renderTestMode(container) {
    container.innerHTML = `
        <div class="reports-header">
            <h2>🔧 Конструктор отчётов</h2>
            <div class="reports-header-actions">
                <button class="reports-mode-toggle" onclick="switchReportsMode('user')" title="Пользовательский режим">
                    👤
                </button>
                <button class="reports-close-btn" onclick="closeReportsModal()">✕</button>
            </div>
        </div>
        
        <!-- Контекст -->
        <div class="reports-context-section">
            <div class="reports-section-title">📎 Присоединить к промпту:</div>
            <div class="reports-context-grid">
                <label class="reports-context-item">
                    <input type="checkbox" id="ctx_facts" checked>
                    <span class="ctx-icon">📋</span>
                    <span class="ctx-name">Факты</span>
                    <span class="ctx-count" id="ctx_facts_count">0</span>
                </label>
                <label class="reports-context-item">
                    <input type="checkbox" id="ctx_traits">
                    <span class="ctx-icon">🧠</span>
                    <span class="ctx-name">Черты характера</span>
                    <span class="ctx-count" id="ctx_traits_count">0</span>
                </label>
                <label class="reports-context-item">
                    <input type="checkbox" id="ctx_timeline">
                    <span class="ctx-icon">📅</span>
                    <span class="ctx-name">Хронология</span>
                    <span class="ctx-count" id="ctx_timeline_count">0</span>
                </label>
                <label class="reports-context-item">
                    <input type="checkbox" id="ctx_hypotheses">
                    <span class="ctx-icon">💡</span>
                    <span class="ctx-name">Гипотезы</span>
                    <span class="ctx-count" id="ctx_hypotheses_count">0</span>
                </label>
                <label class="reports-context-item">
                    <input type="checkbox" id="ctx_social">
                    <span class="ctx-icon">👥</span>
                    <span class="ctx-name">Социалка</span>
                    <span class="ctx-count" id="ctx_social_count">0</span>
                </label>
                <label class="reports-context-item">
                    <input type="checkbox" id="ctx_style">
                    <span class="ctx-icon">🎭</span>
                    <span class="ctx-name">Стиль общения</span>
                    <span class="ctx-count" id="ctx_style_count">—</span>
                </label>
                <label class="reports-context-item">
                    <input type="checkbox" id="ctx_embedding">
                    <span class="ctx-icon">🧬</span>
                    <span class="ctx-name">Мой эмбеддинг</span>
                    <span class="ctx-count" id="ctx_embedding_count">—</span>
                </label>
                <label class="reports-context-item">
                    <input type="checkbox" id="ctx_ideal">
                    <span class="ctx-icon">💫</span>
                    <span class="ctx-name">Идеальный партнёр</span>
                    <span class="ctx-count" id="ctx_ideal_count">—</span>
                </label>
                <label class="reports-context-item">
                    <input type="checkbox" id="ctx_expectations">
                    <span class="ctx-icon">🎯</span>
                    <span class="ctx-name">Ожидания от партнёра</span>
                    <span class="ctx-count" id="ctx_expectations_count">—</span>
                </label>
            </div>
        </div>
        
        <!-- Промпт -->
        <div class="reports-prompt-section">
            <div class="reports-section-title">✍️ Промпт:</div>
            <textarea id="reportsPrompt" class="reports-prompt-input" 
                placeholder="Напиши анализ моей личности на основе предоставленных данных..."
                rows="5"></textarea>
        </div>
        
        <!-- Параметры LLM -->
        <div class="reports-params-section">
            <div class="reports-param">
                <label for="reportsMaxTokens">📏 Max tokens:</label>
                <input type="number" id="reportsMaxTokens" value="2000" min="100" max="16000" step="100">
            </div>
            <div class="reports-param">
                <label for="reportsTemperature">🌡️ Temperature:</label>
                <input type="range" id="reportsTemperature" min="0" max="2" step="0.1" value="0.7">
                <span id="reportsTempValue">0.7</span>
            </div>
        </div>
        
        <!-- Кнопка генерации -->
        <div class="reports-actions">
            <button class="reports-generate-btn" id="reportsGenerateBtn" onclick="generateCustomReport()">
                🚀 Сгенерировать отчёт
            </button>
        </div>
        
        <!-- Результат -->
        <div class="reports-result-section" id="reportsResultSection" style="display: none;">
            <div class="reports-section-title">📄 Результат:</div>
            <div class="reports-result" id="reportsResult"></div>
            <div class="reports-result-actions">
                <button class="reports-btn" onclick="copyReportToClipboard()">📋 Копировать</button>
                <button class="reports-btn reports-btn-secondary" onclick="clearReportResult()">🗑️ Очистить</button>
            </div>
        </div>
    `;
    
    // Инициализация
    updateContextCounts();
    initTemperatureSlider();
}

function initTemperatureSlider() {
    const slider = document.getElementById('reportsTemperature');
    const value = document.getElementById('reportsTempValue');
    if (slider && value) {
        value.textContent = slider.value;
        slider.oninput = () => {
            value.textContent = slider.value;
        };
    }
}

// ==================== ПОДСЧЁТ ДАННЫХ ====================

function updateContextCounts() {
    const factsData = getFactsData();
    const factsCount = factsData.facts ? factsData.facts.filter(f => !f.superseded).length : 0;
    setCountBadge('ctx_facts_count', factsCount);
    
    const traitsData = getTraitsData();
    const traitsCount = traitsData.traits ? traitsData.traits.filter(t => !t.superseded).length : 0;
    setCountBadge('ctx_traits_count', traitsCount);
    
    const timelineData = getTimelineData();
    const timelineCount = timelineData.events ? timelineData.events.filter(e => !e.superseded).length : 0;
    setCountBadge('ctx_timeline_count', timelineCount);
    
    const hypothesesData = getHypothesesData();
    const hypothesesCount = hypothesesData.hypotheses ? hypothesesData.hypotheses.length : 0;
    setCountBadge('ctx_hypotheses_count', hypothesesCount);
    
    const socialData = getSocialData();
    const socialCount = socialData.contacts ? socialData.contacts.length : 0;
    setCountBadge('ctx_social_count', socialCount);
    
    const style = localStorage.getItem(STORAGE_KEYS.style);
    setCountBadge('ctx_style_count', style && style.trim() ? '✓' : '—');
    
    const embedding = getSavedEmbedding();
    setCountBadge('ctx_embedding_count', embedding ? '✓' : '—');
    
    const ideal = getSavedIdeal();
    const hasIdealScales = ideal && ideal.searchScales;
    setCountBadge('ctx_ideal_count', hasIdealScales ? '✓' : '—');
    
    const hasExpectations = ideal && ideal.expectations;
    setCountBadge('ctx_expectations_count', hasExpectations ? '✓' : '—');
}

function setCountBadge(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = value;
        el.classList.toggle('has-data', value !== '—' && value !== 0);
    }
}

// ==================== СБОР КОНТЕКСТА ====================

function collectSelectedContext() {
    const context = [];
    
    if (document.getElementById('ctx_facts')?.checked) {
        const facts = getFactsForPrompt(false);
        if (facts && !facts.includes('(no ')) {
            context.push({
                title: '📋 ФАКТЫ О ПОЛЬЗОВАТЕЛЕ',
                content: facts
            });
        }
    }
    
    if (document.getElementById('ctx_traits')?.checked) {
        const traits = getTraitsForPrompt(false);
        if (traits && !traits.includes('(no ')) {
            context.push({
                title: '🧠 ЧЕРТЫ ХАРАКТЕРА',
                content: traits
            });
        }
    }
    
    if (document.getElementById('ctx_timeline')?.checked) {
        const timeline = getTimelineForPrompt();
        if (timeline && !timeline.includes('(no ')) {
            context.push({
                title: '📅 ХРОНОЛОГИЯ ЖИЗНИ',
                content: timeline
            });
        }
    }
    
    if (document.getElementById('ctx_hypotheses')?.checked) {
        const hypotheses = getHypothesesForPrompt(false);
        if (hypotheses && !hypotheses.includes('(no ')) {
            context.push({
                title: '💡 ГИПОТЕЗЫ И ИНСАЙТЫ',
                content: hypotheses
            });
        }
    }
    
    if (document.getElementById('ctx_social')?.checked) {
        const social = getSocialForPrompt();
        if (social && !social.includes('(no ')) {
            context.push({
                title: '👥 СОЦИАЛЬНЫЕ СВЯЗИ',
                content: social
            });
        }
    }
    
    if (document.getElementById('ctx_style')?.checked) {
        const style = localStorage.getItem(STORAGE_KEYS.style);
        if (style && style.trim()) {
            context.push({
                title: '🎭 СТИЛЬ ОБЩЕНИЯ',
                content: style
            });
        }
    }
    
    if (document.getElementById('ctx_embedding')?.checked) {
        const embedding = getSavedEmbedding();
        if (embedding) {
            const formattedEmbedding = formatEmbeddingForReport(embedding);
            context.push({
                title: '🧬 ЛИЧНОСТНЫЙ ЭМБЕДДИНГ (50 ШКАЛ)',
                content: formattedEmbedding
            });
        }
    }
    
    if (document.getElementById('ctx_ideal')?.checked) {
        const ideal = getSavedIdeal();
        if (ideal && ideal.searchScales) {
            const formattedIdeal = formatIdealScalesForReport(ideal.searchScales);
            context.push({
                title: '💫 ШКАЛЫ ИДЕАЛЬНОГО ПАРТНЁРА',
                content: formattedIdeal
            });
        }
    }
    
    if (document.getElementById('ctx_expectations')?.checked) {
        const ideal = getSavedIdeal();
        if (ideal && ideal.expectations) {
            context.push({
                title: '🎯 ОЖИДАНИЯ ОТ ПАРТНЁРА',
                content: ideal.expectations
            });
        }
    }
    
    return context;
}

// ==================== ФОРМАТИРОВАНИЕ ====================

function formatEmbeddingForReport(embedding) {
    let result = `Версия: ${embedding.version}\n`;
    result += `Создан: ${new Date(embedding.createdAt).toLocaleDateString('ru-RU')}\n`;
    result += `На основе ${embedding.factsCount} фактов\n\n`;
    
    result += '=== СПИСОК ШКАЛ (50 штук) ===\n\n';
    
    const categories = {};
    SCALES.forEach((scale, idx) => {
        if (!categories[scale.category]) {
            categories[scale.category] = [];
        }
        const vec = embedding.vectors[idx];
        categories[scale.category].push({
            id: scale.id,
            emoji: scale.emoji,
            name: scale.name,
            desc: scale.desc,
            value: vec?.value ?? 0.5,
            spread: vec?.spread ?? 0
        });
    });
    
    for (const [catKey, items] of Object.entries(categories)) {
        result += `\n${CATEGORY_LABELS[catKey] || catKey}:\n`;
        items.forEach(item => {
            const percent = (item.value * 100).toFixed(0);
            const reliability = item.spread <= 0.1 ? '✓' : item.spread <= 0.2 ? '~' : '?';
            result += `  ${item.emoji} ${item.name}: ${percent}% ${reliability} — ${item.desc}\n`;
        });
    }
    
    const high = embedding.vectors
        .map((v, i) => ({ idx: i, ...v }))
        .filter(v => v.value >= 0.7 && v.spread <= 0.15)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    
    const low = embedding.vectors
        .map((v, i) => ({ idx: i, ...v }))
        .filter(v => v.value <= 0.3 && v.spread <= 0.15)
        .sort((a, b) => a.value - b.value)
        .slice(0, 5);
    
    if (high.length > 0) {
        result += '\n🔥 ЯРКО ВЫРАЖЕНО:\n';
        high.forEach(v => {
            const scale = SCALES[v.idx];
            result += `  ${scale.emoji} ${scale.name}: ${(v.value * 100).toFixed(0)}%\n`;
        });
    }
    
    if (low.length > 0) {
        result += '\n🧊 СЛАБО ВЫРАЖЕНО:\n';
        low.forEach(v => {
            const scale = SCALES[v.idx];
            result += `  ${scale.emoji} ${scale.name}: ${(v.value * 100).toFixed(0)}%\n`;
        });
    }
    
    return result;
}

function formatIdealScalesForReport(searchScales) {
    let result = '=== СПИСОК ШКАЛ (50 штук) ===\n\n';
    
    SCALES.forEach(scale => {
        let marker = '  ';
        if (searchScales.high.includes(scale.id)) {
            marker = '🔥';
        } else if (searchScales.low.includes(scale.id)) {
            marker = '🧊';
        }
        result += `${marker} ${scale.id}. ${scale.emoji} ${scale.name} — ${scale.desc}\n`;
    });
    
    result += '\n=== КРИТЕРИИ ПОИСКА ===\n';
    
    result += '\n🔥 ДОЛЖНО БЫТЬ ВЫСОКИМ (≥ 70%):\n';
    searchScales.high.forEach(id => {
        const scale = SCALES.find(s => s.id === id);
        if (scale) {
            result += `  ${scale.emoji} ${scale.name}\n`;
        }
    });
    
    result += '\n🧊 ДОЛЖНО БЫТЬ НИЗКИМ (≤ 50%):\n';
    searchScales.low.forEach(id => {
        const scale = SCALES.find(s => s.id === id);
        if (scale) {
            result += `  ${scale.emoji} ${scale.name}\n`;
        }
    });
    
    return result;
}

// ==================== ГЕНЕРАЦИЯ ОТЧЁТОВ ====================

async function generateCustomReport() {
    const promptInput = document.getElementById('reportsPrompt');
    const userPrompt = promptInput?.value?.trim();
    
    if (!userPrompt) {
        alert('Введите промпт для генерации отчёта');
        return;
    }
    
    const context = collectSelectedContext();
    
    if (context.length === 0) {
        alert('Выберите хотя бы один источник данных');
        return;
    }
    
    const maxTokens = parseInt(document.getElementById('reportsMaxTokens')?.value) || 2000;
    const temperature = parseFloat(document.getElementById('reportsTemperature')?.value) || 0.7;
    
    await generateReportWithContext(context, userPrompt, maxTokens, temperature);
}

async function generateReportWithContext(context, userPrompt, maxTokens, temperature) {
    if (reportsState.isGenerating) return;
    
    const btn = document.getElementById('reportsGenerateBtn');
    const resultSection = document.getElementById('reportsResultSection');
    const resultDiv = document.getElementById('reportsResult');
    
    reportsState.isGenerating = true;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span> Генерирую...';
    }
    
    resultSection.style.display = 'block';
    resultDiv.innerHTML = '<div class="reports-loading"><div class="reports-spinner"></div><p>Генерирую отчёт...</p></div>';
    
    try {
        let fullPrompt = '=== КОНТЕКСТ ===\n\n';
        
        context.forEach(ctx => {
            fullPrompt += `--- ${ctx.title} ---\n${ctx.content}\n\n`;
        });
        
        fullPrompt += '=== ЗАДАЧА ===\n\n';
        fullPrompt += userPrompt;
        
        console.log('[Reports] Full prompt length:', fullPrompt.length);
        console.log('[Reports] Params: maxTokens=', maxTokens, 'temperature=', temperature);
        
        const streamingDiv = document.createElement('div');
        streamingDiv.className = 'reports-streaming-text';
        resultDiv.innerHTML = '';
        resultDiv.appendChild(streamingDiv);
        
        await streamResponseOpenRouter(
            [{ role: 'user', content: fullPrompt }],
            (partialText) => {
                streamingDiv.innerHTML = formatMessageMarkdown(partialText);
            },
            (finalText) => {
                streamingDiv.innerHTML = formatMessageMarkdown(finalText);
            },
            { 
                temperature: temperature,
                max_tokens: maxTokens
            }
        );
        
        console.log('[Reports] Generation complete');
        
    } catch (error) {
        console.error('[Reports] Generation failed:', error);
        resultDiv.innerHTML = `
            <div class="reports-error">
                <p>❌ Ошибка: ${error.message}</p>
                <button class="reports-btn" onclick="${reportsState.mode === 'user' ? 'generatePresetReport' : 'generateCustomReport'}()">🔄 Попробовать снова</button>
            </div>
        `;
    } finally {
        reportsState.isGenerating = false;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🚀 Сгенерировать отчёт';
        }
    }
}

// ==================== УТИЛИТЫ ====================

function copyReportToClipboard() {
    const resultDiv = document.getElementById('reportsResult');
    if (!resultDiv) return;
    
    const text = resultDiv.innerText || resultDiv.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        showReportsToast('✅ Скопировано!');
    }).catch(err => {
        console.error('[Reports] Copy failed:', err);
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showReportsToast('✅ Скопировано!');
        } catch (e) {
            showReportsToast('⚠️ Не удалось скопировать');
        }
        document.body.removeChild(textarea);
    });
}

function clearReportResult() {
    const resultSection = document.getElementById('reportsResultSection');
    const resultDiv = document.getElementById('reportsResult');
    if (resultSection) resultSection.style.display = 'none';
    if (resultDiv) resultDiv.innerHTML = '';
}

function showReportsToast(message) {
    const oldToast = document.querySelector('.reports-toast');
    if (oldToast) oldToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'reports-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 2500);
}

// ==================== ГЛОБАЛЬНЫЕ ЭКСПОРТЫ ====================

window.openReportsModal = openReportsModal;
window.closeReportsModal = closeReportsModal;
window.switchReportsMode = switchReportsMode;
window.generateCustomReport = generateCustomReport;
window.generatePresetReport = generatePresetReport;
window.copyReportToClipboard = copyReportToClipboard;
window.clearReportResult = clearReportResult;

console.log('[reports.js] Loaded. Dual-mode report generator ready.');