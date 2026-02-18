#include "CriticalChanceEvaluator.h"

#include <algorithm>

namespace TulliusWidgets {
namespace {

RE::TESObjectWEAP* SelectActiveWeapon(RE::PlayerCharacter* player) {
    if (!player) return nullptr;

    if (auto* attacking = player->GetAttackingWeapon()) {
        if (auto* object = attacking->GetObject()) {
            if (auto* weapon = object->As<RE::TESObjectWEAP>()) {
                return weapon;
            }
        }
    }

    if (auto* right = player->GetEquippedObject(false)) {
        if (auto* weapon = right->As<RE::TESObjectWEAP>()) {
            return weapon;
        }
    }

    if (auto* left = player->GetEquippedObject(true)) {
        if (auto* weapon = left->As<RE::TESObjectWEAP>()) {
            return weapon;
        }
    }

    return nullptr;
}

RE::Actor* SelectCurrentTarget(RE::PlayerCharacter* player) {
    if (!player) return nullptr;

    auto handle = player->GetActorRuntimeData().currentCombatTarget;
    if (!handle) return nullptr;

    auto targetPtr = handle.get();
    return targetPtr ? targetPtr.get() : nullptr;
}

}  // namespace

float CriticalChanceEvaluator::GetEffectiveCritChance(RE::PlayerCharacter* player) {
    if (!player) return 0.0f;

    float critChance = player->AsActorValueOwner()->GetActorValue(RE::ActorValue::kCriticalChance);
    auto* weapon = SelectActiveWeapon(player);
    if (!weapon) return std::clamp(critChance, 0.0f, 100.0f);

    auto* target = SelectCurrentTarget(player);

    // Let the game evaluate all perk entry points (priority/order/conditions) exactly as runtime does.
    RE::BGSEntryPoint::HandleEntryPoint(
        RE::BGSEntryPoint::ENTRY_POINT::kCalculateMyCriticalHitChance,
        player,
        weapon,
        target,
        std::addressof(critChance));

    return std::clamp(critChance, 0.0f, 100.0f);
}

}  // namespace TulliusWidgets
