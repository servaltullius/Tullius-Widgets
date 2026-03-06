import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const mainText = readFileSync(new URL('../src/main.cpp', import.meta.url), 'utf8');
const resistanceText = readFileSync(new URL('../src/ResistanceEvaluator.cpp', import.meta.url), 'utf8');
const hotkeysText = readFileSync(new URL('../src/WidgetHotkeys.cpp', import.meta.url), 'utf8');
const jsListenersText = readFileSync(new URL('../src/WidgetJsListeners.cpp', import.meta.url), 'utf8');
const widgetEventsText = readFileSync(new URL('../src/WidgetEvents.cpp', import.meta.url), 'utf8');
const widgetRuntimeText = readFileSync(new URL('../src/WidgetRuntime.cpp', import.meta.url), 'utf8');
const widgetVisibilityStateText = readFileSync(new URL('../src/WidgetVisibilityState.cpp', import.meta.url), 'utf8');
const viewBridgeText = readFileSync(new URL('../src/WidgetViewBridge.cpp', import.meta.url), 'utf8');

test('native orchestration is extracted into WidgetRuntime module', () => {
  assert.equal(existsSync(new URL('../src/WidgetRuntime.h', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/WidgetRuntime.cpp', import.meta.url)), true);
  assert.match(mainText, /#include "WidgetRuntime\.h"/);
  assert.doesNotMatch(mainText, /static void StartHeartbeat\(/);
  assert.doesNotMatch(mainText, /static void RequestStatsDispatch\(/);
});

test('resistance evaluator clamps documented resistance ranges', () => {
  assert.match(
    resistanceText,
    /case RE::ActorValue::kResistMagic:[\s\S]*case RE::ActorValue::kPoisonResist:[\s\S]*numeric_limits<float>::lowest[\s\S]*85\.0f, true \};/,
  );
  assert.match(
    resistanceText,
    /case RE::ActorValue::kResistDisease:[\s\S]*return \{ 0\.0f, 100\.0f, true \};/,
  );
});

test('default hotkeys include F11 widget visibility toggle', () => {
  assert.match(
    hotkeysText,
    /Register\(0x57, KeyEventType::KEY_DOWN, \[\]\(\) \{[\s\S]*InvokeScript\("toggleWidgetsVisibility\(\)"\);[\s\S]*\}\);/,
  );
});

test('settings hotkey uses tracked settings-panel state and closes explicitly', () => {
  assert.match(hotkeysText, /DispatchToGameThread\(\[\]\(\) \{/);
  assert.match(hotkeysText, /if \(IsSettingsPanelOpen\(\)\) \{/);
  assert.match(hotkeysText, /InvokeScript\("closeSettings\(\)"\);/);
  assert.match(hotkeysText, /InvokeScript\("toggleSettings\(\)"\)/);
  assert.match(hotkeysText, /Focus on the next task tick/);
});

test('settings bridge listener uses async native settings save path', () => {
  assert.match(jsListenersText, /RegisterJSListener\(view, "onSettingsChanged"/);
  assert.match(jsListenersText, /NativeStorage::SaveSettingsAsync\(/);
  assert.doesNotMatch(jsListenersText, /NativeStorage::SaveSettings\(ResolveStorageBasePath\(\), payload\)/);
});

test('settings bridge listener tracks settings panel visibility for native hotkeys', () => {
  assert.match(jsListenersText, /RegisterJSListener\(view, "onSettingsVisibilityChanged"/);
  assert.match(jsListenersText, /SetSettingsOpen\(open\)/);
});

test('menu visibility heuristics cover transient photo or capture menus', () => {
  assert.match(widgetEventsText, /#include "WidgetVisibilityState\.h"/);
  assert.match(widgetRuntimeText, /#include "WidgetVisibilityState\.h"/);
  assert.match(widgetVisibilityStateText, /"photo"/);
  assert.match(widgetVisibilityStateText, /"screenshot"/);
  assert.match(widgetVisibilityStateText, /IsInFreeCameraMode\(\)/);
  assert.match(widgetVisibilityStateText, /IsModalMenuOpen\(\)/);
  assert.match(widgetVisibilityStateText, /IsApplicationMenuOpen\(\)/);
});

test('view focus path shows the view and requests PrismaUI focus with pauseGame support', () => {
  assert.match(viewBridgeText, /api_->Show\(view\);/);
  assert.match(viewBridgeText, /api_->Focus\(view, pauseGame, disableFocusMenu\)/);
});
