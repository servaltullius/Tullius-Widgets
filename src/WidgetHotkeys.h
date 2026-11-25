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

// While the settings panel waits for a new key, the plugin's own hotkeys (including Esc)
// stand aside so the key reaches the page. Expires on its own after a few seconds in case
// the page never reports the end.
void SetCaptureActive(bool active);
// Ends any capture pause at once (settings panel closed); no grace period.
void ClearCapture();

// While the page answers Esc itself (an open select menu, a selected widget or group), the
// plugin's Esc does not close the settings panel. Giving Esc back keeps a short grace so the
// press that closed the menu is not handled twice.
void SetPageOwnsEscape(bool owns, bool releasedByPageEsc);
// Drops the page's Esc claim at once (settings panel closed); no grace period.
void ClearPageEscape();

}  // namespace TulliusWidgets::WidgetHotkeys
