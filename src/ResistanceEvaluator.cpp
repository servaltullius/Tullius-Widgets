#include "ResistanceEvaluator.h"

#include <algorithm>
#include <cmath>

namespace TulliusWidgets {
namespace {

struct ResistanceLimits {
    float min;
    float max;
    bool shouldClamp;
};

ResistanceLimits GetLimits(RE::ActorValue av) {
    switch (av) {
    case RE::ActorValue::kResistMagic:
    case RE::ActorValue::kResistFire:
    case RE::ActorValue::kResistFrost:
    case RE::ActorValue::kResistShock:
    case RE::ActorValue::kPoisonResist:
    case RE::ActorValue::kResistDisease:
        return { 0.0f, 0.0f, false };
    default:
        return { 0.0f, 0.0f, false };
    }
}

}  // namespace

ResistanceEvaluation ResistanceEvaluator::Evaluate(RE::PlayerCharacter* player, RE::ActorValue av) {
    if (!player) {
        return ResistanceEvaluation{ 0.0f, 0.0f, 0.0f, 0.0f, false };
    }

    float raw = player->AsActorValueOwner()->GetActorValue(av);
    auto limits = GetLimits(av);
    if (!limits.shouldClamp) {
        return ResistanceEvaluation{ raw, raw, raw, raw, false };
    }

    float effective = std::clamp(raw, limits.min, limits.max);
    const bool clamped = std::abs(effective - raw) > 0.001f;
    return ResistanceEvaluation{ raw, effective, limits.min, limits.max, clamped };
}

float ResistanceEvaluator::GetEffectiveResistance(RE::PlayerCharacter* player, RE::ActorValue av) {
    return Evaluate(player, av).effective;
}

}  // namespace TulliusWidgets
