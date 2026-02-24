#include "WidgetEvents.h"

#include <algorithm>
#include <array>
#include <string_view>

namespace TulliusWidgets::WidgetEvents {
namespace {

using namespace std::literals;

Callbacks g_callbacks{};

bool IsViewReady()
{
    return g_callbacks.isViewReady && g_callbacks.isViewReady();
}

bool IsGameLoaded()
{
    return g_callbacks.isGameLoaded && g_callbacks.isGameLoaded();
}

void SetGameLoaded(bool loaded)
{
    if (g_callbacks.setGameLoaded) {
        g_callbacks.setGameLoaded(loaded);
    }
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

void SendStats()
{
    if (g_callbacks.sendStats) {
        g_callbacks.sendStats();
    }
}

void SendStatsForced()
{
    if (g_callbacks.sendStatsForced) {
        g_callbacks.sendStatsForced();
    }
}

void ScheduleStatsUpdateAfter(std::chrono::milliseconds delay)
{
    if (g_callbacks.scheduleStatsUpdateAfter) {
        g_callbacks.scheduleStatsUpdateAfter(delay);
    }
}

class CombatEventSink : public RE::BSTEventSink<RE::TESCombatEvent> {
public:
    static CombatEventSink* GetSingleton()
    {
        static CombatEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(const RE::TESCombatEvent*, RE::BSTEventSource<RE::TESCombatEvent>*) override
    {
        SendStats();
        return RE::BSEventNotifyControl::kContinue;
    }
};

class EquipEventSink : public RE::BSTEventSink<RE::TESEquipEvent> {
public:
    static EquipEventSink* GetSingleton()
    {
        static EquipEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(const RE::TESEquipEvent* event, RE::BSTEventSource<RE::TESEquipEvent>*) override
    {
        if (!event) return RE::BSEventNotifyControl::kContinue;
        auto player = RE::PlayerCharacter::GetSingleton();
        auto* actor = event->actor.get();
        const bool isPlayerEvent =
            player && actor && (actor == player || actor->GetFormID() == RE::FormID(0x00000014));
        if (isPlayerEvent) {
            if (auto* taskInterface = SKSE::GetTaskInterface()) {
                taskInterface->AddTask([]() {
                    SendStatsForced();
                });
            } else {
                SendStatsForced();
            }
        }
        return RE::BSEventNotifyControl::kContinue;
    }
};

class ActiveEffectEventSink : public RE::BSTEventSink<RE::TESActiveEffectApplyRemoveEvent> {
public:
    static ActiveEffectEventSink* GetSingleton()
    {
        static ActiveEffectEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(
        const RE::TESActiveEffectApplyRemoveEvent* event,
        RE::BSTEventSource<RE::TESActiveEffectApplyRemoveEvent>*) override
    {
        if (!event) return RE::BSEventNotifyControl::kContinue;
        auto player = RE::PlayerCharacter::GetSingleton();
        if (player && event->target.get() == player) {
            SendStats();
        }
        return RE::BSEventNotifyControl::kContinue;
    }
};

static constexpr std::array<std::string_view, 18> kHiddenMenus = {
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
    RE::LevelUpMenu::MENU_NAME
};

bool ShouldHideForMenu(const RE::BSFixedString& menuName)
{
    for (const auto& name : kHiddenMenus) {
        if (menuName == name) return true;
    }
    return false;
}

bool IsAnyHiddenMenuOpen(RE::UI* ui)
{
    if (!ui) return false;
    return std::any_of(
        kHiddenMenus.begin(),
        kHiddenMenus.end(),
        [ui](const auto& name) { return ui->IsMenuOpen(name); });
}

class MenuEventSink : public RE::BSTEventSink<RE::MenuOpenCloseEvent> {
public:
    static MenuEventSink* GetSingleton()
    {
        static MenuEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(
        const RE::MenuOpenCloseEvent* event,
        RE::BSTEventSource<RE::MenuOpenCloseEvent>*) override
    {
        if (!event || !IsViewReady()) return RE::BSEventNotifyControl::kContinue;

        auto* ui = RE::UI::GetSingleton();
        const bool levelUpMenuClosed =
            !event->opening && event->menuName == RE::LevelUpMenu::MENU_NAME && IsGameLoaded();

        if (levelUpMenuClosed) {
            ScheduleStatsUpdateAfter(std::chrono::milliseconds(300));
        }

        if (event->menuName == RE::MainMenu::MENU_NAME && event->opening) {
            HideView();
            SetGameLoaded(false);
            return RE::BSEventNotifyControl::kContinue;
        }

        if (event->opening && (ShouldHideForMenu(event->menuName) || (ui && ui->GameIsPaused()))) {
            HideView();
        } else if (!event->opening && IsGameLoaded() && ui && !ui->GameIsPaused() && !IsAnyHiddenMenuOpen(ui)) {
            if (ShowView()) {
                SendStatsForced();
            }
        }

        return RE::BSEventNotifyControl::kContinue;
    }
};

}  // namespace

void RegisterEventSinks(const Callbacks& callbacks)
{
    g_callbacks = callbacks;

    auto* scriptEventSource = RE::ScriptEventSourceHolder::GetSingleton();
    if (scriptEventSource) {
        scriptEventSource->AddEventSink(CombatEventSink::GetSingleton());
        scriptEventSource->AddEventSink(EquipEventSink::GetSingleton());
        scriptEventSource->AddEventSink(ActiveEffectEventSink::GetSingleton());
        logger::info("Event sinks registered");
    }

    auto* ui = RE::UI::GetSingleton();
    if (ui) {
        ui->AddEventSink(MenuEventSink::GetSingleton());
        logger::info("Menu event sink registered");
    }
}

}  // namespace TulliusWidgets::WidgetEvents
