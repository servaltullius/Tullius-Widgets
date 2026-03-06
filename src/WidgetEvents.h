#pragma once

#include <chrono>

namespace TulliusWidgets::WidgetEvents {

struct Callbacks {
    bool (*isViewReady)() = nullptr;
    bool (*isGameLoaded)() = nullptr;
    bool (*hasViewFocus)() = nullptr;
    void (*setGameLoaded)(bool) = nullptr;
    bool (*showView)() = nullptr;
    void (*hideView)() = nullptr;
    void (*sendStats)() = nullptr;
    void (*sendStatsForced)() = nullptr;
    void (*scheduleStatsUpdateAfter)(std::chrono::milliseconds) = nullptr;
};

void RegisterEventSinks(const Callbacks& callbacks);

}  // namespace TulliusWidgets::WidgetEvents
