#pragma once

#include "CriticalChanceEvaluator.h"
#include "ResistanceEvaluator.h"
#include <cstdint>
#include <string>
#include <vector>

namespace RE {
class PlayerCharacter;
}

namespace TulliusWidgets::StatsCollectorInternal {

inline constexpr float kDisplayedDamageMin = 0.0f;
inline constexpr float kDisplayedDamageMax = 9999.0f;
inline constexpr float kElementalResistCap = 85.0f;
inline constexpr float kElementalResistMin = -100.0f;
inline constexpr float kDiseaseResistCap = 100.0f;
inline constexpr float kDiseaseResistMin = 0.0f;
inline constexpr float kCritChanceCap = 100.0f;
inline constexpr float kDamageReductionCap = 80.0f;
inline constexpr float kArmorRatingMultiplier = 0.12f;
inline constexpr float kArmorRatingForMaxReduction = 666.67f;
inline constexpr std::uint32_t kStatsSchemaVersion = 1;

struct TimedEffectEntry {
    std::int32_t instanceId;
    std::string sourceName;
    std::string effectName;
    std::int32_t remainingSec;
    std::int32_t totalSec;
    bool isDebuff;
    std::uint32_t sourceFormId;
    std::uint32_t effectFormId;
    std::uint32_t spellFormId;
};

struct GameTimeEntry {
    std::uint32_t year{0};
    std::uint32_t month{0};
    std::uint32_t day{0};
    std::uint32_t hour{0};
    std::uint32_t minute{0};
    float timeScale{0.0f};
    std::string monthName{};
};

struct ResistanceSnapshot {
    ResistanceEvaluation magic{0.0f, 0.0f, 0.0f, 0.0f, false};
    ResistanceEvaluation fire{0.0f, 0.0f, 0.0f, 0.0f, false};
    ResistanceEvaluation frost{0.0f, 0.0f, 0.0f, 0.0f, false};
    ResistanceEvaluation shock{0.0f, 0.0f, 0.0f, 0.0f, false};
    ResistanceEvaluation poison{0.0f, 0.0f, 0.0f, 0.0f, false};
    ResistanceEvaluation disease{0.0f, 0.0f, 0.0f, 0.0f, false};
    bool anyClamped{false};
};

struct DefenseSnapshot {
    float armorRating{0.0f};
    float rawDamageReduction{0.0f};
    float effectiveDamageReduction{0.0f};
    bool damageReductionClamped{false};
};

struct OffenseSnapshot {
    float rightHandDamage{0.0f};
    float leftHandDamage{0.0f};
    CritChanceEvaluation critChance{0.0f, 0.0f, kCritChanceCap, false};
};

struct EquippedSnapshot {
    std::string rightHand{};
    std::string leftHand{};
};

struct MovementSnapshot {
    float speedMult{0.0f};
};

struct PlayerInfoSnapshot {
    std::int32_t level{1};
    float experience{0.0f};
    float expToNextLevel{0.0f};
    float nextLevelTotalXp{0.0f};
    float expectedLevelThreshold{0.0f};
    std::int32_t gold{0};
    float carryWeight{0.0f};
    float maxCarryWeight{0.0f};
    float health{0.0f};
    float magicka{0.0f};
    float stamina{0.0f};
};

struct AlertDataSnapshot {
    float healthPct{100.0f};
    float magickaPct{100.0f};
    float staminaPct{100.0f};
    float carryPct{0.0f};
};

struct PlayerStateSnapshot {
    PlayerInfoSnapshot playerInfo{};
    AlertDataSnapshot alertData{};
};

struct StatsPayload {
    std::uint32_t schemaVersion{kStatsSchemaVersion};
    std::uint32_t sequence{0};
    ResistanceSnapshot resistances{};
    DefenseSnapshot defense{};
    OffenseSnapshot offense{};
    EquippedSnapshot equipped{};
    MovementSnapshot movement{};
    GameTimeEntry time{};
    PlayerInfoSnapshot playerInfo{};
    AlertDataSnapshot alertData{};
    std::vector<TimedEffectEntry> timedEffects{};
    bool inCombat{false};
};

StatsPayload CollectStatsPayload(RE::PlayerCharacter* player);

}  // namespace TulliusWidgets::StatsCollectorInternal
