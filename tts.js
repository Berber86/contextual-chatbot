// tts.js — озвучка ответов бота (HeyGen Voice Turbo через OpenRouter, /api/tts).
// Поток: у каждого ответа бота появляется кнопка «🔊 Озвучить» → текст чистится от markdown →
// POST /api/tts → сервер стримит сырой PCM (16 бит, 44.1 кГц, моно) → клиент оборачивает его
// в WAV и воспроизводит. Повторный клик во время воспроизведения — стоп. Голос выбирается
// в настройках (10 стандартных голосов HeyGen), по умолчанию gareth.
(function () {
    'use strict';

    const TTS_URL = '/api/tts';
    const MAX_CHARS = 12000;          // 3 куска по 5000 — потолок серверной функции
    const VOICES = ['gareth', 'weston', 'lucian', 'bram', 'vincent', 'nadine', 'tabitha', 'noelle', 'meredith', 'sabrina'];
    const DEFAULT_VOICE = 'gareth';
    const VOICE_STORAGE_KEY = (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS.ttsVoice) || 'chatbot_tts_voice';

    let activeAudio = null;    // текущее воспроизведение
    let activeBtn = null;      // кнопка текущего воспроизведения
    let activeAbort = null;    // контроллер текущего запроса
    let statusTimer = null;

    const $ = (id) => document.getElementById(id);

    function tr(key, fallback) {
        try { return (typeof t === 'function' && t(key)) || fallback; } catch (_) { return fallback; }
    }

    // ---- статусная строка над полем ввода (общая с голосовым вводом) ----
    function setStatus(text) {
        const e = $('voiceStatus');
        const row = $('voiceStatusRow');
        if (e) e.textContent = text || '';
        if (row) row.style.display = text ? 'block' : 'none';
        if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
        if (text) statusTimer = setTimeout(() => {
            const el = $('voiceStatus');
            const r = $('voiceStatusRow');
            if (el) el.textContent = '';
            if (r) r.style.display = 'none';
        }, 6000);
    }

    // ==================== ЧИСТКА ТЕКСТА ДЛЯ РЕЧИ ====================
    // [TTS-PURE-START]
    function textForSpeech(md) {
        let s = String(md || '');

        // Код не читаем — ни блоками, ни инлайном
        s = s.replace(/```[\s\S]*?(```|$)/g, ' ');
        s = s.replace(/~~~[\s\S]*?(~~~|$)/g, ' ');
        s = s.replace(/`([^`\n]+)`/g, ' ');

        // Изображения и ссылки: [текст](url) → текст, голые URL выкидываем
        s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
        s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        s = s.replace(/https?:\/\/\S+/g, ' ');

        // Заголовки, цитаты, маркеры списков, номера
        s = s.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '');
        s = s.replace(/^[ \t]*>[ \t]?/gm, '');
        s = s.replace(/^[ \t]*[-*•–—][ \t]+/gm, '');
        s = s.replace(/^[ \t]*\d+[.)][ \t]+/gm, '');

        // Разделители и таблицы
        s = s.replace(/^[ \t]*([-*_][ \t]*){3,}$/gm, ' ');
        s = s.replace(/^[ \t]*\|?[ \t:|-]*-[ \t:|-]*\|[ \t:|-]*$/gm, ' ');  // строка-разделитель таблицы
        s = s.replace(/^[ \t]*\|[ \t]*/gm, '');   // ведущая труба строки таблицы
        s = s.replace(/[ \t]*\|[ \t]*$/gm, '');   // замыкающая труба
        s = s.replace(/[ \t]*\|[ \t]*/g, ', ');   // внутренние разделители ячеек

        // Выделения: **жирный**, *курсив*, __жирный__, _курсив_, ==маркер==, ~~зачёркнутый~~, ||спойлер||
        s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
        s = s.replace(/__([^_]+)__/g, '$1');
        s = s.replace(/\*([^*\n]+)\*/g, '$1');
        s = s.replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,!?;:])/g, '$1$2');
        s = s.replace(/==([^=]+)==/g, '$1');
        s = s.replace(/~~([^~]+)~~/g, '$1');
        s = s.replace(/\|\|([^|]+)\|\|/g, '$1');

        // Служебная разметка: сноски [^1], kbd [[x]], формулы $...$
        s = s.replace(/\[\^[^\]]+\]/g, ' ');
        s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');
        s = s.replace(/\$\$([^$]+)\$\$/g, '$1');
        s = s.replace(/\$([^$\n]+)\$/g, '$1');

        // Остатки html-тегов
        s = s.replace(/<\/?[a-z][^>]*>/gi, ' ');

        // Эмодзи и прочие неречевые символы
        s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{FE0E}\u{FE0D}]/gu, ' ');
        s = s.replace(/[☑☐✔✗✓☑]/g, ' ');

        // Пробелы
        s = s.replace(/\r/g, '');
        s = s.replace(/[ \t]+/g, ' ');
        s = s.replace(/ *\n */g, '\n');
        s = s.replace(/\n{3,}/g, '\n\n');
        return s.trim();
    }

    // Сырой PCM (16 бит, little-endian) → WAV-файл (Blob)
    function pcmToWav(pcmBytes, sampleRate, channels) {
        const rate = sampleRate || 44100;
        const ch = channels || 1;
        const bytesPerSample = 2;
        const blockAlign = ch * bytesPerSample;
        const dataLength = pcmBytes.length;
        const buffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(buffer);

        const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };

        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);          // размер блока fmt
        view.setUint16(20, 1, true);           // PCM
        view.setUint16(22, ch, true);
        view.setUint32(24, rate, true);
        view.setUint32(28, rate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);          // бит на сэмпл
        writeStr(36, 'data');
        view.setUint32(40, dataLength, true);

        new Uint8Array(buffer, 44).set(pcmBytes);
        return new Blob([buffer], { type: 'audio/wav' });
    }
    // [TTS-PURE-END]

    // ==================== ГОЛОС (настройка) ====================
    window.getTTSVoice = function () {
        try {
            const v = localStorage.getItem(VOICE_STORAGE_KEY);
            return VOICES.includes(v) ? v : DEFAULT_VOICE;
        } catch (_) { return DEFAULT_VOICE; }
    };

    window.setTTSVoice = function (voice) {
        const v = VOICES.includes(voice) ? voice : DEFAULT_VOICE;
        try { localStorage.setItem(VOICE_STORAGE_KEY, v); } catch (_) {}
        const select = $('ttsVoice');
        if (select) select.value = v;
        // Смена голоса — стопим текущее и сбрасываем кэш аудио у всех кнопок
        window.stopAllSpeech();
        document.querySelectorAll('.msg-tts-btn').forEach((btn) => {
            if (btn._ttsUrl) { try { URL.revokeObjectURL(btn._ttsUrl); } catch (_) {} }
            btn._ttsUrl = null;
            btn._ttsVoice = null;
        });
    };

    // ==================== КНОПКА «ОЗВУЧИТЬ» ====================
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // Вызывается из ui.js (appendMessage / finalizeStreamingMessage) для ответов бота
    window.addTTSButton = function (msgEl, rawText) {
        if (!msgEl || typeof rawText !== 'string' || !rawText.trim()) return;
        if (msgEl.querySelector('.msg-tts-btn')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'msg-tts-btn';
        btn.dataset.state = 'idle';
        const label = tr('ttsSpeak', 'Озвучить');
        btn.title = label;
        btn.setAttribute('aria-label', label);
        btn.innerHTML =
            '<svg class="icon" aria-hidden="true"><use href="#i-speaker"></use></svg>' +
            '<span class="msg-tts-label" data-i18n="ttsSpeak">' + escapeHtml(label) + '</span>';
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleSpeech(btn, rawText);
        });
        msgEl.appendChild(btn);
    };

    function setBtnState(btn, state) {
        if (!btn) return;
        btn.dataset.state = state;
        btn.classList.toggle('loading', state === 'loading');
        btn.classList.toggle('playing', state === 'playing');
        const use = btn.querySelector('use');
        if (use) use.setAttribute('href', state === 'playing' ? '#i-stop-speech' : '#i-speaker');
        const label = btn.querySelector('.msg-tts-label');
        const text = state === 'playing'
            ? tr('ttsStop', 'Остановить')
            : (state === 'loading' ? tr('ttsLoading', 'Готовлю…') : tr('ttsSpeak', 'Озвучить'));
        if (label) label.textContent = text;
        btn.title = text;
        btn.setAttribute('aria-label', text);
    }

    // ==================== ВОСПРОИЗВЕДЕНИЕ ====================
    function toggleSpeech(btn, rawText) {
        // Клик по играющей кнопке → стоп
        if (btn.dataset.state === 'playing') {
            window.stopAllSpeech();
            return;
        }
        // Клик по кнопке в загрузке → отмена
        if (btn.dataset.state === 'loading') {
            if (activeAbort) { try { activeAbort.abort(); } catch (_) {} }
            resetActive();
            return;
        }
        playMessage(btn, rawText);
    }

    async function playMessage(btn, rawText) {
        let text = textForSpeech(rawText);
        if (!text) {
            setStatus('⚠️ ' + tr('ttsErrNothing', 'Здесь нечего озвучивать'));
            return;
        }

        let truncated = false;
        if (text.length > MAX_CHARS) {
            const cut = text.slice(0, MAX_CHARS);
            const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('.'));
            text = lastStop > MAX_CHARS * 0.5 ? cut.slice(0, lastStop + 1) : cut;
            truncated = true;
        }

        // Останавливаем предыдущее воспроизведение
        window.stopAllSpeech();

        const voice = window.getTTSVoice();

        // Кэш: тот же текст тем же голосом уже озвучен
        if (btn._ttsUrl && btn._ttsVoice === voice && btn._ttsText === text) {
            startPlayback(btn, btn._ttsUrl);
            return;
        }
        if (btn._ttsUrl) { try { URL.revokeObjectURL(btn._ttsUrl); } catch (_) {} btn._ttsUrl = null; }

        setBtnState(btn, 'loading');
        setStatus('🔊 ' + (truncated
            ? tr('ttsTruncated', 'Текст длинный — озвучу только первую часть') + '…'
            : tr('ttsStatusLoading', 'Озвучиваю ответ…')));

        activeBtn = btn;
        activeAbort = new AbortController();

        try {
            const resp = await fetch(TTS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, voice: voice }),
                signal: activeAbort.signal
            });

            const contentType = resp.headers.get('content-type') || '';
            if (!resp.ok || contentType.includes('application/json')) {
                const data = await resp.json().catch(() => ({}));
                throw ttsError(data.error || ('HTTP ' + resp.status), resp.status);
            }

            const rate = parseInt(resp.headers.get('x-tts-rate'), 10) || 44100;
            const channels = parseInt(resp.headers.get('x-tts-channels'), 10) || 1;
            const pcm = new Uint8Array(await resp.arrayBuffer());
            // 16 бит * 44100 Гц ≈ 5.3 КБ на 0.03 с — короче секунды это точно не речь
            if (pcm.length < 88200 / 4) {
                throw ttsError(tr('ttsErrEmpty', 'Модель вернула слишком короткое аудио — попробуйте ещё раз'), 0);
            }

            const url = URL.createObjectURL(pcmToWav(pcm, rate, channels));
            btn._ttsUrl = url;
            btn._ttsVoice = voice;
            btn._ttsText = text;
            startPlayback(btn, url);
        } catch (e) {
            if (e && e.name === 'AbortError') return;
            console.error('[TTS] error', e);
            setBtnState(btn, 'idle');
            if (activeBtn === btn) resetActive();
            setStatus('⚠️ ' + (e && e.message ? e.message : tr('ttsErrNetwork', 'Ошибка озвучки')));
        }
    }

    function startPlayback(btn, url) {
        const audio = new Audio(url);
        activeAudio = audio;
        activeBtn = btn;
        setBtnState(btn, 'playing');
        setStatus('');   // убираем «Озвучиваю…» — воспроизведение пошло
        audio.onended = () => { if (activeBtn === btn) { resetActive(); setBtnState(btn, 'idle'); } };
        audio.onerror = () => {
            if (activeBtn === btn) { resetActive(); setBtnState(btn, 'idle'); }
            setStatus('⚠️ ' + tr('ttsErrPlayback', 'Не удалось воспроизвести аудио'));
        };
        const p = audio.play();
        if (p && p.catch) p.catch(() => {
            if (activeBtn === btn) { resetActive(); setBtnState(btn, 'idle'); }
            setStatus('⚠️ ' + tr('ttsErrPlayback', 'Не удалось воспроизвести аудио'));
        });
    }

    function resetActive() {
        if (activeAudio) { try { activeAudio.pause(); } catch (_) {} }
        activeAudio = null;
        if (activeBtn && activeBtn.dataset.state !== 'idle') setBtnState(activeBtn, 'idle');
        activeBtn = null;
        activeAbort = null;
    }

    window.stopAllSpeech = function () {
        if (activeAbort) { try { activeAbort.abort(); } catch (_) {} }
        resetActive();
    };

    // Дружелюбные сообщения для типовых ошибок OpenRouter
    function ttsError(message, status) {
        let msg = String(message || '');
        if (status === 429) {
            msg = tr('ttsErrRateLimit', 'Слишком часто: у бесплатной модели лимит ~20 запросов в минуту. Подождите немного и попробуйте снова.');
        } else if (status === 402 || status === 404) {
            msg = tr('ttsErrEnded', 'Бесплатный доступ к модели озвучки закончился (он был до 30.11.2026).');
        } else if (status === 401 || /OPENROUTER_API_KEY/i.test(msg)) {
            msg = tr('ttsErrNoKey', 'На сервере не задан ключ OPENROUTER_API_KEY — озвучка недоступна.');
        } else if (status === 403) {
            msg = tr('ttsErrForbidden', 'Доступ к модели озвучки запрещён.');
        }
        const err = new Error(msg);
        err.status = status;
        return err;
    }

    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    function init() {
        const select = $('ttsVoice');
        if (select) select.value = window.getTTSVoice();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[tts.js] Загружен. Озвучка ответов: HeyGen Voice Turbo через /api/tts');
})();
