#include "StatsCollector.h"
#include "CriticalChanceEvaluator.h"
#include "ResistanceEvaluator.h"
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

static std::string escapeJson(std::string_view input) {
    std::string out;
    out.reserve(input.size());
    for (char c : input) {
        switch (c) {
        case '\\': out += "\\\\"; break;
        case '"': out += "\\\""; break;
        case '\n': out += "\\n"; break;
        case '\r': out += "\\r"; break;
        case '\t': out += "\\t"; break;
        default: out += c; break;
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
        const char* spellName = effect->spell->GetName();
        if (spellName && spellName[0] != '\0') {
            return spellName;
        }
    }

    return "";
}

static std::string getTimedEffectSourceName(const RE::ActiveEffect* effect) {
    if (!effect) return "";

    if (effect->source) {
        const char* sourceName = effect->source->GetName();
        if (sourceName && sourceName[0] != '\0') {
            return sourceName;
        }
    }

    if (effect->spell) {
        const char* spellName = effect->spell->GetName();
        if (spellName && spellName[0] != '\0') {
            return spellName;
        }
    }

    return getTimedEffectName(effect);
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

        auto sourceName = getTimedEffectSourceName(effect);
        auto effectName = getTimedEffectName(effect);
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
        out.push_back(TimedEffectEntry{
            instanceId,
            std::move(sourceName),
            std::move(effectName),
            remainingSec,
            totalSec,
            isDebuff
        });
    }

    std::sort(out.begin(), out.end(), [](const TimedEffectEntry& a, const TimedEffectEntry& b) {
        if (a.remainingSec != b.remainingSec) return a.remainingSec < b.remainingSec;
        if (a.isDebuff != b.isDebuff) return a.isDebuff && !b.isDebuff;
        if (a.sourceName != b.sourceName) return a.sourceName < b.sourceName;
        if (a.effectName != b.effectName) return a.effectName < b.effectName;
        return a.instanceId < b.instanceId;
    });

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

float StatsCollector::CalculateDamageReduction(float armorRating) {
    // Skyrim formula: displayed_armor_rating * 0.12, capped at 80%
    float reduction = armorRating * 0.12f;
    return (std::min)(reduction, 80.0f);
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
    bool inCombat = player->IsInCombat();

    std::string json = "{";

    json += "\"resistances\":{";
    json += "\"magic\":" + safeFloat(ResistanceEvaluator::GetEffectiveResistance(player, RE::ActorValue::kResistMagic)) + ",";
    json += "\"fire\":" + safeFloat(ResistanceEvaluator::GetEffectiveResistance(player, RE::ActorValue::kResistFire)) + ",";
    json += "\"frost\":" + safeFloat(ResistanceEvaluator::GetEffectiveResistance(player, RE::ActorValue::kResistFrost)) + ",";
    json += "\"shock\":" + safeFloat(ResistanceEvaluator::GetEffectiveResistance(player, RE::ActorValue::kResistShock)) + ",";
    json += "\"poison\":" + safeFloat(ResistanceEvaluator::GetEffectiveResistance(player, RE::ActorValue::kPoisonResist)) + ",";
    json += "\"disease\":" + safeFloat(ResistanceEvaluator::GetEffectiveResistance(player, RE::ActorValue::kResistDisease));
    json += "},";

    json += "\"defense\":{";
    json += "\"armorRating\":" + safeFloat(armorRating) + ",";
    json += "\"damageReduction\":" + safeFloat(CalculateDamageReduction(armorRating));
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
    json += "\"critChance\":" + safeFloat(CriticalChanceEvaluator::GetEffectiveCritChance(player));
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

    json += "\"playerInfo\":{";
    json += "\"level\":" + std::to_string(static_cast<int>(player->GetLevel())) + ",";
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
        json += "\"isDebuff\":" + std::string(effect.isDebuff ? "true" : "false");
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
