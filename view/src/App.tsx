import { useCallback, useEffect, useMemo, useState } from 'react';
import { HudWidgetItems } from './components/HudWidgetItems';
import { OnboardingPanel, RuntimeWarningBanner, SettingsSyncWarningBanner } from './components/HudOverlays';
import { SettingsPanel } from './components/SettingsPanel';
import { ScreenEffects } from './components/ScreenEffects';
import { useGameStatsState } from './hooks/useGameStats';
import { useSettings } from './hooks/useSettings';
import { useLocalization } from './i18n/useLocalization';
import { useWidgetItemLayouts } from './hooks/useWidgetItemLayouts';
import {
  buildTrackedChangeSignature,
  getRuntimeWarningText,
  getSettingsSyncWarningText,
  resolveHudVisibility,
} from './utils/hudPresentation';
import './assets/ui-theme.css';
import './assets/screen-effects.css';

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
  const { activeLanguage: lang, availableLanguages } = useLocalization(settings.general.language);
  const itemLayouts = useWidgetItemLayouts({
    settings,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
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
    return buildTrackedChangeSignature(stats, itemLayouts, nowMs);
  }, [itemLayouts, nowMs, stats]);

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

  const runtimeWarningText = getRuntimeWarningText(lang, runtimeDiagnostics);
  const settingsSyncWarningText = getSettingsSyncWarningText(lang, settingsSyncState, lastSettingsSyncOk);

  const handleOnboardingDismiss = () => {
    updateSetting('general.onboardingSeen', true);
  };

  const handleOnboardingOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleCloseSettings = useCallback(() => {
    closeSettings();
  }, [closeSettings]);

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

      <HudWidgetItems
        shouldShow={shouldShow}
        stats={stats}
        settings={settings}
        settingsOpen={settingsOpen}
        lang={lang}
        itemLayouts={itemLayouts}
        accentColor={accentColor}
      />

      {hasLiveStats && <ScreenEffects alertData={stats.alertData} settings={settings} />}

      <SettingsPanel
        settings={settings}
        lang={lang}
        effectiveVisible={visible}
        open={settingsOpen}
        onClose={handleCloseSettings}
        onUpdate={updateSetting}
        accentColor={accentColor}
        availableLanguages={availableLanguages}
      />
    </>
  );
}
