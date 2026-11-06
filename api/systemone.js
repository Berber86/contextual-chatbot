// /api/systemone — прокси к System One (jev / solar-decide) в Hydra.
// Ключ живёт на сервере в HYDRA_API_KEY, в браузер не попадает.
// Тело: { model, state, questions } — ровно как в контракте System One.
// Ответ: { model, answers, usage } — без генерации текста, выходные токены бесплатны.
const DEFAULT_MODEL = 'jev-1.14';
const ALLOWED_TYPES = new Set(['noul', 'choice', 'score']);
const MAX_QUESTIONS = 32;

// Браузер ждёт 25 с: serverless-функция не должна завершаться раньше него.
export const maxDuration = 30;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.HYDRA_API_KEY;
    if (!apiKey) {
        console.error('[SystemOne] HYDRA_API_KEY is not set');
        return res.status(500).json({ error: 'Server misconfiguration: HYDRA_API_KEY is not set' });
    }

    const body = req.body || {};
    const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;
    const questions = body.questions;

    // Мягкая валидация на границе: дальше уходит только то, что понимает вендор.
    if (!questions || typeof questions !== 'object' || Array.isArray(questions)) {
        return res.status(400).json({ error: 'questions must be an object' });
    }
    const names = Object.keys(questions);
    if (names.length === 0 || names.length > MAX_QUESTIONS) {
        return res.status(400).json({ error: `questions must contain 1..${MAX_QUESTIONS} items` });
    }
    for (const name of names) {
        const type = questions[name] && questions[name].type;
        if (!ALLOWED_TYPES.has(type)) {
            return res.status(400).json({ error: `unknown question type for "${name}"` });
        }
    }

    const payload = { model, state: body.state, questions };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
        const started = Date.now();
        const response = await fetch('https://api.hydraai.ru/v1/systemone', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://memory-chatbot.vercel.app',
                'X-Title': 'Memory Chatbot'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error('[SystemOne] upstream error', response.status, data);
            return res.status(response.status).json({ error: data.error || `upstream ${response.status}` });
        }

        console.log(`[SystemOne] ${model}, ${names.length} вопросов, ${Date.now() - started} мс,` +
            ` токенов: ${(data.usage && data.usage.input_tokens) || 0}`);
        return res.status(200).json(data);
    } catch (error) {
        const aborted = error && error.name === 'AbortError';
        console.error('[SystemOne] request failed:', aborted ? 'timeout' : error.message);
        return res.status(aborted ? 504 : 500).json({ error: aborted ? 'System One timeout' : error.message });
    } finally {
        clearTimeout(timer);
    }
}
