#include "PrismaUI_API.h"
#include "StatsCollector.h"
#include <keyhandler/keyhandler.h>
#include <atomic>
#include <chrono>
#include <filesystem>
#include <algorithm>

// Escape single quotes for safe JS string embedding
static std::string EscapeForJS(const std::string& input) {
    std::string result;
    result.reserve(input.size());
    for (char c : input) {
        if (c == '\'') result += "\\'";
        else if (c == '\\') result += "\\\\";
        else result += c;
    }
    return result;
}

PRISMA_UI_API::IVPrismaUI1* PrismaUI = nullptr;
static PrismaView view = 0;
static std::atomic<bool> gameLoaded{false};

// Throttle: shorter interval during combat for responsive HP/MP/SP
static std::chrono::steady_clock::time_point lastUpdateTime{};
static constexpr auto UPDATE_INTERVAL_COMBAT = std::chrono::milliseconds(100);
static constexpr auto UPDATE_INTERVAL_IDLE   = std::chrono::milliseconds(500);

// --- Settings Persistence ---
static constexpr auto SETTINGS_DIR = "Data/SKSE/Plugins";

static std::filesystem::path GetSettingsPath() {
    return std::filesystem::path(SETTINGS_DIR) / "TulliusWidgets.json";
}

static std::filesystem::path GetPresetPath() {
    return std::filesystem::path(SETTINGS_DIR) / "TulliusWidgets_preset.json";
}

static void SaveSettings(const char* jsonData) {
    std::ofstream file(GetSettingsPath());
    if (file.is_open()) {
        file << jsonData;
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
    if (!PrismaUI || !view) return;
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
    std::string script = std::string("setHUDColor('") + hex + "')";
    PrismaUI->Invoke(view, script.c_str());
    logger::info("HUD color sent: {}", hex);
}

static void SendSettingsToView() {
    if (!PrismaUI || !view) return;
    std::string json = LoadSettings();
    if (json.empty()) return;
    std::string script = "updateSettings('" + EscapeForJS(json) + "')";
    PrismaUI->Invoke(view, script.c_str());
    logger::info("Saved settings sent to view");
}

static void SendStatsToView(bool force = false) {
    if (!PrismaUI || !view || !gameLoaded) return;

    if (!force) {
        auto now = std::chrono::steady_clock::now();
        auto player = RE::PlayerCharacter::GetSingleton();
        auto interval = (player && player->IsInCombat()) ? UPDATE_INTERVAL_COMBAT : UPDATE_INTERVAL_IDLE;
        if (now - lastUpdateTime < interval) return;
        lastUpdateTime = now;
    }

    std::string stats = TulliusWidgets::StatsCollector::CollectStats();
    std::string script = "updateStats('" + EscapeForJS(stats) + "')";
    PrismaUI->Invoke(view, script.c_str());
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
        if (!event || !PrismaUI || !view) return RE::BSEventNotifyControl::kContinue;
        auto ui = RE::UI::GetSingleton();

        // Main menu: hide and mark game as unloaded
        if (event->menuName == RE::MainMenu::MENU_NAME && event->opening) {
            PrismaUI->Hide(view);
            gameLoaded = false;
            return RE::BSEventNotifyControl::kContinue;
        }

        // Hide widgets when tracked menus open (or while game is paused by a menu).
        if (event->opening && (ShouldHideForMenu(event->menuName) || (ui && ui->GameIsPaused()))) {
            PrismaUI->Hide(view);
        } else if (!event->opening && gameLoaded && ui && !ui->GameIsPaused() && !IsAnyHiddenMenuOpen(ui)) {
            // Show only after all tracked menus are fully closed.
            PrismaUI->Show(view);
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

        PrismaUI->Hide(view);

        PrismaUI->RegisterJSListener(view, "onSettingsChanged", [](const char* data) -> void {
            if (data) {
                SaveSettings(data);
            }
        });

        PrismaUI->RegisterJSListener(view, "onExportSettings", [](const char* data) -> void {
            if (!data) return;
            std::ofstream file(GetPresetPath());
            if (file.is_open()) {
                file << data;
                logger::info("Preset exported");
                if (PrismaUI && view) {
                    PrismaUI->Invoke(view, "onExportResult(true)");
                }
            }
        });

        PrismaUI->RegisterJSListener(view, "onImportSettings", [](const char*) -> void {
            auto presetPath = GetPresetPath();
            if (!std::filesystem::exists(presetPath)) {
                if (PrismaUI && view) {
                    PrismaUI->Invoke(view, "onImportResult(false)");
                }
                return;
            }
            std::ifstream file(presetPath);
            if (!file.is_open()) return;
            std::string json((std::istreambuf_iterator<char>(file)),
                              std::istreambuf_iterator<char>());
            if (PrismaUI && view) {
                std::string script = "updateSettings('" + EscapeForJS(json) + "')";
                PrismaUI->Invoke(view, script.c_str());
                SaveSettings(json.c_str());
                PrismaUI->Invoke(view, "onImportResult(true)");
            }
            logger::info("Preset imported");
        });

        PrismaUI->RegisterJSListener(view, "onRequestUnfocus", [](const char*) -> void {
            if (PrismaUI && view) {
                PrismaUI->Unfocus(view);
            }
        });

        RegisterEventSinks();

        KeyHandler::RegisterSink();
        KeyHandler* keyHandler = KeyHandler::GetSingleton();

        // Insert = 0xD2 to toggle settings panel
        (void)keyHandler->Register(0xD2, KeyEventType::KEY_DOWN, []() {
            if (PrismaUI && view && gameLoaded) {
                PrismaUI->Invoke(view, "toggleSettings()");
                auto hasFocus = PrismaUI->HasFocus(view);
                if (!hasFocus) {
                    PrismaUI->Focus(view);
                } else {
                    PrismaUI->Unfocus(view);
                }
            }
        });

        // ESC = 0x01 to close settings panel
        (void)keyHandler->Register(0x01, KeyEventType::KEY_DOWN, []() {
            if (PrismaUI && view && gameLoaded && PrismaUI->HasFocus(view)) {
                PrismaUI->Invoke(view, "closeSettings()");
                PrismaUI->Unfocus(view);
            }
        });

        break;
    }
    case SKSE::MessagingInterface::kPostLoadGame:
    case SKSE::MessagingInterface::kNewGame: {
        gameLoaded = true;
        if (PrismaUI && view) {
            PrismaUI->Show(view);
            SendHUDColorToView();
            SendSettingsToView();
            SendStatsToView(true);
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

    g_messaging->RegisterListener("SKSE", SKSEMessageHandler);

    logger::info("TulliusWidgets loaded");
    return true;
}
