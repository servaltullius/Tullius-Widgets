#include "PrismaUI_API.h"
#include "StatsCollector.h"
#include <keyhandler/keyhandler.h>
#include <atomic>
#include <chrono>
#include <filesystem>
#include <algorithm>
#include <mutex>
#include <string_view>
#include <thread>
#ifndef NOMINMAX
#define NOMINMAX
#endif
#define WIN32_LEAN_AND_MEAN
#include <Windows.h>

PRISMA_UI_API::IVPrismaUI1* PrismaUI = nullptr;
static PrismaView view = 0;
static std::atomic<bool> gameLoaded{false};
static REL::Version g_runtimeVersion{};
static REL::Version g_skseVersion{};
static bool g_runtimeSupported = true;
static bool g_addressLibraryPresent = true;
static std::string g_addressLibraryPath;
static std::filesystem::path g_gameRootPath{};

// Throttle: shorter interval during combat for responsive HP/MP/SP
static std::chrono::steady_clock::time_point lastUpdateTime{};
static std::mutex lastUpdateMutex;
static constexpr auto UPDATE_INTERVAL_COMBAT = std::chrono::milliseconds(100);
static constexpr auto UPDATE_INTERVAL_IDLE   = std::chrono::milliseconds(500);
static constexpr auto HEARTBEAT_INTERVAL     = std::chrono::seconds(3);
static std::jthread g_heartbeatThread;
static std::atomic<bool> g_heartbeatStarted{false};

// --- Settings Persistence ---
static std::filesystem::path ResolveGameRootPath();

static std::filesystem::path GetSettingsDirectoryPath() {
    const auto basePath = g_gameRootPath.empty() ? ResolveGameRootPath() : g_gameRootPath;
    return basePath / "Data" / "SKSE" / "Plugins";
}

static std::string EscapeJson(std::string_view input) {
    std::string out;
    out.reserve(input.size() + 8);
    for (unsigned char c : input) {
        switch (c) {
        case '\\': out += "\\\\"; break;
        case '"': out += "\\\""; break;
        case '\b': out += "\\b"; break;
        case '\f': out += "\\f"; break;
        case '\n': out += "\\n"; break;
        case '\r': out += "\\r"; break;
        case '\t': out += "\\t"; break;
        default:
            if (c < 0x20) {
                char unicodeBuf[7];
                std::snprintf(unicodeBuf, sizeof(unicodeBuf), "\\u%04X", static_cast<unsigned int>(c));
                out += unicodeBuf;
            } else {
                out += static_cast<char>(c);
            }
            break;
        }
    }
    return out;
}

static bool IsLikelySupportedRuntime(REL::Version runtimeVersion) {
    return runtimeVersion.major() == 1 && (runtimeVersion.minor() == 5 || runtimeVersion.minor() == 6);
}

static std::filesystem::path ResolveGameRootPath() {
    std::wstring exePathBuffer(MAX_PATH, L'\0');
    while (exePathBuffer.size() <= 32768) {
        const DWORD size = static_cast<DWORD>(exePathBuffer.size());
        const DWORD len = ::GetModuleFileNameW(nullptr, exePathBuffer.data(), size);
        if (len == 0) break;
        if (len < size - 1) {
            exePathBuffer.resize(len);
            std::filesystem::path exePath(exePathBuffer);
            auto parent = exePath.parent_path();
            if (!parent.empty()) return parent;
            break;
        }
        exePathBuffer.resize(exePathBuffer.size() * 2);
    }

    std::error_code ec;
    auto cwd = std::filesystem::current_path(ec);
    if (ec) {
        logger::warn("Failed to resolve current path for diagnostics: {}", ec.message());
        return {};
    }
    return cwd;
}

static std::filesystem::path GetAddressLibraryPath(REL::Version runtimeVersion) {
    const bool usesVersionLib = runtimeVersion.minor() >= 6;
    const auto filename = std::string(usesVersionLib ? "versionlib-" : "version-") + runtimeVersion.string() + ".bin";
    const auto basePath = g_gameRootPath.empty() ? ResolveGameRootPath() : g_gameRootPath;
    return basePath / "Data" / "SKSE" / "Plugins" / filename;
}

static void InitializeRuntimeDiagnostics(const SKSE::LoadInterface* loadInterface) {
    if (!loadInterface) return;

    g_runtimeVersion = loadInterface->RuntimeVersion();
    g_skseVersion = REL::Version::unpack(loadInterface->SKSEVersion());
    g_runtimeSupported = IsLikelySupportedRuntime(g_runtimeVersion);
    g_gameRootPath = ResolveGameRootPath();

    const auto addressLibraryPath = GetAddressLibraryPath(g_runtimeVersion);
    g_addressLibraryPath = addressLibraryPath.generic_string();
    std::error_code ec;
    g_addressLibraryPresent = std::filesystem::exists(addressLibraryPath, ec);
    if (ec) {
        logger::warn("Address Library path check failed ({}): {}", g_addressLibraryPath, ec.message());
        g_addressLibraryPresent = false;
    }

    logger::info(
        "Runtime diagnostics: runtime={}, skse={}, gameRoot={}, addressLibraryPath={}, addressLibraryPresent={}",
        std::to_string(g_runtimeVersion),
        std::to_string(g_skseVersion),
        g_gameRootPath.generic_string(),
        g_addressLibraryPath,
        g_addressLibraryPresent);
}

static std::string BuildRuntimeDiagnosticsJson() {
    const bool hasRuntimeWarning = !g_runtimeSupported;
    const bool hasAddressWarning = !g_addressLibraryPresent;
    std::string warningCode = "none";
    if (hasRuntimeWarning && hasAddressWarning) {
        warningCode = "unsupported-runtime-and-missing-address-library";
    } else if (hasRuntimeWarning) {
        warningCode = "unsupported-runtime";
    } else if (hasAddressWarning) {
        warningCode = "missing-address-library";
    }

    std::string json = "{";
    json += "\"runtimeVersion\":\"" + EscapeJson(std::to_string(g_runtimeVersion)) + "\",";
    json += "\"skseVersion\":\"" + EscapeJson(std::to_string(g_skseVersion)) + "\",";
    json += "\"addressLibraryPath\":\"" + EscapeJson(g_addressLibraryPath) + "\",";
    json += "\"addressLibraryPresent\":" + std::string(g_addressLibraryPresent ? "true" : "false") + ",";
    json += "\"runtimeSupported\":" + std::string(g_runtimeSupported ? "true" : "false") + ",";
    json += "\"usesAddressLibrary\":true,";
    json += "\"warningCode\":\"" + warningCode + "\"";
    json += "}";
    return json;
}

static bool IsViewReady() {
    return PrismaUI && view != 0 && PrismaUI->IsValid(view);
}

static bool TryInteropCall(const char* functionName, const char* argument) {
    if (!IsViewReady()) return false;
    PrismaUI->InteropCall(view, functionName, argument ? argument : "");
    return true;
}

static bool TryInvoke(const char* script) {
    if (!IsViewReady()) return false;
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

static bool EnsureSettingsDirectory() {
    const auto dirPath = GetSettingsDirectoryPath();
    std::error_code ec;
    std::filesystem::create_directories(dirPath, ec);
    if (ec) {
        logger::error("Failed to create settings directory '{}': {}", dirPath.generic_string(), ec.message());
        return false;
    }
    return true;
}

static std::filesystem::path GetSettingsPath() {
    return GetSettingsDirectoryPath() / "TulliusWidgets.json";
}

static std::filesystem::path GetPresetPath() {
    return GetSettingsDirectoryPath() / "TulliusWidgets_preset.json";
}

static void SaveSettings(const char* jsonData) {
    if (!jsonData) return;
    if (!EnsureSettingsDirectory()) return;

    std::ofstream file(GetSettingsPath());
    if (!file.is_open()) {
        logger::error("Failed to open settings file for write: {}", GetSettingsPath().string());
        return;
    }

    file << jsonData;
    if (!file.good()) {
        logger::error("Failed to write settings file: {}", GetSettingsPath().string());
    } else {
        logger::info("Settings saved");
    }
}

static std::string LoadSettings() {
    auto path = GetSettingsPath();
    if (!std::filesystem::exists(path)) return "";
    std::ifstream file(path);
    if (!file.is_open()) return "";
    return std::string((std::istreambuf_iterator<char>(file)),
                        std::istreambuf_iterator<char>());
}

static void SendHUDColorToView() {
    if (!IsViewReady()) return;
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
    if (!IsViewReady()) return;
    std::string json = LoadSettings();
    if (json.empty()) return;
    if (!TryInteropCall("updateSettings", json.c_str())) return;
    logger::info("Saved settings sent to view");
}

static void SendRuntimeDiagnosticsToView() {
    if (!IsViewReady()) return;
    const auto json = BuildRuntimeDiagnosticsJson();
    if (!TryInteropCall("updateRuntimeStatus", json.c_str())) return;
}

static void SendStatsToView(bool force = false) {
    if (!IsViewReady() || !gameLoaded.load()) return;

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

class CombatEventSink : public RE::BSTEventSink<RE::TESCombatEvent> {
public:
    static CombatEventSink* GetSingleton() {
        static CombatEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(const RE::TESCombatEvent*, RE::BSTEventSource<RE::TESCombatEvent>*) override {
        SendStatsToView();
        return RE::BSEventNotifyControl::kContinue;
    }
};

class EquipEventSink : public RE::BSTEventSink<RE::TESEquipEvent> {
public:
    static EquipEventSink* GetSingleton() {
        static EquipEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(const RE::TESEquipEvent* event, RE::BSTEventSource<RE::TESEquipEvent>*) override {
        if (!event) return RE::BSEventNotifyControl::kContinue;
        auto player = RE::PlayerCharacter::GetSingleton();
        if (player && event->actor.get() == player) {
            SendStatsToView(true);  // Force: equip changes are important
        }
        return RE::BSEventNotifyControl::kContinue;
    }
};

class ActiveEffectEventSink : public RE::BSTEventSink<RE::TESActiveEffectApplyRemoveEvent> {
public:
    static ActiveEffectEventSink* GetSingleton() {
        static ActiveEffectEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(const RE::TESActiveEffectApplyRemoveEvent* event, RE::BSTEventSource<RE::TESActiveEffectApplyRemoveEvent>*) override {
        if (!event) return RE::BSEventNotifyControl::kContinue;
        // Only update for effects targeting the player
        auto player = RE::PlayerCharacter::GetSingleton();
        if (player && event->target.get() == player) {
            SendStatsToView();
        }
        return RE::BSEventNotifyControl::kContinue;
    }
};

static constexpr std::array<std::string_view, 21> kHiddenMenus = {
    RE::InventoryMenu::MENU_NAME,
    RE::MagicMenu::MENU_NAME,
    RE::MapMenu::MENU_NAME,
    RE::StatsMenu::MENU_NAME,
    RE::JournalMenu::MENU_NAME,
    RE::TweenMenu::MENU_NAME,
    RE::ContainerMenu::MENU_NAME,
    RE::BarterMenu::MENU_NAME,
    RE::GiftMenu::MENU_NAME,
    RE::LockpickingMenu::MENU_NAME,
    RE::BookMenu::MENU_NAME,
    RE::FavoritesMenu::MENU_NAME,
    RE::Console::MENU_NAME,
    RE::CraftingMenu::MENU_NAME,
    RE::TrainingMenu::MENU_NAME,
    RE::SleepWaitMenu::MENU_NAME,
    RE::RaceSexMenu::MENU_NAME,
    RE::LevelUpMenu::MENU_NAME,
    // Compatibility aliases seen in some UI overhauls / plugins
    "JournalMenu"sv,
    "BookMenu"sv,
    "LockpickingMenu"sv
};

static bool ShouldHideForMenu(const RE::BSFixedString& menuName) {
    for (const auto& name : kHiddenMenus) {
        if (menuName == name) return true;
    }
    return false;
}

static bool IsAnyHiddenMenuOpen(RE::UI* ui) {
    if (!ui) return false;
    return std::any_of(kHiddenMenus.begin(), kHiddenMenus.end(),
                       [ui](const auto& name) { return ui->IsMenuOpen(name); });
}

class MenuEventSink : public RE::BSTEventSink<RE::MenuOpenCloseEvent> {
public:
    static MenuEventSink* GetSingleton() {
        static MenuEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(const RE::MenuOpenCloseEvent* event, RE::BSTEventSource<RE::MenuOpenCloseEvent>*) override {
        if (!event || !IsViewReady()) return RE::BSEventNotifyControl::kContinue;
        auto ui = RE::UI::GetSingleton();

        // Main menu: hide and mark game as unloaded
        if (event->menuName == RE::MainMenu::MENU_NAME && event->opening) {
            TryHideView();
            gameLoaded.store(false);
            return RE::BSEventNotifyControl::kContinue;
        }

        // Hide widgets when tracked menus open (or while game is paused by a menu).
        if (event->opening && (ShouldHideForMenu(event->menuName) || (ui && ui->GameIsPaused()))) {
            TryHideView();
        } else if (!event->opening && gameLoaded.load() && ui && !ui->GameIsPaused() && !IsAnyHiddenMenuOpen(ui)) {
            // Show only after all tracked menus are fully closed.
            if (TryShowView()) {
                SendStatsToView(true);
            }
        }

        return RE::BSEventNotifyControl::kContinue;
    }
};

static void RegisterEventSinks() {
    auto scriptEventSource = RE::ScriptEventSourceHolder::GetSingleton();
    if (scriptEventSource) {
        scriptEventSource->AddEventSink(CombatEventSink::GetSingleton());
        scriptEventSource->AddEventSink(EquipEventSink::GetSingleton());
        scriptEventSource->AddEventSink(ActiveEffectEventSink::GetSingleton());
        logger::info("Event sinks registered");
    }

    auto ui = RE::UI::GetSingleton();
    if (ui) {
        ui->AddEventSink(MenuEventSink::GetSingleton());
        logger::info("Menu event sink registered");
    }
}

static void SKSEMessageHandler(SKSE::MessagingInterface::Message* message) {
    switch (message->type) {
    case SKSE::MessagingInterface::kDataLoaded: {
        PrismaUI = static_cast<PRISMA_UI_API::IVPrismaUI1*>(
            PRISMA_UI_API::RequestPluginAPI(PRISMA_UI_API::InterfaceVersion::V1)
        );

        if (!PrismaUI) {
            logger::error("Failed to initialize PrismaUI API. Is PrismaUI installed?");
            return;
        }

        logger::info("PrismaUI API initialized");

        view = PrismaUI->CreateView("TulliusWidgets/index.html", [](PrismaView v) -> void {
            logger::info("TulliusWidgets view ready (id: {})", v);
        });

        if (!IsViewReady()) {
            logger::error("Failed to create TulliusWidgets view. Widget initialization aborted.");
            view = 0;
            return;
        }

        TryHideView();
        SendRuntimeDiagnosticsToView();

        PrismaUI->RegisterJSListener(view, "onSettingsChanged", [](const char* data) -> void {
            if (data) {
                SaveSettings(data);
            }
        });

        PrismaUI->RegisterJSListener(view, "onExportSettings", [](const char* data) -> void {
            if (!data) return;
            bool success = false;
            if (EnsureSettingsDirectory()) {
                std::ofstream file(GetPresetPath());
                if (file.is_open()) {
                    file << data;
                    success = file.good();
                }
            }

            if (success) {
                logger::info("Preset exported");
            } else {
                logger::error("Preset export failed: {}", GetPresetPath().string());
            }

            if (success) {
                TryInvoke("onExportResult(true)");
            } else {
                TryInvoke("onExportResult(false)");
            }
        });

        PrismaUI->RegisterJSListener(view, "onImportSettings", [](const char*) -> void {
            auto presetPath = GetPresetPath();
            if (!std::filesystem::exists(presetPath)) {
                TryInvoke("onImportResult(false)");
                return;
            }
            std::ifstream file(presetPath);
            if (!file.is_open()) {
                TryInvoke("onImportResult(false)");
                return;
            }
            std::string json((std::istreambuf_iterator<char>(file)),
                              std::istreambuf_iterator<char>());
            if (!TryInteropCall("importSettingsFromNative", json.c_str())) {
                TryInvoke("onImportResult(false)");
                return;
            }
            logger::info("Preset import payload sent");
        });

        PrismaUI->RegisterJSListener(view, "onRequestUnfocus", [](const char*) -> void {
            TryUnfocusView();
        });

        RegisterEventSinks();
        StartHeartbeat();

        KeyHandler::RegisterSink();
        KeyHandler* keyHandler = KeyHandler::GetSingleton();

        // Insert = 0xD2 to toggle settings panel
        (void)keyHandler->Register(0xD2, KeyEventType::KEY_DOWN, []() {
            if (IsViewReady() && gameLoaded.load()) {
                TryInvoke("toggleSettings()");
                if (!ViewHasFocus()) {
                    TryFocusView();
                } else {
                    TryUnfocusView();
                }
            }
        });

        // ESC = 0x01 to close settings panel
        (void)keyHandler->Register(0x01, KeyEventType::KEY_DOWN, []() {
            if (IsViewReady() && gameLoaded.load() && ViewHasFocus()) {
                TryInvoke("closeSettings()");
                TryUnfocusView();
            }
        });

        // F11 = 0x57 to toggle overall widget visibility
        (void)keyHandler->Register(0x57, KeyEventType::KEY_DOWN, []() {
            if (IsViewReady() && gameLoaded.load()) {
                TryInvoke("toggleWidgetsVisibility()");
            }
        });

        break;
    }
    case SKSE::MessagingInterface::kPostLoadGame:
    case SKSE::MessagingInterface::kNewGame: {
        gameLoaded.store(true);
        if (TryShowView()) {
            SendRuntimeDiagnosticsToView();
            SendHUDColorToView();
            SendSettingsToView();
            SendStatsToView(true);
        } else {
            logger::warn("View not ready on game load; skipping initial UI sync");
        }
        logger::info("Game loaded - widgets visible");
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

    if (!g_runtimeSupported) {
        logger::warn(
            "Unsupported runtime detected ({}). The widget may not be stable on this game version.",
            std::to_string(g_runtimeVersion));
    }
    if (!g_addressLibraryPresent) {
        logger::warn(
            "Address Library file not found for runtime {} (expected: {}).",
            std::to_string(g_runtimeVersion),
            g_addressLibraryPath);
    }

    g_messaging->RegisterListener("SKSE", SKSEMessageHandler);

    logger::info("TulliusWidgets loaded");
    return true;
}
