#pragma once

namespace TulliusWidgets::WidgetInteropContracts {

inline constexpr char kUpdateStats[] = "updateStats";
inline constexpr char kUpdateSettings[] = "updateSettings";
inline constexpr char kUpdateRuntimeStatus[] = "updateRuntimeStatus";
inline constexpr char kImportSettingsFromNative[] = "importSettingsFromNative";
inline constexpr char kSetHUDColor[] = "setHUDColor";
inline constexpr char kUpdateIconPacks[] = "updateIconPacks";
inline constexpr char kUpdateUserFonts[] = "updateUserFonts";
inline constexpr char kShowSettingsBackupNotice[] = "showSettingsBackupNotice";
// Self-test session only (SelfTestRuntime.h): called as runSelfTest("<run id>", "<plugin version>").
inline constexpr char kRunSelfTest[] = "runSelfTest";

inline constexpr char kOnSettingsChanged[] = "onSettingsChanged";
inline constexpr char kOnExportSettings[] = "onExportSettings";
inline constexpr char kOnImportSettings[] = "onImportSettings";
inline constexpr char kOnRequestUnfocus[] = "onRequestUnfocus";
inline constexpr char kOnSettingsVisibilityChanged[] = "onSettingsVisibilityChanged";
inline constexpr char kOnHotkeyCapture[] = "onHotkeyCapture";
inline constexpr char kOnEscapeOwner[] = "onEscapeOwner";
inline constexpr char kOnSettingsLoadFailed[] = "onSettingsLoadFailed";
inline constexpr char kOnSelfTestReport[] = "onSelfTestReport";

inline constexpr char kOnExportResult[] = "onExportResult";
inline constexpr char kOnImportResult[] = "onImportResult";
inline constexpr char kOnSettingsSyncResult[] = "onSettingsSyncResult";

inline constexpr char kToggleSettingsScript[] = "toggleSettings()";
inline constexpr char kCloseSettingsScript[] = "closeSettings()";
inline constexpr char kHandleEscapeScript[] = "handleEscape()";
inline constexpr char kShowSettingsLoadFailureScript[] = "showSettingsLoadFailure()";
inline constexpr char kToggleWidgetsVisibilityScript[] = "toggleWidgetsVisibility()";
inline constexpr char kEnterSelfTestSessionScript[] = "enterSelfTestSession()";

}  // namespace TulliusWidgets::WidgetInteropContracts
