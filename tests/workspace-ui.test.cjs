const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const workspace = fs.readFileSync('workspace.js', 'utf8');
const css = fs.readFileSync('styles/workspace.css', 'utf8');

test('shell loads the modular design system instead of the legacy monolith', () => {
  assert.ok(html.includes('styles/workspace.css'));
  assert.ok(html.includes('styles/shell-redesign.css'));
  assert.ok(html.includes('styles/legacy-dependencies.css'));
  assert.ok(!/<link[^>]+href="style\.css"/.test(html));
  assert.ok(html.includes('workspace.js'));
});

test('critical shell ids and handlers remain wired', () => {
  for (const id of ['chatArea', 'chatWelcome', 'messageInput', 'sendBtn', 'voiceBtn', 'askMeToggle', 'settingsDropdown', 'settingsMenuBtn', 'appSidebar', 'sidebarScrim', 'memoryFactCount', 'knowledgeModal']) {
    assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  }
  assert.ok(html.includes('onkeydown="handleKeyDown(event)"'));
  assert.ok(workspace.includes('window.handleKeyDown'));
  assert.ok(workspace.includes('window.usePromptSuggestion'));
  assert.ok(workspace.includes('window.updateComposerState'));
});

test('chat history helpers are not duplicated', () => {
  for (const name of ['appendMessage', 'addToHistory', 'loadChatHistory']) {
    const count = (ui.match(new RegExp(`function ${name}\\(`, 'g')) || []).length;
    assert.equal(count, 1, `${name} should be defined once`);
  }
});

test('memory updates notify the workspace summary', () => {
  assert.ok(app.includes('function notifyMemoryUpdated'));
  for (const name of ['Facts', 'Traits', 'Timeline', 'Hypotheses', 'Gaps', 'Social']) {
    assert.ok(app.includes(`function set${name}Data`));
  }
  assert.ok(workspace.includes("window.addEventListener('memory:updated'"));
});

test('privacy copy does not promise that context is never sent', () => {
  assert.ok(!html.includes('Никуда не отправляется. Никогда.'));
  assert.ok(html.includes('передаются ИИ-провайдеру'));
});

test('design tokens use the light workspace palette', () => {
  assert.ok(css.includes('--ui-bg: #f5f6f1'));
  assert.ok(css.includes('--ui-accent: #315d49'));
  assert.ok(css.includes('prefers-reduced-motion'));
});
