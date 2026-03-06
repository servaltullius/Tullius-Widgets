import type { ComponentProps } from 'react';
import { DraggableWidgetGroup } from './DraggableWidgetGroup';
import { ExperienceWidget } from './ExperienceWidget';
import { StatWidget } from './StatWidget';
import { TimedEffectList } from './TimedEffectList';
import { TimeWidgetList } from './TimeWidgetList';
import { t } from '../i18n/translations';
import type { CombatStats } from '../types/stats';
import type { Language, WidgetSettings } from '../types/settings';
import {
  formatGold,
  formatPercent,
  formatWeight,
  getCarryTone,
  getLowResourceTone,
  getVisibleWidgetGroups,
  hasMeaningfulDifference,
  resolveExperienceProgress,
} from '../utils/hudPresentation';

const ELEMENTAL_RESIST_CAP = 85;
const DISEASE_RESIST_MIN = 0;
const WEAPON_DAMAGE_CAP = 9999;
const WEAPON_DAMAGE_MIN = 0;
const CRIT_CHANCE_CAP = 100;
const CRIT_CHANCE_MIN = 0;

type GroupProps = Omit<ComponentProps<typeof DraggableWidgetGroup>, 'children'>;

interface HudWidgetGroupsProps {
  shouldShow: boolean;
  stats: CombatStats;
  settings: WidgetSettings;
  settingsOpen: boolean;
  lang: Language;
  getGroupProps: (groupId: string) => GroupProps;
}

export function HudWidgetGroups({
  shouldShow,
  stats,
  settings,
  settingsOpen,
  lang,
  getGroupProps,
}: HudWidgetGroupsProps) {
  if (!shouldShow) {
    return null;
  }

  const {
    hasVisibleResistance,
    hasVisibleDefense,
    hasVisibleOffense,
    hasVisibleEquipped,
    hasVisibleTime,
    hasVisibleTimedEffects,
    hasVisibleMovement,
    hasVisibleExperience,
    hasVisiblePlayerInfo,
  } = getVisibleWidgetGroups(settings, stats, settingsOpen);
  const { currentXp, totalXpForNextLevel } = resolveExperienceProgress(stats.playerInfo);
  const rawLabel = t(lang, 'capRawLabel');
  const capLabel = t(lang, 'capLimitLabel');
  const armorLimitLabel = t(lang, 'capArmorLimitLabel');

  const elementalCap = stats.calcMeta.caps.elementalResist || ELEMENTAL_RESIST_CAP;
  const diseaseCap = stats.calcMeta.caps.diseaseResist || 100;
  const critCap = stats.calcMeta.caps.critChance || CRIT_CHANCE_CAP;
  const damageReductionCap = stats.calcMeta.caps.damageReduction;
  const armorCapForMaxReduction = stats.calcMeta.armorCapForMaxReduction;

  const resistanceHelper = (raw: number, effective: number) =>
    hasMeaningfulDifference(raw, effective) ? `${rawLabel} ${Math.round(raw)}%` : undefined;
  const critHelper = hasMeaningfulDifference(stats.calcMeta.rawCritChance, stats.offense.critChance)
    ? `${rawLabel} ${Math.round(stats.calcMeta.rawCritChance)}%`
    : undefined;
  const damageReductionHelper = hasMeaningfulDifference(stats.calcMeta.rawDamageReduction, stats.defense.damageReduction)
    ? `${rawLabel} ${Math.round(stats.calcMeta.rawDamageReduction)}%`
    : undefined;
  const armorHelper = stats.defense.armorRating > armorCapForMaxReduction + 0.5
    ? `${armorLimitLabel} ${Math.round(armorCapForMaxReduction)}`
    : undefined;
  const healthTone = getLowResourceTone(stats.alertData.healthPct, settings.visualAlerts.lowHealthThreshold);
  const magickaTone = getLowResourceTone(stats.alertData.magickaPct, settings.visualAlerts.lowMagickaThreshold);
  const staminaTone = getLowResourceTone(stats.alertData.staminaPct, settings.visualAlerts.lowStaminaThreshold);
  const carryTone = getCarryTone(stats.alertData.carryPct);

  return (
    <>
      {hasVisiblePlayerInfo && (
        <DraggableWidgetGroup {...getGroupProps('playerInfo')}>
          <StatWidget icon="level" iconColor="#ffd700" value={stats.playerInfo.level} visible={settings.playerInfo.level} prominence="secondary" />
          <StatWidget icon="gold" iconColor="#f0c040" value={stats.playerInfo.gold} visible={settings.playerInfo.gold} format={formatGold} prominence="secondary" />
          <StatWidget
            icon="weight"
            iconColor="#cc9966"
            value={stats.playerInfo.carryWeight}
            unit={`/${Math.round(stats.playerInfo.maxCarryWeight)}`}
            visible={settings.playerInfo.carryWeight}
            format={formatWeight}
            prominence="secondary"
            helperText={formatPercent(stats.alertData.carryPct)}
            helperTone={carryTone === 'default' ? 'neutral' : 'warning'}
            valueTone={carryTone}
            meterPct={stats.alertData.carryPct}
            meterColor={carryTone === 'danger' ? '#ff8d8d' : carryTone === 'warning' ? '#ffd36a' : '#d7a26b'}
          />
          <StatWidget
            icon="health"
            iconColor="#e84040"
            value={stats.playerInfo.health}
            visible={settings.playerInfo.health}
            helperText={formatPercent(stats.alertData.healthPct)}
            helperTone={healthTone === 'default' ? 'neutral' : 'warning'}
            valueTone={healthTone}
            meterPct={stats.alertData.healthPct}
            meterColor={healthTone === 'danger' ? '#ff8d8d' : healthTone === 'warning' ? '#ffd36a' : '#ff6b6b'}
          />
          <StatWidget
            icon="magicka"
            iconColor="#4090e8"
            value={stats.playerInfo.magicka}
            visible={settings.playerInfo.magicka}
            helperText={formatPercent(stats.alertData.magickaPct)}
            helperTone={magickaTone === 'default' ? 'neutral' : 'warning'}
            valueTone={magickaTone}
            meterPct={stats.alertData.magickaPct}
            meterColor={magickaTone === 'danger' ? '#ff8d8d' : magickaTone === 'warning' ? '#ffd36a' : '#61b8ff'}
          />
          <StatWidget
            icon="stamina"
            iconColor="#40c840"
            value={stats.playerInfo.stamina}
            visible={settings.playerInfo.stamina}
            helperText={formatPercent(stats.alertData.staminaPct)}
            helperTone={staminaTone === 'default' ? 'neutral' : 'warning'}
            valueTone={staminaTone}
            meterPct={stats.alertData.staminaPct}
            meterColor={staminaTone === 'danger' ? '#ff8d8d' : staminaTone === 'warning' ? '#ffd36a' : '#72f07c'}
          />
        </DraggableWidgetGroup>
      )}

      {hasVisibleExperience && (
        <DraggableWidgetGroup {...getGroupProps('experience')}>
          <ExperienceWidget
            key={`xp-${totalXpForNextLevel}`}
            currentXp={currentXp}
            totalXp={totalXpForNextLevel}
            level={stats.playerInfo.level}
            visible={settings.experience.enabled}
            lang={lang}
          />
        </DraggableWidgetGroup>
      )}

      {hasVisibleResistance && (
        <DraggableWidgetGroup {...getGroupProps('resistances')}>
          <StatWidget
            icon="magic"
            iconColor="#b366ff"
            value={stats.resistances.magic}
            unit="%"
            visible={settings.resistances.magic}
            cap={elementalCap}
            helperText={resistanceHelper(stats.calcMeta.rawResistances.magic, stats.resistances.magic)}
            helperTone={stats.calcMeta.rawResistances.magic > elementalCap + 0.05 ? 'warning' : 'neutral'}
            tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.magic)}% | ${capLabel} <= ${elementalCap}%`}
          />
          <StatWidget
            icon="fire"
            iconColor="#ff6633"
            value={stats.resistances.fire}
            unit="%"
            visible={settings.resistances.fire}
            cap={elementalCap}
            helperText={resistanceHelper(stats.calcMeta.rawResistances.fire, stats.resistances.fire)}
            helperTone={stats.calcMeta.rawResistances.fire > elementalCap + 0.05 ? 'warning' : 'neutral'}
            tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.fire)}% | ${capLabel} <= ${elementalCap}%`}
          />
          <StatWidget
            icon="frost"
            iconColor="#66ccff"
            value={stats.resistances.frost}
            unit="%"
            visible={settings.resistances.frost}
            cap={elementalCap}
            helperText={resistanceHelper(stats.calcMeta.rawResistances.frost, stats.resistances.frost)}
            helperTone={stats.calcMeta.rawResistances.frost > elementalCap + 0.05 ? 'warning' : 'neutral'}
            tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.frost)}% | ${capLabel} <= ${elementalCap}%`}
          />
          <StatWidget
            icon="shock"
            iconColor="#ffdd33"
            value={stats.resistances.shock}
            unit="%"
            visible={settings.resistances.shock}
            cap={elementalCap}
            helperText={resistanceHelper(stats.calcMeta.rawResistances.shock, stats.resistances.shock)}
            helperTone={stats.calcMeta.rawResistances.shock > elementalCap + 0.05 ? 'warning' : 'neutral'}
            tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.shock)}% | ${capLabel} <= ${elementalCap}%`}
          />
          <StatWidget
            icon="poison"
            iconColor="#66ff66"
            value={stats.resistances.poison}
            unit="%"
            visible={settings.resistances.poison}
            cap={elementalCap}
            helperText={resistanceHelper(stats.calcMeta.rawResistances.poison, stats.resistances.poison)}
            helperTone={stats.calcMeta.rawResistances.poison > elementalCap + 0.05 ? 'warning' : 'neutral'}
            tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.poison)}% | ${capLabel} <= ${elementalCap}%`}
            prominence="secondary"
          />
          <StatWidget
            icon="disease"
            iconColor="#99cc66"
            value={stats.resistances.disease}
            unit="%"
            visible={settings.resistances.disease}
            min={DISEASE_RESIST_MIN}
            cap={diseaseCap}
            helperText={resistanceHelper(stats.calcMeta.rawResistances.disease, stats.resistances.disease)}
            helperTone={stats.calcMeta.rawResistances.disease > diseaseCap + 0.05 ? 'warning' : 'neutral'}
            tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.disease)}% | ${capLabel} <= ${diseaseCap}%`}
            prominence="secondary"
          />
        </DraggableWidgetGroup>
      )}

      {hasVisibleDefense && (
        <DraggableWidgetGroup {...getGroupProps('defense')}>
          <StatWidget
            icon="armor"
            iconColor="#aabbcc"
            value={stats.defense.armorRating}
            visible={settings.defense.armorRating}
            helperText={armorHelper}
            helperTone={armorHelper ? 'warning' : 'neutral'}
            tooltip={`${armorLimitLabel}: ${Math.round(armorCapForMaxReduction)} (${capLabel} ${damageReductionCap}%)`}
          />
          <StatWidget
            icon="damageReduce"
            iconColor="#44aaaa"
            value={stats.defense.damageReduction}
            unit="%"
            visible={settings.defense.damageReduction}
            helperText={damageReductionHelper}
            helperTone={stats.calcMeta.flags.damageReductionClamped ? 'warning' : 'neutral'}
            tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawDamageReduction)}% | ${capLabel} ${damageReductionCap}%`}
          />
        </DraggableWidgetGroup>
      )}

      {hasVisibleOffense && (
        <DraggableWidgetGroup {...getGroupProps('offense')}>
          <StatWidget icon="rightHand" iconColor="#e85050" value={stats.offense.rightHandDamage} visible={settings.offense.rightHandDamage} min={WEAPON_DAMAGE_MIN} cap={WEAPON_DAMAGE_CAP} />
          <StatWidget icon="leftHand" iconColor="#e88080" value={stats.offense.leftHandDamage} visible={settings.offense.leftHandDamage} min={WEAPON_DAMAGE_MIN} cap={WEAPON_DAMAGE_CAP} />
          <StatWidget
            icon="crit"
            iconColor="#ff8800"
            value={stats.offense.critChance}
            unit="%"
            visible={settings.offense.critChance}
            min={CRIT_CHANCE_MIN}
            cap={critCap}
            helperText={critHelper}
            helperTone={stats.calcMeta.flags.critChanceClamped ? 'warning' : 'neutral'}
            tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawCritChance)}% | ${capLabel} ${critCap}%`}
          />
        </DraggableWidgetGroup>
      )}

      {hasVisibleEquipped && (
        <DraggableWidgetGroup {...getGroupProps('equipped')}>
          <StatWidget
            key={`r-${stats.equipped.rightHand}`}
            icon="rightHand"
            iconColor="#e85050"
            value={stats.equipped.rightHand || t(lang, 'equippedEmpty')}
            visible={settings.equipped.rightHand}
            prominence="secondary"
          />
          <StatWidget
            key={`l-${stats.equipped.leftHand}`}
            icon="leftHand"
            iconColor="#4090e8"
            value={stats.equipped.leftHand || t(lang, 'equippedEmpty')}
            visible={settings.equipped.leftHand}
            prominence="secondary"
          />
        </DraggableWidgetGroup>
      )}

      {hasVisibleTimedEffects && (
        <DraggableWidgetGroup {...getGroupProps('timedEffects')}>
          <TimedEffectList
            effects={stats.timedEffects}
            maxVisible={settings.timedEffects.maxVisible}
            emptyLabel={t(lang, 'timedEffectsEmpty')}
          />
        </DraggableWidgetGroup>
      )}

      {hasVisibleTime && (
        <DraggableWidgetGroup {...getGroupProps('time')}>
          <TimeWidgetList
            gameTime={stats.time}
            showGameDateTime={settings.time.gameDateTime}
            showRealDateTime={settings.time.realDateTime}
            lang={lang}
          />
        </DraggableWidgetGroup>
      )}

      {hasVisibleMovement && (
        <DraggableWidgetGroup {...getGroupProps('movement')}>
          <StatWidget icon="speed" iconColor="#44ddff" value={stats.movement.speedMult} unit="%" visible={settings.movement.speedMult} prominence="secondary" />
        </DraggableWidgetGroup>
      )}
    </>
  );
}
