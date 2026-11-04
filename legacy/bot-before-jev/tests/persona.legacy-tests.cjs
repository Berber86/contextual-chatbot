const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');
const analytics = fs.readFileSync('analytics.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function extract(source, start, end) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, `Cannot locate ${start}`);
  const to = end ? source.indexOf(end, from) : source.length;
  assert.ok(to > from, `Cannot locate ${end}`);
  return source.slice(from, to);
}

// `const` в app.js живёт в лексическом окружении контекста, а не в его объекте.
function read(context, expression) {
  return vm.runInContext(expression, context);
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    storage: {
      getItem: key => (values.has(key) ? values.get(key) : null),
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key),
    },
  };
}

// app.js целиком: настоящие storage-функции персоны и реальные STORAGE_KEYS/PERSONA_CONFIG.
function appHarness(initial = {}) {
  const { values, storage } = createStorage(initial);
  const events = [];
  const context = vm.createContext({
    console: { log() {}, error() {} },
    window: { dispatchEvent: event => events.push(event.type) },
    localStorage: storage,
    Event,
    document: { createElement: () => ({ textContent: '', innerHTML: '' }) },
  });
  vm.runInContext(app, context);
  return { context, values, events };
}

test('persona emulation activates only with both the toggle and a written prompt', () => {
  const { context } = appHarness();

  assert.equal(context.isPersonaEnabled(), false);

  context.setPersonaMode(true);
  assert.equal(context.isPersonaMode(), true);
  assert.equal(context.isPersonaEnabled(), false, 'без промпта эмуляция не работает');

  context.setPersonaPrompt('  Ты — Шерлок Холмс  ');
  assert.equal(context.getPersonaPrompt(), 'Ты — Шерлок Холмс', 'промпт обрезается по краям');
  assert.equal(context.isPersonaEnabled(), true);

  context.setPersonaPrompt('   ');
  assert.equal(context.getPersonaPrompt(), '');
  assert.equal(context.isPersonaEnabled(), false, 'пустой промпт выключает эмуляцию');
});

test('persona prompt honours the length limit and keeps storage clean', () => {
  const { context, values } = appHarness();
  const { promptLimit } = read(context, 'PERSONA_CONFIG');
  const keys = read(context, 'STORAGE_KEYS');

  context.setPersonaPrompt('я'.repeat(promptLimit + 50));
  assert.equal(context.getPersonaPrompt().length, promptLimit);

  context.setPersonaPrompt('');
  assert.equal(values.has(keys.personaPrompt), false, 'пустой промпт удаляется из хранилища');
});

test('persona notes dedupe, cap history and survive broken storage', () => {
  const { context } = appHarness();

  const first = context.addPersonaNote('Говорит сухо и точно', { kind: 'style' });
  assert.equal(first.kind, 'style');
  assert.equal(context.getPersonaNotesData().notes.length, 1);

  assert.equal(context.addPersonaNote('  говорит сухо и точно!  '), null, 'дубликат не добавляется');
  assert.equal(context.getPersonaNotesData().notes.length, 1);

  assert.equal(context.addPersonaNote('   '), null, 'пустая заметка не добавляется');

  const { maxNotes } = read(context, 'PERSONA_CONFIG');
  const total = maxNotes + 5;
  for (let i = 0; i < total; i++) context.addPersonaNote(`Наблюдение номер ${i}`);
  const notes = context.getPersonaNotesData().notes;
  assert.equal(notes.length, maxNotes, 'история заметок ограничена');
  assert.equal(notes[notes.length - 1].text, `Наблюдение номер ${total - 1}`, 'новые заметки вытесняют старые');

  context.localStorage.setItem(read(context, 'STORAGE_KEYS').personaNotes, '{broken json');
  const recovered = context.getPersonaNotesData();
  assert.equal(Array.isArray(recovered.notes), true);
  assert.equal(recovered.notes.length, 0, 'битый JSON не роняет приложение');
});

test('persona notes accept a plain array written by an older build', () => {
  const { context, values } = appHarness();
  values.set(read(context, 'STORAGE_KEYS').personaNotes, JSON.stringify([{ text: 'старая заметка', kind: 'trait' }]));
  assert.equal(context.getPersonaNotesData().notes.length, 1);
  assert.match(context.getPersonaNotesForPrompt(), /старая заметка/);
});

test('persona counter counts down to the next note and only while emulation is on', () => {
  const { context } = appHarness();
  const { notesInterval } = read(context, 'PERSONA_CONFIG');
  assert.equal(context.getPersonaMessagesLeft(), notesInterval);

  for (let i = 0; i < notesInterval; i++) context.incrementPersonaCounter();
  assert.equal(context.getPersonaCounter(), notesInterval);
  assert.equal(context.getPersonaMessagesLeft(), 0);
  assert.equal(context.shouldUpdatePersonaNotes(), false, 'без включённой эмуляции заметки не пишутся');

  context.setPersonaPrompt('Ты — Шерлок');
  context.setPersonaMode(true);
  assert.equal(context.shouldUpdatePersonaNotes(), true);

  context.resetPersonaCounter();
  assert.equal(context.getPersonaCounter(), 0);
  assert.equal(context.shouldUpdatePersonaNotes(), false);
});

test('the persona block reaches the system prompt only in emulation mode', () => {
  const { context } = appHarness();
  assert.equal(context.getPersonaPromptBlock(), '', 'без режима блок пустой');

  context.setPersonaPrompt('Ты — Шерлок Холмс');
  context.setPersonaMode(true);
  context.addPersonaNote('Отвечает короткими выводами', { kind: 'style' });

  const block = context.getPersonaPromptBlock();
  assert.match(block, /ЭМУЛЯЦИЯ ЛИЧНОСТИ/);
  assert.match(block, /Ты — Шерлок Холмс/, 'промпт попадает в блок');
  assert.match(block, /Отвечает короткими выводами/, 'заметки попадают в блок');
  assert.match(block, /не выдумывай/, 'образ не подменяет факты о пользователе');

  context.setPersonaMode(false);
  assert.equal(context.getPersonaPromptBlock(), '', 'выключенный режим убирает блок');
});

test('chat requests carry the persona block in the system prompt', async () => {
  const source = extract(ui, 'async function processMessageWithTwoStages(userMessage)', 'function buildSystemPromptLegacy()');

  for (const withPersona of [true, false]) {
    const sent = [];
    const context = {
      getChatHistory: () => [{ role: 'user', content: 'привет' }, { role: 'assistant', content: 'здравствуй' }],
      localStorage: { getItem: () => null, setItem() {} },
      updateThinkingMessage() {},
      removeThinkingMessage() {},
      findRelevantContext: async () => ({ compressed: false, facts: 'факты', traits: 'черты' }),
      createStreamingMessage: () => ({ remove() {} }),
      updateStreamingMessage() {},
      finalizeStreamingMessage() {},
      getLanguageName: () => 'Russian',
      pickResponseArchetype: () => 'answer-first',
      decideQuestionPolicyForThisTurn: () => ({ shouldAsk: false }),
      insightMode: true,
      getPersonaPromptBlock: () => (withPersona ? '\n=== 🎭 ЭМУЛЯЦИЯ ЛИЧНОСТИ: ВКЛЮЧЕНА ===\nОБРАЗ: Шерлок' : ''),
      window: {},
      streamResponse: async (messages, onChunk, onComplete) => {
        sent.push(messages);
        onComplete('<answer>Ответ</answer>');
      },
      console: { log() {}, error() {} },
    };
    vm.runInNewContext(source, context);
    await context.processMessageWithTwoStages('привет');

    assert.equal(sent.length, 1);
    assert.equal(sent[0][0].role, 'system');
    const system = sent[0][0].content;
    assert.equal(/ЭМУЛЯЦИЯ ЛИЧНОСТИ/.test(system), withPersona);
    assert.match(system, /answer/, 'формат ответа остаётся прежним');
  }
});

test('saving an empty persona prompt turns emulation off instead of leaving a dead toggle', () => {
  const { context } = appHarness({});
  const storage = context.localStorage;

  const keys = read(context, 'STORAGE_KEYS');
  const textarea = { value: '  Ты — Шерлок Холмс  ' };
  const saveBtn = { style: {} };
  const cancelBtn = { style: {} };
  const editIndicator = { classList: { toggle() {} } };
  const elements = { knowledgeTextarea: textarea, saveBtn, cancelBtn, editIndicator };

  Object.assign(context, {
    document: { getElementById: id => elements[id] || null },
    updatePersonaModeUI() {},
    refreshPersonaNotesTab() {},
    localStorage: storage,
  });
  // currentTab/originalTabContent/hasUnsavedChanges объявлены в app.js через let.
  vm.runInContext("currentTab = 'personaPrompt'; originalTabContent = ''; hasUnsavedChanges = true; personaEnablePending = false;", context);

  vm.runInContext(extract(ui, '// Вкладки с редактируемым текстом.', 'function cancelChanges()'), context);
  storage.setItem(keys.personaMode, '1');

  context.saveChanges();
  assert.equal(context.getPersonaPrompt(), 'Ты — Шерлок Холмс');
  assert.equal(context.isPersonaMode(), true, 'непустой промпт оставляет режим включённым');
  assert.equal(read(context, 'hasUnsavedChanges'), false);

  // Пользователь пытался включить режим без промпта → после сохранения промпта он включается сам.
  vm.runInContext('setPersonaMode(false); personaEnablePending = true;', context);
  textarea.value = 'Ты — Мэри Поппинс';
  context.saveChanges();
  assert.equal(context.getPersonaPrompt(), 'Ты — Мэри Поппинс');
  assert.equal(context.isPersonaMode(), true, 'сохранённый промпт включает отложенный режим');
  assert.equal(read(context, 'personaEnablePending'), false, 'флаг отложенного включения сбрасывается');

  textarea.value = '   ';
  context.saveChanges();
  assert.equal(context.getPersonaPrompt(), '');
  assert.equal(context.isPersonaMode(), false, 'пустой промпт выключает эмуляцию');
});

test('the notes update writes a note through the memory provider and resets the counter', async () => {
  const { context } = appHarness();
  context.setPersonaPrompt('Ты — Шерлок Холмс');
  context.setPersonaMode(true);

  const requests = [];
  Object.assign(context, {
    currentLanguage: 'ru',
    getChatHistory: () => [
      { role: 'user', content: 'Расскажи, что ты замечаешь в этой комнате?' },
      { role: 'assistant', content: 'Пепел на столе. Вы ждали кого-то выше вас.' },
    ],
    getMessageCounter: () => 8,
    getLanguageName: () => 'Russian',
    callMemoryAPIWithRetry: async (prompt, retries) => {
      requests.push({ prompt, retries });
      return JSON.stringify({ note: 'Сухость и точность уже звучат — усилить наблюдательность.', kind: 'style' });
    },
    refreshPersonaNotesTab() {},
    console: { log() {}, error() {} },
  });

  vm.runInContext(extract(analytics, 'async function runPersonaNotesUpdate()', 'async function runDeletionStep'), context);
  vm.runInContext(extract(ui, 'function parseJSON(text)', '// ==================== SEND MESSAGE'), context);
  context.setPersonaCounter(read(context, 'PERSONA_CONFIG').notesInterval);

  await context.runPersonaNotesUpdate();

  assert.equal(requests.length, 1, 'заметка запрашивается у памяти один раз');
  assert.equal(requests[0].retries, 2);
  assert.match(requests[0].prompt, /Ты — Шерлок Холмс/, 'генератор видит промпт личности');
  assert.match(requests[0].prompt, /Пепел на столе/, 'генератор видит последние сообщения');

  const notes = context.getPersonaNotesData().notes;
  assert.equal(notes.length, 1);
  assert.equal(notes[0].kind, 'style');
  assert.equal(notes[0].messageCount, 8);
  assert.equal(context.getPersonaCounter(), 0, 'счётчик сбрасывается после обновления');
});

test('the notes update stays silent when emulation is off or nothing new was said', async () => {
  const { context } = appHarness();
  let requests = 0;
  Object.assign(context, {
    currentLanguage: 'ru',
    getChatHistory: () => [{ role: 'user', content: 'привет' }],
    getMessageCounter: () => 5,
    getLanguageName: () => 'Russian',
    callMemoryAPIWithRetry: async () => { requests++; return JSON.stringify({ note: 'Наблюдение', kind: 'theme' }); },
    refreshPersonaNotesTab() {},
    console: { log() {}, error() {} },
  });
  vm.runInContext(extract(analytics, 'async function runPersonaNotesUpdate()', 'async function runDeletionStep'), context);
  vm.runInContext(extract(ui, 'function parseJSON(text)', '// ==================== SEND MESSAGE'), context);

  context.setPersonaCounter(read(context, 'PERSONA_CONFIG').notesInterval);
  await context.runPersonaNotesUpdate();
  assert.equal(requests, 0, 'без включённой эмуляции модель не вызывается');
  assert.equal(context.getPersonaCounter(), 0);

  // Включаем режим, но модель не находит нового наблюдения.
  context.setPersonaPrompt('Ты — Шерлок');
  context.setPersonaMode(true);
  context.callMemoryAPIWithRetry = async () => { requests++; return JSON.stringify({ note: '   ' }); };
  await context.runPersonaNotesUpdate();
  assert.equal(requests, 1);
  assert.equal(context.getPersonaNotesData().notes.length, 0, 'пустая заметка не сохраняется');

  // Тот же текст повторно — дубликат не пишется.
  context.addPersonaNote('Наблюдение');
  context.callMemoryAPIWithRetry = async () => { requests++; return JSON.stringify({ note: 'наблюдение!' }); };
  await context.runPersonaNotesUpdate();
  assert.equal(requests, 2);
  assert.equal(context.getPersonaNotesData().notes.length, 1, 'дубликат отбрасывается');
});

test('the proactive greeting also stays in character', () => {
  const source = extract(ui, 'function buildGreetingFromLensPrompt(', '// ==================== SETTINGS MENU');
  const lens = {
    strategy: 'strategy', tone: 'tone', mainThread: 'thread', broaderCategory: 'category',
    deeperPattern: 'pattern', adjacentAngle: 'angle', softAnchor: '', questionDirection: 'direction',
    shouldAskQuestion: false, timeHook: 'hook', forbiddenConcrete: [],
  };

  for (const withPersona of [true, false]) {
    const context = {
      formatTimeContextForPrompt: () => 'TIME',
      truncateGreetingText: text => String(text),
      getGreetingHistoryForPrompt: () => '',
      buildGreetingMemoryContext: () => 'memory',
      isPersonaEnabled: () => withPersona,
      getPersonaPrompt: () => 'Ты — Шерлок Холмс',
    };
    vm.runInNewContext(source, context);
    const { system } = context.buildGreetingFromLensPrompt('Russian', {}, lens, '');

    assert.equal(/PERSONA/.test(system), withPersona, 'образ попадает в промпт приветствия только в режиме эмуляции');
    if (withPersona) assert.match(system, /Шерлок Холмс/);
  }
});

test('persona UI is wired into settings, modal tabs and counters', () => {
  assert.match(index, /id="personaModeToggle"/, 'переключатель в настройках');
  assert.match(index, /data-tab="personaPrompt"/);
  assert.match(index, /data-tab="personaNotes"/);
  assert.match(index, /id="personaCounterBadge"/);
  assert.match(index, /id="personaPromptInfo"/);
  assert.match(index, /id="personaNotesInfo"/);

  const switchTab = extract(ui, 'function switchTab(tab)', '// ==================== KNOWLEDGE UI HELPERS');
  assert.match(switchTab, /'personaNotes'/, 'заметки рендерятся как structured-вкладка');
  assert.match(switchTab, /personaPrompt/, 'промпт редактируется в textarea');

  const sendMessage = extract(ui, 'async function sendMessage(event)', '// ==================== HELP MODAL');
  assert.match(sendMessage, /trackPersonaProgress\(\)/, 'прогресс заметок обновляется при отправке');
  assert.match(sendMessage, /runPersonaNotesUpdate\(\)/);

  const clearKnowledge = extract(ui, 'function clearKnowledge()', '// ==================== MODAL WINDOW');
  assert.match(clearKnowledge, /personaNotes/, 'очистка знаний удаляет заметки об образе');
  assert.doesNotMatch(clearKnowledge, /personaPrompt|personaMode/, 'промпт и режим — настройки, а не знания');
});
