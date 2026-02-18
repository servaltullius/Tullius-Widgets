#include "ResistanceEvaluator.h"

#include <algorithm>

namespace TulliusWidgets {

float ResistanceEvaluator::GetEffectiveResistance(RE::PlayerCharacter* player, RE::ActorValue av) {
    if (!player) return 0.0f;

    float raw = player->AsActorValueOwner()->GetActorValue(av);

    switch (av) {
    case RE::ActorValue::kResistMagic:
    case RE::ActorValue::kResistFire:
    case RE::ActorValue::kResistFrost:
    case RE::ActorValue::kResistShock:
    case RE::ActorValue::kPoisonResist:
        return std::clamp(raw, -100.0f, 85.0f);
    case RE::ActorValue::kResistDisease:
        return std::clamp(raw, 0.0f, 100.0f);
    default:
        return raw;
    }
}

}  // namespace TulliusWidgets
