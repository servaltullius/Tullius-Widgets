#pragma once

namespace TulliusWidgets::WidgetHotkeys {

struct Callbacks {
    bool (*isViewReady)() = nullptr;
    bool (*isGameLoaded)() = nullptr;
    bool (*viewHasFocus)() = nullptr;
    bool (*focusView)() = nullptr;
    void (*unfocusView)() = nullptr;
    bool (*invokeScript)(const char*) = nullptr;
};

void RegisterDefaultHotkeys(const Callbacks& callbacks);

}  // namespace TulliusWidgets::WidgetHotkeys
