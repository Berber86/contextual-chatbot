// reports.js - модуль генерации отчётов
// Позволяет создавать кастомные отчёты с выбором контекста из localStorage

// ==================== КОНСТАНТЫ ====================
const REPORTS_STORAGE_KEY = 'chatbot_reports_history';

// ==================== СОСТОЯНИЕ ====================
let reportsState = {
    isGenerating: false
};

// ==================== UI ФУНКЦИИ ====================

function openReportsModal() {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        updateContextCounts();
        initTemperatureSlider();
    }
}

function closeReportsModal() {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
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
    // Факты
    const factsData = getFactsData();
    const factsCount = factsData.facts ? factsData.facts.filter(f => !f.superseded).length : 0;
    setCountBadge('ctx_facts_count', factsCount);
    
    // Черты
    const traitsData = getTraitsData();
    const traitsCount = traitsData.traits ? traitsData.traits.filter(t => !t.superseded).length : 0;
    setCountBadge('ctx_traits_count', traitsCount);
    
    // Хронология
    const timelineData = getTimelineData();
    const timelineCount = timelineData.events ? timelineData.events.filter(e => !e.superseded).length : 0;
    setCountBadge('ctx_timeline_count', timelineCount);
    
    // Гипотезы
    const hypothesesData = getHypothesesData();
    const hypothesesCount = hypothesesData.hypotheses ? hypothesesData.hypotheses.length : 0;
    setCountBadge('ctx_hypotheses_count', hypothesesCount);
    
    // Социалка
    const socialData = getSocialData();
    const socialCount = socialData.contacts ? socialData.contacts.length : 0;
    setCountBadge('ctx_social_count', socialCount);
    
    // Стиль общения
    const style = localStorage.getItem(STORAGE_KEYS.style);
    setCountBadge('ctx_style_count', style && style.trim() ? '✓' : '—');
    
    // Мой эмбеддинг
    const embedding = getSavedEmbedding();
    setCountBadge('ctx_embedding_count', embedding ? '✓' : '—');
    
    // Идеальный партнёр (шкалы)
    const ideal = getSavedIdeal();
    const hasIdealScales = ideal && ideal.searchScales;
    setCountBadge('ctx_ideal_count', hasIdealScales ? '✓' : '—');
    
    // Ожидания от партнёра (текст)
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
    
    // Факты
    if (document.getElementById('ctx_facts')?.checked) {
        const facts = getFactsForPrompt(false);
        if (facts && !facts.includes('(no ')) {
            context.push({
                title: '📋 ФАКТЫ О ПОЛЬЗОВАТЕЛЕ',
                content: facts
            });
        }
    }
    
    // Черты характера
    if (document.getElementById('ctx_traits')?.checked) {
        const traits = getTraitsForPrompt(false);
        if (traits && !traits.includes('(no ')) {
            context.push({
                title: '🧠 ЧЕРТЫ ХАРАКТЕРА',
                content: traits
            });
        }
    }
    
    // Хронология
    if (document.getElementById('ctx_timeline')?.checked) {
        const timeline = getTimelineForPrompt();
        if (timeline && !timeline.includes('(no ')) {
            context.push({
                title: '📅 ХРОНОЛОГИЯ ЖИЗНИ',
                content: timeline
            });
        }
    }
    
    // Гипотезы
    if (document.getElementById('ctx_hypotheses')?.checked) {
        const hypotheses = getHypothesesForPrompt(false);
        if (hypotheses && !hypotheses.includes('(no ')) {
            context.push({
                title: '💡 ГИПОТЕЗЫ И ИНСАЙТЫ',
                content: hypotheses
            });
        }
    }
    
    // Социалка
    if (document.getElementById('ctx_social')?.checked) {
        const social = getSocialForPrompt();
        if (social && !social.includes('(no ')) {
            context.push({
                title: '👥 СОЦИАЛЬНЫЕ СВЯЗИ',
                content: social
            });
        }
    }
    
    // Стиль общения
    if (document.getElementById('ctx_style')?.checked) {
        const style = localStorage.getItem(STORAGE_KEYS.style);
        if (style && style.trim()) {
            context.push({
                title: '🎭 СТИЛЬ ОБЩЕНИЯ',
                content: style
            });
        }
    }
    
    // Мой эмбеддинг
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
    
    // Идеальный партнёр (шкалы)
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
    
    // Ожидания от партнёра
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

// ==================== ФОРМАТИРОВАНИЕ ЭМБЕДДИНГОВ ====================

function formatEmbeddingForReport(embedding) {
    let result = `Версия: ${embedding.version}\n`;
    result += `Создан: ${new Date(embedding.createdAt).toLocaleDateString('ru-RU')}\n`;
    result += `На основе ${embedding.factsCount} фактов\n\n`;
    
    result += '=== СПИСОК ШКАЛ (50 штук) ===\n\n';
    
    // Группируем по категориям
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
    
    // Выделяем яркие и слабые
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
    
    // Сначала перечислим все шкалы с пометками
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

// ==================== ГЕНЕРАЦИЯ ОТЧЁТА ====================

async function generateReport() {
    if (reportsState.isGenerating) return;
    
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
    
    // Параметры
    const maxTokens = parseInt(document.getElementById('reportsMaxTokens')?.value) || 2000;
    const temperature = parseFloat(document.getElementById('reportsTemperature')?.value) || 0.7;
    
    // UI
    const btn = document.getElementById('reportsGenerateBtn');
    const resultSection = document.getElementById('reportsResultSection');
    const resultDiv = document.getElementById('reportsResult');
    
    reportsState.isGenerating = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Генерирую...';
    
    resultSection.style.display = 'block';
    resultDiv.innerHTML = '<div class="reports-loading"><div class="reports-spinner"></div><p>Генерирую отчёт...</p></div>';
    
    try {
        // Формируем полный промпт
        let fullPrompt = '=== КОНТЕКСТ ===\n\n';
        
        context.forEach(ctx => {
            fullPrompt += `--- ${ctx.title} ---\n${ctx.content}\n\n`;
        });
        
        fullPrompt += '=== ЗАДАЧА ===\n\n';
        fullPrompt += userPrompt;
        
        console.log('[Reports] Full prompt length:', fullPrompt.length);
        console.log('[Reports] Params: maxTokens=', maxTokens, 'temperature=', temperature);
        
        // Стриминг
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
                <button class="reports-btn" onclick="generateReport()">🔄 Попробовать снова</button>
            </div>
        `;
    } finally {
        reportsState.isGenerating = false;
        btn.disabled = false;
        btn.innerHTML = '🚀 Сгенерировать отчёт';
    }
}

// ==================== УТИЛИТЫ ====================

function copyReportToClipboard() {
    const resultDiv = document.getElementById('reportsResult');
    if (!resultDiv) return;
    
    // Получаем текст без HTML
    const text = resultDiv.innerText || resultDiv.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        showReportsToast('✅ Скопировано!');
    }).catch(err => {
        console.error('[Reports] Copy failed:', err);
        // Fallback
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
window.generateReport = generateReport;
window.copyReportToClipboard = copyReportToClipboard;
window.clearReportResult = clearReportResult;

console.log('[reports.js] Loaded. Custom report generator ready.');