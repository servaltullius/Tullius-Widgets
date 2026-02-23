#pragma once

#include <string>

namespace TulliusWidgets {

enum class StatsPayloadMode {
    kFast,
    kFull
};

class StatsCollector {
public:
    static std::string CollectStats(StatsPayloadMode mode = StatsPayloadMode::kFull);

private:
    static float GetArmorRating();
    static float CalculateRawDamageReduction(float armorRating);
    static float CalculateDamageReduction(float armorRating);
    static int32_t GetGoldCount();
};

}  // namespace TulliusWidgets
