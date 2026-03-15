import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HudWidgetItems } from './components/HudWidgetItems';
import { OnboardingPanel, RuntimeWarningBanner, SettingsSyncWarningBanner } from './components/HudOverlays';
import { SettingsPanel } from './components/SettingsPanel';
import { ScreenEffects } from './components/ScreenEffects';
import { WidgetEditGuides } from './components/WidgetEditGuides';
import { useGameStatsState } from './hooks/useGameStats';
import { useSettings } from './hooks/useSettings';
import { useWidgetEditSelection } from './hooks/useWidgetEditSelection';
import { createSelectedItemLayoutActions } from './hooks/useSelectedItemLayoutActions';
import { useLocalization } from './i18n/useLocalization';
import { useWidgetItemLayouts } from './hooks/useWidgetItemLayouts';
import type { WidgetItemLayout } from './types/settings';
import {
  buildTrackedChangeSignature,
  getRuntimeWarningText,
  getSettingsSyncWarningText,
  resolveHudVisibility,
} from './utils/hudPresentation';
import { measureWidgetBoundsMap } from './utils/widgetBounds';
import { snapWidgetMove, type AlignmentGuide } from './utils/widgetSnap';
import './assets/ui-theme.css';
import './assets/screen-effects.css';

const SNAP_THRESHOLD = 15;
const GRID = 10;

function resolveItemLayout(
  itemId: string,
  canonicalLayouts: Record<string, WidgetItemLayout>,
  previewLayouts: Record<string, WidgetItemLayout>,
): WidgetItemLayout | null {
  return previewLayouts[itemId] ?? canonicalLayouts[itemId] ?? null;
}

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
  const canonicalItemLayouts = useWidgetItemLayouts({
    settings,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  });
  const [previewLayouts, setPreviewLayouts] = useState<Record<string, WidgetItemLayout>>({});
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);
  const itemElementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const {
    selectedItemId,
    interactionResetToken,
    selectItem,
    startInteraction,
    endInteraction,
  } = useWidgetEditSelection({ settingsOpen });
  const itemLayouts = useMemo(() => {
    return {
      ...canonicalItemLayouts,
      ...previewLayouts,
    };
  }, [canonicalItemLayouts, previewLayouts]);
  const selectedItemLayoutActions = useMemo(() => {
    return createSelectedItemLayoutActions({
      selectedItemId,
      itemLayouts: canonicalItemLayouts,
      settings,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      updateSetting,
    });
  }, [canonicalItemLayouts, selectedItemId, settings, updateSetting, viewport.height, viewport.width]);

  const clearPreviewState = useCallback(() => {
    setPreviewLayouts(previous => (Object.keys(previous).length === 0 ? previous : {}));
    setActiveGuides(previous => (previous.length === 0 ? previous : []));
  }, []);

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

  useEffect(() => {
    if (!settingsOpen) {
      queueMicrotask(() => {
        clearPreviewState();
      });
    }
  }, [clearPreviewState, settingsOpen]);

  useEffect(() => {
    if (interactionResetToken === 0) {
      return;
    }

    queueMicrotask(() => {
      clearPreviewState();
    });
  }, [clearPreviewState, interactionResetToken]);

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

  const registerItemElement = useCallback((itemId: string, element: HTMLDivElement | null) => {
    itemElementRefs.current[itemId] = element;
  }, []);

  const computeMovePreview = useCallback((itemId: string, rawX: number, rawY: number) => {
    return snapWidgetMove({
      activeId: itemId,
      rawX,
      rawY,
      boundsById: measureWidgetBoundsMap(itemElementRefs.current),
      snapThreshold: SNAP_THRESHOLD,
      grid: GRID,
    });
  }, []);

  const handleMoveItem = useCallback((itemId: string, rawX: number, rawY: number) => {
    const snapped = computeMovePreview(itemId, rawX, rawY);
    setPreviewLayouts(previous => {
      const baseLayout = resolveItemLayout(itemId, canonicalItemLayouts, previous);
      if (!baseLayout) {
        return previous;
      }

      return {
        ...previous,
        [itemId]: {
          ...baseLayout,
          x: snapped.position.x,
          y: snapped.position.y,
        },
      };
    });
    setActiveGuides(snapped.guides);
  }, [canonicalItemLayouts, computeMovePreview]);

  const handleMoveItemEnd = useCallback((itemId: string, rawX: number, rawY: number) => {
    const snapped = computeMovePreview(itemId, rawX, rawY);
    updateSetting(`itemLayouts.${itemId}.x`, snapped.position.x, { persist: false });
    updateSetting(`itemLayouts.${itemId}.y`, snapped.position.y);
    setPreviewLayouts(previous => {
      if (!(itemId in previous)) {
        return previous;
      }

      const next = { ...previous };
      delete next[itemId];
      return next;
    });
    setActiveGuides([]);
  }, [computeMovePreview, updateSetting]);

  const handleResizeItem = useCallback((itemId: string, scale: number) => {
    setPreviewLayouts(previous => {
      const baseLayout = resolveItemLayout(itemId, canonicalItemLayouts, previous);
      if (!baseLayout) {
        return previous;
      }

      return {
        ...previous,
        [itemId]: {
          ...baseLayout,
          scale,
        },
      };
    });
    setActiveGuides([]);
  }, [canonicalItemLayouts]);

  const handleResizeItemEnd = useCallback((itemId: string, scale: number) => {
    updateSetting(`itemLayouts.${itemId}.scale`, scale);
    setPreviewLayouts(previous => {
      if (!(itemId in previous)) {
        return previous;
      }

      const next = { ...previous };
      delete next[itemId];
      return next;
    });
    setActiveGuides([]);
  }, [updateSetting]);

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
        editable={settingsOpen}
        selectedItemId={selectedItemId}
        onSelectItem={selectItem}
        onInteractionStart={startInteraction}
        onInteractionEnd={endInteraction}
        onMoveItem={handleMoveItem}
        onMoveItemEnd={handleMoveItemEnd}
        onResizeItem={handleResizeItem}
        onResizeItemEnd={handleResizeItemEnd}
        onItemElementRef={registerItemElement}
      />

      <WidgetEditGuides visible={settingsOpen} guides={activeGuides} />

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
        selectedItemId={selectedItemId}
        selectedItemLayout={selectedItemId ? itemLayouts[selectedItemId] ?? null : null}
        selectedItemLayoutActions={selectedItemLayoutActions}
      />
    </>
  );
}
