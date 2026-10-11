import { t } from '../../i18n/translations';
import type { Language, WidgetItemLayout, WidgetSettings } from '../../types/settings';
import type { CombatStats } from '../../types/stats';
import {
  formatGold,
  formatWeight,
  getCarryTone,
  getCompactEffectRowLimit,
  isLeftHandHeldByTwoHanded,
  getLowResourceTone,
  LOW_RESOURCE_THRESHOLDS,
  resolveExperienceProgress,
} from '../../utils/hudPresentation';
import { formatGameCompact, formatPlaytime, formatRealCompact } from '../../utils/timeWidgetShared';
import { TimedEffectList } from '../TimedEffectList';
import {
  CompactEquipSlot,
  CompactExperienceRing,
  CompactResistance,
  CompactResource,
  CompactStat,
  type CompactTone,
} from './CompactWidgets';

// Semantic colors shared with compact-theme.css; kept here because lucide icons take a color prop.
const COLORS = {
  text2: '#c3bdb0',
  gold: '#d2bb83',
  magic: '#b9a0d6',
  fire: '#e08a6c',
  frost: '#98c6dc',
  shock: '#d9c96f',
  poison: '#9cbf90',
  disease: '#b6ad93',
  health: '#c24c42',
  magicka: '#4a79bd',
  stamina: '#579552',
  hand: '#d8d2c4',
} as const;

const ELEMENTAL_RESIST_CAP = 85;

const WEATHER_KEYS = {
  clear: 'weatherClear',
  cloudy: 'weatherCloudy',
  rain: 'weatherRain',
  snow: 'weatherSnow',
  indoor: 'weatherIndoor',
  unknown: 'weatherUnknown',
} as const;

type ResistanceKey = keyof CombatStats['resistances'];

const RESISTANCES: Record<string, { key: ResistanceKey; color: string; labelKey: 'magic' | 'fire' | 'frost' | 'shock' | 'poison' | 'disease' }> = {
  'resistance.magic': { key: 'magic', color: COLORS.magic, labelKey: 'magic' },
  'resistance.fire': { key: 'fire', color: COLORS.fire, labelKey: 'fire' },
  'resistance.frost': { key: 'frost', color: COLORS.frost, labelKey: 'frost' },
  'resistance.shock': { key: 'shock', color: COLORS.shock, labelKey: 'shock' },
  'resistance.poison': { key: 'poison', color: COLORS.poison, labelKey: 'poison' },
  'resistance.disease': { key: 'disease', color: COLORS.disease, labelKey: 'disease' },
};

function toneFromHud(tone: string): CompactTone {
  return tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'default';
}

interface CompactHudItemProps {
  itemId: string;
  stats: CombatStats;
  settings: WidgetSettings;
  lang: Language;
  nowMs: number;
  /** Resolved on-screen layout; lets the effect list stop above the resource bars. */
  layout?: WidgetItemLayout;
}

export function CompactHudItem({ itemId, stats, settings, lang, nowMs, layout }: CompactHudItemProps) {
  const rawShort = t(lang, 'compactRawShort');
  const capLabel = t(lang, 'capLimitLabel');
  const rawLabel = t(lang, 'capRawLabel');

  const resistance = RESISTANCES[itemId];
  if (resistance) {
    const isDisease = resistance.key === 'disease';
    const cap = isDisease
      ? (stats.calcMeta.caps.diseaseResist || 100)
      : (stats.calcMeta.caps.elementalResist || ELEMENTAL_RESIST_CAP);
    const raw = stats.calcMeta.rawResistances[resistance.key];
    const effective = stats.resistances[resistance.key];
    const mode = settings.resistances.displayMode;
    return (
      <CompactResistance
        icon={resistance.key}
        iconColor={resistance.color}
        value={mode === 'rawOnly' ? raw : effective}
        raw={raw}
        cap={mode === 'rawOnly' ? undefined : cap}
        min={isDisease ? 0 : undefined}
        rawLabel={rawShort}
        showRaw={mode === 'both' ? 'auto' : 'never'}
        title={`${t(lang, resistance.labelKey)} — ${rawLabel} ${Math.round(raw)}% | ${capLabel} ${cap}%`}
      />
    );
  }

  switch (itemId) {
    case 'experience.progress': {
      const { currentXp, totalXpForNextLevel } = resolveExperienceProgress(stats.playerInfo);
      return (
        <CompactExperienceRing
          level={stats.playerInfo.level}
          currentXp={currentXp}
          totalXp={totalXpForNextLevel}
          xpLabel={t(lang, 'compactXpLabel')}
          showNumbers={settings.experience.showNumbers}
        />
      );
    }
    case 'player.level':
      return <CompactStat icon="level" iconColor={COLORS.gold} value={String(stats.playerInfo.level)} label={t(lang, 'level')} />;
    case 'player.gold':
      return <CompactStat icon="gold" iconColor={COLORS.gold} value={formatGold(stats.playerInfo.gold)} trackValue={stats.playerInfo.gold} />;
    case 'player.carryWeight': {
      const tone = getCarryTone(stats.alertData.carryPct);
      return (
        <CompactStat
          icon="weight"
          iconColor={COLORS.text2}
          value={formatWeight(stats.playerInfo.carryWeight)}
          unit={` / ${Math.round(stats.playerInfo.maxCarryWeight)}`}
          tone={toneFromHud(tone)}
        />
      );
    }
    case 'player.health':
      return (
        <CompactResource
          icon="health"
          color={COLORS.health}
          value={stats.playerInfo.health}
          pct={stats.alertData.healthPct}
          tone={getLowResourceTone(stats.alertData.healthPct, LOW_RESOURCE_THRESHOLDS.health) as 'default' | 'warning' | 'danger'}
        />
      );
    case 'player.magicka':
      return (
        <CompactResource
          icon="magicka"
          color={COLORS.magicka}
          value={stats.playerInfo.magicka}
          pct={stats.alertData.magickaPct}
          tone={getLowResourceTone(stats.alertData.magickaPct, LOW_RESOURCE_THRESHOLDS.magicka) as 'default' | 'warning' | 'danger'}
        />
      );
    case 'player.stamina':
      return (
        <CompactResource
          icon="stamina"
          color={COLORS.stamina}
          value={stats.playerInfo.stamina}
          pct={stats.alertData.staminaPct}
          tone={getLowResourceTone(stats.alertData.staminaPct, LOW_RESOURCE_THRESHOLDS.stamina) as 'default' | 'warning' | 'danger'}
        />
      );
    case 'defense.armorRating': {
      const overCap = stats.defense.armorRating > stats.calcMeta.armorCapForMaxReduction + 0.5;
      return (
        <CompactStat
          icon="armor"
          iconColor={COLORS.text2}
          value={String(Math.round(stats.defense.armorRating))}
          tone={overCap ? 'capped' : 'default'}
          iconSize={14}
          title={`${t(lang, 'capArmorLimitLabel')}: ${Math.round(stats.calcMeta.armorCapForMaxReduction)}`}
        />
      );
    }
    case 'defense.damageReduction': {
      const clamped = stats.calcMeta.flags.damageReductionClamped;
      return (
        <CompactStat
          icon="damageReduce"
          iconColor={COLORS.text2}
          value={String(Math.round(stats.defense.damageReduction))}
          unit="%"
          tone={clamped ? 'capped' : 'default'}
          sub={clamped ? `${rawShort} ${Math.round(stats.calcMeta.rawDamageReduction)}` : undefined}
          iconSize={14}
          title={`${rawLabel} ${Math.round(stats.calcMeta.rawDamageReduction)}% | ${capLabel} ${stats.calcMeta.caps.damageReduction}%`}
        />
      );
    }
    case 'offense.rightHandDamage':
      return <CompactStat icon="rightHandDamage" iconColor={COLORS.text2} value={String(Math.round(stats.offense.rightHandDamage))} iconSize={14} />;
    case 'offense.leftHandDamage':
      return <CompactStat icon="leftHandDamage" iconColor={COLORS.text2} value={String(Math.round(stats.offense.leftHandDamage))} iconSize={14} />;
    case 'offense.critChance': {
      const clamped = stats.calcMeta.flags.critChanceClamped;
      return (
        <CompactStat
          icon="crit"
          iconColor={COLORS.text2}
          value={String(Math.round(stats.offense.critChance))}
          unit="%"
          tone={clamped ? 'capped' : stats.offense.critChance <= 0 ? 'muted' : 'default'}
          iconSize={14}
          title={`${rawLabel} ${Math.round(stats.calcMeta.rawCritChance)}% | ${capLabel} ${stats.calcMeta.caps.critChance}%`}
        />
      );
    }
    case 'movement.speedMult':
      return <CompactStat icon="speed" iconColor={COLORS.text2} value={String(Math.round(stats.movement.speedMult))} unit="%" iconSize={14} />;
    case 'equipped.rightHand':
      return (
        <CompactEquipSlot
          slotKey="R"
          name={stats.equipped.rightHand}
          emptyLabel={t(lang, 'equippedEmpty')}
          kind={stats.equipped.rightHandKind}
          value={stats.offense.rightHandDamage}
          nameDisplay={settings.equipped.nameDisplay}
          chargePct={stats.equipped.rightHandChargePct}
          poisonCount={stats.equipped.rightHandPoisonCount}
          ammoCount={stats.equipped.ammoCount}
        />
      );
    case 'equipped.leftHand': {
      // The engine reports a two-handed weapon in both hands; show the left slot as taken.
      const heldByRight = isLeftHandHeldByTwoHanded(stats);
      return (
        <CompactEquipSlot
          slotKey="L"
          name={heldByRight ? t(lang, 'equippedTwoHanded') : stats.equipped.leftHand}
          heldByOtherHand={heldByRight}
          emptyLabel={t(lang, 'equippedEmpty')}
          kind={stats.equipped.leftHandKind}
          value={stats.offense.leftHandDamage}
          nameDisplay={settings.equipped.nameDisplay}
          chargePct={stats.equipped.leftHandChargePct}
          poisonCount={stats.equipped.leftHandPoisonCount}
          ammoCount={stats.equipped.ammoCount}
        />
      );
    }
    case 'equipped.voice':
      return (
        <CompactEquipSlot
          slotKey="Z"
          name={stats.equipped.voice}
          emptyLabel={t(lang, 'equippedEmpty')}
          kind={stats.equipped.voice ? 'other' : 'empty'}
          nameDisplay={settings.equipped.nameDisplay}
          cooldownSec={stats.equipped.voiceCooldownSec}
          wordsKnown={stats.equipped.voiceType === 'shout' ? stats.equipped.voiceWordsKnown : 0}
          wordsUnlocked={stats.equipped.voiceWordsUnlocked}
        />
      );
    case 'equipped.potion':
      return (
        <CompactEquipSlot
          slotKey="P"
          name={stats.equipped.potionCount === null ? '' : stats.equipped.potionName}
          emptyLabel={t(lang, 'equippedEmpty')}
          kind={stats.equipped.potionCount === null ? 'empty' : 'other'}
          value={stats.equipped.potionCount ?? undefined}
          nameDisplay={settings.equipped.nameDisplay}
          potionKind={stats.equipped.potionKind}
        />
      );
    case 'time.game':
      return (
        <CompactStat
          icon="gameTime"
          iconColor={COLORS.gold}
          label={t(lang, 'compactGameTime')}
          value={formatGameCompact(stats.time, nowMs, settings.time.gameDisplay === 'dateTime')}
          iconSize={14}
        />
      );
    case 'time.real':
      return (
        <CompactStat
          icon="realTime"
          iconColor={COLORS.text2}
          label={t(lang, 'compactRealTime')}
          value={formatRealCompact(nowMs, settings.time.realDisplay === 'dateTime')}
          iconSize={14}
        />
      );
    case 'time.playtime':
      return (
        <CompactStat
          icon="playtime"
          iconColor={COLORS.text2}
          label={t(lang, 'compactPlaytime')}
          value={formatPlaytime(stats.playerInfo.playtimeHours, t(lang, 'playtimeFormat'))}
          iconSize={14}
        />
      );
    case 'time.weather': {
      const key = WEATHER_KEYS[stats.time.weather];
      return <CompactStat icon={key} iconColor={COLORS.text2} value={t(lang, key)} iconSize={14} />;
    }
    case 'timedEffects.list':
      return (
        <TimedEffectList
          effects={stats.timedEffects}
          maxVisible={Math.min(
            settings.timedEffects.maxVisible,
            getCompactEffectRowLimit(layout, settings.timedEffects.listLayout, window.innerHeight),
          )}
          emptyLabel={t(lang, 'timedEffectsEmpty')}
          layout={settings.timedEffects.listLayout}
          variant="compact"
        />
      );
    default:
      return null;
  }
}
