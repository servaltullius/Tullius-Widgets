#include "WidgetRuntime.h"
#include "WidgetInteropContracts.h"
#include "WidgetVisibilityState.h"

#include <atomic>
#include <cstdint>
#include <mutex>
#include <thread>
#include <utility>

namespace TulliusWidgets::WidgetRuntime {
namespace {

constexpr auto kFastIntervalCombat = std::chrono::milliseconds(100);
constexpr auto kFastIntervalIdle = std::chrono::milliseconds(500);
constexpr auto kHeartbeatInterval = std::chrono::seconds(2);
constexpr auto kHeartbeatPoll = std::chrono::milliseconds(100);
constexpr auto kPausedRetryDelay = std::chrono::milliseconds(100);

struct RuntimeState {
    std::atomic<bool> gameLoaded{ false };
    std::atomic<bool> heartbeatStarted{ false };
    std::atomic<std::int64_t> scheduledStatsDueMs{ 0 };
    std::chrono::steady_clock::time_point lastFastUpdateTime{};
    std::mutex statsUpdateMutex;
    std::atomic<bool> statsDispatchRunning{ false };
    std::atomic<bool> statsDispatchPending{ false };
    std::atomic<bool> statsDispatchForcePending{ false };
    std::atomic<bool> menusWereHidden{ false };
    std::jthread heartbeatThread;
};

RuntimeState g_state;
Callbacks g_callbacks{};

std::int64_t SteadyNowMs()
{
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::steady_clock::now().time_since_epoch())
        .count();
}

bool IsInteropReady()
{
    return g_callbacks.isInteropReady && g_callbacks.isInteropReady();
}

bool HasViewFocus()
{
    return g_callbacks.hasViewFocus && g_callbacks.hasViewFocus();
}

void QueueGameTask(std::function<void()> task)
{
    if (!task) {
        return;
    }
    if (g_callbacks.queueGameTask) {
        g_callbacks.queueGameTask(std::move(task));
        return;
    }
    task();
}

bool ShowView()
{
    return g_callbacks.showView && g_callbacks.showView();
}

void HideView()
{
    if (g_callbacks.hideView) {
        g_callbacks.hideView();
    }
}

bool TryConsumeScheduledStatsUpdate(std::int64_t nowMs)
{
    auto dueMs = g_state.scheduledStatsDueMs.load(std::memory_order_acquire);
    while (dueMs > 0 && nowMs >= dueMs) {
        if (g_state.scheduledStatsDueMs.compare_exchange_weak(
                dueMs,
                0,
                std::memory_order_acq_rel,
                std::memory_order_acquire)) {
            return true;
        }
    }
    return false;
}

enum class StatsDispatchMode {
    kSkip,
    kReady
};

StatsDispatchMode SelectStatsDispatchMode(bool force)
{
    const auto now = std::chrono::steady_clock::now();

    if (force) {
        std::scoped_lock lock(g_state.statsUpdateMutex);
        g_state.lastFastUpdateTime = now;
        return StatsDispatchMode::kReady;
    }

    const auto* player = RE::PlayerCharacter::GetSingleton();
    const bool inCombat = player && player->IsInCombat();
    const auto interval = inCombat ? kFastIntervalCombat : kFastIntervalIdle;

    std::scoped_lock lock(g_state.statsUpdateMutex);
    if (now - g_state.lastFastUpdateTime < interval) {
        return StatsDispatchMode::kSkip;
    }

    g_state.lastFastUpdateTime = now;
    return StatsDispatchMode::kReady;
}

void SendStatsToView(bool force)
{
    if (!IsInteropReady() || !g_state.gameLoaded.load(std::memory_order_acquire)) {
        return;
    }

    auto* ui = RE::UI::GetSingleton();
    if (WidgetVisibilityState::IsBlockingUiState(ui, HasViewFocus())) {
        ScheduleStatsUpdateAfter(kPausedRetryDelay);
        return;
    }

    if (!force && TryConsumeScheduledStatsUpdate(SteadyNowMs())) {
        force = true;
    }

    if (SelectStatsDispatchMode(force) == StatsDispatchMode::kSkip) {
        return;
    }
    if (!g_callbacks.collectStatsJson || !g_callbacks.interopCall) {
        return;
    }

    std::string stats = g_callbacks.collectStatsJson();
    (void)g_callbacks.interopCall(TulliusWidgets::WidgetInteropContracts::kUpdateStats, stats.c_str());
}

}  // namespace

void Initialize(const Callbacks& callbacks)
{
    g_callbacks = callbacks;
}

bool IsGameLoaded()
{
    return g_state.gameLoaded.load(std::memory_order_acquire);
}

void SetGameLoaded(bool loaded)
{
    g_state.gameLoaded.store(loaded, std::memory_order_release);
    if (!loaded) {
        g_state.scheduledStatsDueMs.store(0, std::memory_order_release);
        g_state.statsDispatchPending.store(false, std::memory_order_release);
        g_state.statsDispatchForcePending.store(false, std::memory_order_release);
    }
}

void RequestStatsDispatch(bool force)
{
    if (force) {
        g_state.statsDispatchForcePending.store(true, std::memory_order_release);
    }
    g_state.statsDispatchPending.store(true, std::memory_order_release);

    bool expected = false;
    if (!g_state.statsDispatchRunning.compare_exchange_strong(expected, true, std::memory_order_acq_rel)) {
        return;
    }

    do {
        const bool shouldForce = g_state.statsDispatchForcePending.exchange(false, std::memory_order_acq_rel);
        g_state.statsDispatchPending.store(false, std::memory_order_release);
        SendStatsToView(shouldForce);
    } while (g_state.statsDispatchPending.load(std::memory_order_acquire)
             || g_state.statsDispatchForcePending.load(std::memory_order_acquire));

    g_state.statsDispatchRunning.store(false, std::memory_order_release);
}

void ScheduleStatsUpdateAfter(std::chrono::milliseconds delay)
{
    const auto targetMs = SteadyNowMs() + delay.count();
    auto dueMs = g_state.scheduledStatsDueMs.load(std::memory_order_acquire);
    while (true) {
        if (dueMs > SteadyNowMs() && dueMs <= targetMs) {
            return;
        }
        if (g_state.scheduledStatsDueMs.compare_exchange_weak(
                dueMs,
                targetMs,
                std::memory_order_acq_rel,
                std::memory_order_acquire)) {
            return;
        }
    }
}

void StartHeartbeat()
{
    if (g_state.heartbeatStarted.exchange(true, std::memory_order_acq_rel)) {
        return;
    }

    g_state.heartbeatThread = std::jthread([](std::stop_token stopToken) {
        constexpr auto kVisibilityCheckInterval = std::chrono::milliseconds(500);
        auto nextHeartbeatDue = std::chrono::steady_clock::now() + kHeartbeatInterval;
        auto nextVisibilityCheck = std::chrono::steady_clock::now() + kVisibilityCheckInterval;

        while (!stopToken.stop_requested()) {
            std::this_thread::sleep_for(kHeartbeatPoll);
            if (stopToken.stop_requested()) {
                break;
            }

            if (!IsGameLoaded()) {
                nextHeartbeatDue = std::chrono::steady_clock::now() + kHeartbeatInterval;
                nextVisibilityCheck = std::chrono::steady_clock::now() + kVisibilityCheckInterval;
                continue;
            }

            const auto now = std::chrono::steady_clock::now();
            const auto nowMs = SteadyNowMs();
            const bool heartbeatDue = now >= nextHeartbeatDue;
            const bool scheduledDue = TryConsumeScheduledStatsUpdate(nowMs);
            const bool visibilityCheckDue = now >= nextVisibilityCheck;
            if (!heartbeatDue && !scheduledDue && !visibilityCheckDue) {
                continue;
            }

            if (visibilityCheckDue) {
                nextVisibilityCheck = now + kVisibilityCheckInterval;
            }

            QueueGameTask([heartbeatDue, scheduledDue, visibilityCheckDue]() {
                if (!IsGameLoaded()) {
                    return;
                }

                if (visibilityCheckDue || heartbeatDue) {
                    auto* ui = RE::UI::GetSingleton();
                    if (WidgetVisibilityState::IsBlockingUiState(ui, HasViewFocus())) {
                        HideView();
                        g_state.menusWereHidden.store(true, std::memory_order_release);
                        return;
                    }
                    if (g_state.menusWereHidden.exchange(false, std::memory_order_acq_rel)) {
                        if (ShowView()) {
                            RequestStatsDispatch(true);
                        }
                    }
                }

                if (heartbeatDue || scheduledDue) {
                    RequestStatsDispatch(true);
                }
            });

            if (heartbeatDue) {
                nextHeartbeatDue = now + kHeartbeatInterval;
            }
        }
    });
}

}  // namespace TulliusWidgets::WidgetRuntime
