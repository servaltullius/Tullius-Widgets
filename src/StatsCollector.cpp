#include "StatsCollector.h"
#include "StatsJsonWriter.h"
#include "StatsPayload.h"
#include "RE/C/Calendar.h"
#include <algorithm>
#include <array>
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

static RE::TESForm* GetSelectedVoiceForm(RE::PlayerCharacter* player)
{
    if (!player) return nullptr;
    if (player->GetActorRuntimeData().selectedPower) {
        return player->GetActorRuntimeData().selectedPower;
    }
    return player->GetCurrentShout();
}

static std::string GetSelectedVoiceType(const RE::TESForm* form)
{
    if (!form) return "empty";
    if (form->As<RE::TESShout>()) {
        return "shout";
    }
    return "power";
}

static std::string GetSelectedVoiceName(RE::PlayerCharacter* player)
{
    return GetFormName(GetSelectedVoiceForm(player));
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

// Icon category for the HUD effect list: what the effect changes, not where it came from.
static const char* GetEffectCategory(const RE::EffectSetting* baseEffect)
{
    if (!baseEffect) return "other";
    using Archetype = RE::EffectSetting::Archetype;
    switch (baseEffect->GetArchetype()) {
    case Archetype::kInvisibility: return "invisibility";
    case Archetype::kParalysis: return "paralysis";
    case Archetype::kNightEye: return "vision";
    case Archetype::kDetectLife: return "vision";
    case Archetype::kLight: return "vision";
    case Archetype::kCloak: return "cloak";
    case Archetype::kSlowTime: return "time";
    case Archetype::kEtherealize: return "ethereal";
    default: break;
    }
    switch (baseEffect->data.primaryAV) {
    case RE::ActorValue::kHealth:
    case RE::ActorValue::kHealRate:
    case RE::ActorValue::kHealRateMult: return "health";
    case RE::ActorValue::kMagicka:
    case RE::ActorValue::kMagickaRate:
    case RE::ActorValue::kMagickaRateMult: return "magicka";
    case RE::ActorValue::kStamina:
    case RE::ActorValue::kStaminaRate:
    case RE::ActorValue::kStaminaRateMult: return "stamina";
    case RE::ActorValue::kResistFire: return "fire";
    case RE::ActorValue::kResistFrost: return "frost";
    case RE::ActorValue::kResistShock: return "shock";
    case RE::ActorValue::kResistMagic: return "magic";
    case RE::ActorValue::kPoisonResist: return "poison";
    case RE::ActorValue::kResistDisease: return "disease";
    case RE::ActorValue::kDamageResist: return "armor";
    case RE::ActorValue::kSpeedMult: return "speed";
    case RE::ActorValue::kCarryWeight: return "weight";
    case RE::ActorValue::kWaterBreathing: return "water";
    case RE::ActorValue::kInvisibility: return "invisibility";
    case RE::ActorValue::kNightEye: return "vision";
    default: break;
    }
    const auto av = static_cast<std::uint32_t>(baseEffect->data.primaryAV);
    if (av >= static_cast<std::uint32_t>(RE::ActorValue::kOneHanded) && av <= static_cast<std::uint32_t>(RE::ActorValue::kEnchanting)) {
        return "skill";
    }
    if (av >= static_cast<std::uint32_t>(RE::ActorValue::kOneHandedModifier) && av <= static_cast<std::uint32_t>(RE::ActorValue::kEnchantingModifier)) {
        return "skill";
    }
    return "other";
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
        const float magnitude = std::isfinite(effect->magnitude) ? effect->magnitude : 0.0f;
        out.push_back(TimedEffectEntry{
            static_cast<std::int32_t>(effect->usUniqueID),
            std::move(sourceName),
            std::move(effectName),
            static_cast<std::int32_t>(std::ceil((std::max)(remaining, 0.0f))),
            static_cast<std::int32_t>(std::ceil((std::max)(effect->duration, 0.0f))),
            isDebuff,
            GetFormId(effect->source),
            GetFormId(baseEffect),
            GetFormId(effect->spell),
            GetEffectCategory(baseEffect),
            magnitude
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

// Coarse weather for the HUD; precipitation uses the sky's fade-aware checks.
static const char* CollectWeatherKind()
{
    const auto* sky = RE::Sky::GetSingleton();
    if (!sky) return "unknown";
    if (sky->mode.get() == RE::Sky::Mode::kInterior) return "indoor";
    if (!sky->currentWeather) return "unknown";
    if (sky->IsSnowing()) return "snow";
    if (sky->IsRaining()) return "rain";
    if (sky->currentWeather->data.flags.any(RE::TESWeather::WeatherDataFlag::kCloudy)) return "cloudy";
    return "clear";
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
    out.weather = CollectWeatherKind();

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

// The engine adds a hidden fArmorBaseFactor (3%) per worn head/body/hands/feet/shield
// armor piece on top of the armor-rating share. Prefer the engine's cached sum (already in
// percent); fall back to counting worn light/heavy pieces when it has not been populated.
static int CountWornArmorPieces(RE::PlayerCharacter* player)
{
    using Slot = RE::BGSBipedObjectForm::BipedObjectSlot;
    std::array<const RE::TESObjectARMO*, 5> counted{};
    int count = 0;
    for (const auto slot : { Slot::kHead, Slot::kBody, Slot::kHands, Slot::kFeet, Slot::kShield }) {
        const auto* armor = player->GetWornArmor(slot, false);
        if (!armor || !(armor->IsLightArmor() || armor->IsHeavyArmor())) continue;
        if (std::find(counted.begin(), counted.begin() + count, armor) != counted.begin() + count) continue;
        counted[static_cast<std::size_t>(count++)] = armor;
    }
    return count;
}

static float GetArmorPieceBonus(RE::PlayerCharacter* player)
{
    if (!player) return 0.0f;
    constexpr float kArmorBaseFactorPercent = 3.0f;
    const float cached = player->GetActorRuntimeData().armorBaseFactorSum;
    const int wornPieces = CountWornArmorPieces(player);
    const float bonus = std::isfinite(cached) && cached > 0.0f
        ? cached
        : static_cast<float>(wornPieces) * kArmorBaseFactorPercent;

    static float lastLoggedBonus = -1.0f;
    if (std::abs(bonus - lastLoggedBonus) > 0.01f) {
        lastLoggedBonus = bonus;
        logger::info(
            "Armor piece bonus: {:.2f}% (engine cached {:.4f}, engine virtual {:.4f}, worn pieces {})",
            bonus, cached, player->GetArmorBaseFactorSum(), wornPieces);
    }
    return bonus;
}

static float CalculateRawDamageReduction(float armorRating, float armorPieceBonus)
{
    return armorRating * kArmorRatingMultiplier + armorPieceBonus;
}

static float CalculateArmorRatingForMaxReduction(float armorPieceBonus)
{
    return (std::max)(0.0f, (kDamageReductionCap - armorPieceBonus) / kArmorRatingMultiplier);
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
    const float armorPieceBonus = GetArmorPieceBonus(player);
    const float rawDamageReduction = CalculateRawDamageReduction(armorRating, armorPieceBonus);
    return DefenseSnapshot{
        armorRating,
        armorPieceBonus,
        CalculateArmorRatingForMaxReduction(armorPieceBonus),
        rawDamageReduction,
        (std::min)(rawDamageReduction, kDamageReductionCap),
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

// Coarse item kind for the compact HUD's slot icon; must match EQUIPPED_ITEM_KINDS in the view.
static const char* GetEquippedKind(RE::PlayerCharacter* player, bool leftHand)
{
    auto* equipped = GetEquippedForm(player, leftHand);
    if (!equipped) return "empty";

    if (const auto* weapon = equipped->As<RE::TESObjectWEAP>()) {
        switch (weapon->GetWeaponType()) {
        case RE::WEAPON_TYPE::kHandToHandMelee: return "unarmed";
        case RE::WEAPON_TYPE::kOneHandSword: return "sword";
        case RE::WEAPON_TYPE::kOneHandDagger: return "dagger";
        case RE::WEAPON_TYPE::kOneHandAxe: return "waraxe";
        case RE::WEAPON_TYPE::kOneHandMace: return "mace";
        case RE::WEAPON_TYPE::kTwoHandSword: return "greatsword";
        // Battleaxes and warhammers share an animation type; keywords keep their EDIDs in memory.
        case RE::WEAPON_TYPE::kTwoHandAxe: return weapon->HasKeywordString("WeapTypeWarhammer") ? "warhammer" : "battleaxe";
        case RE::WEAPON_TYPE::kBow: return "bow";
        case RE::WEAPON_TYPE::kStaff: return "staff";
        case RE::WEAPON_TYPE::kCrossbow: return "crossbow";
        default: return "other";
        }
    }
    if (const auto* spell = equipped->As<RE::SpellItem>()) {
        if (const auto* effect = spell->GetAVEffect()) {
            switch (effect->GetMagickSkill()) {
            case RE::ActorValue::kDestruction: return "destruction";
            case RE::ActorValue::kRestoration: return "restoration";
            case RE::ActorValue::kAlteration: return "alteration";
            case RE::ActorValue::kIllusion: return "illusion";
            case RE::ActorValue::kConjuration: return "conjuration";
            default: break;
            }
        }
        return "spell";
    }
    if (equipped->As<RE::TESObjectARMO>()) return "shield";
    if (equipped->As<RE::TESObjectLIGH>()) return "torch";
    return "other";
}

static std::atomic<std::uint32_t> g_lastPotionFormId{0};

static const char* GetPotionKind(const RE::AlchemyItem* potion)
{
    const auto* effect = potion ? potion->GetCostliestEffectItem() : nullptr;
    const auto* base = effect ? effect->baseEffect : nullptr;
    if (!base) return "other";
    switch (base->data.primaryAV) {
    case RE::ActorValue::kHealth:
    case RE::ActorValue::kHealRate:
    case RE::ActorValue::kHealRateMult: return "health";
    case RE::ActorValue::kMagicka:
    case RE::ActorValue::kMagickaRate:
    case RE::ActorValue::kMagickaRateMult: return "magicka";
    case RE::ActorValue::kStamina:
    case RE::ActorValue::kStaminaRate:
    case RE::ActorValue::kStaminaRateMult: return "stamina";
    default: return "other";
    }
}

static float GetEquippedChargePct(RE::PlayerCharacter* player, bool leftHand)
{
    if (!player) return -1.0f;
    auto* entry = player->GetEquippedEntryData(leftHand);
    if (!entry || !entry->object || !entry->object->As<RE::TESObjectWEAP>()) return -1.0f;
    const auto charge = entry->GetEnchantmentCharge();
    if (!charge || !std::isfinite(*charge)) return -1.0f;
    return static_cast<float>(std::clamp(*charge, 0.0, 100.0));
}

// Doses left of a poison applied to the equipped weapon (0 when none).
static std::int32_t GetEquippedPoisonCount(RE::PlayerCharacter* player, bool leftHand)
{
    if (!player) return 0;
    auto* entry = player->GetEquippedEntryData(leftHand);
    if (!entry || !entry->object || !entry->object->As<RE::TESObjectWEAP>() || !entry->extraLists) return 0;
    for (auto* extraList : *entry->extraLists) {
        if (!extraList) continue;
        if (const auto* poison = extraList->GetByType<RE::ExtraPoison>(); poison && poison->poison && poison->count > 0) {
            return static_cast<std::int32_t>((std::min)(poison->count, 9999u));
        }
    }
    return 0;
}

static EquippedSnapshot CollectEquippedSnapshot(RE::PlayerCharacter* player)
{
    auto* selectedVoice = GetSelectedVoiceForm(player);
    EquippedSnapshot snapshot{
        GetEquippedName(player, false),
        GetEquippedName(player, true),
        GetEquippedKind(player, false),
        GetEquippedKind(player, true)
    };
    snapshot.voice = GetSelectedVoiceName(player);
    snapshot.voiceType = GetSelectedVoiceType(selectedVoice);
    if (const auto* shout = selectedVoice ? selectedVoice->As<RE::TESShout>() : nullptr) {
        for (const auto& variation : shout->variations) {
            const auto* word = variation.word;
            if (!word || !word->GetKnown()) continue;
            ++snapshot.voiceWordsKnown;
            if ((word->GetFormFlags() & RE::TESForm::RecordFlags::kUnlocked) != 0) {
                ++snapshot.voiceWordsUnlocked;
            }
        }
    }
    if (!player) return snapshot;

    snapshot.rightHandChargePct = GetEquippedChargePct(player, false);
    snapshot.leftHandChargePct = GetEquippedChargePct(player, true);
    snapshot.rightHandPoisonCount = GetEquippedPoisonCount(player, false);
    snapshot.leftHandPoisonCount = GetEquippedPoisonCount(player, true);
    if (auto* ammo = player->GetCurrentAmmo()) {
        const char* name = ammo->GetName();
        snapshot.ammoName = name ? name : "";
        snapshot.ammoCount = (std::max)(0, player->GetItemCount(ammo));
    }
    if (const auto potionId = g_lastPotionFormId.load(std::memory_order_acquire); potionId != 0) {
        if (auto* potion = RE::TESForm::LookupByID<RE::AlchemyItem>(potionId)) {
            const char* name = potion->GetName();
            snapshot.potionName = name ? name : "";
            snapshot.potionCount = (std::max)(0, player->GetItemCount(potion));
            snapshot.potionKind = GetPotionKind(potion);
        }
    }
    const float cooldown = player->GetVoiceRecoveryTime();
    snapshot.voiceCooldownSec = std::isfinite(cooldown) && cooldown > 0.0f ? cooldown : 0.0f;
    return snapshot;
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
    // Engine counter of real milliseconds played on this character (what STB shows).
    const auto playedMs = infoRuntime.totalPlayingTime;
    snapshot.playerInfo.playtimeHours = playedMs > 0 ? static_cast<double>(playedMs) / 3'600'000.0 : 0.0;
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

void StatsCollector::NoteConsumedPotion(std::uint32_t formId)
{
    StatsCollectorInternal::g_lastPotionFormId.store(formId, std::memory_order_release);
}

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
