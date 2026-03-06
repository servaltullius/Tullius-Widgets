#include "StatsCollector.h"
#include "StatsJsonWriter.h"
#include "StatsPayload.h"
#include "RE/C/Calendar.h"
#include <algorithm>
#include <atomic>
#include <cmath>
#include <string_view>
#include <utility>

namespace TulliusWidgets::StatsCollectorInternal {

std::atomic<std::uint32_t> gStatsPayloadSequence{0};

static float ComputeLevelThreshold(std::int32_t level)
{
    float base = 75.0f;
    float mult = 25.0f;
    auto* gs = RE::GameSettingCollection::GetSingleton();
    if (gs) {
        if (auto* s = gs->GetSetting("fXPLevelUpBase")) base = s->data.f;
        if (auto* s = gs->GetSetting("fXPLevelUpMult")) mult = s->data.f;
    }
    return base + mult * static_cast<float>(level);
}

static RE::TESForm* GetEquippedForm(RE::PlayerCharacter* player, bool leftHand)
{
    if (!player) return nullptr;

    if (auto* equipped = player->GetEquippedObject(leftHand)) {
        return equipped;
    }

    if (auto* entry = player->GetEquippedEntryData(leftHand)) {
        if (auto* object = entry->object) {
            return object;
        }
    }

    if (leftHand) {
        if (auto* shield = player->GetWornArmor(RE::BGSBipedObjectForm::BipedObjectSlot::kShield, false)) {
            return shield;
        }
    }

    return nullptr;
}

static std::string GetEquippedName(RE::PlayerCharacter* player, bool leftHand)
{
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

    auto* equipped = GetEquippedForm(player, leftHand);
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

static bool ShouldDisplayActiveEffect(const RE::ActiveEffect* effect)
{
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

static std::string GetFormName(const RE::TESForm* form)
{
    if (!form) return "";
    const char* name = form->GetName();
    if (name && name[0] != '\0') {
        return name;
    }
    return "";
}

static std::uint32_t GetFormId(const RE::TESForm* form)
{
    return form ? static_cast<std::uint32_t>(form->GetFormID()) : 0u;
}

static std::string GetTimedEffectName(const RE::ActiveEffect* effect)
{
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
        auto spellName = GetFormName(effect->spell);
        if (!spellName.empty()) {
            return spellName;
        }
    }

    return "";
}

static std::string GetTimedEffectSourceName(const RE::ActiveEffect* effect, std::string_view effectName)
{
    if (!effect) return "";

    if (effect->spell) {
        auto spellName = GetFormName(effect->spell);
        if (!spellName.empty()) {
            return spellName;
        }
    }

    if (effect->source) {
        auto sourceName = GetFormName(effect->source);
        if (!sourceName.empty() && sourceName != effectName) {
            return sourceName;
        }
    }

    return "";
}

static std::vector<TimedEffectEntry> CollectTimedEffects(RE::PlayerCharacter* player)
{
    std::vector<TimedEffectEntry> out;
    if (!player) return out;

    auto* magicTarget = player->AsMagicTarget();
    if (!magicTarget) return out;

    auto* ui = RE::UI::GetSingleton();
    if (!ui || ui->GameIsPaused()) return out;

    auto* activeEffects = magicTarget->GetActiveEffectList();
    if (!activeEffects) return out;

    for (auto* effect : *activeEffects) {
        if (!ShouldDisplayActiveEffect(effect)) {
            continue;
        }

        const float remaining = effect->duration - effect->elapsedSeconds;
        if (!std::isfinite(remaining) || remaining <= 0.1f) {
            continue;
        }

        auto effectName = GetTimedEffectName(effect);
        auto sourceName = GetTimedEffectSourceName(effect, effectName);
        if (sourceName.empty() && effectName.empty()) {
            continue;
        }
        if (sourceName.empty()) sourceName = effectName;
        if (effectName.empty()) effectName = sourceName;

        const auto* baseEffect = effect->GetBaseObject();
        const bool isDebuff = baseEffect && (baseEffect->IsDetrimental() || baseEffect->IsHostile());
        out.push_back(TimedEffectEntry{
            static_cast<std::int32_t>(effect->usUniqueID),
            std::move(sourceName),
            std::move(effectName),
            static_cast<std::int32_t>(std::ceil((std::max)(remaining, 0.0f))),
            static_cast<std::int32_t>(std::ceil((std::max)(effect->duration, 0.0f))),
            isDebuff,
            GetFormId(effect->source),
            GetFormId(baseEffect),
            GetFormId(effect->spell)
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

static GameTimeEntry CollectGameTime()
{
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
        const auto hour = static_cast<int>(std::floor(rawHour));
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

static float GetArmorRating(RE::PlayerCharacter* player)
{
    if (!player) return 0.0f;
    return player->AsActorValueOwner()->GetActorValue(RE::ActorValue::kDamageResist);
}

static float CalculateRawDamageReduction(float armorRating)
{
    return armorRating * kArmorRatingMultiplier;
}

static float CalculateDamageReduction(float armorRating)
{
    return (std::min)(CalculateRawDamageReduction(armorRating), kDamageReductionCap);
}

static std::int32_t GetGoldCount(RE::PlayerCharacter* player)
{
    if (!player) return 0;
    auto gold = RE::TESForm::LookupByID<RE::TESBoundObject>(0x0000000F);
    if (!gold) return 0;
    return player->GetItemCount(gold);
}

static float CollectHandDamage(RE::PlayerCharacter* player, bool leftHand)
{
    if (!player) return 0.0f;

    float damage = 0.0f;
    if (auto* entry = player->GetEquippedEntryData(leftHand)) {
        if (entry->object && entry->object->As<RE::TESObjectWEAP>()) {
            damage = player->GetDamage(entry);
        }
    }

    return std::clamp(damage, kDisplayedDamageMin, kDisplayedDamageMax);
}

static ResistanceSnapshot CollectResistanceSnapshot(RE::PlayerCharacter* player)
{
    ResistanceSnapshot snapshot{};
    snapshot.magic = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kResistMagic);
    snapshot.fire = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kResistFire);
    snapshot.frost = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kResistFrost);
    snapshot.shock = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kResistShock);
    snapshot.poison = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kPoisonResist);
    snapshot.disease = ResistanceEvaluator::Evaluate(player, RE::ActorValue::kResistDisease);
    snapshot.anyClamped =
        snapshot.magic.clamped || snapshot.fire.clamped || snapshot.frost.clamped ||
        snapshot.shock.clamped || snapshot.poison.clamped || snapshot.disease.clamped;
    return snapshot;
}

static DefenseSnapshot CollectDefenseSnapshot(RE::PlayerCharacter* player)
{
    const float armorRating = GetArmorRating(player);
    const float rawDamageReduction = CalculateRawDamageReduction(armorRating);
    return DefenseSnapshot{
        armorRating,
        rawDamageReduction,
        CalculateDamageReduction(armorRating),
        rawDamageReduction > kDamageReductionCap + 0.001f
    };
}

static OffenseSnapshot CollectOffenseSnapshot(RE::PlayerCharacter* player)
{
    OffenseSnapshot snapshot{};
    snapshot.rightHandDamage = CollectHandDamage(player, false);
    snapshot.leftHandDamage = CollectHandDamage(player, true);
    snapshot.critChance = CriticalChanceEvaluator::Evaluate(player);
    return snapshot;
}

static EquippedSnapshot CollectEquippedSnapshot(RE::PlayerCharacter* player)
{
    return EquippedSnapshot{
        GetEquippedName(player, false),
        GetEquippedName(player, true)
    };
}

static MovementSnapshot CollectMovementSnapshot(RE::PlayerCharacter* player)
{
    if (!player) return {};
    return MovementSnapshot{
        player->AsActorValueOwner()->GetActorValue(RE::ActorValue::kSpeedMult)
    };
}

static PlayerStateSnapshot CollectPlayerStateSnapshot(RE::PlayerCharacter* player)
{
    PlayerStateSnapshot snapshot{};
    if (!player) return snapshot;

    auto* av = player->AsActorValueOwner();
    const float maxHP = av->GetActorValue(RE::ActorValue::kHealth);
    const float maxMP = av->GetActorValue(RE::ActorValue::kMagicka);
    const float maxSP = av->GetActorValue(RE::ActorValue::kStamina);
    const float dmgHP = player->GetActorValueModifier(RE::ACTOR_VALUE_MODIFIER::kDamage, RE::ActorValue::kHealth);
    const float dmgMP = player->GetActorValueModifier(RE::ACTOR_VALUE_MODIFIER::kDamage, RE::ActorValue::kMagicka);
    const float dmgSP = player->GetActorValueModifier(RE::ACTOR_VALUE_MODIFIER::kDamage, RE::ActorValue::kStamina);
    const float curHP = (std::max)(maxHP + dmgHP, 0.0f);
    const float curMP = (std::max)(maxMP + dmgMP, 0.0f);
    const float curSP = (std::max)(maxSP + dmgSP, 0.0f);
    const std::int32_t currentLevel = static_cast<std::int32_t>(player->GetLevel());
    float experience = 0.0f;
    float expToNextLevel = 0.0f;
    float nextLevelTotalXp = 0.0f;

    auto& infoRuntime = player->GetInfoRuntimeData();
    if (infoRuntime.skills && infoRuntime.skills->data) {
        const float rawXp = infoRuntime.skills->data->xp;
        const float rawThreshold = infoRuntime.skills->data->levelThreshold;
        experience = std::isfinite(rawXp) ? (std::max)(rawXp, 0.0f) : 0.0f;
        const float safeThreshold = std::isfinite(rawThreshold) ? rawThreshold : experience;
        nextLevelTotalXp = (std::max)(safeThreshold, experience);
        expToNextLevel = (std::max)(safeThreshold - experience, 0.0f);

        if (rawXp >= rawThreshold && rawThreshold > 0.0f && currentLevel > 1) {
            const float expectedThreshold = ComputeLevelThreshold(currentLevel);
            if (std::abs(rawThreshold - expectedThreshold) > 1.0f) {
                experience = (std::max)(rawXp - rawThreshold, 0.0f);
                nextLevelTotalXp = expectedThreshold;
                expToNextLevel = (std::max)(expectedThreshold - experience, 0.0f);

                static std::int32_t lastStaleLoggedLevel = -1;
                if (currentLevel != lastStaleLoggedLevel) {
                    lastStaleLoggedLevel = currentLevel;
                    logger::info(
                        "XP stale: level={} rawXp={:.0f} rawThreshold={:.0f} expected={:.0f} -> exp={:.0f} next={:.0f}",
                        currentLevel,
                        rawXp,
                        rawThreshold,
                        expectedThreshold,
                        experience,
                        nextLevelTotalXp);
                }
            }
        }
    } else {
        nextLevelTotalXp = experience;
    }

    const float expectedLevelThreshold = ComputeLevelThreshold(currentLevel);
    const float carryCur = av->GetActorValue(RE::ActorValue::kInventoryWeight);
    const float carryMax = av->GetActorValue(RE::ActorValue::kCarryWeight);

    snapshot.playerInfo = PlayerInfoSnapshot{
        currentLevel,
        experience,
        expToNextLevel,
        nextLevelTotalXp,
        expectedLevelThreshold,
        GetGoldCount(player),
        carryCur,
        carryMax,
        curHP,
        curMP,
        curSP
    };
    snapshot.alertData = AlertDataSnapshot{
        maxHP > 0 ? (curHP / maxHP) * 100.0f : 100.0f,
        maxMP > 0 ? (curMP / maxMP) * 100.0f : 100.0f,
        maxSP > 0 ? (curSP / maxSP) * 100.0f : 100.0f,
        carryMax > 0 ? (carryCur / carryMax) * 100.0f : 0.0f
    };
    return snapshot;
}

StatsPayload CollectStatsPayload(RE::PlayerCharacter* player)
{
    StatsPayload payload{};
    payload.sequence = gStatsPayloadSequence.fetch_add(1, std::memory_order_relaxed) + 1;
    payload.resistances = CollectResistanceSnapshot(player);
    payload.defense = CollectDefenseSnapshot(player);
    payload.offense = CollectOffenseSnapshot(player);
    payload.equipped = CollectEquippedSnapshot(player);
    payload.movement = CollectMovementSnapshot(player);
    payload.time = CollectGameTime();
    const auto playerState = CollectPlayerStateSnapshot(player);
    payload.playerInfo = playerState.playerInfo;
    payload.alertData = playerState.alertData;
    payload.timedEffects = CollectTimedEffects(player);
    payload.inCombat = player && player->IsInCombat();
    return payload;
}

}  // namespace TulliusWidgets::StatsCollectorInternal

namespace TulliusWidgets {

std::string StatsCollector::CollectStats()
{
    try {
        auto* player = RE::PlayerCharacter::GetSingleton();
        if (!player) {
            return "{}";
        }

        const auto payload = StatsCollectorInternal::CollectStatsPayload(player);
        StatsCollectorInternal::StatsJsonWriter writer;
        return writer.Build(payload);
    } catch (const std::exception& e) {
        logger::error("CollectStats exception: {}", e.what());
        return "{}";
    } catch (...) {
        logger::error("CollectStats unknown exception");
        return "{}";
    }
}

}  // namespace TulliusWidgets
