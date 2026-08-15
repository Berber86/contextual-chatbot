// /api/transcribe — прокси к RouterAI (Whisper Large V3)
// Ключ хранится на сервере в переменной окружения ROUTERAI_API_KEY.
// Браузер присылает аудио в base64, сервер пересылает его в RouterAI как multipart/form-data.
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

    const { audio, format } = req.body || {};
    if (!audio) {
        return res.status(400).json({ error: 'No audio data provided' });
    }

    const apiKey = process.env.ROUTERAI_API_KEY;
    if (!apiKey) {
        console.error('[Transcribe] ROUTERAI_API_KEY is not set');
        return res.status(500).json({ error: 'Server misconfiguration: ROUTERAI_API_KEY is not set' });
    }

    try {
        const audioBuffer = Buffer.from(audio, 'base64');
        const mime = format || 'audio/webm';
        const ext = mime.includes('webm') ? 'webm'
            : mime.includes('ogg') ? 'ogg'
            : mime.includes('mp4') ? 'mp4'
            : mime.includes('mpeg') ? 'mp3' : 'audio';

        const boundary = '----VoiceBoundary' + Math.random().toString(16).slice(2);

        const headerParts = [];
        headerParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nopenai/whisper-large-v3\r\n`);
        headerParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n`);
        headerParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.${ext}"\r\nContent-Type: ${mime}\r\n\r\n`);

        const multipartBody = Buffer.concat([
            Buffer.from(headerParts.join(''), 'utf8'),
            audioBuffer,
            Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
        ]);

        const response = await fetch('https://routerai.ru/api/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: multipartBody
        });

        const raw = await response.text();

        if (!response.ok) {
            console.error('[Transcribe] RouterAI error:', response.status, raw.slice(0, 500));
            let msg = raw;
            try { msg = (JSON.parse(raw).error) || raw; } catch (_) {}
            return res.status(response.status).json({ error: typeof msg === 'string' ? msg.slice(0, 500) : msg });
        }

        let text = raw;
        try {
            const j = JSON.parse(raw);
            text = j.text || j.transcript || (Array.isArray(j.results) ? j.results.map(r => r.transcript || r.text || '').join('\n') : raw);
        } catch (_) {
            // ответ в виде plain text
        }

        return res.status(200).json({ text: (text || '').trim() });
    } catch (error) {
        console.error('[Transcribe] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
