// voice.js — голосовой ввод для Memory Chatbot.
// Запись речи -> /api/transcribe (Whisper Large V3 Turbo через RouterAI) -> текст сразу боту.
// Во время записи показывается большая кнопка «Отправить» (~1/3 экрана) — жми, чтобы остановить и отправить.
// Сообщения, отправленные голосом, помечаются window.dictatedMessageFlag,
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

    const $ = (id) => document.getElementById(id);
    const statusEl = () => $('voiceStatus');
    const statusRow = () => $('voiceStatusRow');
    const stopBtn = () => $('voiceStopBtn');
    const stopSub = () => $('voiceStopSub');
    const micBtn = () => $('voiceBtn');

    function setStatus(t) {
        const e = statusEl(); if (e) e.textContent = t || '';
        const r = statusRow(); if (r) r.style.display = t ? 'block' : 'none';
    }
    function setSub(t) { const e = stopSub(); if (e) e.textContent = t; }
    function showStop(show) { const b = stopBtn(); if (b) b.classList.toggle('show', show); }
    function fmt(s) {
        const m = Math.floor(s / 60);
        const ss = Math.floor(s % 60);
        return m + ':' + String(ss).padStart(2, '0');
    }

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

    // ---- старт/стоп по кнопке микрофона или по большой кнопке «Отправить» ----
    window.toggleVoiceInput = async function () {
        if (isTranscribing) return;
        if (isRecording) { stopRecording(); return; }
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
            cleanup(); releaseWakeLock(); showStop(false);
            isRecording = false;
            if (recTimer) { clearInterval(recTimer); recTimer = null; }
        };
        recorder.onstop = () => {
            const type = recorder.mimeType || mime || 'audio/webm';
            const blob = new Blob(chunks, { type });
            cleanup();        // дорожки останавливаем только после того, как рекордер закончил
            releaseWakeLock();
            isRecording = false;
            showStop(false);
            if (!blob || blob.size < 200) {
                setStatus('⚠️ Запись пустая — попробуйте ещё раз');
                return;
            }
            transcribeAndSend(blob, type);
        };

        try { recorder.start(1000); }   // timeslice — важен для стабильности на мобильных
        catch (e) { cleanup(); setStatus('⚠️ Не удалось начать запись'); return; }

        isRecording = true;
        recStart = Date.now();
        const mb = micBtn(); if (mb) mb.disabled = true;
        setSub('остановить запись · 0:00');
        showStop(true);
        acquireWakeLock();

        recTimer = setInterval(() => {
            const elapsed = (Date.now() - recStart) / 1000;
            setSub('остановить запись · ' + fmt(elapsed));
            if (elapsed >= MAX_SECONDS) {
                setSub('лимит 10 минут — отправляю…');
                stopRecording();
            }
        }, 250);
    }

    function stopRecording() {
        if (recTimer) { clearInterval(recTimer); recTimer = null; }
        if (recorder && recorder.state === 'recording') {
            setStatus('Сохраняю и расшифровываю…');
            recorder.stop();
        }
    }

    function cleanup() { if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; } }

    // ---- отправка на расшифровку и сразу боту ----
    async function transcribeAndSend(blob, type) {
        if (blob.size > TOO_BIG_BYTES) {
            setStatus('⚠️ Слишком длинная запись (' + (blob.size / 1048576).toFixed(1) + ' МБ). Запишите короче.');
            alert('Запись слишком большая (' + (blob.size / 1048576).toFixed(1) + ' МБ).\n' +
                'Серверная функция Vercel принимает до ~4 МБ. Запишите короче — до ~8–9 минут.');
            const mb = micBtn(); if (mb) mb.disabled = false;
            return;
        }
        isTranscribing = true;
        const mb = micBtn(); if (mb) mb.disabled = true;
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
            deliverToBot(text);
        } catch (e) {
            console.error('[Voice] transcribe error', e);
            setStatus('⚠️ Ошибка расшифровки: ' + e.message);
        } finally {
            isTranscribing = false;
            const b = micBtn(); if (b) b.disabled = false;
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

    // ---- отправляем расшифровку в чат как надиктованное сообщение ----
    function deliverToBot(text) {
        const input = $('messageInput');
        if (!input) return;
        input.value = text;
        window.dictatedMessageFlag = true;   // пометка для системного промпта
        try { input.dispatchEvent(new Event('input')); } catch (_) {}
        if (typeof sendMessage === 'function') {
            sendMessage({ preventDefault() {} });
        } else {
            setStatus('Готово — нажмите Send, чтобы отправить.');
        }
    }

    console.log('[voice.js] Загружен. Голосовой ввод: Whisper Large V3 Turbo через /api/transcribe');
})();
