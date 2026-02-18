#pragma once

namespace TulliusWidgets {

class ResistanceEvaluator {
public:
    static float GetEffectiveResistance(RE::PlayerCharacter* player, RE::ActorValue av);
};

}  // namespace TulliusWidgets
