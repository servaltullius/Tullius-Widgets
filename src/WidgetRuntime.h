#pragma once

#include <chrono>
#include <functional>
#include <string>

namespace TulliusWidgets::WidgetRuntime {

struct Callbacks {
    std::function<bool()> isInteropReady;
    std::function<std::string()> collectStatsJson;
    std::function<bool(const char*, const char*)> interopCall;
    std::function<bool()> showView;
    std::function<void()> hideView;
    std::function<void(std::function<void()>)> queueGameTask;
};

void Initialize(const Callbacks& callbacks);
bool IsGameLoaded();
void SetGameLoaded(bool loaded);
void ScheduleStatsUpdateAfter(std::chrono::milliseconds delay);
void RequestStatsDispatch(bool force);
void StartHeartbeat();

}  // namespace TulliusWidgets::WidgetRuntime
