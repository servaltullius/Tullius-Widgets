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
#include <memory>
#include <mutex>
#include <thread>

PRISMA_UI_API::IVPrismaUI1* PrismaUI = nullptr;
static PrismaView view = 0;
static std::atomic<bool> gameLoaded{false};
static TulliusWidgets::RuntimeDiagnostics::State g_runtimeDiagnostics{};
static std::atomic<bool> g_viewDomReady{false};

// Throttle: shorter interval during combat for responsive HP/MP/SP
static std::chrono::steady_clock::time_point lastUpdateTime{};
static std::mutex lastUpdateMutex;
static constexpr auto UPDATE_INTERVAL_COMBAT = std::chrono::milliseconds(100);
static constexpr auto UPDATE_INTERVAL_IDLE   = std::chrono::milliseconds(500);
static constexpr auto HEARTBEAT_INTERVAL     = std::chrono::seconds(3);
static std::jthread g_heartbeatThread;
static std::atomic<bool> g_heartbeatStarted{false};
static std::atomic<std::uint32_t> g_scheduledStatsSeq{0};

// --- Path helpers ---

static std::filesystem::path ResolveStorageBasePath() {
    if (!g_runtimeDiagnostics.gameRootPath.empty()) {
        return g_runtimeDiagnostics.gameRootPath;
    }
    return TulliusWidgets::RuntimeDiagnostics::ResolveGameRootPath();
}

static void InitializeRuntimeDiagnostics(const SKSE::LoadInterface* loadInterface) {
    g_runtimeDiagnostics = TulliusWidgets::RuntimeDiagnostics::Collect(loadInterface);

    logger::info(
        "Runtime diagnostics: runtime={}, skse={}, gameRoot={}, addressLibraryPath={}, addressLibraryPresent={}",
        std::to_string(g_runtimeDiagnostics.runtimeVersion),
        std::to_string(g_runtimeDiagnostics.skseVersion),
        g_runtimeDiagnostics.gameRootPath.generic_string(),
        g_runtimeDiagnostics.addressLibraryPath,
        g_runtimeDiagnostics.addressLibraryPresent);
}

static bool IsViewReady() {
    return PrismaUI && view != 0 && PrismaUI->IsValid(view);
}

static bool IsInteropReady() {
    return IsViewReady() && g_viewDomReady.load();
}

static bool TryInteropCall(const char* functionName, const char* argument) {
    if (!IsInteropReady()) return false;
    PrismaUI->InteropCall(view, functionName, argument ? argument : "");
    return true;
}

static bool TryInvoke(const char* script) {
    if (!IsInteropReady()) return false;
    PrismaUI->Invoke(view, script);
    return true;
}

static bool TryShowView() {
    if (!IsViewReady()) return false;
    PrismaUI->Show(view);
    return true;
}

static bool TryHideView() {
    if (!IsViewReady()) return false;
    PrismaUI->Hide(view);
    return true;
}

static bool ViewHasFocus() {
    if (!IsViewReady()) return false;
    return PrismaUI->HasFocus(view);
}

static bool TryFocusView() {
    if (!IsViewReady()) return false;
    return PrismaUI->Focus(view);
}

static void TryUnfocusView() {
    if (!IsViewReady()) return;
    PrismaUI->Unfocus(view);
}

static void SendHUDColorToView() {
    if (!IsInteropReady()) return;
    uint32_t color = 0xFFFFFF;  // default white
    auto ini = RE::INISettingCollection::GetSingleton();
    if (ini) {
        auto setting = ini->GetSetting("iHUDColorDefault:Interface");
        if (setting) {
            color = static_cast<uint32_t>(setting->GetSInt()) & 0xFFFFFF;
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
    const auto json = TulliusWidgets::RuntimeDiagnostics::BuildJson(g_runtimeDiagnostics);
    if (!TryInteropCall("updateRuntimeStatus", json.c_str())) return;
}

static void SendStatsToView(bool force = false) {
    if (!IsInteropReady() || !gameLoaded.load()) return;

    if (!force) {
        auto now = std::chrono::steady_clock::now();
        auto player = RE::PlayerCharacter::GetSingleton();
        auto interval = (player && player->IsInCombat()) ? UPDATE_INTERVAL_COMBAT : UPDATE_INTERVAL_IDLE;
        {
            std::scoped_lock lock(lastUpdateMutex);
            if (now - lastUpdateTime < interval) return;
            lastUpdateTime = now;
        }
    }

    std::string stats = TulliusWidgets::StatsCollector::CollectStats();
    TryInteropCall("updateStats", stats.c_str());
}

static void ScheduleStatsUpdateAfter(std::chrono::milliseconds delay) {
    auto* taskInterface = SKSE::GetTaskInterface();
    if (!taskInterface) return;

    const auto target = std::chrono::steady_clock::now() + delay;
    const std::uint32_t seq = g_scheduledStatsSeq.fetch_add(1) + 1;
    struct ScheduledStatsUpdate : std::enable_shared_from_this<ScheduledStatsUpdate> {
        std::chrono::steady_clock::time_point target{};
        std::uint32_t seq{};

        void Run() {
            if (g_scheduledStatsSeq.load() != seq) return;

            if (std::chrono::steady_clock::now() >= target) {
                SendStatsToView(true);
                return;
            }

            if (auto* ti = SKSE::GetTaskInterface()) {
                const auto self = shared_from_this();
                ti->AddTask([self]() { self->Run(); });
            }
        }
    };

    const auto task = std::make_shared<ScheduledStatsUpdate>();
    task->target = target;
    task->seq = seq;
    taskInterface->AddTask([task]() { task->Run(); });
}

static bool IsGameLoaded() {
    return gameLoaded.load();
}

static void SetGameLoaded(bool loaded) {
    gameLoaded.store(loaded);
}

static void SendStatsToViewThrottled() {
    SendStatsToView();
}

static void SendStatsToViewForced() {
    SendStatsToView(true);
}

static void SetView(PrismaView newView) {
    view = newView;
}

static void SetViewDomReady(bool ready) {
    g_viewDomReady.store(ready);
}

static void RegisterWidgetJsListeners() {
    TulliusWidgets::WidgetJsListeners::Callbacks jsListenerCallbacks{};
    jsListenerCallbacks.resolveStorageBasePath = &ResolveStorageBasePath;
    jsListenerCallbacks.invokeScript = &TryInvoke;
    jsListenerCallbacks.interopCall = &TryInteropCall;
    jsListenerCallbacks.unfocusView = &TryUnfocusView;
    TulliusWidgets::WidgetJsListeners::Register(PrismaUI, view, jsListenerCallbacks);
}

static void RegisterWidgetEventSinks() {
    TulliusWidgets::WidgetEvents::Callbacks eventCallbacks{};
    eventCallbacks.isViewReady = &IsViewReady;
    eventCallbacks.isGameLoaded = &IsGameLoaded;
    eventCallbacks.setGameLoaded = &SetGameLoaded;
    eventCallbacks.showView = &TryShowView;
    eventCallbacks.hideView = &TryHideView;
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
    if (g_heartbeatStarted.exchange(true)) return;

    g_heartbeatThread = std::jthread([](std::stop_token stopToken) {
        while (!stopToken.stop_requested()) {
            std::this_thread::sleep_for(HEARTBEAT_INTERVAL);
            if (stopToken.stop_requested()) break;

            if (!gameLoaded.load()) continue;

            auto* taskInterface = SKSE::GetTaskInterface();
            if (!taskInterface) continue;

            taskInterface->AddTask([]() {
                if (!gameLoaded.load()) return;

                auto* ui = RE::UI::GetSingleton();
                if (ui && ui->GameIsPaused()) return;

                SendStatsToView(true);
            });
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
    callbacks.hideView = &TryHideView;
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

    auto g_messaging = reinterpret_cast<SKSE::MessagingInterface*>(
        a_skse->QueryInterface(SKSE::LoadInterface::kMessaging)
    );

    if (!g_messaging) {
        logger::critical("Failed to load messaging interface! Plugin will not load.");
        return false;
    }

    SKSE::Init(a_skse);
    SKSE::AllocTrampoline(1 << 10);
    InitializeRuntimeDiagnostics(a_skse);

    if (!g_runtimeDiagnostics.runtimeSupported) {
        logger::warn(
            "Unsupported runtime detected ({}). The widget may not be stable on this game version.",
            std::to_string(g_runtimeDiagnostics.runtimeVersion));
    }
    if (!g_runtimeDiagnostics.addressLibraryPresent) {
        logger::warn(
            "Address Library file not found for runtime {} (expected: {}).",
            std::to_string(g_runtimeDiagnostics.runtimeVersion),
            g_runtimeDiagnostics.addressLibraryPath);
    }

    g_messaging->RegisterListener("SKSE", SKSEMessageHandler);

    logger::info("TulliusWidgets loaded");
    return true;
}
