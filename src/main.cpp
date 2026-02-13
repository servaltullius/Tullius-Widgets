#include "PrismaUI_API.h"
#include "StatsCollector.h"
#include <keyhandler/keyhandler.h>

PRISMA_UI_API::IVPrismaUI1* PrismaUI = nullptr;
static PrismaView view = 0;

static void SendStatsToView() {
    if (!PrismaUI || !view) return;

    std::string stats = TulliusWidgets::StatsCollector::CollectStats();
    PrismaUI->Invoke(view, "updateStats('" + stats + "')");
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

    RE::BSEventNotifyControl ProcessEvent(const RE::TESEquipEvent*, RE::BSTEventSource<RE::TESEquipEvent>*) override {
        SendStatsToView();
        return RE::BSEventNotifyControl::kContinue;
    }
};

class ActiveEffectEventSink : public RE::BSTEventSink<RE::TESActiveEffectApplyRemoveEvent> {
public:
    static ActiveEffectEventSink* GetSingleton() {
        static ActiveEffectEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(const RE::TESActiveEffectApplyRemoveEvent*, RE::BSTEventSource<RE::TESActiveEffectApplyRemoveEvent>*) override {
        SendStatsToView();
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
            SendStatsToView();
        });

        PrismaUI->RegisterJSListener(view, "onSettingsChanged", [](const char* data) -> void {
            logger::info("Settings changed from UI");
        });

        RegisterEventSinks();

        KeyHandler::RegisterSink();
        KeyHandler* keyHandler = KeyHandler::GetSingleton();

        // F10 = 0x44 to toggle settings panel
        keyHandler->Register(0x44, KeyEventType::KEY_DOWN, []() {
            if (PrismaUI && view) {
                PrismaUI->Invoke(view, "toggleSettings()");
                auto hasFocus = PrismaUI->HasFocus(view);
                if (!hasFocus) {
                    PrismaUI->Focus(view);
                } else {
                    PrismaUI->Unfocus(view);
                }
            }
        });

        // F11 = 0x57 to toggle widget visibility
        keyHandler->Register(0x57, KeyEventType::KEY_DOWN, []() {
            if (PrismaUI && view) {
                static bool hidden = false;
                hidden = !hidden;
                if (hidden) {
                    PrismaUI->Hide(view);
                } else {
                    PrismaUI->Show(view);
                    SendStatsToView();
                }
            }
        });

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
