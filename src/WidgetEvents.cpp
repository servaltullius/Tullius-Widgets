#include "WidgetEvents.h"
#include "WidgetVisibilityState.h"

#include <algorithm>

namespace TulliusWidgets::WidgetEvents {
namespace {

using namespace std::literals;

Callbacks g_callbacks{};

bool IsPlayerReference(const RE::TESObjectREFR* ref)
{
    auto* player = RE::PlayerCharacter::GetSingleton();
    return player && ref && (ref == player || ref->GetFormID() == RE::FormID(0x00000014));
}

bool IsViewReady()
{
    return g_callbacks.isViewReady && g_callbacks.isViewReady();
}

bool IsGameLoaded()
{
    return g_callbacks.isGameLoaded && g_callbacks.isGameLoaded();
}

bool HasViewFocus()
{
    return g_callbacks.hasViewFocus && g_callbacks.hasViewFocus();
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

    RE::BSEventNotifyControl ProcessEvent(const RE::TESCombatEvent* event, RE::BSTEventSource<RE::TESCombatEvent>*) override
    {
        if (!event) return RE::BSEventNotifyControl::kContinue;

        auto* actor = event->actor.get();
        auto* target = event->targetActor.get();
        if (IsPlayerReference(actor) || IsPlayerReference(target)) {
            SendStats();
        }
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
        auto* actor = event->actor.get();
        if (IsPlayerReference(actor)) {
            if (auto* taskInterface = SKSE::GetTaskInterface()) {
                taskInterface->AddTask([]() {
                    SendStatsForced();
                });
            } else {
                SendStatsForced();
            }
            // Follow-up: equipment slot data may lag behind the event by
            // several frames, so schedule a second collection to catch the
            // final state without waiting for the 2-second heartbeat.
            ScheduleStatsUpdateAfter(std::chrono::milliseconds(200));
        }
        return RE::BSEventNotifyControl::kContinue;
    }
};

class QuestStageEventSink : public RE::BSTEventSink<RE::TESQuestStageEvent> {
public:
    static QuestStageEventSink* GetSingleton()
    {
        static QuestStageEventSink singleton;
        return &singleton;
    }

    RE::BSEventNotifyControl ProcessEvent(
        const RE::TESQuestStageEvent*,
        RE::BSTEventSource<RE::TESQuestStageEvent>*) override
    {
        // Quest stage change often awards XP; the reward may be applied
        // in the same frame or deferred, so schedule a follow-up.
        SendStatsForced();
        ScheduleStatsUpdateAfter(std::chrono::milliseconds(500));
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
        if (!event) return RE::BSEventNotifyControl::kContinue;

        WidgetVisibilityState::NoteMenuOpenClose(event->menuName, event->opening);

        if (!IsViewReady()) return RE::BSEventNotifyControl::kContinue;

        auto* ui = RE::UI::GetSingleton();
        const bool levelUpMenuClosed =
            !event->opening && event->menuName == RE::LevelUpMenu::MENU_NAME && IsGameLoaded();

        if (levelUpMenuClosed) {
            ScheduleStatsUpdateAfter(std::chrono::milliseconds(300));
        }

        if (event->menuName == RE::MainMenu::MENU_NAME && event->opening) {
            WidgetVisibilityState::Reset();
            HideView();
            SetGameLoaded(false);
            return RE::BSEventNotifyControl::kContinue;
        }

        if (event->opening && (WidgetVisibilityState::ShouldHideForMenu(event->menuName)
                               || WidgetVisibilityState::IsBlockingUiState(ui, HasViewFocus()))) {
            HideView();
        } else if (!event->opening
                   && IsGameLoaded()
                   && ui
                   && !WidgetVisibilityState::IsBlockingUiState(ui, HasViewFocus())) {
            if (ShowView()) {
                SendStatsForced();
                ScheduleStatsUpdateAfter(std::chrono::milliseconds(500));
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
        scriptEventSource->AddEventSink(QuestStageEventSink::GetSingleton());
        logger::info("Event sinks registered");
    }

    auto* ui = RE::UI::GetSingleton();
    if (ui) {
        ui->AddEventSink(MenuEventSink::GetSingleton());
        logger::info("Menu event sink registered");
    }
}

}  // namespace TulliusWidgets::WidgetEvents
