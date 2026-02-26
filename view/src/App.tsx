import { useEffect, useMemo, useState } from 'react';
import { DraggableWidgetGroup } from './components/DraggableWidgetGroup';
import { StatWidget } from './components/StatWidget';
import { TimedEffectList } from './components/TimedEffectList';
import { TimeWidgetList } from './components/TimeWidgetList';
import { SettingsPanel } from './components/SettingsPanel';
import { ScreenEffects } from './components/ScreenEffects';
import { useGameStatsState } from './hooks/useGameStats';
import { useSettings } from './hooks/useSettings';
import { useWidgetPositions } from './hooks/useWidgetPositions';
import { getDefaultPositions } from './data/defaultSettings';
import { WIDGET_GROUP_IDS } from './data/widgetRegistry';
import type { GroupPosition, Language } from './types/settings';
import type { RuntimeDiagnostics } from './types/runtime';
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

function RuntimeWarningBanner({
  text,
  runtimeDiagnostics,
  lang,
}: {
  text: string;
  runtimeDiagnostics: RuntimeDiagnostics;
  lang: Language;
}) {
  return (
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
      <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>{text}</div>
      <div style={{ fontSize: '12px', opacity: 0.95, wordBreak: 'break-all' }}>
        {t(lang, 'runtimeWarningDetails')}: runtime {runtimeDiagnostics.runtimeVersion}, SKSE {runtimeDiagnostics.skseVersion}, {runtimeDiagnostics.addressLibraryPath}
      </div>
    </div>
  );
}

function SettingsSyncWarningBanner({
  text,
  hasRuntimeWarning,
}: {
  text: string;
  hasRuntimeWarning: boolean;
}) {
  return (
    <div style={{
      position: 'fixed',
      top: hasRuntimeWarning ? '84px' : '14px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(88, 46, 10, 0.92)',
      border: '1px solid rgba(255, 191, 115, 0.8)',
      color: '#ffe2ba',
      borderRadius: '10px',
      padding: '10px 14px',
      zIndex: 1390,
      fontFamily: 'sans-serif',
      minWidth: '380px',
      maxWidth: '80vw',
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      pointerEvents: 'none',
      fontSize: '13px',
      fontWeight: 600,
      textAlign: 'center',
    }}>
      {text}
    </div>
  );
}

function OnboardingPanel({
  lang,
  onOpenSettings,
  onDismiss,
}: {
  lang: Language;
  onOpenSettings: () => void;
  onDismiss: () => void;
}) {
  return (
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
          onClick={onOpenSettings}
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
          onClick={onDismiss}
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
  );
}

export function App() {
  const { stats, hasLiveStats } = useGameStatsState();
  const {
    settings,
    visible,
    settingsOpen,
    setSettingsOpen,
    closeSettings,
    updateSetting,
    accentColor,
    runtimeDiagnostics,
    lastSettingsSyncOk,
  } = useSettings();
  const [lastChangeAtMs, setLastChangeAtMs] = useState<number>(() => Date.now());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const defaults = getDefaultPositions();
  const lang = settings.general.language;
  const { resolvePosition, handleGroupMove, handleGroupMoveEnd } = useWidgetPositions({
    defaults,
    settingsPositions: settings.positions,
    updateSetting,
    groupIds: WIDGET_GROUP_IDS,
    snapThreshold: SNAP_THRESHOLD,
    grid: GRID,
    fallbackPos: FALLBACK_POS,
  });

  const trackedChangeSignature = useMemo(() => {
    const parts: string[] = [`combat:${stats.isInCombat ? 1 : 0}`];
    if (settings.resistances.magic) parts.push(`res.magic:${stats.resistances.magic}`);
    if (settings.resistances.fire) parts.push(`res.fire:${stats.resistances.fire}`);
    if (settings.resistances.frost) parts.push(`res.frost:${stats.resistances.frost}`);
    if (settings.resistances.shock) parts.push(`res.shock:${stats.resistances.shock}`);
    if (settings.resistances.poison) parts.push(`res.poison:${stats.resistances.poison}`);
    if (settings.resistances.disease) parts.push(`res.disease:${stats.resistances.disease}`);
    if (settings.defense.armorRating) parts.push(`def.armor:${stats.defense.armorRating}`);
    if (settings.defense.damageReduction) parts.push(`def.reduction:${stats.defense.damageReduction}`);
    if (settings.offense.rightHandDamage) parts.push(`off.right:${stats.offense.rightHandDamage}`);
    if (settings.offense.leftHandDamage) parts.push(`off.left:${stats.offense.leftHandDamage}`);
    if (settings.offense.critChance) parts.push(`off.crit:${stats.offense.critChance}`);
    if (settings.equipped.rightHand) parts.push(`eq.right:${stats.equipped.rightHand}`);
    if (settings.equipped.leftHand) parts.push(`eq.left:${stats.equipped.leftHand}`);
    if (settings.movement.speedMult) parts.push(`move.speed:${stats.movement.speedMult}`);
    if (settings.playerInfo.level) parts.push(`pi.level:${stats.playerInfo.level}`);
    if (settings.playerInfo.gold) parts.push(`pi.gold:${stats.playerInfo.gold}`);
    if (settings.playerInfo.carryWeight) {
      parts.push(`pi.carry:${stats.playerInfo.carryWeight}`);
      parts.push(`pi.maxCarry:${stats.playerInfo.maxCarryWeight}`);
    }
    if (settings.playerInfo.health) parts.push(`pi.health:${stats.playerInfo.health}`);
    if (settings.playerInfo.magicka) parts.push(`pi.magicka:${stats.playerInfo.magicka}`);
    if (settings.playerInfo.stamina) parts.push(`pi.stamina:${stats.playerInfo.stamina}`);
    if (settings.experience.enabled) {
      parts.push(`xp.current:${stats.playerInfo.experience}`);
      parts.push(`xp.toNext:${stats.playerInfo.expToNextLevel}`);
      parts.push(`xp.total:${stats.playerInfo.nextLevelTotalXp}`);
    }
    if (settings.time.gameDateTime) {
      parts.push(`time.year:${stats.time.year}`);
      parts.push(`time.month:${stats.time.month}`);
      parts.push(`time.day:${stats.time.day}`);
      parts.push(`time.hour:${stats.time.hour}`);
      parts.push(`time.minute:${stats.time.minute}`);
    }
    if (settings.time.realDateTime) {
      parts.push(`time.real:${Math.floor(nowMs / 1000)}`);
    }
    if (settings.timedEffects.enabled) {
      const timedEffectSignature = stats.timedEffects
        .map(effect => `${effect.stableKey}:${Math.trunc(effect.remainingSec)}:${Math.trunc(effect.totalSec)}:${effect.isDebuff ? 1 : 0}`)
        .join(';');
      parts.push(`effects:${timedEffectSignature}`);
    }
    return parts.join('|');
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
    stats.isInCombat,
    stats.resistances,
    stats.defense,
    stats.offense,
    stats.equipped,
    stats.movement,
    stats.playerInfo,
    stats.time,
    stats.timedEffects,
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
    hasLiveStats &&
    (!settings.general.combatOnly || stats.isInCombat) &&
    changeWindowActive;

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

  const settingsSyncWarningText = useMemo(() => {
    if (lastSettingsSyncOk !== false) return null;
    return lang === 'ko'
      ? '설정 저장에 실패했습니다. 경로/권한을 확인해 주세요.'
      : 'Failed to save settings. Check file path and permissions.';
  }, [lang, lastSettingsSyncOk]);

  const handleOnboardingDismiss = () => {
    updateSetting('general.onboardingSeen', true);
  };

  const handleOnboardingOpenSettings = () => {
    setSettingsOpen(true);
  };

  return (
    <>
      {runtimeWarningText && runtimeDiagnostics && (
        <RuntimeWarningBanner
          text={runtimeWarningText}
          runtimeDiagnostics={runtimeDiagnostics}
          lang={lang}
        />
      )}

      {settingsSyncWarningText && (
        <SettingsSyncWarningBanner
          text={settingsSyncWarningText}
          hasRuntimeWarning={Boolean(runtimeWarningText && runtimeDiagnostics)}
        />
      )}

      {!settings.general.onboardingSeen && (
        <OnboardingPanel
          lang={lang}
          onOpenSettings={handleOnboardingOpenSettings}
          onDismiss={handleOnboardingDismiss}
        />
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

      {hasLiveStats && <ScreenEffects alertData={stats.alertData} settings={settings} />}

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
