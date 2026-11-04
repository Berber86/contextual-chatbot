const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const uiSource = fs.readFileSync('ui.js', 'utf8');
const initSource = uiSource.slice(
  uiSource.indexOf("document.addEventListener('DOMContentLoaded'"),
  uiSource.indexOf('// ==================== PROACTIVE GREETING ====================')
);

for (const isLocal of [false, true]) {
  test(`initializes without invite access (${isLocal ? 'local' : 'production'})`, async () => {
    const calls = [];
    let initialize;
    const counters = { style: {} };
    const context = {
      document: {
        addEventListener: (event, callback) => { assert.equal(event, 'DOMContentLoaded'); initialize = callback; },
        getElementById: () => counters,
      },
      console: { log() {} },
      isLocal,
      // No invite state, API or access-check function is provided.
      ...Object.fromEntries([
        'runMigration', 'loadLanguage', 'loadChatHistory', 'autoResizeTextarea',
        'initSettingsMenu', 'updateStyleCounter', 'updateHypoCounter', 'updateGapsCounter',
        'updateAskMeModeUI', 'updateInsightModeUI', 'initApiKeySettings', 'showProactiveGreeting',
      ].map(name => [name, () => { calls.push(name); }])),
    };
    vm.runInNewContext(initSource, context);
    await initialize();
    assert.deepEqual(calls, [
      'runMigration', 'loadLanguage', 'loadChatHistory', 'autoResizeTextarea', 'initSettingsMenu',
      ...(isLocal ? ['updateStyleCounter', 'updateHypoCounter', 'updateGapsCounter'] : []),
      'updateAskMeModeUI', 'updateInsightModeUI', 'initApiKeySettings', 'showProactiveGreeting',
    ]);
    if (!isLocal) assert.equal(counters.style.display, 'none');
  });
}

test('cached invite clients are accepted without Firebase or activation records', async () => {
  const source = fs.readFileSync('api/invite.js', 'utf8');
  const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const request = (method, body) => {
    const result = { headers: {} };
    const res = {
      setHeader(key, value) { result.headers[key] = value; },
      status(code) { result.status = code; return this; },
      json(value) { result.body = value; return this; },
      end() { return this; },
    };
    handler({ method, body }, res);
    return result;
  };
  assert.deepEqual(request('POST', { action: 'checkUser' }).body, { success: true, activated: true });
  assert.deepEqual(request('POST', { action: 'validate', code: 'anything' }).body, { success: true, valid: true });
  assert.deepEqual(request('POST', { action: 'activate', code: 'anything' }).body, { success: true });
  assert.equal(request('POST', {}).status, 400);
  assert.equal(request('GET').status, 405);
  assert.equal(request('OPTIONS').status, 200);
});

test('cached UI can still call the access check after app.js is updated', async () => {
  const source = fs.readFileSync('app.js', 'utf8');
  const compatibility = source.slice(source.lastIndexOf('// A cached older ui.js'));
  const context = { window: {} };
  vm.runInNewContext(compatibility, context);
  assert.equal(await context.window.checkInviteAccess(), true);
});
