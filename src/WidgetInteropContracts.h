#pragma once

namespace TulliusWidgets::WidgetInteropContracts {

inline constexpr char kUpdateStats[] = "updateStats";
inline constexpr char kUpdateSettings[] = "updateSettings";
inline constexpr char kUpdateRuntimeStatus[] = "updateRuntimeStatus";
inline constexpr char kImportSettingsFromNative[] = "importSettingsFromNative";
inline constexpr char kSetHUDColor[] = "setHUDColor";

inline constexpr char kOnSettingsChanged[] = "onSettingsChanged";
inline constexpr char kOnExportSettings[] = "onExportSettings";
inline constexpr char kOnImportSettings[] = "onImportSettings";
inline constexpr char kOnRequestUnfocus[] = "onRequestUnfocus";
inline constexpr char kOnSettingsVisibilityChanged[] = "onSettingsVisibilityChanged";

inline constexpr char kOnExportResult[] = "onExportResult";
inline constexpr char kOnImportResult[] = "onImportResult";
inline constexpr char kOnSettingsSyncResult[] = "onSettingsSyncResult";

inline constexpr char kToggleSettingsScript[] = "toggleSettings()";
inline constexpr char kCloseSettingsScript[] = "closeSettings()";
inline constexpr char kToggleWidgetsVisibilityScript[] = "toggleWidgetsVisibility()";

}  // namespace TulliusWidgets::WidgetInteropContracts
