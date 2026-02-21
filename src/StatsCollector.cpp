#include "StatsCollector.h"
#include "CriticalChanceEvaluator.h"
#include "ResistanceEvaluator.h"
#include "RE/C/Calendar.h"
#include <algorithm>
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
static constexpr float kArmorRatingForMaxReduction = 666.67f;

static std::string escapeJson(std::string_view input) {
    std::string out;
    out.reserve(input.size() + 8);
    for (unsigned char c : input) {
        switch (c) {
        case '\\': out += "\\\\"; break;
        case '"': out += "\\\""; break;
        case '\b': out += "\\b"; break;
        case '\f': out += "\\f"; break;
        case '\n': out += "\\n"; break;
        case '\r': out += "\\r"; break;
        case '\t': out += "\\t"; break;
        default:
            if (c < 0x20) {
                char unicodeBuf[7];
                std::snprintf(unicodeBuf, sizeof(unicodeBuf), "\\u%04X", static_cast<unsigned int>(c));
                out += unicodeBuf;
            } else {
                out += static_cast<char>(c);
            }
            break;
        }
    }
    return out;
}

static std::string getEquippedName(RE::PlayerCharacter* player, bool leftHand) {
    if (!player) return "";
    const RE::TESForm* equipped = player->GetEquippedObject(leftHand);
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
    if (ui && ui->GameIsPaused()) return out;

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

float StatsCollector::GetArmorRating() {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return 0.0f;
    return player->AsActorValueOwner()->GetActorValue(RE::ActorValue::kDamageResist);
}

float StatsCollector::CalculateRawDamageReduction(float armorRating) {
    return armorRating * 0.12f;
}

float StatsCollector::CalculateDamageReduction(float armorRating) {
    // Skyrim formula: displayed_armor_rating * 0.12, capped at 80%
    float reduction = CalculateRawDamageReduction(armorRating);
    return (std::min)(reduction, kDamageReductionCap);
}

// Damage perks: each rank adds +20% weapon damage
// Armsman (One-Handed)
static constexpr RE::FormID kArmsman1  = 0x000BABE4;
static constexpr RE::FormID kArmsman2  = 0x00079343;
static constexpr RE::FormID kArmsman3  = 0x00079342;
static constexpr RE::FormID kArmsman4  = 0x00079344;
static constexpr RE::FormID kArmsman5  = 0x000BABE5;
// Barbarian (Two-Handed)
static constexpr RE::FormID kBarbarian1 = 0x000BABE8;
static constexpr RE::FormID kBarbarian2 = 0x00079346;
static constexpr RE::FormID kBarbarian3 = 0x00079347;
static constexpr RE::FormID kBarbarian4 = 0x00079348;
static constexpr RE::FormID kBarbarian5 = 0x00079349;
// Overdraw (Archery)
static constexpr RE::FormID kOverdraw1 = 0x000BABED;
static constexpr RE::FormID kOverdraw2 = 0x0007934A;
static constexpr RE::FormID kOverdraw3 = 0x0007934B;
static constexpr RE::FormID kOverdraw4 = 0x0007934D;
static constexpr RE::FormID kOverdraw5 = 0x00079354;

static bool HasPerk(RE::PlayerCharacter* player, RE::FormID formID) {
    auto perk = RE::TESForm::LookupByID<RE::BGSPerk>(formID);
    return perk && player->HasPerk(perk);
}

// Get damage perk multiplier for weapon type: 0.2 per rank (Armsman/Barbarian/Overdraw)
static float GetDamagePerkMult(RE::PlayerCharacter* player, RE::WEAPON_TYPE type) {
    const RE::FormID* perks = nullptr;
    // Armsman covers all one-handed types, Barbarian all two-handed
    static constexpr RE::FormID oneHand[5] = { kArmsman5, kArmsman4, kArmsman3, kArmsman2, kArmsman1 };
    static constexpr RE::FormID twoHand[5] = { kBarbarian5, kBarbarian4, kBarbarian3, kBarbarian2, kBarbarian1 };
    static constexpr RE::FormID archery[5] = { kOverdraw5, kOverdraw4, kOverdraw3, kOverdraw2, kOverdraw1 };

    switch (type) {
    case RE::WEAPON_TYPE::kOneHandSword:
    case RE::WEAPON_TYPE::kOneHandDagger:
    case RE::WEAPON_TYPE::kOneHandAxe:
    case RE::WEAPON_TYPE::kOneHandMace:
        perks = oneHand; break;
    case RE::WEAPON_TYPE::kTwoHandSword:
    case RE::WEAPON_TYPE::kTwoHandAxe:
        perks = twoHand; break;
    case RE::WEAPON_TYPE::kBow:
    case RE::WEAPON_TYPE::kCrossbow:
        perks = archery; break;
    default:
        return 0.0f;
    }

    // Check from highest rank (5) to lowest (1)
    static constexpr float mults[5] = { 1.0f, 0.8f, 0.6f, 0.4f, 0.2f };
    for (int i = 0; i < 5; ++i) {
        if (HasPerk(player, perks[i])) return mults[i];
    }
    return 0.0f;
}

// Get weapon skill AV for a weapon type
static RE::ActorValue GetWeaponSkillAV(RE::WEAPON_TYPE type) {
    switch (type) {
    case RE::WEAPON_TYPE::kOneHandSword:
    case RE::WEAPON_TYPE::kOneHandDagger:
    case RE::WEAPON_TYPE::kOneHandAxe:
    case RE::WEAPON_TYPE::kOneHandMace:
        return RE::ActorValue::kOneHanded;
    case RE::WEAPON_TYPE::kTwoHandSword:
    case RE::WEAPON_TYPE::kTwoHandAxe:
        return RE::ActorValue::kTwoHanded;
    case RE::WEAPON_TYPE::kBow:
    case RE::WEAPON_TYPE::kCrossbow:
        return RE::ActorValue::kArchery;
    default:
        return RE::ActorValue::kOneHanded;
    }
}

// Displayed damage ≈ baseDmg × (1 + skill/200) × (1 + 0.2×perkRank)
// Note: smithing tempering and Fortify enchantments not included
static float CalcDisplayedDamage(RE::PlayerCharacter* player, RE::TESObjectWEAP* weapon) {
    float baseDmg = static_cast<float>(weapon->GetAttackDamage());
    auto type = weapon->GetWeaponType();

    float skill = player->AsActorValueOwner()->GetBaseActorValue(GetWeaponSkillAV(type));
    float skillMult = 1.0f + skill / 200.0f;
    float perkMult = 1.0f + GetDamagePerkMult(player, type);

    return baseDmg * skillMult * perkMult;
}

int32_t StatsCollector::GetGoldCount() {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return 0;
    auto gold = RE::TESForm::LookupByID<RE::TESBoundObject>(0x0000000F);
    if (!gold) return 0;
    return player->GetItemCount(gold);
}

std::string StatsCollector::CollectStats() {
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

    std::string json = "{";

    json += "\"resistances\":{";
    json += "\"magic\":" + safeFloat(resistMagic.effective) + ",";
    json += "\"fire\":" + safeFloat(resistFire.effective) + ",";
    json += "\"frost\":" + safeFloat(resistFrost.effective) + ",";
    json += "\"shock\":" + safeFloat(resistShock.effective) + ",";
    json += "\"poison\":" + safeFloat(resistPoison.effective) + ",";
    json += "\"disease\":" + safeFloat(resistDisease.effective);
    json += "},";

    json += "\"defense\":{";
    json += "\"armorRating\":" + safeFloat(armorRating) + ",";
    json += "\"damageReduction\":" + safeFloat(effectiveDamageReduction);
    json += "},";

    float rightDmg = 0.0f;
    float leftDmg = 0.0f;
    auto rightHand = player->GetEquippedObject(false);
    auto leftHand = player->GetEquippedObject(true);

    if (rightHand) {
        auto weapon = rightHand->As<RE::TESObjectWEAP>();
        if (weapon) {
            rightDmg = CalcDisplayedDamage(player, weapon);
        }
    }
    if (leftHand) {
        auto weapon = leftHand->As<RE::TESObjectWEAP>();
        if (weapon) {
            leftDmg = CalcDisplayedDamage(player, weapon);
        }
    }
    rightDmg = std::clamp(rightDmg, kDisplayedDamageMin, kDisplayedDamageMax);
    leftDmg = std::clamp(leftDmg, kDisplayedDamageMin, kDisplayedDamageMax);

    json += "\"offense\":{";
    json += "\"rightHandDamage\":" + safeFloat(rightDmg) + ",";
    json += "\"leftHandDamage\":" + safeFloat(leftDmg) + ",";
    json += "\"critChance\":" + safeFloat(critChance.effective);
    json += "},";

    const bool anyResistanceClamped =
        resistMagic.clamped || resistFire.clamped || resistFrost.clamped ||
        resistShock.clamped || resistPoison.clamped || resistDisease.clamped;
    const bool damageReductionClamped = rawDamageReduction > kDamageReductionCap + 0.001f;

    json += "\"calcMeta\":{";
    json += "\"rawResistances\":{";
    json += "\"magic\":" + safeFloat(resistMagic.raw) + ",";
    json += "\"fire\":" + safeFloat(resistFire.raw) + ",";
    json += "\"frost\":" + safeFloat(resistFrost.raw) + ",";
    json += "\"shock\":" + safeFloat(resistShock.raw) + ",";
    json += "\"poison\":" + safeFloat(resistPoison.raw) + ",";
    json += "\"disease\":" + safeFloat(resistDisease.raw);
    json += "},";
    json += "\"rawCritChance\":" + safeFloat(critChance.raw) + ",";
    json += "\"rawDamageReduction\":" + safeFloat(rawDamageReduction) + ",";
    json += "\"armorCapForMaxReduction\":" + safeFloat(kArmorRatingForMaxReduction) + ",";
    json += "\"caps\":{";
    json += "\"elementalResist\":" + safeFloat(kElementalResistCap) + ",";
    json += "\"elementalResistMin\":" + safeFloat(kElementalResistMin) + ",";
    json += "\"diseaseResist\":" + safeFloat(kDiseaseResistCap) + ",";
    json += "\"diseaseResistMin\":" + safeFloat(kDiseaseResistMin) + ",";
    json += "\"critChance\":" + safeFloat(kCritChanceCap) + ",";
    json += "\"damageReduction\":" + safeFloat(kDamageReductionCap);
    json += "},";
    json += "\"flags\":{";
    json += "\"anyResistanceClamped\":" + std::string(anyResistanceClamped ? "true" : "false") + ",";
    json += "\"critChanceClamped\":" + std::string(critChance.clamped ? "true" : "false") + ",";
    json += "\"damageReductionClamped\":" + std::string(damageReductionClamped ? "true" : "false");
    json += "}";
    json += "},";

    const auto rightEquipped = getEquippedName(player, false);
    const auto leftEquipped = getEquippedName(player, true);
    json += "\"equipped\":{";
    json += "\"rightHand\":\"" + escapeJson(rightEquipped) + "\",";
    json += "\"leftHand\":\"" + escapeJson(leftEquipped) + "\"";
    json += "},";

    json += "\"movement\":{";
    json += "\"speedMult\":" + safeFloat(av->GetActorValue(RE::ActorValue::kSpeedMult));
    json += "},";

    const auto gameTime = collectGameTime();
    json += "\"time\":{";
    json += "\"year\":" + std::to_string(gameTime.year) + ",";
    json += "\"month\":" + std::to_string(gameTime.month) + ",";
    json += "\"day\":" + std::to_string(gameTime.day) + ",";
    json += "\"hour\":" + std::to_string(gameTime.hour) + ",";
    json += "\"minute\":" + std::to_string(gameTime.minute) + ",";
    json += "\"monthName\":\"" + escapeJson(gameTime.monthName) + "\",";
    json += "\"timeScale\":" + safeFloat(gameTime.timeScale);
    json += "},";

    // Current values: base + damage modifier (damage modifier is negative)
    float maxHP = av->GetActorValue(RE::ActorValue::kHealth);
    float maxMP = av->GetActorValue(RE::ActorValue::kMagicka);
    float maxSP = av->GetActorValue(RE::ActorValue::kStamina);
    float dmgHP = player->GetActorValueModifier(RE::ACTOR_VALUE_MODIFIER::kDamage, RE::ActorValue::kHealth);
    float dmgMP = player->GetActorValueModifier(RE::ACTOR_VALUE_MODIFIER::kDamage, RE::ActorValue::kMagicka);
    float dmgSP = player->GetActorValueModifier(RE::ACTOR_VALUE_MODIFIER::kDamage, RE::ActorValue::kStamina);
    float curHP = maxHP + dmgHP;
    float curMP = maxMP + dmgMP;
    float curSP = maxSP + dmgSP;
    float experience = 0.0f;
    float expToNextLevel = 0.0f;

    auto& infoRuntime = player->GetInfoRuntimeData();
    if (infoRuntime.skills && infoRuntime.skills->data) {
        const float rawXp = infoRuntime.skills->data->xp;
        const float rawThreshold = infoRuntime.skills->data->levelThreshold;
        experience = std::isfinite(rawXp) ? (std::max)(rawXp, 0.0f) : 0.0f;
        const float safeThreshold = std::isfinite(rawThreshold) ? rawThreshold : experience;
        expToNextLevel = (std::max)(safeThreshold - experience, 0.0f);
    }

    json += "\"playerInfo\":{";
    json += "\"level\":" + std::to_string(static_cast<int>(player->GetLevel())) + ",";
    json += "\"experience\":" + safeFloat(experience) + ",";
    json += "\"expToNextLevel\":" + safeFloat(expToNextLevel) + ",";
    json += "\"gold\":" + std::to_string(static_cast<int>(GetGoldCount())) + ",";
    json += "\"carryWeight\":" + safeFloat(av->GetActorValue(RE::ActorValue::kInventoryWeight)) + ",";
    json += "\"maxCarryWeight\":" + safeFloat(av->GetActorValue(RE::ActorValue::kCarryWeight)) + ",";
    json += "\"health\":" + safeFloat(curHP) + ",";
    json += "\"magicka\":" + safeFloat(curMP) + ",";
    json += "\"stamina\":" + safeFloat(curSP);
    json += "},";

    // Alert data: current percentages for visual alerts
    float hpPct = maxHP > 0 ? (curHP / maxHP) * 100.0f : 100.0f;
    float mpPct = maxMP > 0 ? (curMP / maxMP) * 100.0f : 100.0f;
    float spPct = maxSP > 0 ? (curSP / maxSP) * 100.0f : 100.0f;
    float carryMax = av->GetActorValue(RE::ActorValue::kCarryWeight);
    float carryCur = av->GetActorValue(RE::ActorValue::kInventoryWeight);
    float carryPct = carryMax > 0 ? (carryCur / carryMax) * 100.0f : 0.0f;

    json += "\"alertData\":{";
    json += "\"healthPct\":" + safeFloat(hpPct) + ",";
    json += "\"magickaPct\":" + safeFloat(mpPct) + ",";
    json += "\"staminaPct\":" + safeFloat(spPct) + ",";
    json += "\"carryPct\":" + safeFloat(carryPct);
    json += "},";

    const auto timedEffects = collectTimedEffects(player);
    json += "\"timedEffects\":[";
    for (std::size_t i = 0; i < timedEffects.size(); ++i) {
        const auto& effect = timedEffects[i];
        json += "{";
        json += "\"instanceId\":" + std::to_string(effect.instanceId) + ",";
        json += "\"sourceName\":\"" + escapeJson(effect.sourceName) + "\",";
        json += "\"effectName\":\"" + escapeJson(effect.effectName) + "\",";
        json += "\"remainingSec\":" + std::to_string(effect.remainingSec) + ",";
        json += "\"totalSec\":" + std::to_string(effect.totalSec) + ",";
        json += "\"isDebuff\":" + std::string(effect.isDebuff ? "true" : "false") + ",";
        json += "\"sourceFormId\":" + std::to_string(effect.sourceFormId) + ",";
        json += "\"effectFormId\":" + std::to_string(effect.effectFormId) + ",";
        json += "\"spellFormId\":" + std::to_string(effect.spellFormId);
        json += "}";
        if (i + 1 < timedEffects.size()) {
            json += ",";
        }
    }
    json += "],";

    json += "\"isInCombat\":" + std::string(inCombat ? "true" : "false");

    json += "}";
    return json;
}

}  // namespace TulliusWidgets
