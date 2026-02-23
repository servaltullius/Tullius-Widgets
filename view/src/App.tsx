import { useCallback, useEffect, useMemo, useState } from 'react';
import { DraggableWidgetGroup } from './components/DraggableWidgetGroup';
import { StatWidget } from './components/StatWidget';
import { TimedEffectList } from './components/TimedEffectList';
import { TimeWidgetList } from './components/TimeWidgetList';
import { SettingsPanel } from './components/SettingsPanel';
import { ScreenEffects } from './components/ScreenEffects';
import { useGameStats } from './hooks/useGameStats';
import { useSettings } from './hooks/useSettings';
import { getDefaultPositions } from './data/defaultSettings';
import { WIDGET_GROUP_IDS } from './data/widgetRegistry';
import type { GroupPosition } from './types/settings';
import { t } from './i18n/translations';

const ELEMENTAL_RESIST_CAP = 85;
const ELEMENTAL_RESIST_MIN = -100;
const DISEASE_RESIST_CAP = 100;
const DISEASE_RESIST_MIN = 0;
const WEAPON_DAMAGE_CAP = 9999;
const WEAPON_DAMAGE_MIN = 0;
const CRIT_CHANCE_CAP = 100;
const CRIT_CHANCE_MIN = 0;
const SNAP_THRESHOLD = 15;
const GRID = 10;
const FALLBACK_POS: GroupPosition = { x: 100, y: 100 };

function formatWeight(v: number) {
  return v.toFixed(1);
}

function formatGold(v: number) {
  return v.toLocaleString();
}

function formatInteger(v: number) {
  return Math.round(v).toLocaleString();
}

function hasMeaningfulDifference(a: number, b: number): boolean {
  return Math.abs(a - b) > 0.05;
}

function snapPosition(
  groupId: string,
  rawX: number,
  rawY: number,
  getPositionById: (id: string) => GroupPosition,
): GroupPosition {
  let x = rawX;
  let y = rawY;
  let snappedX = false;
  let snappedY = false;

  for (const otherId of WIDGET_GROUP_IDS) {
    if (otherId === groupId) continue;
    const otherPos = getPositionById(otherId);
    if (!snappedX && Math.abs(x - otherPos.x) < SNAP_THRESHOLD) {
      x = otherPos.x;
      snappedX = true;
    }
    if (!snappedY && Math.abs(y - otherPos.y) < SNAP_THRESHOLD) {
      y = otherPos.y;
      snappedY = true;
    }
  }

  if (!snappedX) x = Math.round(x / GRID) * GRID;
  if (!snappedY) y = Math.round(y / GRID) * GRID;

  return { x, y };
}

export function App() {
  const stats = useGameStats();
  const { settings, visible, settingsOpen, setSettingsOpen, closeSettings, updateSetting, accentColor, runtimeDiagnostics } = useSettings();
  const [dragPositions, setDragPositions] = useState<Record<string, GroupPosition>>({});
  const [lastChangeAtMs, setLastChangeAtMs] = useState<number>(() => Date.now());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const defaults = getDefaultPositions();
  const lang = settings.general.language;

  const trackedChangeSignature = useMemo(() => {
    const trackedTime = settings.time.gameDateTime
      ? {
        year: stats.time.year,
        month: stats.time.month,
        day: stats.time.day,
        hour: stats.time.hour,
        minute: stats.time.minute,
      }
      : null;
    const trackedRealTime = settings.time.realDateTime
      ? Math.floor(nowMs / 1000)
      : null;
    const trackedTimedEffects = settings.timedEffects.enabled
      ? stats.timedEffects.map(effect => [effect.stableKey, Math.trunc(effect.remainingSec), Math.trunc(effect.totalSec), effect.isDebuff ? 1 : 0])
      : null;
    const trackedResistances = {
      ...(settings.resistances.magic ? { magic: stats.resistances.magic } : {}),
      ...(settings.resistances.fire ? { fire: stats.resistances.fire } : {}),
      ...(settings.resistances.frost ? { frost: stats.resistances.frost } : {}),
      ...(settings.resistances.shock ? { shock: stats.resistances.shock } : {}),
      ...(settings.resistances.poison ? { poison: stats.resistances.poison } : {}),
      ...(settings.resistances.disease ? { disease: stats.resistances.disease } : {}),
    };
    const trackedDefense = {
      ...(settings.defense.armorRating ? { armorRating: stats.defense.armorRating } : {}),
      ...(settings.defense.damageReduction ? { damageReduction: stats.defense.damageReduction } : {}),
    };
    const trackedOffense = {
      ...(settings.offense.rightHandDamage ? { rightHandDamage: stats.offense.rightHandDamage } : {}),
      ...(settings.offense.leftHandDamage ? { leftHandDamage: stats.offense.leftHandDamage } : {}),
      ...(settings.offense.critChance ? { critChance: stats.offense.critChance } : {}),
    };
    const trackedEquipped = {
      ...(settings.equipped.rightHand ? { rightHand: stats.equipped.rightHand } : {}),
      ...(settings.equipped.leftHand ? { leftHand: stats.equipped.leftHand } : {}),
    };
    const trackedMovement = settings.movement.speedMult
      ? { speedMult: stats.movement.speedMult }
      : null;
    const trackedPlayerInfo = {
      ...(settings.playerInfo.level ? { level: stats.playerInfo.level } : {}),
      ...(settings.playerInfo.gold ? { gold: stats.playerInfo.gold } : {}),
      ...(settings.playerInfo.carryWeight ? { carryWeight: stats.playerInfo.carryWeight, maxCarryWeight: stats.playerInfo.maxCarryWeight } : {}),
      ...(settings.playerInfo.health ? { health: stats.playerInfo.health } : {}),
      ...(settings.playerInfo.magicka ? { magicka: stats.playerInfo.magicka } : {}),
      ...(settings.playerInfo.stamina ? { stamina: stats.playerInfo.stamina } : {}),
    };
    const trackedExperience = settings.experience.enabled
      ? {
        current: stats.playerInfo.experience,
        toNext: stats.playerInfo.expToNextLevel,
        nextLevelTotalXp: stats.playerInfo.nextLevelTotalXp,
      }
      : null;

    return JSON.stringify({
      resistances: trackedResistances,
      defense: trackedDefense,
      offense: trackedOffense,
      equipped: trackedEquipped,
      movement: trackedMovement,
      playerInfo: trackedPlayerInfo,
      experience: trackedExperience,
      isInCombat: stats.isInCombat,
      timedEffects: trackedTimedEffects,
      time: trackedTime,
      realTime: trackedRealTime,
    });
  }, [
    nowMs,
    settings.defense.armorRating,
    settings.defense.damageReduction,
    settings.equipped.leftHand,
    settings.equipped.rightHand,
    settings.experience.enabled,
    settings.movement.speedMult,
    settings.offense.critChance,
    settings.offense.leftHandDamage,
    settings.offense.rightHandDamage,
    settings.playerInfo.carryWeight,
    settings.playerInfo.gold,
    settings.playerInfo.health,
    settings.playerInfo.level,
    settings.playerInfo.magicka,
    settings.playerInfo.stamina,
    settings.resistances.disease,
    settings.resistances.fire,
    settings.resistances.frost,
    settings.resistances.magic,
    settings.resistances.poison,
    settings.resistances.shock,
    settings.time.gameDateTime,
    settings.time.realDateTime,
    settings.timedEffects.enabled,
    stats,
  ]);

  useEffect(() => {
    const changedAt = Date.now();
    const timer = window.setTimeout(() => {
      setLastChangeAtMs(changedAt);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [trackedChangeSignature]);

  useEffect(() => {
    if (!settings.general.showOnChangeOnly) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, [settings.general.showOnChangeOnly]);

  useEffect(() => {
    if (!settingsOpen || settings.general.onboardingSeen) return;
    updateSetting('general.onboardingSeen', true);
  }, [settings.general.onboardingSeen, settingsOpen, updateSetting]);

  const changeWindowActive =
    !settings.general.showOnChangeOnly ||
    settingsOpen ||
    (nowMs - lastChangeAtMs) <= settings.general.changeDisplaySeconds * 1000;

  const shouldShow = visible &&
    (!settings.general.combatOnly || stats.isInCombat) &&
    changeWindowActive;

  const resolvePosition = useCallback((groupId: string): GroupPosition => {
    return dragPositions[groupId] ?? settings.positions[groupId] ?? defaults[groupId] ?? FALLBACK_POS;
  }, [defaults, dragPositions, settings.positions]);

  const handleGroupMove = useCallback((groupId: string, rawX: number, rawY: number) => {
    const getPositionById = (id: string): GroupPosition =>
      dragPositions[id] ?? settings.positions[id] ?? defaults[id] ?? FALLBACK_POS;
    const snapped = snapPosition(groupId, rawX, rawY, getPositionById);
    setDragPositions(prev => ({ ...prev, [groupId]: snapped }));
  }, [defaults, dragPositions, settings.positions]);

  const handleGroupMoveEnd = useCallback((groupId: string, rawX: number, rawY: number) => {
    const getPositionById = (id: string): GroupPosition =>
      dragPositions[id] ?? settings.positions[id] ?? defaults[id] ?? FALLBACK_POS;
    const snapped = snapPosition(groupId, rawX, rawY, getPositionById);

    setDragPositions(prev => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
    updateSetting(`positions.${groupId}`, snapped);
  }, [defaults, dragPositions, settings.positions, updateSetting]);

  const groupProps = (groupId: string) => {
    const pos = resolvePosition(groupId);
    return {
      groupId,
      x: pos.x,
      y: pos.y,
      opacity: settings.general.opacity,
      size: settings.general.size,
      layout: settings.layouts[groupId] ?? 'vertical',
      accentColor,
      transparentBg: settings.general.transparentBg,
      draggable: settingsOpen,
      onMove: handleGroupMove,
      onDragEnd: handleGroupMoveEnd,
    };
  };

  const hasVisibleResistance = Object.values(settings.resistances).some(Boolean);
  const hasVisibleDefense = Object.values(settings.defense).some(Boolean);
  const hasVisibleOffense = Object.values(settings.offense).some(Boolean);
  const hasVisibleEquipped = Object.values(settings.equipped).some(Boolean);
  const hasVisibleTime = Object.values(settings.time).some(Boolean);
  const hasVisibleTimedEffects = settings.timedEffects.enabled &&
    (settingsOpen || stats.timedEffects.length > 0);
  const hasVisibleMovement = settings.movement.speedMult;
  const hasVisibleExperience = settings.experience.enabled;
  const hasVisiblePlayerInfo = Object.values(settings.playerInfo).some(Boolean);
  const currentXp = Math.max(0, Math.round(stats.playerInfo.experience));
  const rawNextLevelXp = Math.max(0, Math.round(stats.playerInfo.expToNextLevel));
  const providedTotalXp = Math.max(0, Math.round(stats.playerInfo.nextLevelTotalXp));
  const totalXpForNextLevel = Math.max(currentXp + rawNextLevelXp, providedTotalXp);
  const experienceProgressValue = `${formatInteger(currentXp)} / ${formatInteger(totalXpForNextLevel)} XP`;
  const rawLabel = t(lang, 'capRawLabel');
  const capLabel = t(lang, 'capLimitLabel');
  const armorLimitLabel = t(lang, 'capArmorLimitLabel');

  const elementalCap = stats.calcMeta.caps.elementalResist || ELEMENTAL_RESIST_CAP;
  const elementalMin = stats.calcMeta.caps.elementalResistMin;
  const diseaseCap = stats.calcMeta.caps.diseaseResist || DISEASE_RESIST_CAP;
  const diseaseMin = stats.calcMeta.caps.diseaseResistMin;
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

  const runtimeWarningText = useMemo(() => {
    if (!runtimeDiagnostics || runtimeDiagnostics.warningCode === 'none') return null;
    switch (runtimeDiagnostics.warningCode) {
      case 'unsupported-runtime':
        return t(lang, 'runtimeWarningUnsupported');
      case 'missing-address-library':
        return t(lang, 'runtimeWarningAddressLibrary');
      case 'unsupported-runtime-and-missing-address-library':
        return t(lang, 'runtimeWarningBoth');
      default:
        return null;
    }
  }, [lang, runtimeDiagnostics]);

  const handleOnboardingDismiss = () => {
    updateSetting('general.onboardingSeen', true);
  };

  const handleOnboardingOpenSettings = () => {
    setSettingsOpen(true);
  };

  return (
    <>
      {runtimeWarningText && runtimeDiagnostics && (
        <div style={{
          position: 'fixed',
          top: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(80, 18, 18, 0.92)',
          border: '1px solid rgba(255, 120, 90, 0.85)',
          color: '#ffd8c9',
          borderRadius: '10px',
          padding: '10px 14px',
          zIndex: 1400,
          fontFamily: 'sans-serif',
          minWidth: '480px',
          maxWidth: '80vw',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>{runtimeWarningText}</div>
          <div style={{ fontSize: '12px', opacity: 0.95, wordBreak: 'break-all' }}>
            {t(lang, 'runtimeWarningDetails')}: runtime {runtimeDiagnostics.runtimeVersion}, SKSE {runtimeDiagnostics.skseVersion}, {runtimeDiagnostics.addressLibraryPath}
          </div>
        </div>
      )}

      {!settings.general.onboardingSeen && (
        <div style={{
          position: 'fixed',
          top: '28px',
          right: '28px',
          background: 'rgba(16, 18, 26, 0.92)',
          border: '1px solid rgba(120, 175, 255, 0.45)',
          borderRadius: '14px',
          padding: '18px 20px',
          zIndex: 1300,
          color: '#e7eefc',
          fontFamily: 'sans-serif',
          width: 'clamp(420px, 30vw, 560px)',
          boxShadow: '0 10px 22px rgba(0,0,0,0.38)',
        }}>
          <div style={{ fontSize: '19px', fontWeight: 700, marginBottom: '10px' }}>
            {t(lang, 'onboardingTitle')}
          </div>
          <div style={{ fontSize: '15px', lineHeight: 1.55, opacity: 0.96 }}>
            <div>{t(lang, 'onboardingLine1')}</div>
            <div>{t(lang, 'onboardingLine2')}</div>
            <div>{t(lang, 'onboardingLine3')}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button
              onClick={handleOnboardingOpenSettings}
              style={{
                flex: 1,
                borderRadius: '10px',
                border: '1px solid rgba(120,175,255,0.6)',
                background: 'rgba(80,140,255,0.2)',
                color: '#d7e6ff',
                fontSize: '14px',
                fontWeight: 600,
                padding: '10px 12px',
                cursor: 'pointer',
              }}
            >
              {t(lang, 'onboardingOpenSettings')}
            </button>
            <button
              onClick={handleOnboardingDismiss}
              style={{
                flex: 1,
                borderRadius: '10px',
                border: '1px solid rgba(220,220,220,0.35)',
                background: 'rgba(255,255,255,0.06)',
                color: '#d3d9e6',
                fontSize: '14px',
                fontWeight: 600,
                padding: '10px 12px',
                cursor: 'pointer',
              }}
            >
              {t(lang, 'onboardingDismiss')}
            </button>
          </div>
        </div>
      )}

      {shouldShow && (
        <>
          {hasVisiblePlayerInfo && (
            <DraggableWidgetGroup {...groupProps('playerInfo')}>
              <StatWidget icon="level" iconColor="#ffd700" value={stats.playerInfo.level} visible={settings.playerInfo.level} />
              <StatWidget icon="gold" iconColor="#f0c040" value={stats.playerInfo.gold} visible={settings.playerInfo.gold} format={formatGold} />
              <StatWidget icon="weight" iconColor="#cc9966" value={stats.playerInfo.carryWeight} unit={`/${Math.round(stats.playerInfo.maxCarryWeight)}`} visible={settings.playerInfo.carryWeight} format={formatWeight} />
              <StatWidget icon="health" iconColor="#e84040" value={stats.playerInfo.health} visible={settings.playerInfo.health} />
              <StatWidget icon="magicka" iconColor="#4090e8" value={stats.playerInfo.magicka} visible={settings.playerInfo.magicka} />
              <StatWidget icon="stamina" iconColor="#40c840" value={stats.playerInfo.stamina} visible={settings.playerInfo.stamina} />
            </DraggableWidgetGroup>
          )}

          {hasVisibleExperience && (
            <DraggableWidgetGroup {...groupProps('experience')}>
              <StatWidget icon="experience" iconColor="#5ec8ff" value={experienceProgressValue} visible={settings.experience.enabled} />
            </DraggableWidgetGroup>
          )}

          {hasVisibleResistance && (
            <DraggableWidgetGroup {...groupProps('resistances')}>
              <StatWidget
                icon="magic"
                iconColor="#b366ff"
                value={stats.resistances.magic}
                unit="%"
                visible={settings.resistances.magic}
                min={ELEMENTAL_RESIST_MIN}
                cap={elementalCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.magic, stats.resistances.magic)}
                helperTone={stats.calcMeta.flags.anyResistanceClamped ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.magic)}% | ${capLabel} ${elementalMin}~${elementalCap}%`}
              />
              <StatWidget
                icon="fire"
                iconColor="#ff6633"
                value={stats.resistances.fire}
                unit="%"
                visible={settings.resistances.fire}
                min={ELEMENTAL_RESIST_MIN}
                cap={elementalCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.fire, stats.resistances.fire)}
                helperTone={stats.calcMeta.rawResistances.fire > elementalCap + 0.05 ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.fire)}% | ${capLabel} ${elementalMin}~${elementalCap}%`}
              />
              <StatWidget
                icon="frost"
                iconColor="#66ccff"
                value={stats.resistances.frost}
                unit="%"
                visible={settings.resistances.frost}
                min={ELEMENTAL_RESIST_MIN}
                cap={elementalCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.frost, stats.resistances.frost)}
                helperTone={stats.calcMeta.rawResistances.frost > elementalCap + 0.05 ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.frost)}% | ${capLabel} ${elementalMin}~${elementalCap}%`}
              />
              <StatWidget
                icon="shock"
                iconColor="#ffdd33"
                value={stats.resistances.shock}
                unit="%"
                visible={settings.resistances.shock}
                min={ELEMENTAL_RESIST_MIN}
                cap={elementalCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.shock, stats.resistances.shock)}
                helperTone={stats.calcMeta.rawResistances.shock > elementalCap + 0.05 ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.shock)}% | ${capLabel} ${elementalMin}~${elementalCap}%`}
              />
              <StatWidget
                icon="poison"
                iconColor="#66ff66"
                value={stats.resistances.poison}
                unit="%"
                visible={settings.resistances.poison}
                min={ELEMENTAL_RESIST_MIN}
                cap={elementalCap}
                helperText={resistanceHelper(stats.calcMeta.rawResistances.poison, stats.resistances.poison)}
                helperTone={stats.calcMeta.rawResistances.poison > elementalCap + 0.05 ? 'warning' : 'neutral'}
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.poison)}% | ${capLabel} ${elementalMin}~${elementalCap}%`}
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
                tooltip={`${rawLabel} ${Math.round(stats.calcMeta.rawResistances.disease)}% | ${capLabel} ${diseaseMin}~${diseaseCap}%`}
              />
            </DraggableWidgetGroup>
          )}

          {hasVisibleDefense && (
            <DraggableWidgetGroup {...groupProps('defense')}>
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
            <DraggableWidgetGroup {...groupProps('offense')}>
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
            <DraggableWidgetGroup {...groupProps('equipped')}>
              <StatWidget
                icon="rightHand"
                iconColor="#e85050"
                value={stats.equipped.rightHand || t(lang, 'equippedEmpty')}
                visible={settings.equipped.rightHand}
              />
              <StatWidget
                icon="leftHand"
                iconColor="#4090e8"
                value={stats.equipped.leftHand || t(lang, 'equippedEmpty')}
                visible={settings.equipped.leftHand}
              />
            </DraggableWidgetGroup>
          )}

          {hasVisibleTimedEffects && (
            <DraggableWidgetGroup {...groupProps('timedEffects')}>
              <TimedEffectList
                effects={stats.timedEffects}
                maxVisible={settings.timedEffects.maxVisible}
                emptyLabel={t(lang, 'timedEffectsEmpty')}
              />
            </DraggableWidgetGroup>
          )}

          {hasVisibleTime && (
            <DraggableWidgetGroup {...groupProps('time')}>
              <TimeWidgetList
                gameTime={stats.time}
                showGameDateTime={settings.time.gameDateTime}
                showRealDateTime={settings.time.realDateTime}
                lang={lang}
              />
            </DraggableWidgetGroup>
          )}

          {hasVisibleMovement && (
            <DraggableWidgetGroup {...groupProps('movement')}>
              <StatWidget icon="speed" iconColor="#44ddff" value={stats.movement.speedMult} unit="%" visible={settings.movement.speedMult} />
            </DraggableWidgetGroup>
          )}
        </>
      )}

      <ScreenEffects alertData={stats.alertData} settings={settings} />

      <SettingsPanel
        settings={settings}
        effectiveVisible={visible}
        open={settingsOpen}
        onClose={closeSettings}
        onUpdate={updateSetting}
        accentColor={accentColor}
      />
    </>
  );
}
