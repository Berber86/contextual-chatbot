// /api/tts — озвучка текста через OpenRouter (HeyGen Voice Turbo, бесплатно до 30.11.2026)
// Ключ хранится на сервере в переменной окружения OPENROUTER_API_KEY (той же, что и для чата).
// Браузер присылает { text, voice }, сервер стримит обратно сырой PCM (16 бит, 44.1 кГц, моно).
// WAV-контейнер клиент собирает сам (tts.js) — так длинные ответы проходят стримингом
// без ограничения на размер ответа serverless-функции.
//
// Модель: heygen/heygen-voice-1-turbo:free
//   • до 5 000 символов на запрос — длинный текст режем на куски и склеиваем паузой;
//   • 10 стандартных голосов: nadine, tabitha, bram, gareth, noelle, meredith,
//     sabrina, lucian, weston, vincent;
//   • бесплатный тариф OpenRouter: ~20 запросов в минуту.

export const config = { maxDuration: 60 };

const MODEL = 'heygen/heygen-voice-1-turbo:free';
const TTS_URL = 'https://openrouter.ai/api/v1/audio/speech';
const MAX_CHARS_PER_REQUEST = 5000;   // жёсткий лимит HeyGen (5 001 уже отклоняется)
const MAX_CHUNKS = 3;                 // до 15 000 символов за одну озвучку
const CHUNK_GAP_SECONDS = 0.35;       // тишина между склеенными кусками
const DEFAULT_VOICE = 'gareth';
const VOICES = ['nadine', 'tabitha', 'bram', 'gareth', 'noelle', 'meredith', 'sabrina', 'lucian', 'weston', 'vincent'];

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text, voice } = req.body || {};
    const clean = String(text || '').replace(/\u0000/g, '').trim();
    if (!clean) {
        return res.status(400).json({ error: 'Нет текста для озвучки' });
    }

    const voiceId = VOICES.includes(voice) ? voice : DEFAULT_VOICE;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('[TTS] OPENROUTER_API_KEY is not set');
        return res.status(500).json({ error: 'Server misconfiguration: OPENROUTER_API_KEY is not set' });
    }

    // Режем текст на куски ≤ 5000 символов по абзацам/предложениям
    let chunks = splitForTTS(clean, MAX_CHARS_PER_REQUEST);
    const truncated = chunks.length > MAX_CHUNKS;
    if (truncated) chunks = chunks.slice(0, MAX_CHUNKS);

    try {
        // Все куски генерируем параллельно, но отдаём строго по порядку
        const parts = await Promise.all(chunks.map((chunk) => requestPcm(chunk, voiceId, apiKey)));

        const rate = parts[0].rate;
        const channels = parts[0].channels;
        const bytesPerSample = 2; // 16 бит
        const gapBytes = Math.round(rate * CHUNK_GAP_SECONDS) * channels * bytesPerSample;

        // Заголовки стрима: тип + параметры PCM, чтобы клиент мог собрать WAV
        res.setHeader('Content-Type', `audio/pcm; rate=${rate}; channels=${channels}`);
        res.setHeader('X-TTS-Rate', String(rate));
        res.setHeader('X-TTS-Channels', String(channels));
        res.setHeader('X-TTS-Model', MODEL);
        res.setHeader('X-TTS-Voice', voiceId);
        if (truncated) res.setHeader('X-TTS-Truncated', '1');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Access-Control-Expose-Headers', 'X-TTS-Rate, X-TTS-Channels, X-TTS-Truncated, X-TTS-Model, X-TTS-Voice');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();

        const gap = Buffer.alloc(gapBytes, 0);
        for (let i = 0; i < parts.length; i++) {
            if (i > 0 && gapBytes > 0) res.write(gap);
            // Куски с чужой частотой пропускаем, чтобы не испортить дорожку
            if (parts[i].rate === rate && parts[i].channels === channels) {
                res.write(parts[i].pcm);
            } else {
                console.warn('[TTS] Chunk %d has different PCM params (%d/%d), skipped', i, parts[i].rate, parts[i].channels);
            }
        }
        res.end();
        console.log(`[TTS] OK: ${clean.length} chars, ${chunks.length} chunk(s), voice=${voiceId}`);
        return;
    } catch (error) {
        console.error('[TTS] Error:', error.statusCode, error.message);
        // Если заголовки уже отправлены, статус поменять нельзя — просто рвём стрим
        if (res.headersSent) {
            res.end();
            return;
        }
        return res.status(error.statusCode || 500).json({ error: error.message || 'Ошибка синтеза речи' });
    }
}

// ---- запрос одного куска PCM у OpenRouter ----
async function requestPcm(text, voice, apiKey) {
    const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://memory-chatbot.vercel.app',
            'X-Title': 'Memory Chatbot'
        },
        body: JSON.stringify({
            model: MODEL,
            input: text,
            voice: voice,
            response_format: 'pcm'
        })
    });

    if (!response.ok) {
        const raw = await response.text();
        let msg = raw;
        try { msg = (JSON.parse(raw).error || {}).message || raw; } catch (_) {}
        const err = new Error(typeof msg === 'string' ? msg.slice(0, 300) : JSON.stringify(msg));
        err.statusCode = response.status;
        throw err;
    }

    // Защита: иногда шлюзы возвращают 200 + JSON с ошибкой вместо аудио
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        const raw = await response.text();
        let msg = raw;
        try { msg = (JSON.parse(raw).error || {}).message || raw; } catch (_) {}
        const err = new Error(typeof msg === 'string' ? msg.slice(0, 300) : JSON.stringify(msg));
        err.statusCode = 502;
        throw err;
    }

    const pcm = Buffer.from(await response.arrayBuffer());
    if (!pcm || pcm.length === 0) {
        const err = new Error('Пустой аудио-ответ от модели');
        err.statusCode = 502;
        throw err;
    }

    const { rate, channels } = parsePcmParams(response.headers.get('content-type'));
    return { pcm, rate, channels };
}

// Параметры PCM приходят в content-type: "audio/pcm; rate=44100; channels=1"
function parsePcmParams(contentType) {
    let rate = 44100;
    let channels = 1;
    if (contentType) {
        for (const part of contentType.split(';').slice(1)) {
            const eq = part.indexOf('=');
            if (eq < 0) continue;
            const key = part.slice(0, eq).trim().toLowerCase();
            const value = parseInt(part.slice(eq + 1).trim(), 10);
            if (!Number.isFinite(value) || value <= 0) continue;
            if (key === 'rate') rate = value;
            else if (key === 'channels') channels = value;
        }
    }
    return { rate, channels };
}

// ---- разбиение длинного текста на куски ≤ maxChars ----
// Сначала по абзацам, внутри длинного абзаца — по предложениям, совсем длинное — по символам.
function splitForTTS(text, maxChars) {
    if (text.length <= maxChars) return [text];

    const pieces = [];
    for (const para of text.split(/\n{2,}/)) {
        if (para.length <= maxChars) {
            pieces.push(para);
            continue;
        }
        const sentences = para.match(/[^.!?…]+[.!?…]+["»”)]*\s*|[^.!?…]+$/g) || [para];
        let current = '';
        for (const sentence of sentences) {
            if (sentence.length > maxChars) {
                // Предложение само по себе длиннее лимита — режем по символам
                if (current) { pieces.push(current); current = ''; }
                for (let i = 0; i < sentence.length; i += maxChars) {
                    pieces.push(sentence.slice(i, i + maxChars));
                }
                continue;
            }
            if ((current + sentence).length > maxChars && current) {
                pieces.push(current);
                current = sentence;
            } else {
                current += sentence;
            }
        }
        if (current) pieces.push(current);
    }

    const chunks = [];
    let chunk = '';
    for (const piece of pieces) {
        if (piece.length > maxChars) { // защита от рекурсии
            if (chunk) { chunks.push(chunk); chunk = ''; }
            for (let i = 0; i < piece.length; i += maxChars) chunks.push(piece.slice(i, i + maxChars));
            continue;
        }
        if ((chunk ? chunk + '\n\n' : '') .length + piece.length > maxChars && chunk) {
            chunks.push(chunk);
            chunk = piece;
        } else {
            chunk = chunk ? chunk + '\n\n' + piece : piece;
        }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
}
