export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // 1. ИЗВЛЕКАЕМ НОВЫЕ ПАРАМЕТРЫ (temperature, seed)
    const { messages, tools, model, stream, temperature, seed } = req.body;
    
    try {
        let selectedModel = model || 'mistralai/devstral-2512:free';
        
        console.log(`[Server] Model: ${selectedModel}, Temp: ${temperature}, Seed: ${seed}, Stream: ${!!stream}`);
        
        // 2. ФОРМИРУЕМ ТЕЛО ЗАПРОСА
        const requestBody = {
            model: selectedModel,
            messages: messages
        };
        
        // Добавляем temperature, если она есть
        if (typeof temperature !== 'undefined') {
            requestBody.temperature = temperature;
        }
        
        // Добавляем seed, если он есть
        if (typeof seed !== 'undefined') {
            requestBody.seed = seed;
        }
        
        if (tools && tools.length > 0) {
            requestBody.tools = tools;
            requestBody.tool_choice = 'auto';
        }
        
        // Если запрошен стриминг
        if (stream) {
            requestBody.stream = true;
            
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://memory-chatbot.vercel.app',
                    'X-Title': 'Memory Chatbot'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Server] Stream error:', errorText);
                return res.status(response.status).json({ error: errorText });
            }
            
            // Настраиваем SSE заголовки
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            // Пробрасываем стрим от OpenRouter к клиенту
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        res.write('data: [DONE]\n\n');
                        break;
                    }
                    
                    const chunk = decoder.decode(value, { stream: true });
                    res.write(chunk);
                }
            } catch (streamError) {
                console.error('[Server] Stream read error:', streamError);
            }
            
            res.end();
            return;
        }
        
        // Обычный (не стриминг) запрос
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://memory-chatbot.vercel.app',
                'X-Title': 'Memory Chatbot'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.usage) {
            console.log(`[Server] Token usage for ${selectedModel}:`, {
                prompt: data.usage.prompt_tokens,
                completion: data.usage.completion_tokens,
                total: data.usage.total_tokens
            });
        }
        
        res.status(200).json(data);
        
    } catch (error) {
        console.error('[Server] API Error:', error);
        res.status(500).json({ error: error.message });
    }
}