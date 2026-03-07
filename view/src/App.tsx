import { useCallback, useEffect, useMemo, useState } from 'react';
import { HudWidgetGroups } from './components/HudWidgetGroups';
import { OnboardingPanel, RuntimeWarningBanner, SettingsSyncWarningBanner } from './components/HudOverlays';
import { SettingsPanel } from './components/SettingsPanel';
import { ScreenEffects } from './components/ScreenEffects';
import { useGameStatsState } from './hooks/useGameStats';
import { useSettings } from './hooks/useSettings';
import { useWidgetPositions } from './hooks/useWidgetPositions';
import { getDefaultPositions } from './data/defaultSettings';
import { WIDGET_GROUP_IDS } from './data/widgetRegistry';
import type { GroupPosition } from './types/settings';
import {
  buildTrackedChangeSignature,
  getRuntimeWarningText,
  getSettingsSyncWarningText,
  resolveHudVisibility,
} from './utils/hudPresentation';
import './assets/ui-theme.css';
import './assets/screen-effects.css';
const SNAP_THRESHOLD = 15;
const GRID = 10;
const FALLBACK_POS: GroupPosition = { x: 100, y: 100 };

export function App() {
  const { stats, hasLiveStats } = useGameStatsState();
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
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
    settingsSyncState,
  } = useSettings();
  const [lastChangeAtMs, setLastChangeAtMs] = useState<number>(() => Date.now());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const defaults = useMemo(
    () => getDefaultPositions(
      viewport.width,
      viewport.height,
      settings.general.size,
      settings.layouts,
    ),
    [settings.general.size, settings.layouts, viewport.height, viewport.width],
  );
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

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const trackedChangeSignature = useMemo(() => {
    return buildTrackedChangeSignature(stats, settings, nowMs);
  }, [nowMs, settings, stats]);

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

  const { shouldShow } = resolveHudVisibility({
    visible,
    hasLiveStats,
    settings,
    stats,
    settingsOpen,
    nowMs,
    lastChangeAtMs,
  });

  const groupProps = useCallback((groupId: string) => {
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
  }, [resolvePosition, settings.general.opacity, settings.general.size, settings.layouts, accentColor, settings.general.transparentBg, settingsOpen, handleGroupMove, handleGroupMoveEnd]);

  const runtimeWarningText = getRuntimeWarningText(lang, runtimeDiagnostics);
  const settingsSyncWarningText = getSettingsSyncWarningText(lang, settingsSyncState, lastSettingsSyncOk);

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

      <HudWidgetGroups
        shouldShow={shouldShow}
        stats={stats}
        settings={settings}
        settingsOpen={settingsOpen}
        lang={lang}
        getGroupProps={groupProps}
      />

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
