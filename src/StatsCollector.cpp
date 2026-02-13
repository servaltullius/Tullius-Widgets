#include "StatsCollector.h"
#include <cmath>
#include <cstdio>

namespace TulliusWidgets {

static std::string safeFloat(float v) {
    if (std::isnan(v) || std::isinf(v)) return "0";
    char buf[32];
    std::snprintf(buf, sizeof(buf), "%.2f", v);
    return buf;
}

float StatsCollector::GetResistance(RE::ActorValue av) {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return 0.0f;
    return player->AsActorValueOwner()->GetActorValue(av);
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

// Vanilla crit perk FormIDs
static constexpr RE::FormID kBladesman1   = 0x0005F592;  // One-Handed: Sword 10%
static constexpr RE::FormID kBladesman2   = 0x000C1E92;  // One-Handed: Sword 15%
static constexpr RE::FormID kBladesman3   = 0x000C1E93;  // One-Handed: Sword 20%
static constexpr RE::FormID kDeepWounds1  = 0x0003AF83;  // Two-Handed: Greatsword 10%
static constexpr RE::FormID kDeepWounds2  = 0x000C1E94;  // Two-Handed: Greatsword 15%
static constexpr RE::FormID kDeepWounds3  = 0x000C1E95;  // Two-Handed: Greatsword 20%
static constexpr RE::FormID kCritShot1    = 0x00105F19;  // Archery: Bow 10%
static constexpr RE::FormID kCritShot2    = 0x00105F1A;  // Archery: Bow 15%
static constexpr RE::FormID kCritShot3    = 0x00105F1B;  // Archery: Bow 20%

static bool HasPerk(RE::PlayerCharacter* player, RE::FormID formID) {
    auto perk = RE::TESForm::LookupByID<RE::BGSPerk>(formID);
    return perk && player->HasPerk(perk);
}

// Get crit chance from weapon type + perks (vanilla kCriticalChance AV is always 0)
float StatsCollector::GetEffectiveCritChance() {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return 0.0f;

    // Base from ActorValue (mods/enchantments may modify this)
    float base = player->AsActorValueOwner()->GetActorValue(RE::ActorValue::kCriticalChance);

    // Check right-hand weapon type for perk-based crit
    float perkCrit = 0.0f;
    auto rightHand = player->GetEquippedObject(false);
    if (rightHand) {
        auto weapon = rightHand->As<RE::TESObjectWEAP>();
        if (weapon) {
            auto type = weapon->GetWeaponType();
            switch (type) {
            case RE::WEAPON_TYPE::kOneHandSword:
                if (HasPerk(player, kBladesman3))       perkCrit = 20.0f;
                else if (HasPerk(player, kBladesman2))  perkCrit = 15.0f;
                else if (HasPerk(player, kBladesman1))  perkCrit = 10.0f;
                break;
            case RE::WEAPON_TYPE::kTwoHandSword:
                if (HasPerk(player, kDeepWounds3))      perkCrit = 20.0f;
                else if (HasPerk(player, kDeepWounds2)) perkCrit = 15.0f;
                else if (HasPerk(player, kDeepWounds1)) perkCrit = 10.0f;
                break;
            case RE::WEAPON_TYPE::kBow:
            case RE::WEAPON_TYPE::kCrossbow:
                if (HasPerk(player, kCritShot3))        perkCrit = 20.0f;
                else if (HasPerk(player, kCritShot2))   perkCrit = 15.0f;
                else if (HasPerk(player, kCritShot1))   perkCrit = 10.0f;
                break;
            default:
                break;
            }
        }
    }

    return base + perkCrit;
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
    json += "\"magic\":" + safeFloat(GetResistance(RE::ActorValue::kResistMagic)) + ",";
    json += "\"fire\":" + safeFloat(GetResistance(RE::ActorValue::kResistFire)) + ",";
    json += "\"frost\":" + safeFloat(GetResistance(RE::ActorValue::kResistFrost)) + ",";
    json += "\"shock\":" + safeFloat(GetResistance(RE::ActorValue::kResistShock)) + ",";
    json += "\"poison\":" + safeFloat(GetResistance(RE::ActorValue::kPoisonResist)) + ",";
    json += "\"disease\":" + safeFloat(GetResistance(RE::ActorValue::kResistDisease));
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
            rightDmg = static_cast<float>(weapon->GetAttackDamage());
        }
    }
    if (leftHand) {
        auto weapon = leftHand->As<RE::TESObjectWEAP>();
        if (weapon) {
            leftDmg = static_cast<float>(weapon->GetAttackDamage());
        }
    }

    json += "\"offense\":{";
    json += "\"rightHandDamage\":" + safeFloat(rightDmg) + ",";
    json += "\"leftHandDamage\":" + safeFloat(leftDmg) + ",";
    json += "\"critChance\":" + safeFloat(GetEffectiveCritChance());
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

    json += "\"isInCombat\":" + std::string(inCombat ? "true" : "false");

    json += "}";
    return json;
}

}  // namespace TulliusWidgets
