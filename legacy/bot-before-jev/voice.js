// voice.js — голосовой ввод для Memory Chatbot.
// Поток: жми 🎤 → запись (большая кнопка «Остановить запись») → после останова «Отправить» / «Удалить».
// Запись короче 2 секунд отправить нельзя. При отправке: /api/transcribe (Whisper Large V3)
// → текст уходит боту как голосовое сообщение (помечается window.dictatedMessageFlag,
// в чате показывается свёрнутым значком с раскрываемым текстом).
(function () {
    'use strict';

    const MAX_SECONDS = 600;          // лимит записи — 10 минут
    const MIN_SECONDS = 2;            // короче — не отправляем
    const TRANSCRIBE_URL = '/api/transcribe';
    const TOO_BIG_BYTES = 3_300_000;  // ~предельная база64-длина для серверной функции Vercel (~4.5 МБ)

    let mediaStream = null;
    let recorder = null;
    let chunks = [];
    let recTimer = null;
    let recStart = 0;
    let recDuration = 0;
    let wakeLock = null;
    let isRecording = false;
    let isTranscribing = false;
    let pendingBlob = null;           // записанное аудио, ждёт выбора Отправить/Удалить
    let pendingType = 'audio/webm';

    const $ = (id) => document.getElementById(id);
    const micBtn = () => $('voiceBtn');
    const panel = () => $('voicePanel');
    const timerEl = () => $('voiceTimer');
    const sendBtn = () => $('voiceSendBtn');
    const hintEl = () => $('voiceHint');
    const statusEl = () => $('voiceStatus');
    const statusRow = () => $('voiceStatusRow');

    function setStatus(t) {
        const e = statusEl(); if (e) e.textContent = t || '';
        const r = statusRow(); if (r) r.style.display = t ? 'block' : 'none';
    }
    function setHint(t) { const e = hintEl(); if (e) e.textContent = t || ''; }
    function fmt(s) {
        const m = Math.floor(s / 60);
        const ss = Math.floor(s % 60);
        return m + ':' + String(ss).padStart(2, '0');
    }
    function setPanel(state) {
        const p = panel();
        if (!p) return;
        p.classList.remove('show', 'ready');
        if (state === 'recording') p.classList.add('show');
        else if (state === 'ready') p.classList.add('show', 'ready');
        // 'hidden' — ничего не добавляем
    }
    function setMicDisabled(d) { const b = micBtn(); if (b) b.disabled = d; }

    // ---- wake lock ----
    async function acquireWakeLock() {
        try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
    }
    function releaseWakeLock() { try { if (wakeLock) wakeLock.release(); } catch (_) {} wakeLock = null; }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isRecording) acquireWakeLock();
    });

    function pickMime() {
        const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
            for (const c of cands) if (MediaRecorder.isTypeSupported(c)) return c;
        }
        return '';
    }

    // ---- кнопка микрофона ----
    window.toggleVoiceInput = async function () {
        if (isTranscribing) return;
        if (isRecording) { stopRecording(); return; }
        // если есть ожидающая запись — начинаем новую (старую выбрасываем)
        pendingBlob = null;
        setPanel('hidden');
        await startRecording();
    };

    async function startRecording() {
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
            cleanup(); releaseWakeLock(); setPanel('hidden'); setMicDisabled(false);
            isRecording = false;
            if (recTimer) { clearInterval(recTimer); recTimer = null; }
        };
        recorder.onstop = () => {
            const type = recorder.mimeType || mime || 'audio/webm';
            const blob = new Blob(chunks, { type });
            cleanup();        // дорожки останавливаем только после того, как рекордер закончил
            releaseWakeLock();
            isRecording = false;
            setMicDisabled(false);
            recDuration = (Date.now() - recStart) / 1000;
            if (!blob || blob.size < 200) {
                setStatus('⚠️ Запись пустая — попробуйте ещё раз');
                setPanel('hidden');
                return;
            }
            pendingBlob = blob;
            pendingType = type;
            // Готовое состояние: Отправить / Удалить. Короткие (<2с) отправить нельзя.
            const tooShort = recDuration < MIN_SECONDS;
            if (sendBtn()) sendBtn().disabled = tooShort;
            setHint(tooShort
                ? 'Слишком короткая запись (меньше ' + MIN_SECONDS + ' с). Удалите и запишите заново.'
                : 'Длительность ' + fmt(recDuration) + '. Проверьте и отправьте.');
            setPanel('ready');
        };

        try { recorder.start(1000); }
        catch (e) { cleanup(); setStatus('⚠️ Не удалось начать запись'); return; }

        isRecording = true;
        recStart = Date.now();
        setMicDisabled(true);
        setStatus('');
        const t = timerEl(); if (t) t.textContent = '0:00';
        setPanel('recording');
        acquireWakeLock();

        recTimer = setInterval(() => {
            const elapsed = (Date.now() - recStart) / 1000;
            const te = timerEl(); if (te) te.textContent = fmt(elapsed);
            if (elapsed >= MAX_SECONDS) {
                setHint('Лимит 10 минут — останавливаю…');
                stopRecording();
            }
        }, 250);
    }

    function stopRecording() {
        if (recTimer) { clearInterval(recTimer); recTimer = null; }
        if (recorder && recorder.state === 'recording') {
            recorder.stop();
        }
    }

    function cleanup() { if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; } }

    // ---- Отправить ----
    window.voiceSend = async function () {
        if (!pendingBlob || isTranscribing) return;
        if (recDuration < MIN_SECONDS) return; // защита

        if (pendingBlob.size > TOO_BIG_BYTES) {
            setHint('Слишком длинная запись (' + (pendingBlob.size / 1048576).toFixed(1) + ' МБ). Удалите и запишите короче.');
            return;
        }
        isTranscribing = true;
        setMicDisabled(true);
        if (sendBtn()) sendBtn().disabled = true;
        setPanel('hidden');
        setStatus('🎧 Расшифровываю речь (Whisper Large V3)…');
        try {
            const b64 = await blobToBase64(pendingBlob);
            const resp = await fetch(TRANSCRIBE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: b64, format: pendingType })
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(data.error || ('HTTP ' + resp.status));
            const text = (data.text || '').trim();
            if (!text) { setStatus('⚠️ Распознавание вернуло пустой текст'); return; }
            setStatus('');
            deliverToBot(text);
        } catch (e) {
            console.error('[Voice] transcribe error', e);
            setStatus('⚠️ Ошибка расшифровки: ' + e.message);
        } finally {
            isTranscribing = false;
            pendingBlob = null;
            setMicDisabled(false);
        }
    };

    // ---- Удалить ----
    window.voiceDelete = function () {
        pendingBlob = null;
        recDuration = 0;
        setHint('');
        setPanel('hidden');
        setStatus('Запись удалена');
        setTimeout(() => setStatus(''), 1500);
    };

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => { const s = r.result || ''; const i = s.indexOf(','); resolve(i >= 0 ? s.slice(i + 1) : s); };
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
    }

    // ---- отправляем расшифровку в чат как надиктованное голосовое сообщение ----
    function deliverToBot(text) {
        const input = $('messageInput');
        if (!input) return;
        input.value = text;
        window.dictatedMessageFlag = true;   // пометка для системного промпта + рендер аудио-пузыря
        try { input.dispatchEvent(new Event('input')); } catch (_) {}
        if (typeof sendMessage === 'function') {
            sendMessage({ preventDefault() {} });
        } else {
            setStatus('Готово — нажмите Send, чтобы отправить.');
        }
    }

    console.log('[voice.js] Загружен. Голосовой ввод: Whisper Large V3 через /api/transcribe');
})();
