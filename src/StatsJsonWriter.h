#pragma once

#include "StatsPayload.h"
#include <string>
#include <string_view>

namespace TulliusWidgets::StatsCollectorInternal {

class StatsJsonWriter {
public:
    std::string Build(const StatsPayload& payload);

private:
    void AppendFloat(float value);
    void AppendInt(std::int32_t value);
    void AppendUInt(std::uint32_t value);
    void AppendBool(bool value);
    void AppendEscapedString(std::string_view value);
    void AppendMeta(const StatsPayload& payload);
    void AppendResistances(const StatsPayload& payload);
    void AppendDefense(const StatsPayload& payload);
    void AppendOffense(const StatsPayload& payload);
    void AppendCalcMeta(const StatsPayload& payload);
    void AppendEquipped(const StatsPayload& payload);
    void AppendMovement(const StatsPayload& payload);
    void AppendTime(const GameTimeEntry& time);
    void AppendPlayerInfo(const PlayerInfoSnapshot& playerInfo);
    void AppendAlertData(const AlertDataSnapshot& alertData);
    void AppendTimedEffects(const std::vector<TimedEffectEntry>& timedEffects);

    std::string json_{};
};

}  // namespace TulliusWidgets::StatsCollectorInternal
