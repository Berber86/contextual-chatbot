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
    
    const { messages, tools, model } = req.body;
    
    try {
        // Определяем модель для использования
        let selectedModel = model || 'mistralai/devstral-2512:free'; // модель по умолчанию
        
        console.log(`[Server] Using model: ${selectedModel}, tools: ${tools?.length || 0}`);
        
        const requestBody = {
            model: selectedModel,
            messages: messages
        };
        
        if (tools && tools.length > 0) {
            requestBody.tools = tools;
            requestBody.tool_choice = 'auto';
        }
        
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
        
        // Логируем использование токенов для отладки
        if (data.usage) {
            console.log(`[Server] Token usage for ${selectedModel}:`, {
                prompt: data.usage.prompt_tokens,
                completion: data.usage.completion_tokens,
                total: data.usage.total_tokens
            });
        }
        
        res.status(200).json(data);
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
}