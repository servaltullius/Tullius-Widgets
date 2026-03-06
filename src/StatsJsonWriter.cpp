#include "StatsJsonWriter.h"
#include "JsonUtils.h"
#include <cmath>
#include <cstdio>
#include <string_view>

namespace TulliusWidgets::StatsCollectorInternal {

std::string StatsJsonWriter::Build(const StatsPayload& payload)
{
    json_.clear();
    json_.reserve(4096);
    json_ += '{';
    AppendMeta(payload);
    json_ += ',';
    AppendResistances(payload);
    json_ += ',';
    AppendDefense(payload);
    json_ += ',';
    AppendOffense(payload);
    json_ += ',';
    AppendCalcMeta(payload);
    json_ += ',';
    AppendEquipped(payload);
    json_ += ',';
    AppendMovement(payload);
    json_ += ',';
    AppendTime(payload.time);
    json_ += ',';
    AppendPlayerInfo(payload.playerInfo);
    json_ += ',';
    AppendAlertData(payload.alertData);
    json_ += ',';
    AppendTimedEffects(payload.timedEffects);
    json_ += ',';
    json_ += "\"isInCombat\":";
    AppendBool(payload.inCombat);
    json_ += '}';
    return json_;
}

void StatsJsonWriter::AppendFloat(float value)
{
    if (std::isnan(value) || std::isinf(value)) {
        json_ += '0';
        return;
    }

    char buf[32];
    std::snprintf(buf, sizeof(buf), "%.2f", value);
    json_ += buf;
}

void StatsJsonWriter::AppendInt(std::int32_t value)
{
    char buf[16];
    std::snprintf(buf, sizeof(buf), "%d", value);
    json_ += buf;
}

void StatsJsonWriter::AppendUInt(std::uint32_t value)
{
    char buf[16];
    std::snprintf(buf, sizeof(buf), "%u", value);
    json_ += buf;
}

void StatsJsonWriter::AppendBool(bool value)
{
    json_ += value ? "true" : "false";
}

void StatsJsonWriter::AppendEscapedString(std::string_view value)
{
    json_ += '"';
    json_ += JsonUtils::Escape(value);
    json_ += '"';
}

void StatsJsonWriter::AppendMeta(const StatsPayload& payload)
{
    json_ += "\"schemaVersion\":";
    AppendUInt(payload.schemaVersion);
    json_ += ',';
    json_ += "\"seq\":";
    AppendUInt(payload.sequence);
}

void StatsJsonWriter::AppendResistances(const StatsPayload& payload)
{
    json_ += "\"resistances\":{";
    json_ += "\"magic\":";
    AppendFloat(payload.resistances.magic.effective);
    json_ += ',';
    json_ += "\"fire\":";
    AppendFloat(payload.resistances.fire.effective);
    json_ += ',';
    json_ += "\"frost\":";
    AppendFloat(payload.resistances.frost.effective);
    json_ += ',';
    json_ += "\"shock\":";
    AppendFloat(payload.resistances.shock.effective);
    json_ += ',';
    json_ += "\"poison\":";
    AppendFloat(payload.resistances.poison.effective);
    json_ += ',';
    json_ += "\"disease\":";
    AppendFloat(payload.resistances.disease.effective);
    json_ += '}';
}

void StatsJsonWriter::AppendDefense(const StatsPayload& payload)
{
    json_ += "\"defense\":{";
    json_ += "\"armorRating\":";
    AppendFloat(payload.defense.armorRating);
    json_ += ',';
    json_ += "\"damageReduction\":";
    AppendFloat(payload.defense.effectiveDamageReduction);
    json_ += '}';
}

void StatsJsonWriter::AppendOffense(const StatsPayload& payload)
{
    json_ += "\"offense\":{";
    json_ += "\"rightHandDamage\":";
    AppendFloat(payload.offense.rightHandDamage);
    json_ += ',';
    json_ += "\"leftHandDamage\":";
    AppendFloat(payload.offense.leftHandDamage);
    json_ += ',';
    json_ += "\"critChance\":";
    AppendFloat(payload.offense.critChance.effective);
    json_ += '}';
}

void StatsJsonWriter::AppendCalcMeta(const StatsPayload& payload)
{
    json_ += "\"calcMeta\":{";
    json_ += "\"rawResistances\":{";
    json_ += "\"magic\":";
    AppendFloat(payload.resistances.magic.raw);
    json_ += ',';
    json_ += "\"fire\":";
    AppendFloat(payload.resistances.fire.raw);
    json_ += ',';
    json_ += "\"frost\":";
    AppendFloat(payload.resistances.frost.raw);
    json_ += ',';
    json_ += "\"shock\":";
    AppendFloat(payload.resistances.shock.raw);
    json_ += ',';
    json_ += "\"poison\":";
    AppendFloat(payload.resistances.poison.raw);
    json_ += ',';
    json_ += "\"disease\":";
    AppendFloat(payload.resistances.disease.raw);
    json_ += "},";
    json_ += "\"rawCritChance\":";
    AppendFloat(payload.offense.critChance.raw);
    json_ += ',';
    json_ += "\"rawDamageReduction\":";
    AppendFloat(payload.defense.rawDamageReduction);
    json_ += ',';
    json_ += "\"armorCapForMaxReduction\":";
    AppendFloat(kArmorRatingForMaxReduction);
    json_ += ',';
    json_ += "\"caps\":{";
    json_ += "\"elementalResist\":";
    AppendFloat(kElementalResistCap);
    json_ += ',';
    json_ += "\"elementalResistMin\":";
    AppendFloat(kElementalResistMin);
    json_ += ',';
    json_ += "\"diseaseResist\":";
    AppendFloat(kDiseaseResistCap);
    json_ += ',';
    json_ += "\"diseaseResistMin\":";
    AppendFloat(kDiseaseResistMin);
    json_ += ',';
    json_ += "\"critChance\":";
    AppendFloat(kCritChanceCap);
    json_ += ',';
    json_ += "\"damageReduction\":";
    AppendFloat(kDamageReductionCap);
    json_ += "},";
    json_ += "\"flags\":{";
    json_ += "\"anyResistanceClamped\":";
    AppendBool(payload.resistances.anyClamped);
    json_ += ',';
    json_ += "\"critChanceClamped\":";
    AppendBool(payload.offense.critChance.clamped);
    json_ += ',';
    json_ += "\"damageReductionClamped\":";
    AppendBool(payload.defense.damageReductionClamped);
    json_ += "}";
    json_ += '}';
}

void StatsJsonWriter::AppendEquipped(const StatsPayload& payload)
{
    json_ += "\"equipped\":{";
    json_ += "\"rightHand\":";
    AppendEscapedString(payload.equipped.rightHand);
    json_ += ',';
    json_ += "\"leftHand\":";
    AppendEscapedString(payload.equipped.leftHand);
    json_ += '}';
}

void StatsJsonWriter::AppendMovement(const StatsPayload& payload)
{
    json_ += "\"movement\":{";
    json_ += "\"speedMult\":";
    AppendFloat(payload.movement.speedMult);
    json_ += '}';
}

void StatsJsonWriter::AppendTime(const GameTimeEntry& time)
{
    json_ += "\"time\":{";
    json_ += "\"year\":";
    AppendUInt(time.year);
    json_ += ',';
    json_ += "\"month\":";
    AppendUInt(time.month);
    json_ += ',';
    json_ += "\"day\":";
    AppendUInt(time.day);
    json_ += ',';
    json_ += "\"hour\":";
    AppendUInt(time.hour);
    json_ += ',';
    json_ += "\"minute\":";
    AppendUInt(time.minute);
    json_ += ',';
    json_ += "\"monthName\":";
    AppendEscapedString(time.monthName);
    json_ += ',';
    json_ += "\"timeScale\":";
    AppendFloat(time.timeScale);
    json_ += '}';
}

void StatsJsonWriter::AppendPlayerInfo(const PlayerInfoSnapshot& playerInfo)
{
    json_ += "\"playerInfo\":{";
    json_ += "\"level\":";
    AppendInt(playerInfo.level);
    json_ += ',';
    json_ += "\"experience\":";
    AppendFloat(playerInfo.experience);
    json_ += ',';
    json_ += "\"expToNextLevel\":";
    AppendFloat(playerInfo.expToNextLevel);
    json_ += ',';
    json_ += "\"nextLevelTotalXp\":";
    AppendFloat(playerInfo.nextLevelTotalXp);
    json_ += ',';
    json_ += "\"expectedLevelThreshold\":";
    AppendFloat(playerInfo.expectedLevelThreshold);
    json_ += ',';
    json_ += "\"gold\":";
    AppendInt(playerInfo.gold);
    json_ += ',';
    json_ += "\"carryWeight\":";
    AppendFloat(playerInfo.carryWeight);
    json_ += ',';
    json_ += "\"maxCarryWeight\":";
    AppendFloat(playerInfo.maxCarryWeight);
    json_ += ',';
    json_ += "\"health\":";
    AppendFloat(playerInfo.health);
    json_ += ',';
    json_ += "\"magicka\":";
    AppendFloat(playerInfo.magicka);
    json_ += ',';
    json_ += "\"stamina\":";
    AppendFloat(playerInfo.stamina);
    json_ += '}';
}

void StatsJsonWriter::AppendAlertData(const AlertDataSnapshot& alertData)
{
    json_ += "\"alertData\":{";
    json_ += "\"healthPct\":";
    AppendFloat(alertData.healthPct);
    json_ += ',';
    json_ += "\"magickaPct\":";
    AppendFloat(alertData.magickaPct);
    json_ += ',';
    json_ += "\"staminaPct\":";
    AppendFloat(alertData.staminaPct);
    json_ += ',';
    json_ += "\"carryPct\":";
    AppendFloat(alertData.carryPct);
    json_ += '}';
}

void StatsJsonWriter::AppendTimedEffects(const std::vector<TimedEffectEntry>& timedEffects)
{
    json_ += "\"timedEffects\":[";
    for (std::size_t i = 0; i < timedEffects.size(); ++i) {
        const auto& effect = timedEffects[i];
        json_ += '{';
        json_ += "\"instanceId\":";
        AppendInt(effect.instanceId);
        json_ += ',';
        json_ += "\"sourceName\":";
        AppendEscapedString(effect.sourceName);
        json_ += ',';
        json_ += "\"effectName\":";
        AppendEscapedString(effect.effectName);
        json_ += ',';
        json_ += "\"remainingSec\":";
        AppendInt(effect.remainingSec);
        json_ += ',';
        json_ += "\"totalSec\":";
        AppendInt(effect.totalSec);
        json_ += ',';
        json_ += "\"isDebuff\":";
        AppendBool(effect.isDebuff);
        json_ += ',';
        json_ += "\"sourceFormId\":";
        AppendUInt(effect.sourceFormId);
        json_ += ',';
        json_ += "\"effectFormId\":";
        AppendUInt(effect.effectFormId);
        json_ += ',';
        json_ += "\"spellFormId\":";
        AppendUInt(effect.spellFormId);
        json_ += '}';
        if (i + 1 < timedEffects.size()) {
            json_ += ',';
        }
    }
    json_ += ']';
}

}  // namespace TulliusWidgets::StatsCollectorInternal
