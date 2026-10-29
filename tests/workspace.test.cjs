const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ui = fs.readFileSync('ui.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const dashboard = fs.readFileSync('dashboard.js', 'utf8');

function extract(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Cannot locate ${start}`);
  return source.slice(from, to);
}

test('composer sends on Enter, but not Shift+Enter or during IME composition', () => {
  const input = { value: '', style: {}, scrollHeight: 45, addEventListener() {} };
  const send = { disabled: false };
  let submitted = 0;
  let prevented = 0;
  const context = {
    document: { getElementById: id => id === 'messageInput' ? input : send },
    isProcessing: false,
    sendMessage: () => submitted++,
  };
  vm.runInNewContext(extract(ui, 'function updateComposerState()', '// ====================  VIA OPENROUTER'), context);
  context.updateComposerState();
  assert.equal(send.disabled, true);
  input.value = 'Привет';
  context.updateComposerState();
  assert.equal(send.disabled, false);
  context.isProcessing = true;
  context.updateComposerState();
  assert.equal(send.disabled, true);

  const event = overrides => ({ key: 'Enter', keyCode: 13, preventDefault() { prevented++; }, ...overrides });
  context.handleKeyDown(event({ shiftKey: true }));
  context.handleKeyDown(event({ isComposing: true }));
  context.handleKeyDown(event({ keyCode: 229 }));
  assert.equal(submitted, 0);
  context.handleKeyDown(event({}));
  assert.equal(submitted, 1);
  assert.equal(prevented, 1);
});

test('clearing chat preserves the welcome screen and removes conversation nodes', () => {
  const removed = [];
  const children = ['welcomeScreen', 'userMessage', 'thinkingMessage'].map(id => ({ id, remove() { removed.push(id); } }));
  const status = { textContent: '' };
  let updated = 0;
  let storageKey;
  const context = {
    confirm: () => true,
    isProcessing: false,
    t: key => key,
    localStorage: { removeItem: key => { storageKey = key; } },
    STORAGE_KEYS: { chatHistory: 'history' },
    document: { getElementById: id => id === 'chatArea' ? { children } : status },
    window: { updateWelcomeScreen() { updated++; } },
    console: { log() {} },
  };
  vm.runInNewContext(extract(ui, 'function clearChat()', '// ==================== KNOWLEDGE ===================='), context);
  context.clearChat();
  assert.deepEqual(removed, ['userMessage', 'thinkingMessage']);
  assert.equal(storageKey, 'history');
  assert.equal(updated, 1);
  assert.equal(status.textContent, 'chatCleared');
});

test('empty history does not scroll past the welcome screen', () => {
  // The timestamp-aware declaration at the end of ui.js is the active one.
  const start = ui.lastIndexOf('function loadChatHistory()');
  const end = ui.indexOf('// 3. Отрисовываем', start);
  const chat = { scrollTop: 0, scrollHeight: 500 };
  let history = [];
  const context = { getChatHistory: () => history, document: { getElementById: () => chat }, appendMessage() {}, Date };
  vm.runInNewContext(ui.slice(start, end), context);
  context.loadChatHistory();
  assert.equal(chat.scrollTop, 0);
  history = [{ role: 'user', content: 'hello' }];
  context.loadChatHistory();
  assert.equal(chat.scrollTop, 500);
});

test('memory overview reflects active records, including Russian plural forms', () => {
  const ids = ['memoryFacts', 'memoryTraits', 'memoryEvents', 'memoryFactsLabel', 'memoryTraitsLabel', 'memoryEventsLabel', 'memoryStatus', 'memorySummary'];
  const elements = Object.fromEntries(ids.map(id => [id, { textContent: '', dataset: {} }]));
  const listeners = {};
  let facts = { facts: [{ text: 'one' }, { text: 'old', superseded: true }] };
  const context = {
    document: { getElementById: id => elements[id], addEventListener() {} },
    window: { addEventListener: (event, callback) => { listeners[event] = callback; } },
    getFactsData: () => facts,
    getTraitsData: () => ({ traits: [{}, {}] }),
    getTimelineData: () => ({ events: [{}, {}, {}, {}, {}] }),
    getHypothesesData: () => ({ hypotheses: [] }),
    getSocialData: () => ({ contacts: [] }),
    currentLanguage: 'ru',
    t: key => key,
  };
  vm.runInNewContext(dashboard, context);
  context.window.refreshMemoryOverview();
  assert.equal(elements.memoryFacts.textContent, '1');
  assert.equal(elements.memoryFactsLabel.textContent, 'факт');
  assert.equal(elements.memoryTraitsLabel.textContent, 'черты');
  assert.equal(elements.memoryEventsLabel.textContent, 'событий');
  assert.equal(elements.memoryStatus.textContent, 'memoryFilledTag');
  facts = { facts: Array.from({ length: 11 }, () => ({})) };
  listeners['memory-updated']();
  assert.equal(elements.memoryFactsLabel.textContent, 'фактов');
});

test('a stage-two failure propagates to the caller instead of reporting success', async () => {
  const source = extract(ui, 'async function processMessageWithTwoStages(userMessage)', 'function buildSystemPromptLegacy()');
  let removed = false;
  let shownError = false;
  const context = {
    getChatHistory: () => [],
    localStorage: { getItem: () => null, setItem() {} },
    updateThinkingMessage() {},
    findRelevantContext: async () => ({ compressed: false }),
    createStreamingMessage: () => ({ remove() { removed = true; } }),
    getLanguageName: () => 'Russian',
    pickResponseArchetype: () => '',
    decideQuestionPolicyForThisTurn: () => ({ shouldAsk: false }),
    insightMode: true,
    window: {},
    streamResponse: async () => { throw new Error('offline'); },
    removeThinkingMessage() {},
    appendMessage() { shownError = true; },
    console: { error() {} },
  };
  vm.runInNewContext(source, context);
  await assert.rejects(context.processMessageWithTwoStages('hello'), /offline/);
  assert.equal(removed, true);
  assert.equal(shownError, false);
});

test('failed sends restore the message without counting it or overwriting a new draft', async () => {
  const source = extract(ui, 'async function sendMessage(event)', '// ==================== HELP MODAL ====================');
  for (const newDraft of ['', 'Новый черновик']) {
    const input = { value: 'Исходное сообщение', style: {}, dispatchEvent() {} };
    const send = { disabled: false };
    const messages = [];
    let counted = false;
    const context = {
      isProcessing: false,
      document: { getElementById: id => ({ messageInput: input, sendBtn: send, streamingMessage: null })[id] },
      window: {},
      Event: class Event {},
      updateComposerState() {},
      appendMessage: (...args) => messages.push(args),
      processMessageWithTwoStages: async () => { input.value = newDraft; throw new Error('offline'); },
      removeThinkingMessage() {},
      incrementMessageCounter: () => { counted = true; },
      t: key => key,
      console: { error() {} },
    };
    vm.runInNewContext(source, context);
    await context.sendMessage({ preventDefault() {} });
    assert.equal(input.value, newDraft || 'Исходное сообщение');
    assert.equal(counted, false);
    assert.equal(context.isProcessing, false);
    assert.equal(messages[1][0], 'system');
    assert.equal(messages[1][1], 'chatConnectionError');
    assert.equal(messages[1][2], false);
  }
});

test('switching back to Russian uses built-in translations without an API request', async () => {
  const source = extract(app, 'async function selectLanguage(langCode)', 'async function translateInterface(langCode)');
  let applied = false;
  let translated = false;
  let saved;
  const context = {
    LANGUAGES: [{ code: 'ru', name: 'Русский' }],
    DEFAULT_TRANSLATIONS: { example: 'Привет' },
    translations: {}, currentLanguage: 'en',
    STORAGE_KEYS: { language: 'language', translations: 'translations' },
    localStorage: { setItem: (key, value) => { saved = [key, value]; }, getItem: () => null },
    applyTranslations() { applied = true; },
    translateInterface: async () => { translated = true; },
  };
  vm.runInNewContext(source, context);
  await context.selectLanguage('ru');
  assert.equal(context.currentLanguage, 'ru');
  assert.equal(context.translations.example, 'Привет');
  assert.deepEqual(saved, ['language', 'ru']);
  assert.equal(applied, true);
  assert.equal(translated, false);
});

test('self-discovery cards can be activated with Enter and Space', () => {
  const source = fs.readFileSync('you.js', 'utf8');
  const listeners = {};
  let clicks = 0;
  let prevented = 0;
  const card = {
    addEventListener: (name, handler) => { listeners[name] = handler; },
    click: () => { clicks++; },
  };
  const context = {
    document: { querySelectorAll: selector => selector === '.you-quality-card' ? [card] : [] },
    youHandleDragStart() {}, youHandleDragEnd() {}, youHandleTouchStart() {},
    youHandleTouchMove() {}, youHandleTouchEnd() {}, youHandleCardClick() {},
    youHandleDragOver() {}, youHandleDragLeave() {}, youHandleDrop() {}, youHandleZoneClick() {},
    youUpdateZoneStates() {},
  };
  vm.runInNewContext(extract(source, 'function youInitDragAndDrop()', 'function youHandleCardClick(e)'), context);
  context.youInitDragAndDrop();
  for (const key of ['Enter', ' ', 'ArrowDown']) {
    listeners.keydown({ key, preventDefault: () => { prevented++; } });
  }
  assert.equal(clicks, 2);
  assert.equal(prevented, 2);
});

test('self-discovery keeps a selected card active when a zone is full', () => {
  const source = fs.readFileSync('you.js', 'utf8');
  const classes = new Set();
  const attributes = {};
  const card = {
    classList: { contains: name => classes.has(name), add: name => classes.add(name), remove: name => classes.delete(name) },
    setAttribute: (name, value) => { attributes[name] = value; },
  };
  let canMove = false;
  const moved = [];
  const context = {
    document: { querySelectorAll: () => [card] },
    youState: { activeCard: null, touchDragData: null },
    youUpdateZoneHighlights() {},
    youMoveCardToZone: (selected, zone) => { moved.push([selected, zone]); return canMove; },
  };
  vm.runInNewContext(extract(source, 'function youHandleCardClick(e)', 'function youHandleDragStart(e)'), context);
  context.youHandleCardClick.call(card, { stopPropagation() {} });
  assert.equal(attributes['aria-pressed'], 'true');
  const zone = { dataset: { zone: 'yes' } };
  const event = { target: { closest: () => null } };
  context.youHandleZoneClick.call(zone, event);
  assert.equal(context.youState.activeCard, card);
  assert.equal(attributes['aria-pressed'], 'true');
  canMove = true;
  context.youHandleZoneClick.call(zone, event);
  assert.equal(moved.length, 2);
  assert.equal(context.youState.activeCard, null);
  assert.equal(attributes['aria-pressed'], 'false');
});

test('self-discovery leaves narrow-screen touch swipes available for scrolling', () => {
  const source = fs.readFileSync('you.js', 'utf8');
  let prevented = false;
  const context = {
    youState: { touchDragData: null },
    window: { matchMedia: () => ({ matches: true }) },
  };
  vm.runInNewContext(extract(source, 'function youHandleTouchStart(e)', 'function youHandleTouchEnd(e)'), context);
  const card = { getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  context.youHandleTouchStart.call(card, { touches: [{ clientX: 20, clientY: 20 }] });
  context.youHandleTouchMove({ touches: [{ clientX: 20, clientY: 100 }], preventDefault: () => { prevented = true; } });
  assert.equal(context.youState.touchDragData, null);
  assert.equal(prevented, false);
  context.window.matchMedia = () => ({ matches: false });
  context.youHandleTouchStart.call(card, { touches: [{ clientX: 20, clientY: 20 }] });
  assert.equal(context.youState.touchDragData.card, card, 'larger screens retain touch drag support');
});
