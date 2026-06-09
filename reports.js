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
        description: 'Анализ того, какие качества партнёра принесут реальное счастье в долгосрочной перспективе, а не яркую влюблённость',
        requiredContext: ['ctx_embedding', 'ctx_ideal', 'ctx_expectations'],
        prompt: `Найди три места где пользователь может обманывать сам себя в отношении качеств идеального партнёра. Но не пиши об этом, а сразу начни с того что предоставь три другие возможно даже прямо противоположные от ожиданий конкретных качества действительно нужного ему партнёра. Ответь простым понятным языком без каких либо цифр и процентов.`,
        maxTokens: 5000,
        temperature: 0.6
    },
    {
        id: 'shadow_self',
        title: 'Моя тёмная сторона',
        icon: '🌑',
        description: 'Честный анализ ваших противоречий, слепых зон и того, что вы предпочитаете не замечать в себе',
        requiredContext: ['ctx_facts', 'ctx_traits', 'ctx_hypotheses'],
        prompt: `На основе накопленных данных о пользователе, определи 3-5 его теневых качеств — тех черт и паттернов, которые он сам скорее всего не осознаёт или не хочет признавать. Это могут быть:
- Противоречия между словами и действиями
- Защитные механизмы и самообман
- Подавленные желания или страхи
- Повторяющиеся деструктивные паттерны

Пиши максимально честно, но с эмпатией. Не обвиняй — помогай увидеть. Каждую теневую черту сопровождай конкретным примером из его данных и объяснением, почему это важно осознать. Используй простой язык без психологического жаргона.`,
        maxTokens: 4000,
        temperature: 0.7
    },
    {
        id: 'life_decisions_decoder',
        title: 'Дешифратор моих решений',
        icon: '🔐',
        description: 'Раскрывает скрытые мотивы и истинные причины ваших жизненных выборов',
        requiredContext: ['ctx_facts', 'ctx_traits', 'ctx_timeline', 'ctx_hypotheses'],
        prompt: `Проанализируй хронологию жизни пользователя вместе с его чертами характера и гипотезами. Найди паттерн принятия решений:

1. Какими НАСТОЯЩИМИ ценностями (а не декларируемыми) он руководствуется при выборе?
2. Какие страхи или убеждения влияют на его решения незаметно для него самого?
3. Есть ли повторяющийся сценарий в его ключевых жизненных поворотах?

Приведи 2-3 конкретных примера из его хронологии и покажи, как его черты проявились в этих решениях. Помоги ему увидеть невидимый алгоритм своей жизни. Пиши как мудрый друг, а не как учебник психологии.`,
        maxTokens: 5000,
        temperature: 0.65
    },
    {
        id: 'energy_vampires',
        title: 'Кто крадёт мою энергию?',
        icon: '🧛',
        description: 'Анализ социальных связей: какие люди и ситуации истощают вас, а какие наполняют',
        requiredContext: ['ctx_social', 'ctx_traits', 'ctx_facts'],
        prompt: `На основе социальных связей пользователя и его черт характера, определи:

1. **Энергетические вампиры** — какие люди или типы отношений истощают его? Почему именно его личность уязвима перед ними?

2. **Источники энергии** — с кем или в каких ситуациях он подзаряжается? Что в этих отношениях резонирует с его сутью?

3. **Невидимые ловушки** — какие социальные роли он играет из чувства долга, вопреки своей природе?

Будь конкретен: называй типы людей из его окружения (не по именам, а по ролям и качествам). Дай практический совет, как защитить границы или перестроить отношения. Говори прямо, но заботливо.`,
        maxTokens: 4500,
        temperature: 0.7
    },
    {
        id: 'conflict_manual',
        title: 'Инструкция по мне для конфликтов',
        icon: '⚔️',
        description: 'Руководство для близких: как с вами ссориться, мириться и решать проблемы',
        requiredContext: ['ctx_traits', 'ctx_embedding'],
        prompt: `Представь, что пишешь мроничную нескучную небанальную и нетривиальную инструкцию для близкого человека пользователя, но совершенно не знакомого с деталями и языком увлечений юзера. тоесть если юзер программист, то инструкция долдна быть написана для не программиста, а гуманитария!: "Как обращаться с этим человеком в конфликте".

будь полностью свободен в повествовании(для мемной атмосферы) но по возможности опиши:

1. **Что его триггерит**
2. **Как он ведёт себя в ссоре**
3. **Что ему РЕАЛЬНО нужно** 
4. **Чего делать нельзя**

Пиши ясно и понятно для стороннего человека друга юзера который подчеркнуто  совершенно не разбирается в деталях увлечения юзера. не перегружай читателя контекстом о юзере. будь уместно ироничен


КРИТИЧЕСКРЕ ПРАВИЛО!!! Пиши стилем изложения демонстративно и нарочито прямо противоположном увлечениям и типажу юзера: если юзер технарь, то не используй технических терминов, а только гуманитарные. если юзер очень умный, то стиль должен быть например как для его старого простого друга любителя пить с ним пиво и т.п. `,
        maxTokens: 4000,
        temperature: 0.75
    },
    {
        id: 'burnout_predictor',
        title: 'Карта моего выгорания',
        icon: '🔥',
        description: 'Персональныйх прогноз выгорания: ваши триггеры, ранние признаки и способы восстановления',
        requiredContext: ['ctx_traits', 'ctx_facts', 'ctx_timeline', 'ctx_hypotheses'],
        prompt: `На основе личности пользователя, его образа жизни и истории создай персональную карту выгорания:

1. **Профиль риска** — какие именно его черты делают его уязвимым к выгоранию? (Например: перфекционизм + низкие границы = работа до упора)

2. **Ранние симптомы** — как выгорание будет проявляться КОНКРЕТНО у него, учитывая его тип личности? (У одних — раздражительность, у других — апатия, у третьих — бегство в работу ещё глубже)

3. **Триггеры** — какие ситуации из его жизни запускают выгорание быстрее всего?

4. **Персональная аптечка** — что поможет восстановиться ИМЕННО ему? (Учитывай интроверсию/экстраверсию, потребность в контроле, способы обработки эмоций)

Не давай общих советов в стиле "высыпайтесь и гуляйте". Используй его реальные данные. Пиши как врач, который знает историю болезни конкретного пациента.`,
        maxTokens: 5000,
        temperature: 0.6
    },
    {
        id: 'yelow_angel',
        title: 'Романс Вертинского о тебе',
        icon: '🕯️👼',
        description: 'Трогающая душу песня. Рифма и смыслы в ней страдают. Как и ты',
        requiredContext: ['ctx_traits', 'ctx_facts'],
        prompt: `Прочти стихотворение Вертинского 1934 года, улови его повествовательную структуру и смысл и душевную точность.
Напиши свой стих про юзера,  косвенно вдохновившись этим стихом, но очень другой. : 
Желтый Ангел
В вечерних ресторанах,
В парижских балаганах,
В дешевом электрическом раю,
Всю ночь ломаю руки
От ярости и муки
И людям что-то жалобно пою.
Звенят, гудят джаз-банды,
И злые обезьяны
Мне скалят искалеченные рты.
А я, кривой и пьяный,
Зову их в океаны
И сыплю им в шампанское цветы.
А когда наступит утро, я бреду бульваром сонным,
Где в испуге даже дети убегают от меня.
Я усталый, старый клоун, я машу мечом картонным,
И лучах моей короны умирает светоч дня.
Звенят, гудят джаз-банды,
Танцуют обезьяны
И бешено встречают Рождество.
А я, кривой и пьяный,
Заснул у фортепьяно
Под этот дикий гул и торжество.
На башне бьют куранты,
Уходят музыканты,
И елка догорела до конца.
Лакеи тушат свечи,
Давно замолкли речи,
И я уж не могу поднять лица.
И тогда с потухшей елки тихо спрыгнул желтый Ангел
И сказал: «Маэстро бедный, Вы устали, Вы больны.
Говорят, что Вы в притонах по ночам поете танго.
Даже в нашем добром небе были все удивлены».
И, закрыв лицо руками, я внимал жестокой речи,
Утирая фраком слезы, слезы боли и стыда.
А высоко в синем небе догорали божьи свечи
И печальный желтый Ангел тихо таял без следа.
`,
        maxTokens: 5000,
        temperature: 0.8
    }
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
    // Собираем ВСЕ доступные регистры
    const availability = {
        hasEmbedding: !!getSavedEmbedding(),
        hasIdeal: !!(getSavedIdeal()?.searchScales),
        hasExpectations: !!(getSavedIdeal()?.expectations),
        hasFacts: (getFactsData().facts?.filter(f => !f.superseded).length || 0) > 0,
        hasTraits: (getTraitsData().traits?.filter(t => !t.superseded).length || 0) > 0,
        hasTimeline: (getTimelineData().events?.filter(e => !e.superseded).length || 0) > 0,
        hasHypotheses: (getHypothesesData().hypotheses?.length || 0) > 0,
        hasSocial: (getSocialData().contacts?.length || 0) > 0,
        hasStyle: !!(localStorage.getItem(STORAGE_KEYS.style)?.trim())
    };
    
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
        
        <section class="reports-hero">
            <div>
                <h3>Готовые персональные отчёты</h3>
                <p>Выберите сценарий. Каждый отчёт берёт только те регистры памяти, которые указаны в карточке, и не стартует без нужных данных.</p>
            </div>
            <div class="reports-hero-stats">
                <span>${PRESET_REPORTS.length} отчётов</span>
                <span>${Object.values(availability).filter(Boolean).length}/9 источников</span>
            </div>
        </section>

        <div class="reports-user-content">
            ${PRESET_REPORTS.map(preset => renderPresetCard(preset, availability)).join('')}
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
    // Маппинг контекстов на availability
    const contextMap = {
        'ctx_embedding': availability.hasEmbedding,
        'ctx_ideal': availability.hasIdeal,
        'ctx_expectations': availability.hasExpectations,
        'ctx_facts': availability.hasFacts,
        'ctx_traits': availability.hasTraits,
        'ctx_timeline': availability.hasTimeline,
        'ctx_hypotheses': availability.hasHypotheses,
        'ctx_social': availability.hasSocial,
        'ctx_style': availability.hasStyle
    };
    
    const canGenerate = preset.requiredContext.every(ctx => contextMap[ctx]);
    const missingData = preset.requiredContext.filter(ctx => !contextMap[ctx]);
    
    const missingHints = {
        'ctx_embedding': 'Создайте эмбеддинг во вкладке "🎯 Мой профиль"',
        'ctx_ideal': 'Заполните "💫 Кто мне нужен?"',
        'ctx_expectations': 'Заполните "💫 Кто мне нужен?"',
        'ctx_facts': 'Пообщайтесь с ботом, накопите факты о себе',
        'ctx_traits': 'Расскажите боту о себе, чтобы он понял ваш характер',
        'ctx_timeline': 'Упомяните события из вашей жизни',
        'ctx_hypotheses': 'Нужно минимум 16 сообщений для генерации гипотез',
        'ctx_social': 'Расскажите о людях в вашей жизни',
        'ctx_style': 'Нужно минимум 10 сообщений для определения стиля'
    };

    const contextLabels = {
        'ctx_embedding': 'эмбеддинг',
        'ctx_ideal': 'идеал',
        'ctx_expectations': 'ожидания',
        'ctx_facts': 'факты',
        'ctx_traits': 'черты',
        'ctx_timeline': 'хронология',
        'ctx_hypotheses': 'гипотезы',
        'ctx_social': 'социалка',
        'ctx_style': 'стиль'
    };
    
    return `
        <article class="preset-card ${canGenerate ? 'preset-ready' : 'preset-disabled'}">
            <div class="preset-icon" aria-hidden="true">${preset.icon}</div>
            <div class="preset-info">
                <div class="preset-title-row">
                    <h3 class="preset-title">${preset.title}</h3>
                    <span class="preset-status-chip ${canGenerate ? 'preset-status-ready' : 'preset-status-locked'}">
                        ${canGenerate ? 'готов' : 'нужны данные'}
                    </span>
                </div>
                <p class="preset-description">${preset.description}</p>
                <div class="preset-context-chips">
                    ${preset.requiredContext.map(ctx => `<span class="preset-context-chip ${contextMap[ctx] ? 'available' : 'missing'}">${contextLabels[ctx] || ctx}</span>`).join('')}
                </div>
                ${!canGenerate ? `
                    <div class="preset-requirements">
                        <span class="req-label">Что нужно добавить:</span>
                        ${missingData.map(ctx => `<span class="req-hint">${missingHints[ctx]}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <button 
                class="preset-generate-btn" 
                ${canGenerate ? '' : 'disabled'} 
                onclick="generatePresetReport('${preset.id}')"
            >
                ${canGenerate ? 'Сгенерировать' : 'Недоступно'}
            </button>
        </article>
    `;
}
async function generatePresetReport(presetId) {
    const preset = PRESET_REPORTS.find(p => p.id === presetId);
    if (!preset) return;
    
    // Собираем нужный контекст
    const context = [];
    
    if (preset.requiredContext.includes('ctx_facts')) {
        const facts = getFactsForPrompt(false);
        if (facts && !facts.includes('(no ')) {
            context.push({
                title: '📋 ФАКТЫ О ПОЛЬЗОВАТЕЛЕ',
                content: facts
            });
        }
    }
    
    if (preset.requiredContext.includes('ctx_traits')) {
        const traits = getTraitsForPrompt(false);
        if (traits && !traits.includes('(no ')) {
            context.push({
                title: '🧠 ЧЕРТЫ ХАРАКТЕРА',
                content: traits
            });
        }
    }
    
    if (preset.requiredContext.includes('ctx_timeline')) {
        const timeline = getTimelineForPrompt();
        if (timeline && !timeline.includes('(no ')) {
            context.push({
                title: '📅 ХРОНОЛОГИЯ ЖИЗНИ',
                content: timeline
            });
        }
    }
    
    if (preset.requiredContext.includes('ctx_hypotheses')) {
        const hypotheses = getHypothesesForPrompt(false);
        if (hypotheses && !hypotheses.includes('(no ')) {
            context.push({
                title: '💡 ГИПОТЕЗЫ И ИНСАЙТЫ',
                content: hypotheses
            });
        }
    }
    
    if (preset.requiredContext.includes('ctx_social')) {
        const social = getSocialForPrompt();
        if (social && !social.includes('(no ')) {
            context.push({
                title: '👥 СОЦИАЛЬНЫЕ СВЯЗИ',
                content: social
            });
        }
    }
    
    if (preset.requiredContext.includes('ctx_style')) {
        const style = localStorage.getItem(STORAGE_KEYS.style);
        if (style && style.trim()) {
            context.push({
                title: '🎭 СТИЛЬ ОБЩЕНИЯ',
                content: style
            });
        }
    }
    
    if (preset.requiredContext.includes('ctx_embedding')) {
        const embedding = getSavedEmbedding();
        if (embedding) {
            const formattedEmbedding = formatEmbeddingForReport(embedding);
            context.push({
                title: '🧬 ЛИЧНОСТНЫЙ ЭМБЕДДИНГ (50 ШКАЛ)',
                content: formattedEmbedding
            });
        }
    }
    
    if (preset.requiredContext.includes('ctx_ideal')) {
        const ideal = getSavedIdeal();
        if (ideal?.searchScales) {
            const formattedIdeal = formatIdealScalesForReport(ideal.searchScales);
            context.push({
                title: '💫 ШКАЛЫ ИДЕАЛЬНОГО ПАРТНЁРА',
                content: formattedIdeal
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
    
    console.log(`[Reports] Preset "${preset.id}" context blocks:`, context.length);
    
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
        
        <section class="reports-hero reports-builder-hero">
            <div>
                <h3>Конструктор отчёта</h3>
                <p>Соберите контекст вручную и задайте собственную задачу. Используйте этот режим для экспериментов, проверки промптов и разовых аналитических запросов.</p>
            </div>
            <div class="reports-hero-stats">
                <span>ручной режим</span>
                <span>dev</span>
            </div>
        </section>

        <!-- Контекст -->
        <div class="reports-context-section">
            <div class="reports-section-title">📎 Источники данных:</div>
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
    
    // Показываем ожидание с инструкцией
    resultDiv.innerHTML = `
        <div class="reports-loading">
            <div class="reports-spinner"></div>
            <p><strong>Генерирую персональный отчёт...</strong></p>
            <p class="reports-wait-hint">Это может занять 30-60 секунд. Анализируем ваши данные и формируем глубокий ответ.</p>
            <p class="reports-wait-hint">☕ Самое время налить чаю</p>
        </div>
    `;
    
    // 🔥 СКРОЛЛИМ К РЕЗУЛЬТАТУ
    setTimeout(() => {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
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
                <button class="reports-btn" onclick="${reportsState.mode === 'user' ? `generatePresetReport('${context.presetId}')` : 'generateCustomReport()'}">🔄 Попробовать снова</button>
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