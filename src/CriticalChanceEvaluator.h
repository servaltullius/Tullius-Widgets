#pragma once

namespace TulliusWidgets {

struct CritChanceEvaluation {
    float raw;
    float effective;
    float cap;
    bool clamped;
};

class CriticalChanceEvaluator {
public:
    static CritChanceEvaluation Evaluate(RE::PlayerCharacter* player);
    static float GetEffectiveCritChance(RE::PlayerCharacter* player);
};

}  // namespace TulliusWidgets
