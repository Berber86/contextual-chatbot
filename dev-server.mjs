// dev-server.mjs — локальный сервер для разработки без деплоя на Vercel.
//
// Запуск:  node dev-server.mjs            (порт 3000)
//          PORT=8080 node dev-server.mjs
//
// Что делает:
//   • раздаёт статику (index.html, js, css, assets);
//   • /api/tts  — если задан OPENROUTER_API_KEY, проксирует настоящий запрос
//                 к HeyGen Voice Turbo; иначе возвращает тестовый сигнал
//                 (TTS_DEV_MOCK=1, по умолчанию включён) или ошибку 500;
//   • /api/chat — в демо-режиме отвечает заготовленным текстом (SSE-стрим),
//                 чтобы можно было проверить кнопку «Озвучить» без ключа.
//
// Это НЕ продакшен-код: на Vercel работают api/tts.js и api/chat.js.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const MOCK = process.env.TTS_DEV_MOCK !== '0';
const HAS_KEY = Boolean(process.env.OPENROUTER_API_KEY);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8'
};

const DEMO_REPLY = [
    'Привет! Это **демо-режим** локального сервера: без ключа OpenRouter я отвечаю заготовленным текстом, ',
    'а не настоящим ответом модели.\n\n',
    'Кнопка «Озвучить» внизу этого сообщения уже работает — нажмите её. ',
    'В демо прозвучит тестовый сигнал: настоящий голос ',
    'HeyGen Voice Turbo появится после деплоя на Vercel, где уже настроен тот же ключ OpenRouter, что и для чата.\n\n',
    'Голос можно поменять в настройках — там десять вариантов: Gareth, Weston, Nadine и другие. ',
    'Приятной настройки!'
].join('');

// ---- тестовый сигнал: три мягкие ноты (C5-E5-G5), 44.1 кГц, 16 бит, моно ----
// ВНИМАНИЕ: отдаём сырой PCM — WAV-контейнер клиент собирает сам (как и в проде).
function demoChimePcm() {
    const rate = 44100;
    const notes = [523.25, 659.25, 783.99];
    const noteSec = 0.28;
    const gapSec = 0.08;
    const totalSamples = Math.ceil(rate * (notes.length * noteSec + (notes.length - 1) * gapSec));
    const pcm = Buffer.alloc(totalSamples * 2);

    let cursor = 0;
    for (const freq of notes) {
        const n = Math.floor(rate * noteSec);
        for (let i = 0; i < n && cursor < totalSamples; i++, cursor++) {
            const t = i / rate;
            const envelope = Math.min(1, i / (rate * 0.02)) * Math.min(1, (n - i) / (rate * 0.06));
            const sample = Math.sin(2 * Math.PI * freq * t) * 0.32 * envelope;
            pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), cursor * 2);
        }
        cursor += Math.floor(rate * gapSec);
    }
    return pcm;
}

function sendJson(res, status, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Expose-Headers': 'X-TTS-Rate, X-TTS-Channels, X-TTS-Truncated, X-TTS-Model, X-TTS-Voice'
    });
    res.end(body);
}

// ---- /api/tts ----
async function handleTts(req, res, body) {
    const { text, voice } = body || {};
    if (!String(text || '').trim()) return sendJson(res, 400, { error: 'Нет текста для озвучки' });

    if (HAS_KEY) {
        try {
            const upstream = await fetch('https://openrouter.ai/api/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost',
                    'X-Title': 'Memory Chatbot Dev'
                },
                body: JSON.stringify({
                    model: 'heygen/heygen-voice-1-turbo:free',
                    input: String(text).slice(0, 5000),
                    voice: voice || 'gareth',
                    response_format: 'pcm'
                })
            });
            if (!upstream.ok) {
                const raw = await upstream.text();
                let msg = raw;
                try { msg = JSON.parse(raw).error?.message || raw; } catch { /* plain text */ }
                return sendJson(res, upstream.status, { error: String(msg).slice(0, 300) });
            }
            const pcm = Buffer.from(await upstream.arrayBuffer());
            const ct = upstream.headers.get('content-type') || '';
            const rate = parseInt((ct.match(/rate=(\d+)/) || [])[1], 10) || 44100;
            const channels = parseInt((ct.match(/channels=(\d+)/) || [])[1], 10) || 1;
            res.writeHead(200, {
                'Content-Type': `audio/pcm; rate=${rate}; channels=${channels}`,
                'X-TTS-Rate': String(rate),
                'X-TTS-Channels': String(channels),
                'X-TTS-Model': 'heygen/heygen-voice-1-turbo:free',
                'X-TTS-Voice': voice || 'gareth',
                'Access-Control-Expose-Headers': 'X-TTS-Rate, X-TTS-Channels, X-TTS-Truncated, X-TTS-Model, X-TTS-Voice'
            });
            return res.end(pcm);
        } catch (e) {
            return sendJson(res, 502, { error: 'Не удалось связаться с OpenRouter: ' + e.message });
        }
    }

    if (MOCK) {
        const pcm = demoChimePcm();
        res.writeHead(200, {
            'Content-Type': 'audio/pcm; rate=44100; channels=1',
            'X-TTS-Rate': '44100',
            'X-TTS-Channels': '1',
            'X-TTS-Model': 'dev-mock',
            'X-TTS-Voice': voice || 'gareth',
            'Access-Control-Expose-Headers': 'X-TTS-Rate, X-TTS-Channels, X-TTS-Truncated, X-TTS-Model, X-TTS-Voice'
        });
        return res.end(pcm);
    }

    return sendJson(res, 500, { error: 'Server misconfiguration: OPENROUTER_API_KEY is not set' });
}

// ---- /api/chat (демо-ответ) ----
function handleChat(req, res, body) {
    if (body && body.stream) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        // режем демо-текст на куски по ~40 символов, чтобы выглядело как стрим
        const words = DEMO_REPLY.match(/[^ ]+ ?/g) || [];
        let i = 0;
        const timer = setInterval(() => {
            if (i >= words.length) {
                clearInterval(timer);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }
            const chunk = words.slice(i, i + 3).join('');
            i += 3;
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
        }, 30);
        return;
    }
    return sendJson(res, 200, {
        choices: [{ message: { content: DEMO_REPLY } }]
    });
}

function readBody(req) {
    return new Promise((resolve) => {
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', () => {
            try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
        });
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    if (pathname === '/api/tts' && req.method === 'POST') {
        return handleTts(req, res, await readBody(req));
    }
    if (pathname === '/api/chat' && req.method === 'POST') {
        return handleChat(req, res, await readBody(req));
    }
    if (pathname.startsWith('/api/')) {
        return sendJson(res, 404, { error: `В дев-сервере нет обработчика ${pathname}` });
    }

    // статика
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.normalize(path.join(__dirname, filePath));
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found');
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[dev-server] http://localhost:${PORT}`);
    console.log(`[dev-server] OPENROUTER_API_KEY: ${HAS_KEY ? 'задан — /api/tts ходит в OpenRouter' : 'нет — /api/tts отдаёт тестовый сигнал (TTS_DEV_MOCK=${MOCK})'}`);
    console.log('[dev-server] /api/chat отвечает демо-текстом (это не продакшен)');
});
