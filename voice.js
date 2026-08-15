// voice.js — голосовой ввод для Memory Chatbot.
// Запись речи -> /api/transcribe (Whisper Large V3 Turbo через RouterAI) -> текст боту.
// Два режима:
//   • автоотправка (по умолчанию): расшифровка сразу уходит боту как сообщение пользователя;
//   • «Редактировать речь»: расшифровка попадает в поле ввода, пользователь правит и жмёт Send.
// Сообщения, отправленные голосом, помечаются флагом window.dictatedMessageFlag,
// чтобы в системный промпт добавлялась заметка о распознанной речи.
(function () {
    'use strict';

    const MAX_SECONDS = 600;          // лимит записи — 10 минут
    const TRANSCRIBE_URL = '/api/transcribe';
    const TOO_BIG_BYTES = 3_300_000;  // ~предельная база64-длина для серверной функции Vercel (~4.5 МБ)

    let mediaStream = null;
    let recorder = null;
    let chunks = [];
    let recTimer = null;
    let recStart = 0;
    let wakeLock = null;
    let isRecording = false;
    let isTranscribing = false;
    let editMode = false;

    const $ = (id) => document.getElementById(id);
    const btn = () => $('voiceBtn');
    const statusEl = () => $('voiceStatus');
    const timerEl = () => $('voiceTimer');
    const editToggle = () => $('voiceEditToggle');

    function setStatus(t) { const e = statusEl(); if (e) e.textContent = t || ''; }
    function setTimer(t) { const e = timerEl(); if (e) e.textContent = t || ''; }
    function fmt(s) {
        const m = Math.floor(s / 60);
        const ss = Math.floor(s % 60);
        return m + ':' + String(ss).padStart(2, '0');
    }
    function resetButton() {
        const b = btn();
        if (b) { b.classList.remove('recording'); b.textContent = '🎤'; b.title = 'Голосовой ввод (до 10 минут)'; }
    }

    // ---- тумблер «Редактировать речь» ----
    window.toggleVoiceEditMode = function () {
        editMode = !editMode;
        const t = editToggle();
        if (t) t.classList.toggle('active', editMode);
        if (!isRecording && !isTranscribing) {
            setStatus(editMode
                ? 'Режим правки: после записи текст попадёт в поле ввода.'
                : '');
        }
    };

    // ---- wake lock (чтобы экран не гас во время записи на мобильном) ----
    async function acquireWakeLock() {
        try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
    }
    function releaseWakeLock() { try { if (wakeLock) wakeLock.release(); } catch (_) {} wakeLock = null; }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isRecording) acquireWakeLock();
    });

    // ---- выбор поддерживаемого аудио-формата ----
    function pickMime() {
        const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
            for (const c of cands) if (MediaRecorder.isTypeSupported(c)) return c;
        }
        return '';
    }
    function extFor(m) {
        if (!m) return 'webm';
        if (m.includes('webm')) return 'webm';
        if (m.includes('ogg')) return 'ogg';
        if (m.includes('mp4')) return 'mp4';
        return 'audio';
    }

    // ---- старт/стоп по кнопке микрофона ----
    window.toggleVoiceInput = async function () {
        if (isTranscribing) return;
        if (isRecording) { stopRecording(); return; }
        await startRecording();
    };

    async function startRecording() {
        const b = btn();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setStatus('⚠️ Браузер не поддерживает запись с микрофона');
            return;
        }
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
            });
        } catch (e) {
            setStatus('⚠️ Нет доступа к микрофону');
            alert('Не удалось получить доступ к микрофону: ' + (e.message || e.name) +
                '\n\nПроверьте разрешение на микрофон для сайта и что он не занят другим приложением.');
            return;
        }

        chunks = [];
        const mime = pickMime();
        const opts = Object.assign({ audioBitsPerSecond: 32000 }, mime ? { mimeType: mime } : {});
        try {
            recorder = new MediaRecorder(mediaStream, opts);
        } catch (e) {
            try { recorder = new MediaRecorder(mediaStream); }
            catch (e2) { cleanup(); setStatus('⚠️ Запись недоступна в этом браузере'); return; }
        }

        recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
        recorder.onerror = () => {
            setStatus('⚠️ Ошибка записи');
            cleanup(); resetButton(); releaseWakeLock();
            isRecording = false;
            if (recTimer) { clearInterval(recTimer); recTimer = null; }
        };
        recorder.onstop = () => {
            const type = recorder.mimeType || mime || 'audio/webm';
            const blob = new Blob(chunks, { type });
            cleanup();        // дорожки останавливаем только после того, как рекордер закончил
            releaseWakeLock();
            isRecording = false;
            resetButton();
            if (!blob || blob.size < 200) {
                setStatus('⚠️ Запись пустая — попробуйте ещё раз');
                return;
            }
            transcribeAndAct(blob, type);
        };

        try { recorder.start(1000); }   // timeslice — важен для стабильности на мобильных
        catch (e) { cleanup(); setStatus('⚠️ Не удалось начать запись'); return; }

        isRecording = true;
        recStart = Date.now();
        if (b) { b.classList.add('recording'); b.textContent = '■'; b.title = 'Остановить и расшифровать'; }
        setStatus(editMode
            ? '🔴 Запись… (потом — в поле ввода для правки)'
            : '🔴 Запись… (потом — автоотправка боту)');
        setTimer('0:00');
        acquireWakeLock();

        recTimer = setInterval(() => {
            const elapsed = (Date.now() - recStart) / 1000;
            setTimer(fmt(elapsed));
            if (elapsed >= MAX_SECONDS) {
                setStatus('⏹ Достигнут лимит 10 минут — расшифровываю…');
                stopRecording();
            }
        }, 250);
    }

    function stopRecording() {
        if (recTimer) { clearInterval(recTimer); recTimer = null; }
        if (recorder && recorder.state === 'recording') {
            setStatus(editMode ? 'Сохраняю и расшифровываю…' : 'Сохраняю и расшифровываю…');
            recorder.stop();
        }
    }

    function cleanup() { if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; } }

    // ---- отправка на расшифровку ----
    async function transcribeAndAct(blob, type) {
        if (blob.size > TOO_BIG_BYTES) {
            setStatus('⚠️ Слишком длинная запись (' + (blob.size / 1048576).toFixed(1) + ' МБ). Запишите короче.');
            alert('Запись слишком большая (' + (blob.size / 1048576).toFixed(1) + ' МБ).\n' +
                'Серверная функция Vercel принимает до ~4 МБ. Запишите короче — до ~8–9 минут.');
            return;
        }
        isTranscribing = true;
        const b = btn(); if (b) b.disabled = true;
        setStatus('🎧 Расшифровываю речь (Whisper Large V3 Turbo)…');
        try {
            const b64 = await blobToBase64(blob);
            const resp = await fetch(TRANSCRIBE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: b64, format: type })
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(data.error || ('HTTP ' + resp.status));
            const text = (data.text || '').trim();
            if (!text) { setStatus('⚠️ Распознавание вернуло пустой текст'); return; }
            setStatus('');
            deliverTranscription(text);
        } catch (e) {
            console.error('[Voice] transcribe error', e);
            setStatus('⚠️ Ошибка расшифровки: ' + e.message);
        } finally {
            isTranscribing = false;
            if (b) b.disabled = false;
        }
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => { const s = r.result || ''; const i = s.indexOf(','); resolve(i >= 0 ? s.slice(i + 1) : s); };
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
    }

    // ---- куда девать результат ----
    function deliverTranscription(text) {
        const input = $('messageInput');
        if (!input) return;

        const canAutoSend = (typeof window.sendMessage === 'function' || typeof sendMessage === 'function');

        if (editMode || !canAutoSend) {
            // Режим правки: кладём в поле ввода, пользователь сам отправит
            input.value = text;
            window._dictatedInput = true;          // флаг: в поле — голосовой текст
            try { input.dispatchEvent(new Event('input')); } catch (_) {}
            try { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 200) + 'px'; } catch (_) {}
            input.focus();
            setStatus(editMode
                ? '✏️ Распознанный текст в поле ввода — проверьте и отправьте.'
                : 'Текст в поле ввода — отправьте кнопкой.');
        } else {
            // Автоотправка боту как надиктованного сообщения
            input.value = text;
            window._dictatedInput = true;          // бэкап-флаг (если бот занят)
            window.dictatedMessageFlag = true;     // пометка для системного промпта
            try { input.dispatchEvent(new Event('input')); } catch (_) {}
            sendMessage({ preventDefault() {} });
        }
    }

    console.log('[voice.js] Загружен. Голосовой ввод: Whisper Large V3 Turbo через /api/transcribe');
})();
