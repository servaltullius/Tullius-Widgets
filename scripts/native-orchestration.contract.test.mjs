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
    /void OnVisibilityKey\(\)\s*\{[\s\S]*InvokeScript\(TulliusWidgets::WidgetInteropContracts::kToggleWidgetsVisibilityScript\);/,
  );
  assert.match(hotkeysText, /BindKeys\(kInsertScanCode, kF11ScanCode\);/);
});

test('saved hotkey bindings apply at startup and on every settings save', () => {
  assert.match(hotkeysText, /TryReadUIntMember\(settingsJson, \{ "general", "settingsHotkey" \}\)/);
  assert.match(hotkeysText, /TryReadUIntMember\(settingsJson, \{ "general", "visibilityHotkey" \}\)/);
  assert.match(hotkeysText, /case 0xD2:  \/\/ Insert/);
  assert.match(hotkeysText, /IsMenuOpen\(RE::Console::MENU_NAME\)/);
  assert.match(hotkeysText, /GetRuntimeData\(\).textEntryCount <= 0/);
  assert.match(hotkeysText, /bool CanTypeText\(std::uint32_t code\)/);
  assert.match(jsListenersText, /WidgetHotkeys::ApplyHotkeysFromSettingsJson\(payload\)/);
  assert.match(mainText, /WidgetHotkeys::ApplyHotkeysFromSettingsJson\(savedSettings\)/);
  assert.match(interopContractsText, /kOnHotkeyCapture\[] = "onHotkeyCapture"/);
  assert.match(jsListenersText, /WidgetHotkeys::SetCaptureActive\(active\)/);
  assert.match(hotkeysText, /return;  \/\/ Esc cancels the capture on the page instead of closing the panel\./);
  assert.match(hotkeysText, /kCaptureReleaseGraceMs/);
  assert.match(interopContractsText, /kOnEscapeOwner\[] = "onEscapeOwner"/);
  assert.match(jsListenersText, /WidgetHotkeys::SetPageOwnsEscape\(state == "1", state == "0e"\)/);
  assert.match(hotkeysText, /g_pageEscapeReleasedAtMs\.store\(releasedByPageEsc \? NowMs\(\) : 0/);
  assert.match(jsListenersText, /WidgetHotkeys::ClearPageEscape\(\)/);
  assert.match(interopContractsText, /kHandleEscapeScript\[] = "handleEscape\(\)"/);
  assert.match(hotkeysText, /if \(PageHoldsEscape\(\)\) \{[\s\S]*?InvokeScript\(TulliusWidgets::WidgetInteropContracts::kHandleEscapeScript\);[\s\S]*?return;\s*\}/);
  assert.match(hotkeysText, /if \(PageReleasedEscapeJustNow\(\)\) \{\s*return;/);
  assert.match(hotkeysText, /Register\(kEscapeScanCode, KeyEventType::KEY_DOWN, \[\]\(\) \{\s*if \(AnotherMenuTakesEscape\(\)\) \{\s*return;/);
  assert.match(hotkeysText, /IsBlockingUiStateExceptFreeCamera\(ui, true\)/);
});

test('settings panel gets its focus back when a menu that hid the view closes', () => {
  assert.match(mainText, /static void HideViewIfReady\(\) \{[\s\S]*?if \(g\.settingsPanelOpen\.load\(std::memory_order_acquire\)\) \{\s*g\.panelFocusLostToHide\.store\(true/);
  assert.match(mainText, /static bool TryShowView\(\) \{[\s\S]*?if \(g\.panelFocusLostToHide\.exchange\(false, std::memory_order_acq_rel\)\) \{\s*RestorePanelFocusAfterShow\(\);/);
  assert.match(mainText, /static void RestorePanelFocusAfterShow\(\) \{\s*QueueGameTask\(/);
  assert.match(mainText, /if \(TryFocusView\(\)\) \{[\s\S]*?TryInvoke\(TulliusWidgets::WidgetInteropContracts::kCloseSettingsScript\)\)/);
  assert.match(mainText, /g\.panelFocusLostToHide\.store\(false, std::memory_order_release\);/);
  assert.match(mainText, /eventCallbacks\.hasViewFocus = &ViewOwnsScreen;/);
  assert.match(mainText, /callbacks\.hasViewFocus = \[\]\(\) \{\s*return ViewOwnsScreen\(\);/);
  assert.match(mainText, /if \(g\.settingsPanelOpen\.exchange\(false, std::memory_order_acq_rel\)\) \{\s*TryInvoke\(TulliusWidgets::WidgetInteropContracts::kCloseSettingsScript\);/);
  assert.match(mainText, /if \(!TryInvoke\(TulliusWidgets::WidgetInteropContracts::kCloseSettingsScript\)\) \{[\s\S]*?g\.settingsPanelOpen\.store\(false, std::memory_order_release\);[\s\S]*?TryUnfocusView\(\);/);
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

test('settings saves keep the old file first and the view can report a failed load', () => {
  const storageText = readFileSync(new URL('../src/NativeStorage.cpp', import.meta.url), 'utf8');
  // Copies come first; a save they refuse is not written, and a failed write is retried alone.
  assert.match(storageText, /auto prepared = KeepCopiesBeforeSave\(gameRootPath, jsonData\);\s*if \(prepared\.mustNotReplace\) \{[\s\S]*?prepared = KeepCopiesBeforeSave\(gameRootPath, jsonData\);\s*if \(prepared\.mustNotReplace\) return false;/);
  assert.match(storageText, /if \(!WriteSettingsFile\(gameRootPath, jsonData\)\) \{[\s\S]*?if \(!WriteSettingsFile\(gameRootPath, jsonData\)\) \{[\s\S]*?return false;[\s\S]*?RecordWrittenSave\(prepared\);/);
  assert.match(storageText, /SettingsBackups::PrepareForSave\([\s\S]*?lastWrittenRevision\)/);
  // The notice is queued only once the file was really replaced.
  assert.match(storageText, /void RecordWrittenSave\([^)]*\)\s*\{[\s\S]*?g_lastWrittenRevision = prepared\.incomingRevision;[\s\S]*?g_pendingBackupNotice = prepared\.unloadedBackup->filename\(\)\.string\(\);/);
  // State the writer thread touches is declared before (destroyed after) the writer itself.
  assert.ok(storageText.indexOf('std::optional<std::string> g_pendingBackupNotice;') < storageText.indexOf('std::jthread g_asyncSettingsWriter;'));
  // A byte order mark is removed before the file reaches the view.
  assert.match(storageText, /SettingsBackups::StripUtf8Bom\(out\)/);
  // A file that is there but cannot be read is reported to the view instead of being skipped silently.
  assert.match(mainText, /if \(json\.empty\(\)\) \{[\s\S]*?SettingsFileExists\([\s\S]*?TryInvoke\(TulliusWidgets::WidgetInteropContracts::kShowSettingsLoadFailureScript\)/);
  assert.match(interopContractsText, /kShowSettingsLoadFailureScript\[] = "showSettingsLoadFailure\(\)"/);
  // The view hears about a kept file after the save it belongs to.
  assert.match(interopContractsText, /kShowSettingsBackupNotice\[] = "showSettingsBackupNotice"/);
  assert.match(jsListenersText, /NotifySettingsSyncResult\(saved, revision\);\s*NotifyUnloadedBackup\(\);/);
  assert.match(jsListenersText, /SettingsBackups::BuildBackupNoticeScript\(\s*TulliusWidgets::WidgetInteropContracts::kShowSettingsBackupNotice, \*fileName\)/);
  assert.match(jsListenersText, /SettingsBackups::ClampUtf8\(reason, kMaxReasonLength\)/);
  // A view that could not read the saved settings says why, and the plugin logs it.
  assert.match(interopContractsText, /kOnSettingsLoadFailed\[] = "onSettingsLoadFailed"/);
  assert.match(jsListenersText, /RegisterJSListener\(view, TulliusWidgets::WidgetInteropContracts::kOnSettingsLoadFailed,[\s\S]*?logger::warn\(\s*"The view could not apply the saved settings: \{\}"/);
});

test('settings sync bridge result includes optional revision-aware ack support', () => {
  assert.match(interopContractsText, /kOnSettingsSyncResult\[] = "onSettingsSyncResult"/);
  assert.match(jsListenersText, /TryReadUIntMember\(payloadView, \{ "rev" \}\)/);
  assert.match(jsListenersText, /NotifySettingsSyncResult\(saved, revision\)/);
});

test('menu visibility heuristics cover transient photo or capture menus', () => {
  assert.match(widgetEventsText, /#include "WidgetVisibilityState\.h"/);
  assert.match(widgetRuntimeText, /#include "WidgetVisibilityState\.h"/);
  assert.match(widgetVisibilityStateText, /RE::DialogueMenu::MENU_NAME/);
  assert.match(widgetVisibilityStateText, /"photo"/);
  assert.match(widgetVisibilityStateText, /"screenshot"/);
  assert.match(widgetVisibilityStateText, /IsInFreeCameraMode\(\)/);
  assert.match(widgetVisibilityStateText, /IsModalMenuOpen\(\)/);
  assert.match(widgetVisibilityStateText, /IsApplicationMenuOpen\(\)/);
});

test('transient menu matching never walks an untrusted menu-name length', () => {
  const menuNameMatchText = readFileSync(new URL('../src/MenuNameMatch.h', import.meta.url), 'utf8');
  assert.match(widgetVisibilityStateText, /#include "MenuNameMatch\.h"/);
  assert.match(widgetVisibilityStateText, /MenuNameMatch::TrustedMenuName\(std::string_view\(menuName\)\)/);
  assert.match(widgetVisibilityStateText, /MenuNameMatch::ContainsAnyLoweredToken\(trustedMenuName, kTransientHideMenuTokens\)/);
  assert.doesNotMatch(widgetVisibilityStateText, /ToLowerAscii|\.reserve\(/);
  assert.match(menuNameMatchText, /kMaxTrustedMenuNameLength = 128;/);
  assert.match(menuNameMatchText, /::strnlen\(reported\.data\(\), reported\.size\(\)\) != reported\.size\(\)/);
});

test('corrupted menu close events reconcile tracked transient menus with the UI', () => {
  assert.match(widgetVisibilityStateText, /std::vector<std::string> g_openTransientMenus;/);
  assert.match(widgetVisibilityStateText, /g_reconcileTransientMenus\.store\(true, std::memory_order_release\);/);
  assert.match(widgetVisibilityStateText, /return !ui->IsMenuOpen\(menuName\);/);
  assert.match(widgetVisibilityStateText, /ReconcileTransientMenus\(ui\);\s*return g_transientHideMenuCount\.load/);
});

test('visibility checks allow PrismaUI focus without hiding the widget view', () => {
  assert.match(widgetEventsHeaderText, /bool \(\*hasViewFocus\)\(\) = nullptr;/);
  assert.match(widgetRuntimeHeaderText, /std::function<bool\(\)> hasViewFocus;/);
  assert.match(widgetVisibilityHeaderText, /IsBlockingUiState\(RE::UI\* ui, bool allowFocusedWidgetMenu = false\)/);
  assert.match(widgetEventsText, /IsBlockingUiState\(ui, HasViewFocus\(\)\)/);
  assert.match(widgetRuntimeText, /IsBlockingUiState\(ui, HasViewFocus\(\)\)/);
  assert.match(widgetVisibilityStateText, /const bool genericUiBlockersActive = !allowFocusedWidgetMenu/);
});

test('the stats bridge serializes weapon, sneak, and free camera activity as booleans', () => {
  const statsWriterText = readFileSync(new URL('../src/StatsJsonWriter.cpp', import.meta.url), 'utf8');
  const statsCollectorText = readFileSync(new URL('../src/StatsCollector.cpp', import.meta.url), 'utf8');
  for (const field of ['weaponDrawn', 'sneaking', 'freeCamera']) {
    assert.ok(statsWriterText.includes(String.raw`\"${field}\":`));
    assert.ok(statsWriterText.includes(`AppendBool(payload.${field});`));
  }
  assert.match(statsCollectorText, /payload\.weaponDrawn = player && player->AsActorState\(\)->IsWeaponDrawn\(\);/);
  assert.match(statsCollectorText, /payload\.sneaking = player && player->IsSneaking\(\);/);
  assert.match(statsCollectorText, /payload\.freeCamera = player && WidgetVisibilityState::IsFreeCameraModeActive\(\);/);
});

test('settings change only the free-camera blocker and request a visibility check', () => {
  const blocking = widgetVisibilityStateText.match(/bool IsBlockingUiState\(.*\)\s*\{([\s\S]*?)\n\}/)?.[1];
  // The focused settings panel stays visible in a free camera scene.
  assert.match(blocking, /freeCameraBlocks = ui && !allowFocusedWidgetMenu\s*&& g_freeCameraDisplay\.load\(.*\) == FreeCameraDisplay::kHide\s*&& IsFreeCameraModeActive\(\)/);
  assert.match(blocking, /freeCameraBlocks \|\| IsBlockingUiStateExceptFreeCamera\(ui, allowFocusedWidgetMenu\)/);
  assert.match(hotkeysText, /TryReadStringMember\(settingsJson, \{ "general", "freeCameraDisplay" \}\)/);
  assert.match(hotkeysText, /value == "vitals"[\s\S]*?display = FreeCameraDisplay::kVitals;[\s\S]*?value == "all"[\s\S]*?display = FreeCameraDisplay::kAll;/);
  assert.match(hotkeysText, /if \(WidgetVisibilityState::SetFreeCameraDisplay\(display\)\)\s*\{\s*WidgetRuntime::RequestVisibilityCheck\(\)/);
  assert.match(widgetRuntimeText, /visibilityCheckDue = visibilityCheckRequested \|\| now >= nextVisibilityCheck/);
  // A save load re-reads the file for the view; the plugin applies the same file.
  assert.match(mainText, /static void SendSettingsToView\(\) \{[\s\S]*?ApplyHotkeysFromSettingsJson\(json\);\s*if \(!TryInteropCall\([^)]*kUpdateSettings/);
});

test('the heartbeat recovers any native hide and keeps stats paused while the view is hidden', () => {
  assert.match(mainText, /static void HideViewIfReady\(\) \{[\s\S]*?if \(g_viewBridge\.Hide\(\)\) \{\s*TulliusWidgets::WidgetRuntime::NoteViewHidden\(\)/);
  assert.match(widgetRuntimeText, /void NoteViewHidden\(\)\s*\{\s*g_state\.menusWereHidden\.store\(true,/);
  assert.match(widgetRuntimeText, /menusWereHidden\.exchange\(false,[^\n]+\n\s*recoveredView = ShowView\(\)/);
  // Stats stay paused while the view is hidden (including the free camera on "hide"); the
  // recovery path shows the view and forces one dispatch instead.
  assert.doesNotMatch(widgetRuntimeText, /IsBlockingUiStateExceptFreeCamera/);
  assert.match(widgetRuntimeText, /void SendStatsToView\(bool force\)[\s\S]*?if \(WidgetVisibilityState::IsBlockingUiState\(ui, HasViewFocus\(\)\)\) \{\s*ScheduleStatsUpdateAfter/);
  assert.match(widgetRuntimeText, /recoveredView = ShowView\(\);[\s\S]*?if \(recoveredView \|\| heartbeatDue \|\| scheduledDue\) \{\s*RequestStatsDispatch\(true\);/);
});

test('the App relies on auto-hide deadlines and has no legacy visibility polling', () => {
  const appText = readFileSync(new URL('../view/src/App.tsx', import.meta.url), 'utf8');
  const autoHideText = readFileSync(new URL('../view/src/hooks/useAutoHide.ts', import.meta.url), 'utf8');
  assert.match(appText, /useAutoHide\(\{/);
  for (const text of [appText, autoHideText]) {
    assert.doesNotMatch(text, /setInterval\(|showOnChangeOnly|joinTrackedChangeSignature/);
  }
});

test('view focus path shows the view and requests PrismaUI focus with pauseGame support', () => {
  assert.match(viewBridgeText, /api_->Show\(view\);/);
  assert.match(viewBridgeText, /api_->Focus\(view, pauseGame, disableFocusMenu\)/);
});

test('icon packs reach the view under the bridge name it listens for, before the settings', () => {
  const bridgeConstantsText = readFileSync(new URL('../view/src/constants/bridge.ts', import.meta.url), 'utf8');
  assert.match(interopContractsText, /kUpdateIconPacks\[\] = "updateIconPacks";/);
  assert.match(bridgeConstantsText, /updateIconPacks: 'updateIconPacks'/);
  assert.match(mainText, /static void SendSettingsToView\(\) \{[\s\S]*?SendIconPacksToView\(\);[\s\S]*?LoadSettings/);
});

test('user fonts reach the view after icon packs and before the saved settings', () => {
  const bridgeConstantsText = readFileSync(new URL('../view/src/constants/bridge.ts', import.meta.url), 'utf8');
  assert.match(interopContractsText, /kUpdateUserFonts\[\] = "updateUserFonts";/);
  assert.match(bridgeConstantsText, /updateUserFonts: 'updateUserFonts'/);
  assert.match(mainText, /static void SendSettingsToView\(\) \{[\s\S]*?SendIconPacksToView\(\);\s*SendUserFontsToView\(\);[\s\S]*?kUpdateSettings/);
  const sendBody = mainText.match(/static void SendUserFontsToView\(\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(sendBody, /BuildUserFontsJson[\s\S]*?kUpdateUserFonts, json\.c_str\(\)/);
  assert.doesNotMatch(sendBody, /if\s*\([^\n]*(?:fontCount|json\.empty\(\))/);
});

test('user font scanning uses the shared name rules, its path and limits', () => {
  const scanner = readFileSync(new URL('../src/UserFonts.cpp', import.meta.url), 'utf8');
  assert.match(scanner, /#include "UserFontNames\.h"/);
  assert.match(scanner, /"Data" \/ "PrismaUI" \/ "views" \/ "TulliusWidgets" \/ "user-fonts"/);
  // Font type first (no warning for licence files), then the name rule, then size.
  assert.match(scanner, /if \(!IsUsableFontFileName\(name\)\) continue;\s*if \(!IsValidName\(name\)\)/);
  assert.match(scanner, /if \(!IsValidName\(id\)\)/);
  assert.match(scanner, /file_size\(\) != 0/);
  assert.match(scanner, /kMaxFonts = 32;/);
  assert.match(scanner, /kMaxFilesPerFont = 16;/);
  assert.match(scanner, /SortAndDropCaseDuplicates\(files\);\s*if \(files\.size\(\) > kMaxFilesPerFont\)/);
  assert.match(scanner, /std::sort\(fonts\.begin[\s\S]*fonts\.resize\(kMaxFonts\)/);
});
