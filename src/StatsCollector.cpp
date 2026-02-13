#include "StatsCollector.h"

namespace TulliusWidgets {

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
    float reduction = (armorRating / (armorRating + 400.0f)) * 100.0f;
    return std::min(reduction, 80.0f);
}

std::string StatsCollector::CollectStats() {
    auto player = RE::PlayerCharacter::GetSingleton();
    if (!player) return "{}";

    auto av = player->AsActorValueOwner();
    float armorRating = GetArmorRating();
    bool inCombat = player->IsInCombat();

    std::string json = "{";

    json += "\"resistances\":{";
    json += "\"magic\":" + std::to_string(GetResistance(RE::ActorValue::kResistMagic)) + ",";
    json += "\"fire\":" + std::to_string(GetResistance(RE::ActorValue::kResistFire)) + ",";
    json += "\"frost\":" + std::to_string(GetResistance(RE::ActorValue::kResistFrost)) + ",";
    json += "\"shock\":" + std::to_string(GetResistance(RE::ActorValue::kResistShock)) + ",";
    json += "\"poison\":" + std::to_string(GetResistance(RE::ActorValue::kPoisonResist)) + ",";
    json += "\"disease\":" + std::to_string(GetResistance(RE::ActorValue::kResistDisease));
    json += "},";

    json += "\"defense\":{";
    json += "\"armorRating\":" + std::to_string(armorRating) + ",";
    json += "\"damageReduction\":" + std::to_string(CalculateDamageReduction(armorRating));
    json += "},";

    float rightDmg = 0.0f;
    float leftDmg = 0.0f;
    auto rightHand = player->GetEquippedObject(false);
    auto leftHand = player->GetEquippedObject(true);

    if (rightHand) {
        auto weapon = rightHand->As<RE::TESObjectWEAP>();
        if (weapon) {
            rightDmg = av->GetActorValue(RE::ActorValue::kMeleeDamage);
        }
    }
    if (leftHand) {
        auto weapon = leftHand->As<RE::TESObjectWEAP>();
        if (weapon) {
            leftDmg = static_cast<float>(weapon->GetAttackDamage());
        }
    }

    json += "\"offense\":{";
    json += "\"rightHandDamage\":" + std::to_string(rightDmg) + ",";
    json += "\"leftHandDamage\":" + std::to_string(leftDmg) + ",";
    json += "\"critChance\":0";
    json += "},";

    json += "\"movement\":{";
    json += "\"speedMult\":" + std::to_string(av->GetActorValue(RE::ActorValue::kSpeedMult));
    json += "},";

    json += "\"isInCombat\":" + std::string(inCombat ? "true" : "false");

    json += "}";
    return json;
}

}  // namespace TulliusWidgets
