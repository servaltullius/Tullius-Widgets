#pragma once

#include <string>

namespace TulliusWidgets {

class StatsCollector {
public:
    static std::string CollectStats();

private:
    static float GetResistance(RE::ActorValue av);
    static float GetArmorRating();
    static float CalculateDamageReduction(float armorRating);
    static float GetEffectiveCritChance();
    static int32_t GetGoldCount();
};

}  // namespace TulliusWidgets
