#include "NativeStorage.h"
#include "PrismaUI_API.h"
#include "RuntimeDiagnostics.h"
#include "StatsCollector.h"
#include "WidgetBootstrap.h"
#include "WidgetEvents.h"
#include "WidgetHotkeys.h"
#include "WidgetJsListeners.h"
#include "WidgetRuntime.h"
#include "WidgetViewBridge.h"
#include <atomic>
#include <filesystem>
#include <functional>

PRISMA_UI_API::IVPrismaUI1* PrismaUI = nullptr;

namespace {

struct PluginState {
    TulliusWidgets::RuntimeDiagnostics::State runtimeDiagnostics{};
    std::atomic<bool> settingsPanelOpen{ false };
};

PluginState g;
TulliusWidgets::WidgetViewBridge::Runtime g_viewBridge{};

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

static void SyncViewBridgeApi() {
    g_viewBridge.SetApi(PrismaUI);
}

static bool IsViewReady() {
    SyncViewBridgeApi();
    return g_viewBridge.IsViewReady();
}

static bool IsInteropReady() {
    SyncViewBridgeApi();
    return g_viewBridge.IsInteropReady();
}

static bool TryInteropCall(const char* functionName, const char* argument) {
    SyncViewBridgeApi();
    return g_viewBridge.InteropCall(functionName, argument);
}

static bool TryInvoke(const char* script) {
    SyncViewBridgeApi();
    return g_viewBridge.Invoke(script);
}

static bool TryShowView() {
    SyncViewBridgeApi();
    return g_viewBridge.Show();
}

static bool TryHideView() {
    SyncViewBridgeApi();
    return g_viewBridge.Hide();
}

static void HideViewIfReady() {
    (void)TryHideView();
}

static bool ViewHasFocus() {
    SyncViewBridgeApi();
    return g_viewBridge.HasFocus();
}

static bool TryFocusView() {
    SyncViewBridgeApi();
    return g_viewBridge.Focus();
}

static void TryUnfocusView() {
    SyncViewBridgeApi();
    g_viewBridge.Unfocus();
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

static bool IsGameLoaded() {
    return TulliusWidgets::WidgetRuntime::IsGameLoaded();
}

static void SetGameLoaded(bool loaded) {
    TulliusWidgets::WidgetRuntime::SetGameLoaded(loaded);
    if (!loaded) {
        g.settingsPanelOpen.store(false, std::memory_order_release);
    }
}

static bool IsSettingsPanelOpen() {
    return g.settingsPanelOpen.load(std::memory_order_acquire);
}

static void SetSettingsPanelOpen(bool open) {
    g.settingsPanelOpen.store(open, std::memory_order_release);
}

static void SendStatsToViewThrottled() {
    TulliusWidgets::WidgetRuntime::RequestStatsDispatch(false);
}

static void SendStatsToViewForced() {
    TulliusWidgets::WidgetRuntime::RequestStatsDispatch(true);
}

static void ScheduleStatsUpdateAfter(std::chrono::milliseconds delay) {
    TulliusWidgets::WidgetRuntime::ScheduleStatsUpdateAfter(delay);
}

static void SetView(PrismaView newView) {
    g_viewBridge.SetView(newView);
}

static void SetViewDomReady(bool ready) {
    g_viewBridge.SetDomReady(ready);
}

static void RegisterWidgetJsListeners() {
    SyncViewBridgeApi();
    TulliusWidgets::WidgetJsListeners::Callbacks jsListenerCallbacks{};
    jsListenerCallbacks.resolveStorageBasePath = &ResolveStorageBasePath;
    jsListenerCallbacks.invokeScript = &TryInvoke;
    jsListenerCallbacks.interopCall = &TryInteropCall;
    jsListenerCallbacks.unfocusView = &TryUnfocusView;
    jsListenerCallbacks.setSettingsOpen = &SetSettingsPanelOpen;
    TulliusWidgets::WidgetJsListeners::Register(
        g_viewBridge.GetApi(),
        g_viewBridge.GetView(),
        jsListenerCallbacks);
}

static void RegisterWidgetEventSinks() {
    TulliusWidgets::WidgetEvents::Callbacks eventCallbacks{};
    eventCallbacks.isViewReady = &IsViewReady;
    eventCallbacks.isGameLoaded = &IsGameLoaded;
    eventCallbacks.hasViewFocus = &ViewHasFocus;
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
    hotkeyCallbacks.isSettingsPanelOpen = &IsSettingsPanelOpen;
    hotkeyCallbacks.focusView = &TryFocusView;
    hotkeyCallbacks.unfocusView = &TryUnfocusView;
    hotkeyCallbacks.invokeScript = &TryInvoke;
    TulliusWidgets::WidgetHotkeys::RegisterDefaultHotkeys(hotkeyCallbacks);
}

static void QueueGameTask(std::function<void()> task) {
    if (!task) return;
    if (auto* taskInterface = SKSE::GetTaskInterface()) {
        taskInterface->AddTask([task = std::move(task)]() mutable {
            task();
        });
        return;
    }
    task();
}

static TulliusWidgets::WidgetRuntime::Callbacks BuildWidgetRuntimeCallbacks() {
    TulliusWidgets::WidgetRuntime::Callbacks callbacks{};
    callbacks.isInteropReady = []() {
        return IsInteropReady();
    };
    callbacks.hasViewFocus = []() {
        return ViewHasFocus();
    };
    callbacks.collectStatsJson = []() {
        return TulliusWidgets::StatsCollector::CollectStats();
    };
    callbacks.interopCall = [](const char* functionName, const char* argument) {
        return TryInteropCall(functionName, argument);
    };
    callbacks.showView = []() {
        return TryShowView();
    };
    callbacks.hideView = []() {
        HideViewIfReady();
    };
    callbacks.queueGameTask = [](std::function<void()> task) {
        QueueGameTask(std::move(task));
    };
    return callbacks;
}

static void StartWidgetRuntime() {
    TulliusWidgets::WidgetRuntime::StartHeartbeat();
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
    callbacks.startHeartbeat = &StartWidgetRuntime;
    callbacks.registerHotkeys = &RegisterWidgetHotkeys;
    return callbacks;
}

static void SKSEMessageHandler(SKSE::MessagingInterface::Message* message) {
    const auto bootstrapCallbacks = BuildWidgetBootstrapCallbacks();

    switch (message->type) {
    case SKSE::MessagingInterface::kDataLoaded: {
        TulliusWidgets::WidgetRuntime::Initialize(BuildWidgetRuntimeCallbacks());
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
