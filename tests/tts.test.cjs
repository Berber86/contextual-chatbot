// Тесты озвучки: api/tts.js (сервер) и чистые функции tts.js (клиент).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// ==================== загрузка api/tts.js ====================
const apiSource = fs.readFileSync('api/tts.js', 'utf8')
    .replace(/^export const config = \{[^}]*\};$/m, '')
    .replace('export default async function handler', 'async function handler');

function loadApiHandler(fetchImpl, env = {}) {
    const sandbox = {
        console: { log() {}, error() {}, warn() {} },
        Buffer,
        process: { env },
        fetch: fetchImpl
    };
    vm.runInNewContext(
        apiSource + '\n; globalThis.__handler = handler; globalThis.__split = splitForTTS;',
        sandbox
    );
    return { handler: sandbox.__handler, split: sandbox.__split };
}

function mockRes() {
    return {
        statusCode: 200,
        headers: {},
        headersSent: false,
        ended: false,
        chunks: [],
        jsonBody: null,
        setHeader(k, v) { this.headers[String(k).toLowerCase()] = v; },
        status(code) { this.statusCode = code; return this; },
        json(obj) { this.jsonBody = obj; return this; },
        write(b) { this.headersSent = true; this.chunks.push(Buffer.from(b)); return true; },
        end() { this.ended = true; },
        flushHeaders() { this.headersSent = true; },
        body() { return Buffer.concat(this.chunks); }
    };
}

// Подделка ответа OpenRouter: PCM-буфер с параметрами в content-type
function pcmResponse(pcm, contentType) {
    return {
        ok: true,
        status: 200,
        headers: { get: (h) => String(h).toLowerCase() === 'content-type' ? (contentType || 'audio/pcm; rate=44100; channels=1') : null },
        arrayBuffer: async () => pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength),
        text: async () => ''
    };
}

function makePcm(fill, length) {
    const b = Buffer.alloc(length);
    b.fill(fill);
    return b;
}

// ==================== splitForTTS ====================
test('splitForTTS: короткий текст не режется', () => {
    const { split } = loadApiHandler(() => {});
    assert.deepEqual([...split('привет', 5000)], ['привет']);
    assert.deepEqual([...split('a'.repeat(5000), 5000)], ['a'.repeat(5000)]);
});

test('splitForTTS: режет по предложениям, а не посередине слова', () => {
    const { split } = loadApiHandler(() => {});
    const sentence = 'Это одно длинное предложение из многих слов которое повторяется снова и снова. ';
    const text = sentence.repeat(40).trim(); // ~4700+ символов
    const chunks = split(text, 1000);
    assert.ok(chunks.length > 1, 'должен разбиться на куски');
    for (const c of chunks) {
        assert.ok(c.length <= 1000, `кусок должен быть <= 1000, получено ${c.length}`);
    }
    // Крайне длинное предложение режется по символам
    const unbroken = 'x'.repeat(2500);
    const hard = split(unbroken, 1000);
    assert.deepEqual([...hard].map((c) => c.length), [1000, 1000, 500]);
});

// ==================== обработчик api/tts ====================
test('api/tts: 400 без текста', async () => {
    const { handler } = loadApiHandler(() => { throw new Error('не должен вызываться'); }, { OPENROUTER_API_KEY: 'k' });
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.jsonBody.error);
});

test('api/tts: 500 без OPENROUTER_API_KEY', async () => {
    const { handler } = loadApiHandler(() => { throw new Error('не должен вызываться'); }, {});
    const res = mockRes();
    await handler({ method: 'POST', body: { text: 'привет' } }, res);
    assert.equal(res.statusCode, 500);
    assert.match(res.jsonBody.error, /OPENROUTER_API_KEY/);
});

test('api/tts: успешный ответ — PCM без изменений, с заголовками параметров', async () => {
    const pcm = makePcm(0xab, 5000);
    const calls = [];
    const { handler } = loadApiHandler(async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body) });
        return pcmResponse(pcm);
    }, { OPENROUTER_API_KEY: 'k' });

    const res = mockRes();
    await handler({ method: 'POST', body: { text: 'Привет, как дела?', voice: 'weston' } }, res);

    assert.equal(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('audio/pcm'));
    assert.equal(res.headers['x-tts-rate'], '44100');
    assert.equal(res.headers['x-tts-channels'], '1');
    assert.equal(res.headers['x-tts-voice'], 'weston');
    assert.equal(res.headers['x-tts-model'], 'heygen/heygen-voice-1-turbo:free');
    assert.ok(res.body().equals(pcm), 'тело должно быть исходным PCM');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.voice, 'weston');
    assert.equal(calls[0].body.response_format, 'pcm');
    assert.equal(calls[0].body.model, 'heygen/heygen-voice-1-turbo:free');
    assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/audio/speech');
});

test('api/tts: неизвестный голос заменяется на gareth', async () => {
    const calls = [];
    const { handler } = loadApiHandler(async (url, init) => {
        calls.push(JSON.parse(init.body));
        return pcmResponse(makePcm(1, 100));
    }, { OPENROUTER_API_KEY: 'k' });

    const res = mockRes();
    await handler({ method: 'POST', body: { text: 'тест', voice: 'evil-clone' } }, res);
    assert.equal(calls[0].voice, 'gareth');
    assert.equal(res.headers['x-tts-voice'], 'gareth');
});

test('api/tts: длинный текст режется на куски и склеивается паузой', async () => {
    const calls = [];
    const { handler } = loadApiHandler(async (url, init) => {
        const body = JSON.parse(init.body);
        calls.push(body);
        // разные метки — проверим порядок склейки
        return pcmResponse(makePcm(calls.length, 4410));
    }, { OPENROUTER_API_KEY: 'k' });

    const text = ('Предложение номер такое-то о погоде и жизни. ').repeat(400); // ~26 000 символов
    const res = mockRes();
    await handler({ method: 'POST', body: { text } }, res);

    // 3 куска максимум (MAX_CHUNKS), каждый <= 5000
    assert.equal(calls.length, 3);
    for (const c of calls) assert.ok(c.input.length <= 5000);
    assert.equal(res.headers['x-tts-truncated'], '1', 'должен отметить усечение');

    const body = res.body();
    const gap = Math.round(44100 * 0.35) * 1 * 2; // 30 870 байт тишины
    const expected = Buffer.concat([
        makePcm(1, 4410), Buffer.alloc(gap), makePcm(2, 4410), Buffer.alloc(gap), makePcm(3, 4410)
    ]);
    assert.ok(body.equals(expected), 'куски должны идти по порядку с паузами тишины');
});

test('api/tts: ошибка 429 от OpenRouter пробрасывается как JSON', async () => {
    const { handler } = loadApiHandler(async () => ({
        ok: false,
        status: 429,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({ error: { message: 'Rate limit exceeded' } })
    }), { OPENROUTER_API_KEY: 'k' });

    const res = mockRes();
    await handler({ method: 'POST', body: { text: 'тест' } }, res);
    assert.equal(res.statusCode, 429);
    assert.match(res.jsonBody.error, /Rate limit/);
});

test('api/tts: пустой PCM от модели → 502', async () => {
    const { handler } = loadApiHandler(async () => pcmResponse(Buffer.alloc(0)), { OPENROUTER_API_KEY: 'k' });
    const res = mockRes();
    await handler({ method: 'POST', body: { text: 'тест' } }, res);
    assert.equal(res.statusCode, 502);
});

test('api/tts: параметры PCM читаются из content-type', async () => {
    const { handler } = loadApiHandler(
        async () => pcmResponse(makePcm(7, 500), 'audio/pcm; rate=24000; channels=2'),
        { OPENROUTER_API_KEY: 'k' }
    );
    const res = mockRes();
    await handler({ method: 'POST', body: { text: 'тест' } }, res);
    assert.equal(res.headers['x-tts-rate'], '24000');
    assert.equal(res.headers['x-tts-channels'], '2');
});

// ==================== чистые функции tts.js (клиент) ====================
const ttsSource = fs.readFileSync('tts.js', 'utf8');
const pureStart = ttsSource.indexOf('// [TTS-PURE-START]');
const pureEnd = ttsSource.indexOf('// [TTS-PURE-END]');
assert.ok(pureStart > 0 && pureEnd > pureStart, 'в tts.js должен быть блок чистых функций');

const clientSandbox = { Blob, console: { log() {} } };
vm.runInNewContext(ttsSource.slice(pureStart, pureEnd), clientSandbox);
const { textForSpeech, pcmToWav } = clientSandbox;

test('textForSpeech: выкидывает код, ссылки и разметку', () => {
    const md = [
        '# Заголовок',
        'Обычный текст с **жирным** и *курсивом*.',
        '```js',
        'console.log("код не читаем");',
        '```',
        'Инлайн `const x = 1` тоже пропускаем.',
        'Ссылка на [документацию](https://example.com/docs) остаётся словами.',
        'Голая ссылка https://example.com выкидывается.',
        '- пункт списка',
        '> цитата',
        'Эмодзи 🎉🔊 не читаются.'
    ].join('\n');

    const speech = textForSpeech(md);
    assert.ok(!speech.includes('console.log'), 'код не должен попасть в речь');
    assert.ok(!speech.includes('```'), 'разметка кода не должна остаться');
    assert.ok(!speech.includes('const x'), 'инлайн-код не должен попасть в речь');
    assert.ok(!speech.includes('https://'), 'URL не должны попасть в речь');
    assert.ok(!speech.includes('**') && !speech.includes('*'), 'звёздочки не должны остаться');
    assert.ok(!speech.includes('🎉'), 'эмодзи не должны остаться');
    assert.ok(speech.includes('Заголовок'), 'текст заголовка должен остаться');
    assert.ok(speech.includes('жирным'), 'текст выделения должен остаться');
    assert.ok(speech.includes('документацию'), 'текст ссылки должен остаться');
    assert.ok(speech.includes('пункт списка'), 'текст списка должен остаться');
});

test('textForSpeech: таблицы превращаются в перечисления без краевых запятых', () => {
    const md = '| Параметр | Значение |\n| --- | --- |\n| Имя | Алекс |\n| Город | Амстердам |';
    const speech = textForSpeech(md);
    assert.ok(!/^\s*,|,\s*$/.test(speech), 'не должно быть висячих запятых: ' + JSON.stringify(speech));
    assert.ok(speech.includes('Параметр, Значение'), 'строка заголовков читаема');
    assert.ok(speech.includes('Имя, Алекс'), 'ячейки разделены');
});

test('textForSpeech: пустой и код-only текст → пусто', () => {
    assert.equal(textForSpeech('```\nvar a = 1;\n```'), '');
    assert.equal(textForSpeech(''), '');
});

test('pcmToWav: корректный WAV-заголовок', () => {
    const pcm = Buffer.alloc(1000, 0x55);
    const blob = pcmToWav(new Uint8Array(pcm), 44100, 1);
    assert.equal(blob.type, 'audio/wav');
    // Blob → ArrayBuffer для проверки байтов
    return blob.arrayBuffer().then((buf) => {
        const view = new DataView(buf);
        const str = (off, len) => String.fromCharCode(...new Uint8Array(buf, off, len));
        assert.equal(str(0, 4), 'RIFF');
        assert.equal(view.getUint32(4, true), 36 + 1000);
        assert.equal(str(8, 4), 'WAVE');
        assert.equal(str(12, 4), 'fmt ');
        assert.equal(view.getUint32(16, true), 16);
        assert.equal(view.getUint16(20, true), 1);       // PCM
        assert.equal(view.getUint16(22, true), 1);       // моно
        assert.equal(view.getUint32(24, true), 44100);   // частота
        assert.equal(view.getUint32(28, true), 88200);   // байт/сек
        assert.equal(view.getUint16(32, true), 2);       // block align
        assert.equal(view.getUint16(34, true), 16);      // бит
        assert.equal(str(36, 4), 'data');
        assert.equal(view.getUint32(40, true), 1000);
        assert.deepEqual([...new Uint8Array(buf, 44)], [...pcm]);
    });
});
