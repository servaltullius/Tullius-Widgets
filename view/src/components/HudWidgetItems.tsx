import { useMemo, type ReactNode } from 'react';
import { ExperienceWidget } from './ExperienceWidget';
import { StatWidget } from './StatWidget';
import { TimedEffectList } from './TimedEffectList';
import { t } from '../i18n/translations';
import type { Language, WidgetItemLayout, WidgetSettings } from '../types/settings';
import type { CombatStats } from '../types/stats';
import {
  formatGold,
  formatPercent,
  formatWeight,
  getCarryTone,
  getLowResourceTone,
  getVisibleHudItemIds,
  hasMeaningfulDifference,
  resolveExperienceProgress,
} from '../utils/hudPresentation';
import {
  formatGameDateTime,
  formatRealDateTime,
  TIME_WIDGET_VALUE_MAX_WIDTH,
  useSharedTimeWidgetClock,
} from '../utils/timeWidgetShared';

const ELEMENTAL_RESIST_CAP = 85;
const DISEASE_RESIST_MIN = 0;
const WEAPON_DAMAGE_CAP = 9999;
const WEAPON_DAMAGE_MIN = 0;
const CRIT_CHANCE_CAP = 100;
const CRIT_CHANCE_MIN = 0;

interface HudWidgetItemsProps {
  shouldShow: boolean;
  stats: CombatStats;
  settings: WidgetSettings;
  settingsOpen: boolean;
  lang: Language;
  itemLayouts: Record<string, WidgetItemLayout>;
  accentColor: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function renderItemShell(
  itemId: string,
  layout: WidgetItemLayout,
  opacity: number,
  accentColor: string,
  transparentBg: boolean,
  child: ReactNode,
) {
  const showBg = !transparentBg;

  return (
    <div
      key={itemId}
      data-widget-item-id={itemId}
      style={{
        position: 'fixed',
        left: `${layout.x}px`,
        top: `${layout.y}px`,
        opacity: opacity / 100,
        transform: `scale(${layout.scale})`,
        transformOrigin: 'top left',
        background: showBg
          ? `linear-gradient(135deg, ${hexToRgba(accentColor, 0.12)} 0%, rgba(0,0,0,0.45) 60%)`
          : 'transparent',
        borderRadius: '8px',
        padding: showBg ? '8px 12px' : '0',
        border: showBg ? `1px solid ${hexToRgba(accentColor, 0.25)}` : 'none',
        boxShadow: showBg ? `inset 0 0 20px ${hexToRgba(accentColor, 0.06)}, 0 0 8px ${hexToRgba(accentColor, 0.1)}` : 'none',
        overflow: 'visible',
        userSelect: 'none',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {child}
    </div>
  );
}

export function HudWidgetItems({
  shouldShow,
  stats,
  settings,
  settingsOpen,
  lang,
  itemLayouts,
  accentColor,
}: HudWidgetItemsProps) {
  const hasVisibleTimeItem = shouldShow
    && (
      itemLayouts['time.game']?.visible === true
      || itemLayouts['time.real']?.visible === true
    );
  const nowMs = useSharedTimeWidgetClock(stats.time.snapshotAtMs, hasVisibleTimeItem);

  const visibleItemIds = useMemo(() => {
    return getVisibleHudItemIds(itemLayouts, stats, settingsOpen);
  }, [itemLayouts, settingsOpen, stats]);

  if (!shouldShow) {
    return null;
  }

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
  const gameDateTime = formatGameDateTime(stats.time, nowMs, lang);
  const realDateTime = formatRealDateTime(nowMs, lang);

  return (
    <>
      {visibleItemIds.map(itemId => {
        const layout = itemLayouts[itemId];
        if (!layout) {
          return null;
        }

        switch (itemId) {
          case 'experience.progress':
            return renderItemShell(
              itemId,
              layout,
              settings.general.opacity,
              accentColor,
              settings.general.transparentBg,
              (
                <ExperienceWidget
                  currentXp={currentXp}
                  totalXp={totalXpForNextLevel}
                  level={stats.playerInfo.level}
                  visible
                  lang={lang}
                />
              ),
            );
          case 'player.level':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget icon="level" iconColor="#ffd700" value={stats.playerInfo.level} visible prominence="secondary" />
            ));
          case 'player.gold':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget icon="gold" iconColor="#f0c040" value={stats.playerInfo.gold} visible format={formatGold} prominence="secondary" />
            ));
          case 'player.carryWeight':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="weight"
                iconColor="#cc9966"
                value={stats.playerInfo.carryWeight}
                unit={`/${Math.round(stats.playerInfo.maxCarryWeight)}`}
                visible
                format={formatWeight}
                prominence="secondary"
                helperText={formatPercent(stats.alertData.carryPct)}
                helperTone={carryTone === 'default' ? 'neutral' : 'warning'}
                valueTone={carryTone}
                meterPct={stats.alertData.carryPct}
                meterColor={carryTone === 'danger' ? '#ff8d8d' : carryTone === 'warning' ? '#ffd36a' : '#d7a26b'}
              />
            ));
          case 'player.health':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="health"
                iconColor="#e84040"
                value={stats.playerInfo.health}
                visible
                helperText={formatPercent(stats.alertData.healthPct)}
                helperTone={healthTone === 'default' ? 'neutral' : 'warning'}
                valueTone={healthTone}
                meterPct={stats.alertData.healthPct}
                meterColor={healthTone === 'danger' ? '#ff8d8d' : healthTone === 'warning' ? '#ffd36a' : '#ff6b6b'}
              />
            ));
          case 'player.magicka':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="magicka"
                iconColor="#4090e8"
                value={stats.playerInfo.magicka}
                visible
                helperText={formatPercent(stats.alertData.magickaPct)}
                helperTone={magickaTone === 'default' ? 'neutral' : 'warning'}
                valueTone={magickaTone}
                meterPct={stats.alertData.magickaPct}
                meterColor={magickaTone === 'danger' ? '#ff8d8d' : magickaTone === 'warning' ? '#ffd36a' : '#61b8ff'}
              />
            ));
          case 'player.stamina':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="stamina"
                iconColor="#40c840"
                value={stats.playerInfo.stamina}
                visible
                helperText={formatPercent(stats.alertData.staminaPct)}
                helperTone={staminaTone === 'default' ? 'neutral' : 'warning'}
                valueTone={staminaTone}
                meterPct={stats.alertData.staminaPct}
                meterColor={staminaTone === 'danger' ? '#ff8d8d' : staminaTone === 'warning' ? '#ffd36a' : '#72f07c'}
              />
            ));
          case 'resistance.magic':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="magic"
                iconColor="#b366ff"
                value={stats.resistances.magic}
                unit="%"
                visible
                cap={elementalCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.magic, stats.resistances.magic)}
                helperTone={stats.calcMeta.rawResistances.magic > elementalCap + 0.05 ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.magic)}% | ${capLabel} <= ${elementalCap}%`}
              />
            ));
          case 'resistance.fire':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="fire"
                iconColor="#ff6633"
                value={stats.resistances.fire}
                unit="%"
                visible
                cap={elementalCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.fire, stats.resistances.fire)}
                helperTone={stats.calcMeta.rawResistances.fire > elementalCap + 0.05 ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.fire)}% | ${capLabel} <= ${elementalCap}%`}
              />
            ));
          case 'resistance.frost':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="frost"
                iconColor="#66ccff"
                value={stats.resistances.frost}
                unit="%"
                visible
                cap={elementalCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.frost, stats.resistances.frost)}
                helperTone={stats.calcMeta.rawResistances.frost > elementalCap + 0.05 ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.frost)}% | ${capLabel} <= ${elementalCap}%`}
              />
            ));
          case 'resistance.shock':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="shock"
                iconColor="#ffdd33"
                value={stats.resistances.shock}
                unit="%"
                visible
                cap={elementalCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.shock, stats.resistances.shock)}
                helperTone={stats.calcMeta.rawResistances.shock > elementalCap + 0.05 ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.shock)}% | ${capLabel} <= ${elementalCap}%`}
              />
            ));
          case 'resistance.poison':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="poison"
                iconColor="#66ff66"
                value={stats.resistances.poison}
                unit="%"
                visible
                cap={elementalCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.poison, stats.resistances.poison)}
                helperTone={stats.calcMeta.rawResistances.poison > elementalCap + 0.05 ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.poison)}% | ${capLabel} <= ${elementalCap}%`}
                prominence="secondary"
              />
            ));
          case 'resistance.disease':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="disease"
                iconColor="#99cc66"
                value={stats.resistances.disease}
                unit="%"
                visible
                min={DISEASE_RESIST_MIN}
                cap={diseaseCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.disease, stats.resistances.disease)}
                helperTone={stats.calcMeta.rawResistances.disease > diseaseCap + 0.05 ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.disease)}% | ${capLabel} <= ${diseaseCap}%`}
                prominence="secondary"
              />
            ));
          case 'defense.armorRating':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="armor"
                iconColor="#aabbcc"
                value={stats.defense.armorRating}
                visible
                helperText={armorHelper}
                helperTone={armorHelper ? 'warning' : 'neutral'}
                tooltip={`${armorLimitLabel}: ${Math.round(armorCapForMaxReduction)} (${capLabel} ${damageReductionCap}%)`}
              />
            ));
          case 'defense.damageReduction':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="damageReduce"
                iconColor="#44aaaa"
                value={stats.defense.damageReduction}
                unit="%"
                visible
                helperText={damageReductionHelper}
                helperTone={stats.calcMeta.flags.damageReductionClamped ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawDamageReduction)}% | ${capLabel} ${damageReductionCap}%`}
              />
            ));
          case 'offense.rightHandDamage':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget icon="rightHand" iconColor="#e85050" value={stats.offense.rightHandDamage} visible min={WEAPON_DAMAGE_MIN} cap={WEAPON_DAMAGE_CAP} />
            ));
          case 'offense.leftHandDamage':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget icon="leftHand" iconColor="#e88080" value={stats.offense.leftHandDamage} visible min={WEAPON_DAMAGE_MIN} cap={WEAPON_DAMAGE_CAP} />
            ));
          case 'offense.critChance':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="crit"
                iconColor="#ff8800"
                value={stats.offense.critChance}
                unit="%"
                visible
                min={CRIT_CHANCE_MIN}
                cap={critCap}
                helperText={critHelper}
                helperTone={stats.calcMeta.flags.critChanceClamped ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawCritChance)}% | ${capLabel} ${critCap}%`}
              />
            ));
          case 'equipped.rightHand':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="rightHand"
                iconColor="#e85050"
                value={stats.equipped.rightHand || t(lang, 'equippedEmpty')}
                visible
                prominence="secondary"
              />
            ));
          case 'equipped.leftHand':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="leftHand"
                iconColor="#4090e8"
                value={stats.equipped.leftHand || t(lang, 'equippedEmpty')}
                visible
                prominence="secondary"
              />
            ));
          case 'time.game':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="gameTime"
                iconColor="#d8b96b"
                value={gameDateTime}
                visible
                prominence="secondary"
                valueMaxWidth={TIME_WIDGET_VALUE_MAX_WIDTH}
              />
            ));
          case 'time.real':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget
                icon="realTime"
                iconColor="#77d8ff"
                value={realDateTime}
                visible
                prominence="secondary"
                valueMaxWidth={TIME_WIDGET_VALUE_MAX_WIDTH}
              />
            ));
          case 'movement.speedMult':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <StatWidget icon="speed" iconColor="#44ddff" value={stats.movement.speedMult} unit="%" visible prominence="secondary" />
            ));
          case 'timedEffects.list':
            return renderItemShell(itemId, layout, settings.general.opacity, accentColor, settings.general.transparentBg, (
              <TimedEffectList
                effects={stats.timedEffects}
                maxVisible={settings.timedEffects.maxVisible}
                emptyLabel={t(lang, 'timedEffectsEmpty')}
              />
            ));
          default:
            return null;
        }
      })}
    </>
  );
}
