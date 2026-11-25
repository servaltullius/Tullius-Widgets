import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HudWidgetItems } from './components/HudWidgetItems';
import { OnboardingPanel, RuntimeWarningBanner, SettingsSyncWarningBanner } from './components/HudOverlays';
import { SettingsPanel } from './components/SettingsPanel';
import { WidgetEditGuides } from './components/WidgetEditGuides';
import { useGameStatsState } from './hooks/useGameStats';
import { useAutoHide } from './hooks/useAutoHide';
import { useSettings } from './hooks/useSettings';
import { useWidgetEditSelection } from './hooks/useWidgetEditSelection';
import { useWidgetWheelAdjust } from './hooks/useWidgetWheelAdjust';
import { createSelectedItemLayoutActions } from './hooks/useSelectedItemLayoutActions';
import { useWidgetKeyboardNudge } from './hooks/useWidgetKeyboardNudge';
import { useLayoutHistory } from './hooks/useLayoutHistory';
import { useLocalization } from './i18n/useLocalization';
import { useWidgetItemLayouts } from './hooks/useWidgetItemLayouts';
import type { WidgetItemLayout } from './types/settings';
import { getRuntimeWarningText, getSettingsSyncWarningText } from './utils/hudPresentation';
import { formatHotkey } from './utils/hotkeys';
import { applyTimedEffectFilter } from './utils/timedEffectFilter';
import { measureWidgetBounds, measureWidgetBoundsMap } from './utils/widgetBounds';
import { snapWidgetMove, type AlignmentGuide } from './utils/widgetSnap';
import { resolveFontPresetVariables } from './utils/fontPresets';
import { FONTS_READY_EVENT } from './utils/fontsReady';
import { IconPacksContext, useIconPacksBridge } from './hooks/useIconPacks';
import { UserFontsContext, useUserFontsBridge } from './hooks/useUserFonts';
import { useUserFontFace } from './hooks/useUserFontFace';
import './assets/ui-theme.css';
import './assets/compact-theme.css';

const SNAP_THRESHOLD = 15;
const GRID = 10;
const HUD_FADE_IN_MS = 200;
const HUD_FADE_OUT_MS = 500;

function resolveItemLayout(
  itemId: string,
  canonicalLayouts: Record<string, WidgetItemLayout>,
  previewLayouts: Record<string, WidgetItemLayout>,
): WidgetItemLayout | null {
  return previewLayouts[itemId] ?? canonicalLayouts[itemId] ?? null;
}

export function App() {
  const { stats: rawStats, hasLiveStats } = useGameStatsState();
  const iconPacks = useIconPacksBridge();
  const userFonts = useUserFontsBridge();
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
  const stats = useMemo(
    () => applyTimedEffectFilter(rawStats, settings.timedEffects),
    [rawStats, settings.timedEffects],
  );
  const { activeLanguage: lang, availableLanguages } = useLocalization(settings.general.language);
  const hudFontRoot = useRef<HTMLDivElement>(null);
  const lastHudFamily = useRef<string | null>(null);
  const relayoutHudText = useCallback(() => {
    const root = hudFontRoot.current;
    if (!root) return;
    const hasPass = root.classList.contains('tw-font-pass-a') || root.classList.contains('tw-font-pass-b');
    // The bundled-font startup rule already uses normal kerning for compact text.
    const usesNormalKerning = hasPass
      ? root.classList.contains('tw-font-pass-a')
      : document.documentElement.classList.contains('tw-fonts-ready') && root.querySelector('.tw-compact') !== null;
    const firstPass = !usesNormalKerning;
    root.classList.toggle('tw-font-pass-a', firstPass);
    root.classList.toggle('tw-font-pass-b', !firstPass);
  }, []);
  const { family: userFamily, status: userFontStatus } = useUserFontFace(userFonts, settings.general.userFont, relayoutHudText);
  useEffect(() => {
    // Once a user font switch has set a relayout class, the startup rule for the bundled font no
    // longer changes the computed style, so the bundled font becoming ready must relayout here.
    const handleFontsReady = () => {
      const root = hudFontRoot.current;
      if (root && (root.classList.contains('tw-font-pass-a') || root.classList.contains('tw-font-pass-b'))) {
        relayoutHudText();
      }
    };
    window.addEventListener(FONTS_READY_EVENT, handleFontsReady);
    return () => window.removeEventListener(FONTS_READY_EVENT, handleFontsReady);
  }, [relayoutHudText]);
  useLayoutEffect(() => {
    if (userFamily !== lastHudFamily.current || userFontStatus === 'failed') relayoutHudText();
    lastHudFamily.current = userFamily;
  }, [userFamily, userFontStatus, relayoutHudText]);
  const fontVariables = useMemo(
    () => resolveFontPresetVariables(settings.general.fontPreset, settings.general.hudStyle, userFamily),
    [settings.general.fontPreset, settings.general.hudStyle, userFamily],
  );
  const canonicalItemLayouts = useWidgetItemLayouts({
    settings,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  });
  const [previewLayouts, setPreviewLayouts] = useState<Record<string, WidgetItemLayout>>({});
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);
  const itemElementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const keyboardGuideTimeoutRef = useRef<number | null>(null);
  const {
    selectedItemId,
    interactionMode,
    interactionResetToken,
    selectItem,
    clearSelection,
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

  const clearKeyboardGuideTimeout = useCallback(() => {
    if (keyboardGuideTimeoutRef.current !== null) {
      window.clearTimeout(keyboardGuideTimeoutRef.current);
      keyboardGuideTimeoutRef.current = null;
    }
  }, []);

  const clearPreviewState = useCallback(() => {
    clearKeyboardGuideTimeout();
    setPreviewLayouts(previous => (Object.keys(previous).length === 0 ? previous : {}));
    setActiveGuides(previous => (previous.length === 0 ? previous : []));
  }, [clearKeyboardGuideTimeout]);

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

  useEffect(() => {
    if (!settingsOpen || settings.general.onboardingSeen) return;
    updateSetting('general.onboardingSeen', true);
  }, [settings.general.onboardingSeen, settingsOpen, updateSetting]);

  const { visibility, itemPresence } = useAutoHide({
    visible,
    hasLiveStats,
    general: settings.general,
    stats,
    settingsOpen,
    itemLayouts,
  });

  const measureSelectedItemBounds = useCallback(
    (itemId: string) => measureWidgetBounds(itemElementRefs.current[itemId] ?? null),
    [],
  );
  const measureHudWidgetBounds = useCallback(
    () => Object.values(measureWidgetBoundsMap(itemElementRefs.current)),
    [],
  );

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

  const handleKeyboardNudge = useCallback((deltaX: number, deltaY: number) => {
    if (!selectedItemId) {
      return;
    }

    const baseLayout = canonicalItemLayouts[selectedItemId];
    if (!baseLayout) {
      return;
    }

    const preview = computeMovePreview(selectedItemId, baseLayout.x + deltaX, baseLayout.y + deltaY);
    clearKeyboardGuideTimeout();
    setActiveGuides(preview.guides);
    keyboardGuideTimeoutRef.current = window.setTimeout(() => {
      keyboardGuideTimeoutRef.current = null;
      setActiveGuides(previous => (previous.length === 0 ? previous : []));
    }, 300);
  }, [canonicalItemLayouts, clearKeyboardGuideTimeout, computeMovePreview, selectedItemId]);

  const restoreItemLayouts = useCallback((layouts: Record<string, WidgetItemLayout>) => {
    updateSetting('itemLayouts', layouts);
  }, [updateSetting]);
  const layoutHistory = useLayoutHistory({
    enabled: settingsOpen,
    itemLayouts: settings.itemLayouts,
    onRestore: restoreItemLayouts,
    resetKey: `${settings.general.hudStyle}:${settings.general.compactAnchor}:${settings.general.size}`,
  });

  useWidgetWheelAdjust({
    enabled: settingsOpen && interactionMode === null,
    itemLayouts: canonicalItemLayouts,
    opacity: settings.general.opacity,
    updateSetting,
    selectItem,
  });

  useWidgetKeyboardNudge({
    enabled: settingsOpen && selectedItemId !== null,
    selectedItemId,
    selectedItemLayoutActions,
    onKeyboardNudge: handleKeyboardNudge,
  });

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

  useEffect(() => {
    return () => {
      clearKeyboardGuideTimeout();
    };
  }, [clearKeyboardGuideTimeout]);

  return (
    <IconPacksContext.Provider value={iconPacks}>
    <div data-testid="app-font-theme" style={fontVariables}>
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
          settingsKeyLabel={formatHotkey(settings.general.settingsHotkey)}
          visibilityKeyLabel={formatHotkey(settings.general.visibilityHotkey)}
          onOpenSettings={handleOnboardingOpenSettings}
          onDismiss={handleOnboardingDismiss}
        />
      )}

      <div
        ref={hudFontRoot}
        className="tw-hud-font-root"
        style={{
          opacity: visibility.opacity,
          // Only auto-hide fades. F11, the settings panel and the free camera switch at once as before.
          transition: settings.general.autoHide.enabled
            ? `opacity ${visibility.opacity === 1 ? HUD_FADE_IN_MS : HUD_FADE_OUT_MS}ms`
            : 'none',
        }}
      >
        <HudWidgetItems
          shouldShow={visibility.render}
          visibility={visibility}
          stats={stats}
          settings={settings}
          settingsOpen={settingsOpen}
          lang={lang}
          itemLayouts={itemLayouts}
          itemPresence={itemPresence}
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
      </div>

      <WidgetEditGuides visible={settingsOpen} guides={activeGuides} />


      <UserFontsContext.Provider value={{ fonts: userFonts, status: userFontStatus }}>
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
          measureWidgetBounds={measureHudWidgetBounds}
          measureItemBounds={measureSelectedItemBounds}
          interactionMode={interactionMode}
          onDeselectItem={clearSelection}
          onLayoutCheckpoint={layoutHistory.checkpoint}
        />
      </UserFontsContext.Provider>
    </div>
    </IconPacksContext.Provider>
  );
}
