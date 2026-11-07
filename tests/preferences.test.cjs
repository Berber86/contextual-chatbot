const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ui = fs.readFileSync('ui.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

test('settings contain neither manual memory provider nor manual response model controls', () => {
  assert.doesNotMatch(html, /id="memoryProvider"/);
  assert.doesNotMatch(html, /selectChatModel/);
  assert.doesNotMatch(html, /class="model-switch"/);
  assert.match(html, /Память обновляет OpenRouter/);
  assert.match(html, /без его решения — Hydra GLM-5\.2/);
  assert.doesNotMatch(ui, /window\.selectChatModel/);
  assert.doesNotMatch(ui, /function setMemoryProvider/);
});

test('Ask Me container is hidden without gaps and appears when gaps exist', () => {
  const gaps = { gaps: [] };
  const container = { hidden: false, style: {} };
  const toggle = {
    disabled: true,
    classList: { toggle() {} },
    setAttribute() {},
  };
  const hint = { textContent: '' };
  const elements = { askMeContainer: container, askMeToggle: toggle, askMeHint: hint };
  const context = vm.createContext({
    console: { log() {} },
    askMeMode: false,
    getGapsData: () => gaps,
    t: key => key,
    document: { getElementById: id => elements[id] || null },
  });
  const section = ui.slice(ui.indexOf('// ==================== ASK ME MODE'),
    ui.indexOf('// ==================== PERSONA EMULATION UI'));
  vm.runInContext(section, context);

  vm.runInContext('updateAskMeModeUI()', context);
  assert.equal(container.hidden, true);
  assert.equal(container.style.display, 'none');
  assert.equal(toggle.disabled, true);

  gaps.gaps.push({ id: 'gap-1', topic: 'Что вдохновляет пользователя' });
  vm.runInContext('updateAskMeModeUI()', context);
  assert.equal(container.hidden, false);
  assert.equal(container.style.display, '');
  assert.equal(toggle.disabled, false);

  vm.runInContext('askMeMode = true', context);
  gaps.gaps.length = 0;
  vm.runInContext('updateAskMeModeUI()', context);
  assert.equal(container.hidden, true);
  assert.equal(context.askMeMode, false, 'скрытый недоступный режим не остаётся включённым');
});

test('Ask Me starts hidden in HTML to avoid flashing an unavailable control', () => {
  assert.match(html, /class="ask-me-container" id="askMeContainer" hidden/);
});
