// Structure checks for the self-test session (docs/plans/2026-11-26-in-game-self-test.md): every
// place that would write a file, send the real settings or stats, or act on a hotkey checks the
// session first. The behaviour of the session logic itself is in self-test-session.native.test.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const storageText = read('NativeStorage.cpp');
const listenersText = read('WidgetJsListeners.cpp');
const mainText = read('main.cpp');
const runtimeText = read('WidgetRuntime.cpp');
const hotkeysText = read('WidgetHotkeys.cpp');
const contractsText = read('WidgetInteropContracts.h');
const selfTestRuntimeText = read('SelfTestRuntime.cpp');

const SESSION_CHECK = String.raw`if \((?:TulliusWidgets::)?SelfTestSession::IsActive\(\)\)`;

/** The body of a function definition, from its opening brace to the matching closing one. */
function bodyOf(text, signature) {
  const start = text.search(signature);
  assert.notEqual(start, -1, `definition not found: ${signature}`);
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  throw new Error(`unbalanced braces after ${signature}`);
}

function assertChecksSessionFirst(body, label) {
  assert.match(body.trimStart(), new RegExp(`^(?://[^\\n]*\\n\\s*)*${SESSION_CHECK}`), `${label} must check the session first`);
}

test('every settings and preset write refuses in a self-test session before touching the disk', () => {
  assertChecksSessionFirst(bodyOf(storageText, /bool SaveSettingsSync\(/), 'SaveSettingsSync');
  assertChecksSessionFirst(bodyOf(storageText, /\nbool SaveSettingsAsync\(/), 'SaveSettingsAsync');
  assertChecksSessionFirst(bodyOf(storageText, /\nbool ExportPreset\(/), 'ExportPreset');
  // Those are the only writers: the async writer and the public SaveSettings go through SaveSettingsSync.
  assert.match(bodyOf(storageText, /\nbool SaveSettings\(/), /return SaveSettingsSync\(/);
  assert.equal((storageText.match(/std::ofstream /g) ?? []).length, 2, 'a new file writer needs the session check too');
});

test('the page cannot save, export or import in a self-test session', () => {
  const saveListener = listenersText.slice(
    listenersText.indexOf('kOnSettingsChanged, ['),
    listenersText.indexOf('kOnSettingsLoadFailed, ['),
  );
  assert.ok(
    saveListener.search(/SelfTestSession::IsActive\(\)/) < saveListener.search(/ApplyHotkeysFromSettingsJson|SaveSettingsAsync/),
    'the save listener checks the session before applying hotkeys or saving',
  );
  assert.doesNotMatch(
    saveListener.slice(saveListener.search(/SelfTestSession::IsActive\(\)/), saveListener.indexOf('return;') + 7),
    /NotifySettingsSyncResult/,
    'a dropped save is not answered, so the page does not retry or warn',
  );

  const exportListener = listenersText.slice(listenersText.indexOf('kOnExportSettings, ['), listenersText.indexOf('kOnImportSettings, ['));
  assert.ok(exportListener.search(/SelfTestSession::IsActive\(\)/) < exportListener.search(/ExportPreset\(/));
  const importListener = listenersText.slice(listenersText.indexOf('kOnImportSettings, ['), listenersText.indexOf('kOnRequestUnfocus, ['));
  assert.ok(importListener.search(/SelfTestSession::IsActive\(\)/) < importListener.search(/LoadPreset\(/));
});

test('a self-test session never reads the settings file or sends the page the real settings or game stats', () => {
  // Every reader (the page's settings, the startup hotkey bindings) goes through LoadSettings.
  assertChecksSessionFirst(bodyOf(storageText, /\nstd::string LoadSettings\(/), 'LoadSettings');
  assert.equal(
    (storageText.match(/GetSettingsPath\(gameRootPath\), kMaxSettingsFileBytes/g) ?? []).length,
    1,
    'a new reader of the settings file needs the session check too',
  );

  const sendSettings = bodyOf(mainText, /static void SendSettingsToView\(\)/);
  assert.ok(
    sendSettings.search(/SelfTestSession::IsActive\(\)/) < sendSettings.search(/LoadSettings\(/),
    'the session check comes before reading the settings file',
  );
  assert.match(sendSettings, /kEnterSelfTestSessionScript/);

  const sendStats = bodyOf(runtimeText, /void SendStatsToView\(bool force\)/);
  assert.ok(sendStats.search(/SelfTestSession::IsActive\(\)/) < sendStats.search(/collectStatsJson\(\)/));
});

test('the session is decided at plugin load, before the view exists', () => {
  const load = bodyOf(mainText, /SKSE_PLUGIN_LOAD\(/);
  const decide = load.search(/SelfTestRuntime::InitializeForLaunch\(/);
  assert.notEqual(decide, -1);
  assert.ok(decide < load.search(/RegisterListener\(/), 'before the kDataLoaded handler that creates the view is registered');
  // The marker is checked in one place only.
  const checkers = readdirSync(new URL('../src/', import.meta.url))
    .filter(name => /\.(cpp|h)$/.test(name) && name !== 'SelfTestSession.h')
    .filter(name => read(name).includes('CheckMarker('));
  assert.deepEqual(checkers, ['SelfTestRuntime.cpp']);
  assert.match(selfTestRuntimeText, /SetActiveForLaunch\(true\)/);
});

test('hotkeys do nothing in a self-test session', () => {
  assertChecksSessionFirst(bodyOf(hotkeysText, /void OnSettingsKey\(\)/), 'OnSettingsKey');
  assertChecksSessionFirst(bodyOf(hotkeysText, /void OnVisibilityKey\(\)/), 'OnVisibilityKey');
  const escape = hotkeysText.slice(hotkeysText.indexOf('Register(kEscapeScanCode'));
  assertChecksSessionFirst(bodyOf(escape, /\[\]\(\)/), 'the Esc handler');
});

test('the page is asked to run from a visible heartbeat and reports through its own listener', () => {
  assert.match(contractsText, /kRunSelfTest\[] = "runSelfTest"/);
  assert.match(contractsText, /kOnSelfTestReport\[] = "onSelfTestReport"/);
  assert.match(contractsText, /kEnterSelfTestSessionScript\[] = "enterSelfTestSession\(\)"/);
  assert.match(listenersText, /kOnSelfTestReport, \[[\s\S]*?SelfTestRuntime::HandleReport\(payload\)/);
  assert.match(mainText, /callbacks\.onVisibleHeartbeat = \[\]\(\) \{\s*TulliusWidgets::SelfTestRuntime::PollOnVisibleHeartbeat\(&TryInvoke\);/);
  // Only after the menu check, while the view is shown.
  const heartbeat = runtimeText.slice(runtimeText.indexOf('QueueGameTask([heartbeatDue'));
  assert.ok(heartbeat.search(/IsBlockingUiState/) < heartbeat.search(/onVisibleHeartbeat\(\)/));
  assert.match(heartbeat, /if \(viewShown && IsInteropReady\(\) && g_callbacks\.onVisibleHeartbeat\)/);
});
