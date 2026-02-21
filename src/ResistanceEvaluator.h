#pragma once

namespace TulliusWidgets {

struct ResistanceEvaluation {
    float raw;
    float effective;
    float min;
    float cap;
    bool clamped;
};

class ResistanceEvaluator {
public:
    static ResistanceEvaluation Evaluate(RE::PlayerCharacter* player, RE::ActorValue av);
    static float GetEffectiveResistance(RE::PlayerCharacter* player, RE::ActorValue av);
};

}  // namespace TulliusWidgets
