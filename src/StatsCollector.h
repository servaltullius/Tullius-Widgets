#pragma once

#include <string>

namespace TulliusWidgets {

class StatsCollector {
public:
    static std::string CollectStats();

private:
    static float GetArmorRating();
    static float CalculateRawDamageReduction(float armorRating);
    static float CalculateDamageReduction(float armorRating);
    static int32_t GetGoldCount();
};

}  // namespace TulliusWidgets
