#include "CriticalChanceEvaluator.h"

#include <algorithm>
#include <cmath>
#include <windows.h>

namespace TulliusWidgets {
namespace {
static constexpr float kCritChanceMin = 0.0f;
static constexpr float kCritChanceCap = 100.0f;

// SEH and C++ EH cannot coexist in the same function (MSVC restriction).
// Isolate the potentially crashing HandleEntryPoint call in its own function.
static bool TryHandleEntryPoint_SEH(
    RE::PlayerCharacter* player,
    RE::TESObjectWEAP* weapon,
    RE::Actor* evalTarget,
    float* critChance)
{
    __try {
        RE::BGSEntryPoint::HandleEntryPoint(
            RE::BGSEntryPoint::ENTRY_POINT::kCalculateMyCriticalHitChance,
            player,
            weapon,
            evalTarget,
            critChance);
        return true;
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        logger::error("SEH exception in BGSEntryPoint::HandleEntryPoint (critChance)");
        return false;
    }
}

RE::TESObjectWEAP* SelectActiveWeapon(RE::PlayerCharacter* player) {
    if (!player) return nullptr;

    if (auto* attacking = player->GetAttackingWeapon()) {
        if (auto* object = attacking->object) {
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

CritChanceEvaluation CriticalChanceEvaluator::Evaluate(RE::PlayerCharacter* player) {
    if (!player) {
        return CritChanceEvaluation{ 0.0f, 0.0f, kCritChanceCap, false };
    }

    float critChance = player->AsActorValueOwner()->GetActorValue(RE::ActorValue::kCriticalChance);
    if (!std::isfinite(critChance)) critChance = 0.0f;

    auto* weapon = SelectActiveWeapon(player);
    if (!weapon) {
        const float effective = std::clamp(critChance, kCritChanceMin, kCritChanceCap);
        return CritChanceEvaluation{
            critChance,
            effective,
            kCritChanceCap,
            std::abs(effective - critChance) > 0.001f
        };
    }

    auto* target = SelectCurrentTarget(player);
    RE::Actor* evalTarget = target ? target : static_cast<RE::Actor*>(player);

    if (!TryHandleEntryPoint_SEH(player, weapon, evalTarget, std::addressof(critChance))) {
        critChance = 0.0f;
    }

    if (!std::isfinite(critChance)) critChance = 0.0f;
    const float effective = std::clamp(critChance, kCritChanceMin, kCritChanceCap);
    return CritChanceEvaluation{
        critChance,
        effective,
        kCritChanceCap,
        std::abs(effective - critChance) > 0.001f
    };
}

float CriticalChanceEvaluator::GetEffectiveCritChance(RE::PlayerCharacter* player) {
    return Evaluate(player).effective;
}

}  // namespace TulliusWidgets
