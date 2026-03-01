#include "StatsCollector.h"
#include "CriticalChanceEvaluator.h"
#include "JsonUtils.h"
#include "ResistanceEvaluator.h"
#include "RE/C/Calendar.h"
#include <algorithm>
#include <atomic>
#include <cstdint>
#include <cmath>
#include <cstdio>
#include <string_view>
#include <utility>
#include <vector>

namespace TulliusWidgets {

static constexpr float kDisplayedDamageMin = 0.0f;
static constexpr float kDisplayedDamageMax = 9999.0f;
static constexpr float kElementalResistCap = 85.0f;
static constexpr float kElementalResistMin = -100.0f;
static constexpr float kDiseaseResistCap = 100.0f;
static constexpr float kDiseaseResistMin = 0.0f;
static constexpr float kCritChanceCap = 100.0f;
static constexpr float kDamageReductionCap = 80.0f;
static constexpr float kArmorRatingMultiplier = 0.12f;
static constexpr float kArmorRatingForMaxReduction = 666.67f;
static constexpr std::uint32_t kStatsSchemaVersion = 1;
std::atomic<std::uint32_t> gStatsPayloadSequence{0};

// Level-up XP correction: game engine may not reset xp/levelThreshold immediately
// after AdvanceLevel(). Track level changes and compute correct values until the
// game data refreshes.
struct LevelUpXpCorrection {
    std::int32_t lastLevel{0};
    float staleXp{-1.0f};           // rawXp snapshot when staleness detected (-1 = inactive)
    float staleThreshold{-1.0f};
    float correctedXp{0.0f};
    float correctedThreshold{0.0f};
};
static LevelUpXpCorrection s_levelUpXp;

static float ComputeLevelThreshold(std::int32_t level) {
    // Skyrim formula: fXPLevelUpBase + fXPLevelUpMult * level
    float base = 75.0f;
    float mult = 25.0f;
    auto* gs = RE::GameSettingCollection::GetSingleton();
    if (gs) {
        if (auto* s = gs->GetSetting("fXPLevelUpBase")) base = s->data.f;
        if (auto* s = gs->GetSetting("fXPLevelUpMult")) mult = s->data.f;
    }
    return base + mult * static_cast<float>(level);
}

static RE::TESForm* getEquippedForm(RE::PlayerCharacter* player, bool leftHand) {
    if (!player) return nullptr;

    if (auto* equipped = player->GetEquippedObject(leftHand)) {
        return equipped;
    }

    if (auto* entry = player->GetEquippedEntryData(leftHand)) {
        if (auto* object = entry->object) {
            return object;
        }
    }

    // Some setups report shields only as worn armor, not as left-hand object.
    if (leftHand) {
        if (auto* shield = player->GetWornArmor(RE::BGSBipedObjectForm::BipedObjectSlot::kShield, false)) {
            return shield;
        }
    }

    return nullptr;
}

static std::string getEquippedName(RE::PlayerCharacter* player, bool leftHand) {
    if (!player) return "";
    if (auto* entry = player->GetEquippedEntryData(leftHand)) {
        if (const char* displayName = entry->GetDisplayName(); displayName && displayName[0] != '\0') {
            return displayName;
        }
        if (auto* object = entry->object) {
            if (const char* objectName = object->GetName(); objectName && objectName[0] != '\0') {
                return objectName;
            }
        }
    }

    auto* equipped = getEquippedForm(player, leftHand);
    if (!equipped) return "";

    if (const auto* weapon = equipped->As<RE::TESObjectWEAP>()) {
        const char* name = weapon->GetName();
        return name ? name : "";
    }
    if (const auto* spell = equipped->As<RE::SpellItem>()) {
        const char* name = spell->GetName();
        return name ? name : "";
    }
    if (const auto* scroll = equipped->As<RE::ScrollItem>()) {
        const char* name = scroll->GetName();
        return name ? name : "";
    }
    if (const auto* armor = equipped->As<RE::TESObjectARMO>()) {
        const char* name = armor->GetName();
        return name ? name : "";
    }
    const char* name = equipped->GetName();
    return name ? name : "";
}

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

static bool shouldDisplayActiveEffect(const RE::ActiveEffect* effect) {
    if (!effect) return false;
    if (effect->flags.all(RE::ActiveEffect::Flag::kInactive)) return false;
    if (effect->flags.all(RE::ActiveEffect::Flag::kDispelled)) return false;

    const auto* baseEffect = effect->GetBaseObject();
    if (!baseEffect) return false;
    if (baseEffect->data.flags.all(RE::EffectSetting::EffectSettingData::Flag::kHideInUI)) return false;
    if (baseEffect->data.flags.all(RE::EffectSetting::EffectSettingData::Flag::kNoDuration)) return false;

    if (!std::isfinite(effect->duration) || effect->duration <= 0.0f) return false;
    if (!std::isfinite(effect->elapsedSeconds)) return false;
    return true;
}

static std::string getFormName(const RE::TESForm* form) {
    if (!form) return "";
    const char* name = form->GetName();
    if (name && name[0] != '\0') {
        return name;
    }
    return "";
}

static std::uint32_t getFormId(const RE::TESForm* form) {
    return form ? static_cast<std::uint32_t>(form->GetFormID()) : 0u;
}

static std::string getTimedEffectName(const RE::ActiveEffect* effect) {
    if (!effect) return "";

    if (const auto* baseEffect = effect->GetBaseObject()) {
        if (const char* fullName = baseEffect->GetFullName(); fullName && fullName[0] != '\0') {
            return fullName;
        }
        if (const char* name = baseEffect->GetName(); name && name[0] != '\0') {
            return name;
        }
    }

    if (effect->spell) {
        auto spellName = getFormName(effect->spell);
        if (!spellName.empty()) {
            return spellName;
        }
    }

    return "";
}

static std::string getTimedEffectSourceName(const RE::ActiveEffect* effect, std::string_view effectName) {
    if (!effect) return "";

    if (effect->spell) {
        auto spellName = getFormName(effect->spell);
        if (!spellName.empty()) {
            return spellName;
        }
    }

    if (effect->source) {
        auto sourceName = getFormName(effect->source);
        if (!sourceName.empty()) {
            if (sourceName != effectName) {
                return sourceName;
            }
        }
    }

    return "";
}

static std::vector<TimedEffectEntry> collectTimedEffects(RE::PlayerCharacter* player) {
    std::vector<TimedEffectEntry> out;
    if (!player) return out;

    // Actor has runtime-dependent base offsets (SE/AE), so always cast through accessor.
    auto* magicTarget = player->AsMagicTarget();
    if (!magicTarget) return out;

    // During save/load transitions, active effect data can be unstable. Skip this frame.
    auto* ui = RE::UI::GetSingleton();
    if (!ui || ui->GameIsPaused()) return out;

    auto* activeEffects = magicTarget->GetActiveEffectList();
    if (!activeEffects) return out;

    for (auto* effect : *activeEffects) {
        if (!shouldDisplayActiveEffect(effect)) {
            continue;
        }

        const float remaining = effect->duration - effect->elapsedSeconds;
        if (!std::isfinite(remaining) || remaining <= 0.1f) {
            continue;
        }

        auto effectName = getTimedEffectName(effect);
        auto sourceName = getTimedEffectSourceName(effect, effectName);
        if (sourceName.empty() && effectName.empty()) {
            continue;
        }
        if (sourceName.empty()) sourceName = effectName;
        if (effectName.empty()) effectName = sourceName;

        const auto* baseEffect = effect->GetBaseObject();
        const bool isDebuff = baseEffect && (baseEffect->IsDetrimental() || baseEffect->IsHostile());
        const auto remainingSec = static_cast<std::int32_t>(std::ceil((std::max)(remaining, 0.0f)));
        const auto totalSec = static_cast<std::int32_t>(std::ceil((std::max)(effect->duration, 0.0f)));
        const auto instanceId = static_cast<std::int32_t>(effect->usUniqueID);
        const auto sourceFormId = getFormId(effect->source);
        const auto effectFormId = getFormId(baseEffect);
        const auto spellFormId = getFormId(effect->spell);
        out.push_back(TimedEffectEntry{
            instanceId,
            std::move(sourceName),
            std::move(effectName),
            remainingSec,
            totalSec,
            isDebuff,
            sourceFormId,
            effectFormId,
            spellFormId
        });
    }

    std::sort(out.begin(), out.end(), [](const TimedEffectEntry& a, const TimedEffectEntry& b) {
        if (a.remainingSec != b.remainingSec) return a.remainingSec < b.remainingSec;
        if (a.isDebuff != b.isDebuff) return a.isDebuff && !b.isDebuff;
        if (a.sourceName != b.sourceName) return a.sourceName < b.sourceName;
        if (a.effectName != b.effectName) return a.effectName < b.effectName;
        if (a.effectFormId != b.effectFormId) return a.effectFormId < b.effectFormId;
        if (a.sourceFormId != b.sourceFormId) return a.sourceFormId < b.sourceFormId;
        if (a.spellFormId != b.spellFormId) return a.spellFormId < b.spellFormId;
        return a.instanceId < b.instanceId;
    });

    return out;
}

struct GameTimeEntry {
    std::uint32_t year;
    std::uint32_t month;
    std::uint32_t day;
    std::uint32_t hour;
    std::uint32_t minute;
    float timeScale;
    std::string monthName;
};

static GameTimeEntry collectGameTime() {
    GameTimeEntry out{
        201,
        static_cast<std::uint32_t>(RE::Calendar::Month::kMorningStar),
        1,
        12,
        0,
        20.0f,
        "Morning Star"
    };

    auto* calendar = RE::Calendar::GetSingleton();
    if (!calendar) return out;

    out.year = (std::max)(calendar->GetYear(), 1u);
    out.month = (std::min)(calendar->GetMonth(), static_cast<std::uint32_t>(RE::Calendar::Month::kEveningStar));
    out.monthName = calendar->GetMonthName();
    if (out.monthName.empty()) {
        out.monthName = "Unknown";
    }

    const auto rawDay = static_cast<int>(std::lround(calendar->GetDay()));
    out.day = static_cast<std::uint32_t>(std::clamp(rawDay, 1, 31));

    const float rawHour = calendar->GetHour();
    if (std::isfinite(rawHour)) {
        const float hourFloor = std::floor(rawHour);
        const auto hour = static_cast<int>(hourFloor);
        out.hour = static_cast<std::uint32_t>(std::clamp(hour, 0, 23));
        out.minute = (std::min)(calendar->GetMinutes(), 59u);
    } else {
        out.hour = 12;
        out.minute = 0;
    }

    if (calendar->timeScale) {
        const float rawTimeScale = calendar->timeScale->value;
        if (std::isfinite(rawTimeScale) && rawTimeScale >= 0.0f) {
            out.timeScale = rawTimeScale;
        }
    }

    return out;
}

static std::string safeFloat(float v) {
    if (std::isnan(v) || std::isinf(v)) return "0";
    char buf[32];
    std::snprintf(buf, sizeof(buf), "%.2f", v);
    return buf;
}

// In-place append variants to avoid temporary std::string allocations.
static void appendFloat(std::string& out, float v) {
    if (std::isnan(v) || std::isinf(v)) { out += '0'; return; }
    char buf[32];
    std::snprintf(buf, sizeof(buf), "%.2f", v);
    out += buf;
}

static void appendInt(std::string& out, std::int32_t v) {
    char buf[16];
    std::snprintf(buf, sizeof(buf), "%d", v);
    out += buf;
}

static void appendUInt(std::string& out, std::uint32_t v) {
    char buf[16];
    std::snprintf(buf, sizeof(buf), "%u", v);
    out += buf;
}

static void appendBool(std::string& out, bool v) {
    out += v ? "true" : "false";
}

static void appendEscapedString(std::string& out, std::string_view s) {
    out += '"';
    out += JsonUtils::Escape(std::string(s));
    out += '"';
}

float StatsCollector::GetArmorRating() {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return 0.0f;
    return player->AsActorValueOwner()->GetActorValue(RE::ActorValue::kDamageResist);
}

float StatsCollector::CalculateRawDamageReduction(float armorRating) {
    return armorRating * kArmorRatingMultiplier;
}

float StatsCollector::CalculateDamageReduction(float armorRating) {
    // Skyrim formula: displayed_armor_rating * 0.12, capped at 80%
    float reduction = CalculateRawDamageReduction(armorRating);
    return (std::min)(reduction, kDamageReductionCap);
}

int32_t StatsCollector::GetGoldCount() {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return 0;
    auto gold = RE::TESForm::LookupByID<RE::TESBoundObject>(0x0000000F);
    if (!gold) return 0;
    return player->GetItemCount(gold);
}

std::string StatsCollector::CollectStats() {
  try {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return "{}";

    auto av = player->AsActorValueOwner();
    float armorRating = GetArmorRating();
    float rawDamageReduction = CalculateRawDamageReduction(armorRating);
    float effectiveDamageReduction = CalculateDamageReduction(armorRating);
    bool inCombat = player->IsInCombat();

    const auto resistMagic = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kResistMagic);
    const auto resistFire = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kResistFire);
    const auto resistFrost = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kResistFrost);
    const auto resistShock = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kResistShock);
    const auto resistPoison = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kPoisonResist);
    const auto resistDisease = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kResistDisease);
    const auto critChance = CriticalChanceEvaluator::Evaluate(player);

    std::string json;
    json.reserve(4096);
    json += '{';
    json += "\"schemaVersion\":";
    appendUInt(json, kStatsSchemaVersion);
    json += ',';
    json += "\"seq\":";
    appendUInt(json, gStatsPayloadSequence.fetch_add(1, std::memory_order_relaxed) + 1);
    json += ',';

    json += "\"resistances\":{";
    json += "\"magic\":"; appendFloat(json, resistMagic.effective); json += ',';
    json += "\"fire\":"; appendFloat(json, resistFire.effective); json += ',';
    json += "\"frost\":"; appendFloat(json, resistFrost.effective); json += ',';
    json += "\"shock\":"; appendFloat(json, resistShock.effective); json += ',';
    json += "\"poison\":"; appendFloat(json, resistPoison.effective); json += ',';
    json += "\"disease\":"; appendFloat(json, resistDisease.effective);
    json += "},";

    json += "\"defense\":{";
    json += "\"armorRating\":"; appendFloat(json, armorRating); json += ',';
    json += "\"damageReduction\":"; appendFloat(json, effectiveDamageReduction);
    json += "},";

    float rightDmg = 0.0f;
    float leftDmg = 0.0f;

    if (auto* entry = player->GetEquippedEntryData(false)) {
        if (entry->object && entry->object->As<RE::TESObjectWEAP>()) {
            rightDmg = player->GetDamage(entry);
        }
    }
    if (auto* entry = player->GetEquippedEntryData(true)) {
        if (entry->object && entry->object->As<RE::TESObjectWEAP>()) {
            leftDmg = player->GetDamage(entry);
        }
    }
    rightDmg = std::clamp(rightDmg, kDisplayedDamageMin, kDisplayedDamageMax);
    leftDmg = std::clamp(leftDmg, kDisplayedDamageMin, kDisplayedDamageMax);

    json += "\"offense\":{";
    json += "\"rightHandDamage\":"; appendFloat(json, rightDmg); json += ',';
    json += "\"leftHandDamage\":"; appendFloat(json, leftDmg); json += ',';
    json += "\"critChance\":"; appendFloat(json, critChance.effective);
    json += "},";

    const bool anyResistanceClamped =
        resistMagic.clamped || resistFire.clamped || resistFrost.clamped ||
        resistShock.clamped || resistPoison.clamped || resistDisease.clamped;
    const bool damageReductionClamped = rawDamageReduction > kDamageReductionCap + 0.001f;

    json += "\"calcMeta\":{";
    json += "\"rawResistances\":{";
    json += "\"magic\":"; appendFloat(json, resistMagic.raw); json += ',';
    json += "\"fire\":"; appendFloat(json, resistFire.raw); json += ',';
    json += "\"frost\":"; appendFloat(json, resistFrost.raw); json += ',';
    json += "\"shock\":"; appendFloat(json, resistShock.raw); json += ',';
    json += "\"poison\":"; appendFloat(json, resistPoison.raw); json += ',';
    json += "\"disease\":"; appendFloat(json, resistDisease.raw);
    json += "},";
    json += "\"rawCritChance\":"; appendFloat(json, critChance.raw); json += ',';
    json += "\"rawDamageReduction\":"; appendFloat(json, rawDamageReduction); json += ',';
    json += "\"armorCapForMaxReduction\":"; appendFloat(json, kArmorRatingForMaxReduction); json += ',';
    json += "\"caps\":{";
    json += "\"elementalResist\":"; appendFloat(json, kElementalResistCap); json += ',';
    json += "\"elementalResistMin\":"; appendFloat(json, kElementalResistMin); json += ',';
    json += "\"diseaseResist\":"; appendFloat(json, kDiseaseResistCap); json += ',';
    json += "\"diseaseResistMin\":"; appendFloat(json, kDiseaseResistMin); json += ',';
    json += "\"critChance\":"; appendFloat(json, kCritChanceCap); json += ',';
    json += "\"damageReduction\":"; appendFloat(json, kDamageReductionCap);
    json += "},";
    json += "\"flags\":{";
    json += "\"anyResistanceClamped\":"; appendBool(json, anyResistanceClamped); json += ',';
    json += "\"critChanceClamped\":"; appendBool(json, critChance.clamped); json += ',';
    json += "\"damageReductionClamped\":"; appendBool(json, damageReductionClamped);
    json += "}";
    json += "},";

    const auto rightEquipped = getEquippedName(player, false);
    const auto leftEquipped = getEquippedName(player, true);
    json += "\"equipped\":{";
    json += "\"rightHand\":"; appendEscapedString(json, rightEquipped); json += ',';
    json += "\"leftHand\":"; appendEscapedString(json, leftEquipped);
    json += "},";

    json += "\"movement\":{";
    json += "\"speedMult\":"; appendFloat(json, av->GetActorValue(RE::ActorValue::kSpeedMult));
    json += "},";

    const auto gameTime = collectGameTime();
    json += "\"time\":{";
    json += "\"year\":"; appendUInt(json, gameTime.year); json += ',';
    json += "\"month\":"; appendUInt(json, gameTime.month); json += ',';
    json += "\"day\":"; appendUInt(json, gameTime.day); json += ',';
    json += "\"hour\":"; appendUInt(json, gameTime.hour); json += ',';
    json += "\"minute\":"; appendUInt(json, gameTime.minute); json += ',';
    json += "\"monthName\":"; appendEscapedString(json, gameTime.monthName); json += ',';
    json += "\"timeScale\":"; appendFloat(json, gameTime.timeScale);
    json += "},";

    // Current values: base + damage modifier (damage modifier is negative)
    float maxHP = av->GetActorValue(RE::ActorValue::kHealth);
    float maxMP = av->GetActorValue(RE::ActorValue::kMagicka);
    float maxSP = av->GetActorValue(RE::ActorValue::kStamina);
    float dmgHP = player->GetActorValueModifier(RE::ACTOR_VALUE_MODIFIER::kDamage, RE::ActorValue::kHealth);
    float dmgMP = player->GetActorValueModifier(RE::ACTOR_VALUE_MODIFIER::kDamage, RE::ActorValue::kMagicka);
    float dmgSP = player->GetActorValueModifier(RE::ACTOR_VALUE_MODIFIER::kDamage, RE::ActorValue::kStamina);
    float curHP = (std::max)(maxHP + dmgHP, 0.0f);
    float curMP = (std::max)(maxMP + dmgMP, 0.0f);
    float curSP = (std::max)(maxSP + dmgSP, 0.0f);
    float experience = 0.0f;
    float expToNextLevel = 0.0f;
    float nextLevelTotalXp = 0.0f;
    const std::int32_t currentLevel = static_cast<std::int32_t>(player->GetLevel());

    auto& infoRuntime = player->GetInfoRuntimeData();
    if (infoRuntime.skills && infoRuntime.skills->data) {
        const float rawXp = infoRuntime.skills->data->xp;
        const float rawThreshold = infoRuntime.skills->data->levelThreshold;
        experience = std::isfinite(rawXp) ? (std::max)(rawXp, 0.0f) : 0.0f;
        const float safeThreshold = std::isfinite(rawThreshold) ? rawThreshold : experience;
        nextLevelTotalXp = (std::max)(safeThreshold, experience);
        expToNextLevel = (std::max)(safeThreshold - experience, 0.0f);

        // --- Level-up XP correction ---
        // 1. Clear correction once game data refreshes (raw values changed)
        if (s_levelUpXp.staleXp >= 0.0f) {
            if (rawXp != s_levelUpXp.staleXp || rawThreshold != s_levelUpXp.staleThreshold) {
                s_levelUpXp.staleXp = -1.0f;
            }
        }

        // 2. Detect level-up with stale XP (xp >= threshold after level increase)
        if (s_levelUpXp.lastLevel > 0 &&
            currentLevel > s_levelUpXp.lastLevel &&
            rawXp >= rawThreshold && rawThreshold > 0.0f) {
            s_levelUpXp.staleXp = rawXp;
            s_levelUpXp.staleThreshold = rawThreshold;
            s_levelUpXp.correctedXp = (std::max)(rawXp - rawThreshold, 0.0f);
            s_levelUpXp.correctedThreshold = ComputeLevelThreshold(currentLevel);
        }

        // 3. Update tracked level
        s_levelUpXp.lastLevel = currentLevel;

        // 4. Apply correction if active
        if (s_levelUpXp.staleXp >= 0.0f) {
            experience = s_levelUpXp.correctedXp;
            nextLevelTotalXp = s_levelUpXp.correctedThreshold;
            expToNextLevel = (std::max)(nextLevelTotalXp - experience, 0.0f);
        }
    } else {
        s_levelUpXp.lastLevel = currentLevel;
        nextLevelTotalXp = experience;
    }

    json += "\"playerInfo\":{";
    json += "\"level\":"; appendInt(json, static_cast<std::int32_t>(player->GetLevel())); json += ',';
    json += "\"experience\":"; appendFloat(json, experience); json += ',';
    json += "\"expToNextLevel\":"; appendFloat(json, expToNextLevel); json += ',';
    json += "\"nextLevelTotalXp\":"; appendFloat(json, nextLevelTotalXp); json += ',';
    json += "\"gold\":"; appendInt(json, GetGoldCount()); json += ',';
    json += "\"carryWeight\":"; appendFloat(json, av->GetActorValue(RE::ActorValue::kInventoryWeight)); json += ',';
    json += "\"maxCarryWeight\":"; appendFloat(json, av->GetActorValue(RE::ActorValue::kCarryWeight)); json += ',';
    json += "\"health\":"; appendFloat(json, curHP); json += ',';
    json += "\"magicka\":"; appendFloat(json, curMP); json += ',';
    json += "\"stamina\":"; appendFloat(json, curSP);
    json += "},";

    // Alert data: current percentages for visual alerts
    float hpPct = maxHP > 0 ? (curHP / maxHP) * 100.0f : 100.0f;
    float mpPct = maxMP > 0 ? (curMP / maxMP) * 100.0f : 100.0f;
    float spPct = maxSP > 0 ? (curSP / maxSP) * 100.0f : 100.0f;
    float carryMax = av->GetActorValue(RE::ActorValue::kCarryWeight);
    float carryCur = av->GetActorValue(RE::ActorValue::kInventoryWeight);
    float carryPct = carryMax > 0 ? (carryCur / carryMax) * 100.0f : 0.0f;

    json += "\"alertData\":{";
    json += "\"healthPct\":"; appendFloat(json, hpPct); json += ',';
    json += "\"magickaPct\":"; appendFloat(json, mpPct); json += ',';
    json += "\"staminaPct\":"; appendFloat(json, spPct); json += ',';
    json += "\"carryPct\":"; appendFloat(json, carryPct);
    json += "},";

    const auto timedEffects = collectTimedEffects(player);
    json += "\"timedEffects\":[";
    for (std::size_t i = 0; i < timedEffects.size(); ++i) {
        const auto& effect = timedEffects[i];
        json += '{';
        json += "\"instanceId\":"; appendInt(json, effect.instanceId); json += ',';
        json += "\"sourceName\":"; appendEscapedString(json, effect.sourceName); json += ',';
        json += "\"effectName\":"; appendEscapedString(json, effect.effectName); json += ',';
        json += "\"remainingSec\":"; appendInt(json, effect.remainingSec); json += ',';
        json += "\"totalSec\":"; appendInt(json, effect.totalSec); json += ',';
        json += "\"isDebuff\":"; appendBool(json, effect.isDebuff); json += ',';
        json += "\"sourceFormId\":"; appendUInt(json, effect.sourceFormId); json += ',';
        json += "\"effectFormId\":"; appendUInt(json, effect.effectFormId); json += ',';
        json += "\"spellFormId\":"; appendUInt(json, effect.spellFormId);
        json += '}';
        if (i + 1 < timedEffects.size()) {
            json += ',';
        }
    }
    json += "],";

    json += "\"isInCombat\":"; appendBool(json, inCombat);

    json += '}';
    return json;
  } catch (const std::exception& e) {
    logger::error("CollectStats exception: {}", e.what());
    return "{}";
  } catch (...) {
    logger::error("CollectStats unknown exception");
    return "{}";
  }
}

}  // namespace TulliusWidgets
