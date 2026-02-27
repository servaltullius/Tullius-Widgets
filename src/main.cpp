#include "NativeStorage.h"
#include "PrismaUI_API.h"
#include "RuntimeDiagnostics.h"
#include "StatsCollector.h"
#include "WidgetBootstrap.h"
#include "WidgetEvents.h"
#include "WidgetHotkeys.h"
#include "WidgetJsListeners.h"
#include <atomic>
#include <cstdint>
#include <chrono>
#include <filesystem>
#include <mutex>
#include <thread>

PRISMA_UI_API::IVPrismaUI1* PrismaUI = nullptr;

namespace {

// Compile-time throttle intervals
constexpr auto kFastIntervalCombat = std::chrono::milliseconds(100);
constexpr auto kFastIntervalIdle   = std::chrono::milliseconds(500);
constexpr auto kHeartbeatInterval  = std::chrono::seconds(2);
constexpr auto kHeartbeatPoll      = std::chrono::milliseconds(100);
constexpr auto kPausedRetryDelay   = std::chrono::milliseconds(100);

struct PluginState {
    std::atomic<PrismaView> view{0};
    std::atomic<bool> gameLoaded{false};
    std::atomic<bool> viewDomReady{false};
    std::atomic<bool> heartbeatStarted{false};
    std::atomic<std::int64_t> scheduledStatsDueMs{0};
    TulliusWidgets::RuntimeDiagnostics::State runtimeDiagnostics{};

    std::chrono::steady_clock::time_point lastFastUpdateTime{};
    std::mutex statsUpdateMutex;
    std::mutex statsDispatchMutex;
    std::atomic<bool> statsDispatchPending{false};
    std::atomic<bool> statsDispatchForcePending{false};

    std::jthread heartbeatThread;
};

PluginState g;

}  // namespace

// --- Path helpers ---

static std::filesystem::path ResolveStorageBasePath() {
    if (!g.runtimeDiagnostics.gameRootPath.empty()) {
        return g.runtimeDiagnostics.gameRootPath;
    }
    return TulliusWidgets::RuntimeDiagnostics::ResolveGameRootPath();
}

static void InitializeRuntimeDiagnostics(const SKSE::LoadInterface* loadInterface) {
    g.runtimeDiagnostics = TulliusWidgets::RuntimeDiagnostics::Collect(loadInterface);

    logger::info(
        "Runtime diagnostics: runtime={}, skse={}, gameRoot={}, addressLibraryPath={}, addressLibraryPresent={}",
        std::to_string(g.runtimeDiagnostics.runtimeVersion),
        std::to_string(g.runtimeDiagnostics.skseVersion),
        g.runtimeDiagnostics.gameRootPath.generic_string(),
        g.runtimeDiagnostics.addressLibraryPath,
        g.runtimeDiagnostics.addressLibraryPresent);
}

static bool IsViewReady() {
    if (!PrismaUI) return false;
    const auto view = g.view.load(std::memory_order_acquire);
    return view != 0 && PrismaUI->IsValid(view);
}

static bool IsInteropReady() {
    return IsViewReady() && g.viewDomReady.load();
}

static bool TryInteropCall(const char* functionName, const char* argument) {
    if (!PrismaUI || !g.viewDomReady.load(std::memory_order_acquire)) return false;
    const auto view = g.view.load(std::memory_order_acquire);
    if (view == 0 || !PrismaUI->IsValid(view)) return false;
    PrismaUI->InteropCall(view, functionName, argument ? argument : "");
    return true;
}

static bool TryInvoke(const char* script) {
    if (!PrismaUI || !g.viewDomReady.load(std::memory_order_acquire)) return false;
    const auto view = g.view.load(std::memory_order_acquire);
    if (view == 0 || !PrismaUI->IsValid(view)) return false;
    PrismaUI->Invoke(view, script);
    return true;
}

static bool TryShowView() {
    if (!PrismaUI) return false;
    const auto view = g.view.load(std::memory_order_acquire);
    if (view == 0 || !PrismaUI->IsValid(view)) return false;
    PrismaUI->Show(view);
    return true;
}

static bool TryHideView() {
    if (!PrismaUI) return false;
    const auto view = g.view.load(std::memory_order_acquire);
    if (view == 0 || !PrismaUI->IsValid(view)) return false;
    PrismaUI->Hide(view);
    return true;
}

static void HideViewIfReady() {
    (void)TryHideView();
}

static bool ViewHasFocus() {
    if (!PrismaUI) return false;
    const auto view = g.view.load(std::memory_order_acquire);
    if (view == 0 || !PrismaUI->IsValid(view)) return false;
    return PrismaUI->HasFocus(view);
}

static bool TryFocusView() {
    if (!PrismaUI) return false;
    const auto view = g.view.load(std::memory_order_acquire);
    if (view == 0 || !PrismaUI->IsValid(view)) return false;
    return PrismaUI->Focus(view);
}

static void TryUnfocusView() {
    if (!PrismaUI) return;
    const auto view = g.view.load(std::memory_order_acquire);
    if (view == 0 || !PrismaUI->IsValid(view)) return;
    PrismaUI->Unfocus(view);
}

static void SendHUDColorToView() {
    if (!IsInteropReady()) return;
    static constexpr std::uint32_t kDefaultHUDColor = 0xFFFFFF;
    std::uint32_t color = kDefaultHUDColor;
    auto ini = RE::INISettingCollection::GetSingleton();
    if (ini) {
        auto setting = ini->GetSetting("iHUDColorDefault:Interface");
        if (setting) {
            color = static_cast<std::uint32_t>(setting->GetSInt()) & 0xFFFFFF;
        }
    }
    char hex[16];
    std::snprintf(hex, sizeof(hex), "#%06x", color);
    if (!TryInteropCall("setHUDColor", hex)) return;
    logger::info("HUD color sent: {}", hex);
}

static void SendSettingsToView() {
    if (!IsInteropReady()) return;
    std::string json = TulliusWidgets::NativeStorage::LoadSettings(ResolveStorageBasePath());
    if (json.empty()) return;
    if (!TryInteropCall("updateSettings", json.c_str())) return;
    logger::info("Saved settings sent to view");
}

static void SendRuntimeDiagnosticsToView() {
    if (!IsInteropReady()) return;
    const auto json = TulliusWidgets::RuntimeDiagnostics::BuildJson(g.runtimeDiagnostics);
    if (!TryInteropCall("updateRuntimeStatus", json.c_str())) return;
}

enum class StatsDispatchMode {
    kSkip,
    kReady
};

static std::int64_t SteadyNowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::steady_clock::now().time_since_epoch())
        .count();
}

static void ScheduleStatsUpdateAfter(std::chrono::milliseconds delay);

static bool TryConsumeScheduledStatsUpdate(std::int64_t nowMs) {
    auto dueMs = g.scheduledStatsDueMs.load(std::memory_order_acquire);
    while (dueMs > 0 && nowMs >= dueMs) {
        if (g.scheduledStatsDueMs.compare_exchange_weak(
                dueMs,
                0,
                std::memory_order_acq_rel,
                std::memory_order_acquire)) {
            return true;
        }
    }
    return false;
}

static StatsDispatchMode SelectStatsDispatchMode(bool force) {
    const auto now = std::chrono::steady_clock::now();

    if (force) {
        std::scoped_lock lock(g.statsUpdateMutex);
        g.lastFastUpdateTime = now;
        return StatsDispatchMode::kReady;
    }

    const auto* player = RE::PlayerCharacter::GetSingleton();
    const bool inCombat = player && player->IsInCombat();
    const auto interval = inCombat ? kFastIntervalCombat : kFastIntervalIdle;

    std::scoped_lock lock(g.statsUpdateMutex);
    if (now - g.lastFastUpdateTime < interval) return StatsDispatchMode::kSkip;

    g.lastFastUpdateTime = now;
    return StatsDispatchMode::kReady;
}

static void SendStatsToView(bool force = false) {
    if (!IsInteropReady() || !g.gameLoaded.load()) return;

    auto* ui = RE::UI::GetSingleton();
    if (ui && ui->GameIsPaused()) {
        ScheduleStatsUpdateAfter(kPausedRetryDelay);
        return;
    }

    if (!force && TryConsumeScheduledStatsUpdate(SteadyNowMs())) {
        force = true;
    }

    const auto dispatchMode = SelectStatsDispatchMode(force);
    if (dispatchMode == StatsDispatchMode::kSkip) return;

    std::string stats = TulliusWidgets::StatsCollector::CollectStats();
    TryInteropCall("updateStats", stats.c_str());
}

static void RequestStatsDispatch(bool force = false) {
    if (force) {
        g.statsDispatchForcePending.store(true, std::memory_order_release);
    }
    g.statsDispatchPending.store(true, std::memory_order_release);

    while (g.statsDispatchMutex.try_lock()) {
        while (true) {
            const bool shouldForce = g.statsDispatchForcePending.exchange(false, std::memory_order_acq_rel);
            g.statsDispatchPending.store(false, std::memory_order_release);
            SendStatsToView(shouldForce);

            const bool hasPending = g.statsDispatchPending.exchange(false, std::memory_order_acq_rel);
            const bool hasForcePending = g.statsDispatchForcePending.exchange(false, std::memory_order_acq_rel);
            if (!hasPending && !hasForcePending) {
                break;
            }

            g.statsDispatchPending.store(true, std::memory_order_release);
            if (hasForcePending) {
                g.statsDispatchForcePending.store(true, std::memory_order_release);
            }
        }

        g.statsDispatchMutex.unlock();

        if (!g.statsDispatchPending.load(std::memory_order_acquire)
            && !g.statsDispatchForcePending.load(std::memory_order_acquire)) {
            break;
        }
    }
}

static void ScheduleStatsUpdateAfter(std::chrono::milliseconds delay) {
    const auto targetMs = SteadyNowMs() + delay.count();
    auto dueMs = g.scheduledStatsDueMs.load(std::memory_order_acquire);
    while (true) {
        if (dueMs > 0 && dueMs <= targetMs) {
            return;
        }
        if (g.scheduledStatsDueMs.compare_exchange_weak(
                dueMs,
                targetMs,
                std::memory_order_acq_rel,
                std::memory_order_acquire)) {
            return;
        }
    }
}

static bool IsGameLoaded() {
    return g.gameLoaded.load();
}

static void SetGameLoaded(bool loaded) {
    g.gameLoaded.store(loaded);
    if (!loaded) {
        g.scheduledStatsDueMs.store(0, std::memory_order_release);
        g.statsDispatchPending.store(false, std::memory_order_release);
        g.statsDispatchForcePending.store(false, std::memory_order_release);
    }
}

static void SendStatsToViewThrottled() {
    RequestStatsDispatch(false);
}

static void SendStatsToViewForced() {
    RequestStatsDispatch(true);
}

static void SetView(PrismaView newView) {
    g.view.store(newView, std::memory_order_release);
}

static void SetViewDomReady(bool ready) {
    g.viewDomReady.store(ready);
}

static void RegisterWidgetJsListeners() {
    TulliusWidgets::WidgetJsListeners::Callbacks jsListenerCallbacks{};
    jsListenerCallbacks.resolveStorageBasePath = &ResolveStorageBasePath;
    jsListenerCallbacks.invokeScript = &TryInvoke;
    jsListenerCallbacks.interopCall = &TryInteropCall;
    jsListenerCallbacks.unfocusView = &TryUnfocusView;
    TulliusWidgets::WidgetJsListeners::Register(
        PrismaUI,
        g.view.load(std::memory_order_acquire),
        jsListenerCallbacks);
}

static void RegisterWidgetEventSinks() {
    TulliusWidgets::WidgetEvents::Callbacks eventCallbacks{};
    eventCallbacks.isViewReady = &IsViewReady;
    eventCallbacks.isGameLoaded = &IsGameLoaded;
    eventCallbacks.setGameLoaded = &SetGameLoaded;
    eventCallbacks.showView = &TryShowView;
    eventCallbacks.hideView = &HideViewIfReady;
    eventCallbacks.sendStats = &SendStatsToViewThrottled;
    eventCallbacks.sendStatsForced = &SendStatsToViewForced;
    eventCallbacks.scheduleStatsUpdateAfter = &ScheduleStatsUpdateAfter;
    TulliusWidgets::WidgetEvents::RegisterEventSinks(eventCallbacks);
}

static void RegisterWidgetHotkeys() {
    TulliusWidgets::WidgetHotkeys::Callbacks hotkeyCallbacks{};
    hotkeyCallbacks.isViewReady = &IsViewReady;
    hotkeyCallbacks.isGameLoaded = &IsGameLoaded;
    hotkeyCallbacks.viewHasFocus = &ViewHasFocus;
    hotkeyCallbacks.focusView = &TryFocusView;
    hotkeyCallbacks.unfocusView = &TryUnfocusView;
    hotkeyCallbacks.invokeScript = &TryInvoke;
    TulliusWidgets::WidgetHotkeys::RegisterDefaultHotkeys(hotkeyCallbacks);
}

static void StartHeartbeat() {
    if (g.heartbeatStarted.exchange(true)) return;

    g.heartbeatThread = std::jthread([](std::stop_token stopToken) {
        auto nextHeartbeatDue = std::chrono::steady_clock::now() + kHeartbeatInterval;
        while (!stopToken.stop_requested()) {
            std::this_thread::sleep_for(kHeartbeatPoll);
            if (stopToken.stop_requested()) break;

            if (!g.gameLoaded.load()) {
                nextHeartbeatDue = std::chrono::steady_clock::now() + kHeartbeatInterval;
                continue;
            }

            auto* taskInterface = SKSE::GetTaskInterface();
            if (!taskInterface) continue;

            const auto now = std::chrono::steady_clock::now();
            const auto nowMs = SteadyNowMs();
            const bool heartbeatDue = now >= nextHeartbeatDue;
            const bool scheduledDue = TryConsumeScheduledStatsUpdate(nowMs);
            if (!heartbeatDue && !scheduledDue) continue;

            taskInterface->AddTask([heartbeatDue, scheduledDue]() {
                if (!g.gameLoaded.load()) return;

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

static TulliusWidgets::WidgetBootstrap::Callbacks BuildWidgetBootstrapCallbacks() {
    TulliusWidgets::WidgetBootstrap::Callbacks callbacks{};
    callbacks.setView = &SetView;
    callbacks.setViewDomReady = &SetViewDomReady;
    callbacks.setGameLoaded = &SetGameLoaded;
    callbacks.isViewReady = &IsViewReady;
    callbacks.showView = &TryShowView;
    callbacks.hideView = &HideViewIfReady;
    callbacks.sendRuntimeDiagnostics = &SendRuntimeDiagnosticsToView;
    callbacks.sendHUDColor = &SendHUDColorToView;
    callbacks.sendSettings = &SendSettingsToView;
    callbacks.sendStatsForced = &SendStatsToViewForced;
    callbacks.registerJsListeners = &RegisterWidgetJsListeners;
    callbacks.registerEventSinks = &RegisterWidgetEventSinks;
    callbacks.startHeartbeat = &StartHeartbeat;
    callbacks.registerHotkeys = &RegisterWidgetHotkeys;
    return callbacks;
}

static void SKSEMessageHandler(SKSE::MessagingInterface::Message* message) {
    const auto bootstrapCallbacks = BuildWidgetBootstrapCallbacks();

    switch (message->type) {
    case SKSE::MessagingInterface::kDataLoaded: {
        if (!TulliusWidgets::WidgetBootstrap::InitializeOnDataLoaded(PrismaUI, bootstrapCallbacks)) {
            return;
        }
        break;
    }
    case SKSE::MessagingInterface::kPostLoadGame:
    case SKSE::MessagingInterface::kNewGame: {
        TulliusWidgets::WidgetBootstrap::SyncOnGameLoaded(bootstrapCallbacks);
        break;
    }
    }
}

extern "C" DLLEXPORT bool SKSEAPI SKSEPlugin_Load(const SKSE::LoadInterface* a_skse) {
    REL::Module::reset();

    auto messaging = reinterpret_cast<SKSE::MessagingInterface*>(
        a_skse->QueryInterface(SKSE::LoadInterface::kMessaging)
    );

    if (!messaging) {
        logger::critical("Failed to load messaging interface! Plugin will not load.");
        return false;
    }

    SKSE::Init(a_skse);
    SKSE::AllocTrampoline(1 << 10);
    InitializeRuntimeDiagnostics(a_skse);

    if (!g.runtimeDiagnostics.runtimeSupported) {
        logger::warn(
            "Unsupported runtime detected ({}). The widget may not be stable on this game version.",
            std::to_string(g.runtimeDiagnostics.runtimeVersion));
    }
    if (!g.runtimeDiagnostics.addressLibraryPresent) {
        logger::warn(
            "Address Library file not found for runtime {} (expected: {}).",
            std::to_string(g.runtimeDiagnostics.runtimeVersion),
            g.runtimeDiagnostics.addressLibraryPath);
    }

    messaging->RegisterListener("SKSE", SKSEMessageHandler);

    logger::info("TulliusWidgets loaded");
    return true;
}
