// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { useSettings } from './useSettings';
import type { WidgetSettings } from '../types/settings';

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
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
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
});
