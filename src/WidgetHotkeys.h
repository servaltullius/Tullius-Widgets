#pragma once

#include <string_view>

namespace TulliusWidgets::WidgetHotkeys {

struct Callbacks {
    bool (*isViewReady)() = nullptr;
    bool (*isGameLoaded)() = nullptr;
    bool (*isSettingsPanelOpen)() = nullptr;
    bool (*focusView)() = nullptr;
    void (*unfocusView)() = nullptr;
    bool (*invokeScript)(const char*) = nullptr;
};

void RegisterDefaultHotkeys(const Callbacks& callbacks);

// Rebinds the settings-panel and show/hide-all keys from a settings JSON payload
// (general.settingsHotkey / general.visibilityHotkey, DirectInput scan codes).
// Missing, reserved or clashing codes fall back to Insert / F11.
void ApplyHotkeysFromSettingsJson(std::string_view settingsJson);

}  // namespace TulliusWidgets::WidgetHotkeys
