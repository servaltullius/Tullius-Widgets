#include "IconPacks.h"
#include "NativeStorage.h"
#include "PrismaUI_API.h"
#include "RuntimeDiagnostics.h"
#include "SelfTestRuntime.h"
#include "SelfTestSession.h"
#include "StatsCollector.h"
#include "UserFonts.h"
#include "WidgetBootstrap.h"
#include "WidgetEvents.h"
#include "WidgetHotkeys.h"
#include "WidgetInteropContracts.h"
#include "WidgetJsListeners.h"
#include "WidgetRuntime.h"
#include "WidgetViewBridge.h"
#include "WidgetVisibilityState.h"
#include <atomic>
#include <filesystem>
#include <functional>

PRISMA_UI_API::IVPrismaUI1* PrismaUI = nullptr;

namespace {

struct PluginState {
    TulliusWidgets::RuntimeDiagnostics::State runtimeDiagnostics{};
    std::atomic<bool> settingsPanelOpen{ false };
    // Set when a menu (the console, the journal, ...) hides the view while the settings panel is
    // open. Hiding takes the cursor and input focus away from the panel, so the next time the view
    // is shown the panel gets them back instead of staying open with the game taking the input.
    std::atomic<bool> panelFocusLostToHide{ false };
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

static void RestorePanelFocusAfterShow();

static bool TryShowView() {
    SyncViewBridgeApi();
    if (!g_viewBridge.Show()) {
        return false;
    }
    TulliusWidgets::WidgetRuntime::NoteViewShown();
    if (g.panelFocusLostToHide.exchange(false, std::memory_order_acq_rel)) {
        RestorePanelFocusAfterShow();
    }
    return true;
}

static void HideViewIfReady() {
    SyncViewBridgeApi();
    if (g_viewBridge.Hide()) {
        TulliusWidgets::WidgetRuntime::NoteViewHidden();
        if (g.settingsPanelOpen.load(std::memory_order_acquire)) {
            g.panelFocusLostToHide.store(true, std::memory_order_release);
        }
    }
}

static bool ViewHasFocus() {
    SyncViewBridgeApi();
    return g_viewBridge.HasFocus();
}

// The HUD visibility rules let a focused view stay up through pauses and the free camera. An open
// settings panel counts as well even while something (the console) has taken its focus, so the
// view can come back and get the focus again instead of waiting for the free camera to end.
static bool ViewOwnsScreen() {
    return g.settingsPanelOpen.load(std::memory_order_acquire) || ViewHasFocus();
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
            color = static_cast<std::uint32_t>(setting->GetInteger()) & 0xFFFFFF;
        }
    }
    char hex[16];
    std::snprintf(hex, sizeof(hex), "#%06x", color);
    if (!TryInteropCall(TulliusWidgets::WidgetInteropContracts::kSetHUDColor, hex)) return;
    logger::info("HUD color sent: {}", hex);
}

static void SendIconPacksToView() {
    if (!IsInteropReady()) return;
    std::size_t packCount = 0;
    const auto json = TulliusWidgets::IconPacks::BuildIconPacksJson(ResolveStorageBasePath(), &packCount);
    if (!TryInteropCall(TulliusWidgets::WidgetInteropContracts::kUpdateIconPacks, json.c_str())) return;
    logger::info("Icon packs sent to view: {}", packCount);
}

static void SendUserFontsToView() {
    if (!IsInteropReady()) return;
    std::size_t fontCount = 0;
    const auto json = TulliusWidgets::UserFonts::BuildUserFontsJson(ResolveStorageBasePath(), &fontCount);
    if (!TryInteropCall(TulliusWidgets::WidgetInteropContracts::kUpdateUserFonts, json.c_str())) return;
    logger::info("User fonts sent to view: {}", fontCount);
}

static void SendSettingsToView() {
    if (!IsInteropReady()) return;
    // A self-test session never shows the page the real settings: the page puts up its session
    // notice and starts from its own test settings when the run begins.
    if (TulliusWidgets::SelfTestSession::IsActive()) {
        (void)TryInvoke(TulliusWidgets::WidgetInteropContracts::kEnterSelfTestSessionScript);
        return;
    }
    // Send available assets before applying the saved selections.
    SendIconPacksToView();
    SendUserFontsToView();
    std::string json = TulliusWidgets::NativeStorage::LoadSettings(ResolveStorageBasePath());
    if (json.empty()) {
        // A file that is there but empty, too large or unreadable never reaches the view, which
        // then starts from defaults: tell it, so the player hears about it before changing anything.
        if (TulliusWidgets::NativeStorage::SettingsFileExists(ResolveStorageBasePath())) {
            logger::warn("The saved settings file could not be read; the view starts from defaults");
            (void)TryInvoke(TulliusWidgets::WidgetInteropContracts::kShowSettingsLoadFailureScript);
        }
        return;
    }
    // The view adopts the file it receives here, so the plugin applies the same file: otherwise a
    // failed save earlier in the session leaves the two on different hotkeys or camera policy.
    TulliusWidgets::WidgetHotkeys::ApplyHotkeysFromSettingsJson(json);
    if (!TryInteropCall(TulliusWidgets::WidgetInteropContracts::kUpdateSettings, json.c_str())) return;
    logger::info("Saved settings sent to view");
}

static void SendRuntimeDiagnosticsToView() {
    if (!IsInteropReady()) return;
    const auto json = TulliusWidgets::RuntimeDiagnostics::BuildJson(g.runtimeDiagnostics);
    if (!TryInteropCall(TulliusWidgets::WidgetInteropContracts::kUpdateRuntimeStatus, json.c_str())) return;
}

static bool IsGameLoaded() {
    return TulliusWidgets::WidgetRuntime::IsGameLoaded();
}

static void SetGameLoaded(bool loaded) {
    TulliusWidgets::WidgetRuntime::SetGameLoaded(loaded);
    if (!loaded) {
        // Leaving for the main menu with the panel open: close it on the page too, so a kept page
        // does not come back with the panel (or its layout bar) open while the plugin thinks it shut.
        if (g.settingsPanelOpen.exchange(false, std::memory_order_acq_rel)) {
            TryInvoke(TulliusWidgets::WidgetInteropContracts::kCloseSettingsScript);
        }
        g.panelFocusLostToHide.store(false, std::memory_order_release);
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
    eventCallbacks.hasViewFocus = &ViewOwnsScreen;
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
    // Saved key bindings apply from startup, before the view is ready.
    const auto savedSettings = TulliusWidgets::NativeStorage::LoadSettings(ResolveStorageBasePath());
    if (!savedSettings.empty()) {
        TulliusWidgets::WidgetHotkeys::ApplyHotkeysFromSettingsJson(savedSettings);
    }
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

// Runs on the next task tick, like the settings hotkey, so the menu that just closed has finished
// before the panel takes the cursor again. If the panel was closed meanwhile nothing happens; if
// something still blocks the HUD, the next showing tries again; if focusing fails, the panel is
// closed so it never stays open without a cursor.
static void RestorePanelFocusAfterShow() {
    QueueGameTask([]() {
        if (!g.settingsPanelOpen.load(std::memory_order_acquire) || !IsViewReady() || !IsGameLoaded()) {
            return;
        }
        if (ViewHasFocus()) {
            return;
        }
        // Only menus that hide the HUD count here; the pause the panel's own focus brings does not.
        if (TulliusWidgets::WidgetVisibilityState::IsBlockingUiState(RE::UI::GetSingleton(), true)) {
            g.panelFocusLostToHide.store(true, std::memory_order_release);
            return;
        }
        if (TryFocusView()) {
            logger::info("Settings panel focus restored after the view was shown again");
            return;
        }
        logger::warn("Could not give the settings panel focus back; closing it");
        if (!TryInvoke(TulliusWidgets::WidgetInteropContracts::kCloseSettingsScript)) {
            // The page did not take the close, so it will not report it either: end the panel
            // state here so the next settings hotkey opens it instead of closing it.
            logger::warn("Could not close the settings panel on the page; clearing the panel state");
            g.settingsPanelOpen.store(false, std::memory_order_release);
            TulliusWidgets::WidgetHotkeys::ClearCapture();
            TulliusWidgets::WidgetHotkeys::ClearPageEscape();
            TryUnfocusView();
        }
    });
}

static TulliusWidgets::WidgetRuntime::Callbacks BuildWidgetRuntimeCallbacks() {
    TulliusWidgets::WidgetRuntime::Callbacks callbacks{};
    callbacks.isInteropReady = []() {
        return IsInteropReady();
    };
    callbacks.hasViewFocus = []() {
        return ViewOwnsScreen();
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
    callbacks.onVisibleHeartbeat = []() {
        TulliusWidgets::SelfTestRuntime::PollOnVisibleHeartbeat(&TryInvoke);
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
    case SKSE::MessagingInterface::kPreLoadGame: {
        // The last-potion slot belongs to the character being left behind.
        TulliusWidgets::StatsCollector::NoteConsumedPotion(0);
        break;
    }
    case SKSE::MessagingInterface::kPostLoadGame:
    case SKSE::MessagingInterface::kNewGame: {
        if (message->type == SKSE::MessagingInterface::kNewGame) {
            TulliusWidgets::StatsCollector::NoteConsumedPotion(0);
        }
        TulliusWidgets::StatsCollector::ResetPlaytimeTracking();
        TulliusWidgets::WidgetBootstrap::SyncOnGameLoaded(bootstrapCallbacks);
        TulliusWidgets::SelfTestRuntime::NoteGameLoaded();
        break;
    }
    }
}

SKSE_PLUGIN_LOAD(const SKSE::LoadInterface* a_skse) {
    REL::Module::reset();

    auto messaging = reinterpret_cast<SKSE::MessagingInterface*>(
        a_skse->QueryInterface(SKSE::LoadInterface::kMessaging)
    );

    if (!messaging) {
        logger::critical("Failed to load messaging interface! Plugin will not load.");
        return false;
    }

    SKSE::Init(a_skse);
    InitializeRuntimeDiagnostics(a_skse);
    // Before the view exists (kDataLoaded), so a self-test session never sends it the real settings.
    TulliusWidgets::SelfTestRuntime::InitializeForLaunch(ResolveStorageBasePath());

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
