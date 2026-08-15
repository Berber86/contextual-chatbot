// /api/hydra — прокси к платному провайдеру Hydra.
// Ключ хранится на сервере в переменной окружения HYDRA_API_KEY (в браузер не попадает).
// Тело запроса совместимо с /api/chat: { model, messages, stream, temperature, seed, tools }.
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.HYDRA_API_KEY;
    if (!apiKey) {
        console.error('[Hydra] HYDRA_API_KEY is not set');
        return res.status(500).json({ error: 'Server misconfiguration: HYDRA_API_KEY is not set' });
    }

    const { messages, tools, model, stream, temperature, seed } = req.body || {};

    try {
        let selectedModel = model || 'glm-5.2';
        console.log(`[Hydra] Model: ${selectedModel}, Temp: ${temperature}, Seed: ${seed}, Stream: ${!!stream}`);

        const requestBody = { model: selectedModel, messages };

        if (typeof temperature !== 'undefined') requestBody.temperature = temperature;
        if (typeof seed !== 'undefined') requestBody.seed = seed;
        if (tools && tools.length > 0) {
            requestBody.tools = tools;
            requestBody.tool_choice = 'auto';
        }

        const upstreamHeaders = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://memory-chatbot.vercel.app',
            'X-Title': 'Memory Chatbot'
        };

        if (stream) {
            requestBody.stream = true;
            const response = await fetch('https://api.hydraai.ru/v1/chat/completions', {
                method: 'POST', headers: upstreamHeaders, body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Hydra] Stream error:', errorText);
                return res.status(response.status).json({ error: errorText });
            }
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) { res.write('data: [DONE]\n\n'); break; }
                    res.write(decoder.decode(value, { stream: true }));
                }
            } catch (streamError) {
                console.error('[Hydra] Stream read error:', streamError);
            }
            res.end();
            return;
        }

        const response = await fetch('https://api.hydraai.ru/v1/chat/completions', {
            method: 'POST', headers: upstreamHeaders, body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        if (data.usage) {
            console.log(`[Hydra] Usage for ${selectedModel}:`, {
                prompt: data.usage.prompt_tokens,
                completion: data.usage.completion_tokens,
                total: data.usage.total_tokens
            });
        }
        res.status(200).json(data);
    } catch (error) {
        console.error('[Hydra] API Error:', error);
        res.status(500).json({ error: error.message });
    }
}
