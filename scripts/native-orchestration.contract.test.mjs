import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const mainText = readFileSync(new URL('../src/main.cpp', import.meta.url), 'utf8');
const resistanceText = readFileSync(new URL('../src/ResistanceEvaluator.cpp', import.meta.url), 'utf8');
const hotkeysText = readFileSync(new URL('../src/WidgetHotkeys.cpp', import.meta.url), 'utf8');
const interopContractsText = readFileSync(new URL('../src/WidgetInteropContracts.h', import.meta.url), 'utf8');
const jsListenersText = readFileSync(new URL('../src/WidgetJsListeners.cpp', import.meta.url), 'utf8');
const widgetEventsText = readFileSync(new URL('../src/WidgetEvents.cpp', import.meta.url), 'utf8');
const widgetEventsHeaderText = readFileSync(new URL('../src/WidgetEvents.h', import.meta.url), 'utf8');
const widgetRuntimeText = readFileSync(new URL('../src/WidgetRuntime.cpp', import.meta.url), 'utf8');
const widgetRuntimeHeaderText = readFileSync(new URL('../src/WidgetRuntime.h', import.meta.url), 'utf8');
const widgetVisibilityStateText = readFileSync(new URL('../src/WidgetVisibilityState.cpp', import.meta.url), 'utf8');
const widgetVisibilityHeaderText = readFileSync(new URL('../src/WidgetVisibilityState.h', import.meta.url), 'utf8');
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
  assert.match(interopContractsText, /kToggleWidgetsVisibilityScript\[] = "toggleWidgetsVisibility\(\)"/);
  assert.match(
    hotkeysText,
    /constexpr std::uint32_t kF11ScanCode = 0x57;/,
  );
  assert.match(
    hotkeysText,
    /Register\(kF11ScanCode, KeyEventType::KEY_DOWN, \[\]\(\) \{[\s\S]*InvokeScript\(TulliusWidgets::WidgetInteropContracts::kToggleWidgetsVisibilityScript\);[\s\S]*\}\);/,
  );
});

test('settings hotkey uses tracked settings-panel state and closes explicitly', () => {
  assert.match(hotkeysText, /DispatchToGameThread\(\[\]\(\) \{/);
  assert.match(hotkeysText, /if \(IsSettingsPanelOpen\(\)\) \{/);
  assert.match(interopContractsText, /kCloseSettingsScript\[] = "closeSettings\(\)"/);
  assert.match(interopContractsText, /kToggleSettingsScript\[] = "toggleSettings\(\)"/);
  assert.match(hotkeysText, /InvokeScript\(TulliusWidgets::WidgetInteropContracts::kCloseSettingsScript\);/);
  assert.match(hotkeysText, /InvokeScript\(TulliusWidgets::WidgetInteropContracts::kToggleSettingsScript\)/);
  assert.match(hotkeysText, /Focus on the next task tick/);
});

test('settings bridge listener uses async native settings save path', () => {
  assert.match(interopContractsText, /kOnSettingsChanged\[] = "onSettingsChanged"/);
  assert.match(jsListenersText, /RegisterJSListener\(view, TulliusWidgets::WidgetInteropContracts::kOnSettingsChanged/);
  assert.match(jsListenersText, /NativeStorage::SaveSettingsAsync\(/);
  assert.doesNotMatch(jsListenersText, /NativeStorage::SaveSettings\(ResolveStorageBasePath\(\), payload\)/);
});

test('settings bridge listener tracks settings panel visibility for native hotkeys', () => {
  assert.match(interopContractsText, /kOnSettingsVisibilityChanged\[] = "onSettingsVisibilityChanged"/);
  assert.match(jsListenersText, /RegisterJSListener\(view, TulliusWidgets::WidgetInteropContracts::kOnSettingsVisibilityChanged/);
  assert.match(jsListenersText, /SetSettingsOpen\(open\)/);
});

test('settings sync bridge result includes optional revision-aware ack support', () => {
  assert.match(interopContractsText, /kOnSettingsSyncResult\[] = "onSettingsSyncResult"/);
  assert.match(jsListenersText, /TryReadUIntField\(payloadView, "rev"\)/);
  assert.match(jsListenersText, /NotifySettingsSyncResult\(saved, revision\)/);
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

test('visibility checks allow PrismaUI focus without hiding the widget view', () => {
  assert.match(widgetEventsHeaderText, /bool \(\*hasViewFocus\)\(\) = nullptr;/);
  assert.match(widgetRuntimeHeaderText, /std::function<bool\(\)> hasViewFocus;/);
  assert.match(widgetVisibilityHeaderText, /IsBlockingUiState\(RE::UI\* ui, bool allowFocusedWidgetMenu = false\)/);
  assert.match(widgetEventsText, /IsBlockingUiState\(ui, HasViewFocus\(\)\)/);
  assert.match(widgetRuntimeText, /IsBlockingUiState\(ui, HasViewFocus\(\)\)/);
  assert.match(widgetVisibilityStateText, /const bool genericUiBlockersActive = !allowFocusedWidgetMenu/);
});

test('view focus path shows the view and requests PrismaUI focus with pauseGame support', () => {
  assert.match(viewBridgeText, /api_->Show\(view\);/);
  assert.match(viewBridgeText, /api_->Focus\(view, pauseGame, disableFocusMenu\)/);
});
