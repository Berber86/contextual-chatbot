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
//   • /api/chat, /api/hydra — в демо-режиме отвечают заготовленным текстом (SSE-стрим)
//                 и JSON-заметкой для эмуляции личности,
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

// 🎭 Эмуляция личности просит у памяти JSON-заметку об образе.
// В демо-режиме подставляем правдоподобную заметку, чтобы вкладку «Заметки личности»
// можно было проверить без ключа OpenRouter.
const PERSONA_MARKER = '=== ОБРАЗ (роль бота) ===';
const PERSONA_DEMO_NOTES = [
    { kind: 'style', text: 'Манера роли уже держится: короткие фразы и сухие выводы звучат уверенно — этот тон стоит сохранять.' },
    { kind: 'trait', text: 'В ответах проявилась наблюдательность: детали из сообщений подхватываются и превращаются в выводы.' },
    { kind: 'theme', text: 'Роль хорошо ложится на темы разговора — образ не мешает отвечать по делу.' },
    { kind: 'preference', text: 'Пользователю откликаются точные формулировки без воды — образ можно сделать ещё лаконичнее.' },
];
let personaDemoIndex = 0;

function personaDemoReply(body) {
    const messages = Array.isArray(body && body.messages) ? body.messages : [];
    const prompt = messages.map(m => m.content || '').join('\n');
    if (!prompt.includes(PERSONA_MARKER)) return null;

    const note = PERSONA_DEMO_NOTES[personaDemoIndex % PERSONA_DEMO_NOTES.length];
    personaDemoIndex++;
    return JSON.stringify({ note: note.text, kind: note.kind });
}

function handleChat(req, res, body) {
    const personaReply = personaDemoReply(body);
    if (personaReply) {
        return sendJson(res, 200, { choices: [{ message: { content: personaReply } }] });
    }

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

// Демо-ответ System One: без ключа Hydra маршрут по сложности должен работать локально.
// Сложность считается по простым признакам — этого хватает, чтобы увидеть все три уровня.
function handleSystemOne(req, res, body) {
    const state = body && body.state;
    const message = typeof state === 'string'
        ? state
        : String((state && (state.message || JSON.stringify(state))) || '');
    const forced = Number(process.env.SYSTEMONE_DEV_FORCE);

    let score = Number.isFinite(forced) ? forced : 0.08;
    if (!Number.isFinite(forced)) {
        // Грубая, но наглядная эвристика: длина + вопросительная форма + «сложные» темы.
        // Нужна только для превью — в проде сложность оценивает сама модель.
        score += Math.min(0.35, message.length / 300);
        if (/[?？]/.test(message)) score += 0.04;
        const heavy = /(почему|зачем|как|объясни|сравн|план|решени|выбор|успе|страшн|тяжел|отношен|деньг|здоров|смысл|работ|команд|руковод)/gi;
        const hits = (message.match(heavy) || []).length;
        score += Math.min(0.4, hits * 0.12);
        score = Math.min(0.95, Math.max(0.05, score));
    }

    const levels = 10;
    const raw = score * (levels - 1);

    // Архетип и уместность вопроса — тоже грубая эвристика, только для превью.
    const archetype =
        /(или|выбрать|вариант|что лучше)/i.test(message) ? 'options' :
        /(как|что делать|план|шаг)/i.test(message) ? 'micro_plan' :
        /(не получается|застрял|не могу|срываюсь)/i.test(message) ? 'reframe' :
        /(напомни|раньше|говорили|прошлый раз)/i.test(message) ? 'connector' :
        message.length < 25 ? 'minimalist' : 'answer_first';

    const answers = {
        complexity: {
            type: 'score',
            score: Number(raw.toFixed(2)),
            confidence: 0.82,
            probabilities: { [String(Math.round(raw))]: 0.62 },
            legend: {}
        },
        needs_memory: { type: 'noul', noul: score > 0.4 ? 0.71 : 0.19 },
        archetype: { type: 'choice', choice: archetype, confidence: 0.66, probabilities: { [archetype]: 0.66 } },
        ask_question: { type: 'noul', noul: /[?？]/.test(message) ? 0.62 : 0.24 }
    };

    // Вопросы, которых демо не знает (например, облака памяти cloud_<hash>),
    // отвечаем по пересечению слов: иначе выбор тем в превью всегда пустой.
    const questions = (body && body.questions) || {};
    const stems = text => new Set((text.toLowerCase().match(/[a-zа-яё]{4,}/gi) || []).map(word => word.slice(0, 4)));
    const messageStems = stems(message);
    for (const [name, question] of Object.entries(questions)) {
        if (name === 'complexity' || name === 'needs_memory' || name === 'archetype' || name === 'ask_question') continue;
        const text = String((question && (question.instructions || question.criteria)) || name);
        const overlap = Array.from(stems(text)).some(stem => messageStems.has(stem));
        // Без совпадения слов всё равно даём стабильную псевдо-вероятность:
        // иначе в превью не поднимается ни одна тема и выбор не видно.
        const hash = Array.from(name).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        const fallback = Number((0.15 + (hash % 46) / 100).toFixed(2));
        if (!question || question.type === 'noul') {
            answers[name] = { type: 'noul', noul: overlap ? 0.71 : fallback, confidence: 0.6 };
        } else if (question.type === 'choice') {
            // Выбор из многих вариантов (облака памяти): распределение по совпадению
            // слов с сообщением, остальным — маленькие псевдо-вероятности.
            const entries = Array.isArray(question.criteria)
                ? question.criteria.map((text, index) => [String(index), text])
                : Object.entries(question.criteria || {});
            if (entries.length === 0) continue;
            const weights = entries.map(([key, text]) => {
                const hit = Array.from(stems(String(text))).some(stem => messageStems.has(stem));
                const hash = Array.from(key).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
                return [key, hit ? 0.45 : 0.02 + (hash % 7) / 100];
            });
            const total = weights.reduce((sum, [, weight]) => sum + weight, 0) || 1;
            const probabilities = {};
            weights.forEach(([key, weight]) => { probabilities[key] = Number((weight / total).toFixed(3)); });
            const best = weights.slice().sort((a, b) => b[1] - a[1])[0][0];
            answers[name] = { type: 'choice', choice: best, confidence: 0.6, probabilities };
        }
    }


    return sendJson(res, 200, {
        model: (body && body.model) || 'jev-1.14',
        answers,
        usage: { input_tokens: Math.max(40, Math.round(message.length / 3)), output_tokens: 0 },
        demo: true
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
    // Кривой URL (например «//» от прокси) не должен ронять дев-сервер.
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
        return sendJson(res, 400, { error: 'Некорректный URL запроса' });
    }

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
    // /api/hydra — тот же демо-ответ: в «умном режиме» память и заметки личности
    // идут именно туда, и без этого мока их нельзя проверить локально.
    if ((pathname === '/api/chat' || pathname === '/api/hydra') && req.method === 'POST') {
        return handleChat(req, res, await readBody(req));
    }
    // /api/systemone — типизированные решения (jev / solar-decide). Без ключа — демо.
    if (pathname === '/api/systemone' && req.method === 'POST') {
        return handleSystemOne(req, res, await readBody(req));
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
    console.log('[dev-server] /api/chat и /api/hydra отвечают демо-текстом (это не продакшен)');
});
