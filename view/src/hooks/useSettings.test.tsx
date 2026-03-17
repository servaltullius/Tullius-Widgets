// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { defaultSettings } from '../data/defaultSettings';
import { resolveWidgetItemLayouts } from '../data/widgetItemRegistry';
import { useSettings } from './useSettings';
import type { UpdateSettingFn, WidgetSettings } from '../types/settings';

function Harness({ onSettings }: { onSettings: (settings: WidgetSettings) => void }) {
  const { settings } = useSettings();
  useEffect(() => {
    onSettings(settings);
  }, [onSettings, settings]);
  return null;
}

function SyncResultHarness({ onSync }: { onSync: (result: boolean | null) => void }) {
  const { lastSettingsSyncOk } = useSettings();
  useEffect(() => {
    onSync(lastSettingsSyncOk);
  }, [lastSettingsSyncOk, onSync]);
  return null;
}

function UpdateSettingHarness({ onReady }: { onReady: (updateSetting: UpdateSettingFn) => void }) {
  const { updateSetting } = useSettings();
  useEffect(() => {
    onReady(updateSetting);
  }, [onReady, updateSetting]);
  return null;
}

function SettingsAndUpdateHarness({
  onSettings,
  onReady,
}: {
  onSettings: (settings: WidgetSettings) => void;
  onReady: (updateSetting: UpdateSettingFn) => void;
}) {
  const { settings, updateSetting } = useSettings();
  useEffect(() => {
    onSettings(settings);
  }, [onSettings, settings]);
  useEffect(() => {
    onReady(updateSetting);
  }, [onReady, updateSetting]);
  return null;
}

describe('useSettings', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let latest: WidgetSettings | null = null;

  beforeEach(() => {
    latest = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete window.updateSettings;
    delete window.updateRuntimeStatus;
    delete window.importSettingsFromNative;
    delete window.toggleSettings;
    delete window.toggleWidgetsVisibility;
    delete window.closeSettings;
    delete window.setHUDColor;
    delete window.onSettingsSyncResult;
    delete window.onImportResult;
    delete window.onSettingsVisibilityChanged;
    delete window.TulliusWidgetsBridge;
  });

  it('accepts xsmall size from updateSettings payload', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    expect(typeof window.updateSettings).toBe('function');

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        general: { size: 'xsmall' },
      }));
    });

    expect(latest).not.toBeNull();
    expect(latest!.general.size).toBe('xsmall');
  });

  it('starts with the standalone level widget hidden in fresh stage 2 defaults', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    expect(latest).not.toBeNull();
    expect(latest!.playerInfo.level).toBe(false);
  });

  it('accepts updateSettings from namespaced bridge handler', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    expect(typeof window.TulliusWidgetsBridge?.v1?.updateSettings).toBe('function');

    await act(async () => {
      window.TulliusWidgetsBridge?.v1?.updateSettings?.(JSON.stringify({
        general: { opacity: 55 },
      }));
    });

    expect(latest).not.toBeNull();
    expect(latest!.general.opacity).toBe(55);
  });

  it('stamps imported canonical item layouts with the current viewport metadata when missing', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        schemaVersion: 5,
        itemLayouts: {
          'resistance.fire': {
            visible: true,
            x: 2880,
            y: 240,
            scale: 1.3,
            locked: false,
            zIndex: 8,
          },
        },
      }));
    });

    expect(latest?.itemLayouts['resistance.fire']).toEqual({
      visible: true,
      x: 2880,
      y: 240,
      scale: 1.3,
      locked: false,
      zIndex: 8,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  });

  it('persists viewport metadata when updateSettings loads canonical item layouts without it', async () => {
    vi.useFakeTimers();
    const onSettingsChanged = vi.fn();
    window.onSettingsChanged = onSettingsChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        schemaVersion: 5,
        rev: 117,
        itemLayouts: {
          'experience.progress': {
            visible: true,
            x: 51.1875,
            y: 1295.3275146484375,
            scale: 1.68,
            locked: false,
            zIndex: 0,
          },
        },
      }));
      vi.advanceTimersByTime(250);
    });

    expect(onSettingsChanged).toHaveBeenCalledTimes(1);
    expect(JSON.parse(onSettingsChanged.mock.calls[0]?.[0] as string)).toMatchObject({
      itemLayouts: {
        'experience.progress': {
          visible: true,
          x: 51.1875,
          y: 1295.3275146484375,
          scale: 1.68,
          locked: false,
          zIndex: 0,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
      },
      rev: 118,
    });

    vi.useRealTimers();
  });

  it('preserves imported group scales from native import when serializing later settings updates', async () => {
    const onSettingsChanged = vi.fn();
    const onImportResult = vi.fn();
    let updateSetting: UpdateSettingFn | null = null;
    vi.useFakeTimers();
    window.onSettingsChanged = onSettingsChanged;
    window.onImportResult = onImportResult;

    await act(async () => {
      root = createRoot(container);
      root.render(<SettingsAndUpdateHarness onSettings={settings => { latest = settings; }} onReady={value => { updateSetting = value; }} />);
    });

    expect(typeof window.importSettingsFromNative).toBe('function');

    await act(async () => {
      window.importSettingsFromNative?.(JSON.stringify({
        groupScales: {
          playerInfo: 1.4,
          unknownGroup: 2.1,
          invalid: 0,
        },
      }));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onImportResult).toHaveBeenCalledWith(true);
    expect(latest).not.toBeNull();
    expect(latest!.groupScales).toEqual({
      playerInfo: 1.4,
      unknownGroup: 2.1,
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(onSettingsChanged).toHaveBeenCalledTimes(1);
    expect(JSON.parse(onSettingsChanged.mock.calls[0]?.[0] as string).groupScales).toEqual({
      playerInfo: 1.4,
      unknownGroup: 2.1,
    });

    await act(async () => {
      updateSetting?.('general.opacity', 75);
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(onSettingsChanged).toHaveBeenCalledTimes(2);
    expect(JSON.parse(onSettingsChanged.mock.calls[1]?.[0] as string).groupScales).toEqual({
      playerInfo: 1.4,
      unknownGroup: 2.1,
    });
  });

  it('ignores stale settings payload revision', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        schemaVersion: 1,
        rev: 5,
        general: { opacity: 77 },
      }));
    });

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        schemaVersion: 1,
        rev: 3,
        general: { opacity: 22 },
      }));
    });

    expect(latest).not.toBeNull();
    expect(latest!.general.opacity).toBe(77);
  });

  it('exposes native settings sync result callback', async () => {
    let syncResult: boolean | null = null;

    await act(async () => {
      root = createRoot(container);
      root.render(<SyncResultHarness onSync={result => { syncResult = result; }} />);
    });

    expect(typeof window.onSettingsSyncResult).toBe('function');

    await act(async () => {
      window.onSettingsSyncResult?.(false);
    });

    expect(syncResult).toBe(false);
  });

  it('retries the last settings payload once after native sync failure', async () => {
    vi.useFakeTimers();
    const onSettingsChanged = vi.fn();
    let updateSetting: UpdateSettingFn | null = null;
    window.onSettingsChanged = onSettingsChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(<UpdateSettingHarness onReady={value => { updateSetting = value; }} />);
    });

    await act(async () => {
      updateSetting?.('general.opacity', 77);
      vi.advanceTimersByTime(200);
    });

    expect(onSettingsChanged).toHaveBeenCalledTimes(1);
    const firstRevision = (JSON.parse(onSettingsChanged.mock.calls[0]?.[0] as string) as { rev?: number }).rev;

    await act(async () => {
      window.onSettingsSyncResult?.(false, firstRevision);
      vi.advanceTimersByTime(200);
    });

    expect(onSettingsChanged).toHaveBeenCalledTimes(2);
    expect(onSettingsChanged.mock.calls[1]?.[0]).toBe(onSettingsChanged.mock.calls[0]?.[0]);
    vi.useRealTimers();
  });

  it('allows retrying the same setting value again after repeated native sync failures', async () => {
    vi.useFakeTimers();
    const onSettingsChanged = vi.fn();
    let updateSetting: UpdateSettingFn | null = null;
    window.onSettingsChanged = onSettingsChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(<UpdateSettingHarness onReady={value => { updateSetting = value; }} />);
    });

    await act(async () => {
      updateSetting?.('general.opacity', 77);
      vi.advanceTimersByTime(200);
    });

    const firstRevision = (JSON.parse(onSettingsChanged.mock.calls[0]?.[0] as string) as { rev?: number }).rev;

    await act(async () => {
      window.onSettingsSyncResult?.(false, firstRevision);
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      window.onSettingsSyncResult?.(false, firstRevision);
      updateSetting?.('general.opacity', 77);
      vi.advanceTimersByTime(200);
    });

    expect(onSettingsChanged).toHaveBeenCalledTimes(3);
    const retriedPayload = JSON.parse(onSettingsChanged.mock.calls[2]?.[0] as string) as WidgetSettings & { rev?: number };
    const originalPayload = JSON.parse(onSettingsChanged.mock.calls[0]?.[0] as string) as WidgetSettings & { rev?: number };
    expect(retriedPayload.general.opacity).toBe(77);
    expect(retriedPayload.rev).toBeGreaterThan(originalPayload.rev ?? 0);
    vi.useRealTimers();
  });

  it('allows retrying the same canonical item visibility value again after repeated native sync failures', async () => {
    vi.useFakeTimers();
    const onSettingsChanged = vi.fn();
    let updateSetting: UpdateSettingFn | null = null;
    window.onSettingsChanged = onSettingsChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(<UpdateSettingHarness onReady={value => { updateSetting = value; }} />);
    });

    await act(async () => {
      updateSetting?.('general.opacity', 77);
      vi.advanceTimersByTime(200);
    });

    const firstRevision = (JSON.parse(onSettingsChanged.mock.calls[0]?.[0] as string) as { rev?: number }).rev;

    await act(async () => {
      window.onSettingsSyncResult?.(false, firstRevision);
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      window.onSettingsSyncResult?.(false, firstRevision);
      updateSetting?.('itemLayouts.resistance.disease.visible', false);
      vi.advanceTimersByTime(200);
    });

    expect(onSettingsChanged).toHaveBeenCalledTimes(3);
    const retriedPayload = JSON.parse(onSettingsChanged.mock.calls[2]?.[0] as string) as WidgetSettings & { rev?: number };
    expect(retriedPayload.general.opacity).toBe(77);
    expect(retriedPayload.itemLayouts['resistance.disease']).toBeUndefined();
    expect(retriedPayload.rev).toBeGreaterThan(firstRevision ?? 0);
    vi.useRealTimers();
  });

  it('returns import failure for invalid non-object payload', async () => {
    const onImportResult = vi.fn();
    window.onImportResult = onImportResult;

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    await act(async () => {
      window.importSettingsFromNative?.('[]');
    });

    expect(onImportResult).toHaveBeenCalledWith(false);
  });

  it('reports settings panel visibility changes to native bridge listeners', async () => {
    const onSettingsVisibilityChanged = vi.fn();
    window.onSettingsVisibilityChanged = onSettingsVisibilityChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    expect(onSettingsVisibilityChanged).toHaveBeenNthCalledWith(1, 'closed');

    await act(async () => {
      window.toggleSettings?.();
    });

    expect(onSettingsVisibilityChanged).toHaveBeenNthCalledWith(2, 'open');

    await act(async () => {
      window.closeSettings?.();
    });

    expect(onSettingsVisibilityChanged).toHaveBeenNthCalledWith(3, 'closed');
  });

  it('updates itemLayouts entries addressed by dotted item ids', async () => {
    let updateSetting: UpdateSettingFn | null = null;

    await act(async () => {
      root = createRoot(container);
      root.render(
        <SettingsAndUpdateHarness
          onSettings={settings => { latest = settings; }}
          onReady={value => { updateSetting = value; }}
        />,
      );
    });

    await act(async () => {
      updateSetting?.('itemLayouts.player.level.visible', false);
      updateSetting?.('itemLayouts.player.level.x', 42);
      updateSetting?.('itemLayouts.player.level.y', 84);
      updateSetting?.('itemLayouts.player.level.scale', 1.5);
    });

    expect(latest?.itemLayouts['player.level']).toEqual({
      visible: false,
      x: 42,
      y: 84,
      scale: 1.5,
      locked: false,
      zIndex: 1,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  });

  it('updates canonical resistance itemLayouts entries addressed by dotted item ids', async () => {
    let updateSetting: UpdateSettingFn | null = null;

    await act(async () => {
      root = createRoot(container);
      root.render(
        <SettingsAndUpdateHarness
          onSettings={settings => { latest = settings; }}
          onReady={value => { updateSetting = value; }}
        />,
      );
    });

    await act(async () => {
      updateSetting?.('itemLayouts.resistance.disease.visible', true);
    });

    const fallbackLayout = resolveWidgetItemLayouts({
      settings: structuredClone(defaultSettings),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    })['resistance.disease'];

    expect(fallbackLayout).toBeTruthy();
    expect(latest?.itemLayouts['resistance.disease']).toEqual({
      ...fallbackLayout,
      visible: true,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  });

  it('rewrites legacy visibility toggles to canonical itemLayouts entries', async () => {
    const onSettingsChanged = vi.fn();
    let updateSetting: UpdateSettingFn | null = null;
    vi.useFakeTimers();
    window.onSettingsChanged = onSettingsChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(
        <SettingsAndUpdateHarness
          onSettings={settings => { latest = settings; }}
          onReady={value => { updateSetting = value; }}
        />,
      );
    });

    await act(async () => {
      window.importSettingsFromNative?.(JSON.stringify({
        itemLayouts: {
          'player.level': {
            visible: true,
            x: 64,
            y: 96,
            scale: 1.1,
            locked: true,
            zIndex: 11,
          },
        },
      }));
      await Promise.resolve();
    });

    expect(latest?.playerInfo.level).toBe(true);
    expect(latest?.itemLayouts['player.level']).toEqual({
      visible: true,
      x: 64,
      y: 96,
      scale: 1.1,
      locked: true,
      zIndex: 11,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    await act(async () => {
      updateSetting?.('playerInfo.level', false);
    });

    expect(latest?.itemLayouts['player.level']).toEqual({
      visible: false,
      x: 64,
      y: 96,
      scale: 1.1,
      locked: true,
      zIndex: 11,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    expect(latest?.playerInfo.level).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(JSON.parse(onSettingsChanged.mock.calls[onSettingsChanged.mock.calls.length - 1]?.[0] as string).itemLayouts['player.level']).toEqual({
      visible: false,
      x: 64,
      y: 96,
      scale: 1.1,
      locked: true,
      zIndex: 11,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    vi.useRealTimers();
  });

  it('imports canonical itemLayouts payloads without requiring legacy layout fields', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    await act(async () => {
      window.importSettingsFromNative?.(JSON.stringify({
        itemLayouts: {
          'time.game': { visible: false, x: 320, y: 120, scale: 1.2, locked: false, zIndex: 20 },
          'player.level': { visible: true, x: 64, y: 96, scale: 1.1, locked: true, zIndex: 1 },
        },
      }));
    });

    expect(latest?.itemLayouts['time.game']).toEqual({
      visible: false,
      x: 320,
      y: 120,
      scale: 1.2,
      locked: false,
      zIndex: 20,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    expect(latest?.itemLayouts['player.level']).toEqual({
      visible: true,
      x: 64,
      y: 96,
      scale: 1.1,
      locked: true,
      zIndex: 1,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  });

  it('preserves standalone level visibility for legacy imports without explicit level fields', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    await act(async () => {
      window.importSettingsFromNative?.(JSON.stringify({
        schemaVersion: 3,
        playerInfo: {
          gold: 777,
        },
      }));
    });

    expect(latest?.playerInfo.level).toBe(true);
  });

  it('preserves standalone level visibility for schema-less legacy imports on the import path', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    await act(async () => {
      window.importSettingsFromNative?.(JSON.stringify({
        playerInfo: {
          gold: false,
        },
      }));
    });

    expect(latest?.playerInfo.level).toBe(true);
  });

  it('does not re-enable standalone level for schema-less partial runtime updates', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    await act(async () => {
      window.updateSettings?.(JSON.stringify({
        playerInfo: {
          gold: 777,
        },
      }));
    });

    expect(latest?.playerInfo.level).toBe(false);
    expect(latest?.playerInfo.gold).toBe(true);
  });

  it('keeps standalone level hidden for legacy imports that explicitly disable it', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    await act(async () => {
      window.importSettingsFromNative?.(JSON.stringify({
        schemaVersion: 3,
        playerInfo: {
          level: false,
          gold: 777,
        },
      }));
    });

    expect(latest?.playerInfo.level).toBe(false);
  });

  it('prefers canonical itemLayouts visibility when legacy player level import fields conflict', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onSettings={settings => { latest = settings; }} />);
    });

    await act(async () => {
      window.importSettingsFromNative?.(JSON.stringify({
        schemaVersion: 3,
        playerInfo: {
          level: true,
        },
        itemLayouts: {
          'player.level': { visible: false, x: 64, y: 96, scale: 1.1 },
        },
      }));
    });

    expect(latest?.playerInfo.level).toBe(false);
    expect(latest?.itemLayouts['player.level']).toMatchObject({
      visible: false,
    });
  });

  it('persists new display-mode settings with the current schema version', async () => {
    const onSettingsChanged = vi.fn();
    let updateSetting: UpdateSettingFn | null = null;
    vi.useFakeTimers();
    window.onSettingsChanged = onSettingsChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(
        <SettingsAndUpdateHarness
          onSettings={settings => { latest = settings; }}
          onReady={value => { updateSetting = value; }}
        />,
      );
    });

    await act(async () => {
      updateSetting?.('playerInfo.carryWeightDisplay', 'meterOnly');
      updateSetting?.('resistances.displayMode', 'rawOnly');
      updateSetting?.('time.gameDisplay', 'timeOnly');
      updateSetting?.('time.realDisplay', 'timeOnly');
      updateSetting?.('timedEffects.listLayout', 'horizontal');
    });

    expect(latest?.playerInfo.carryWeightDisplay).toBe('meterOnly');
    expect(latest?.resistances.displayMode).toBe('rawOnly');
    expect(latest?.time.gameDisplay).toBe('timeOnly');
    expect(latest?.time.realDisplay).toBe('timeOnly');
    expect(latest?.timedEffects.listLayout).toBe('horizontal');

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(onSettingsChanged).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(onSettingsChanged.mock.calls[0]?.[0] as string) as WidgetSettings & { schemaVersion?: number };

    expect(payload.schemaVersion).toBe(5);
    expect(payload.playerInfo.carryWeightDisplay).toBe('meterOnly');
    expect(payload.resistances.displayMode).toBe('rawOnly');
    expect(payload.time.gameDisplay).toBe('timeOnly');
    expect(payload.time.realDisplay).toBe('timeOnly');
    expect(payload.timedEffects.listLayout).toBe('horizontal');
    vi.useRealTimers();
  });
});
