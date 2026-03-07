// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useRef } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { defaultSettings } from '../data/defaultSettings';
import type { WidgetSettings } from '../types/settings';
import { useSettingsSync } from './useSettingsSync';

interface SyncHarnessValue {
  lastSettingsSyncOk: boolean | null;
  settingsSyncState: string;
  notifySettingsChanged: (settings: WidgetSettings, explicitRevision?: number) => void;
  rememberQueuedSettings: (settings: WidgetSettings, explicitRevision?: number) => void;
  retryPersistedSettings: (currentSettings: WidgetSettings) => boolean;
  handleSettingsSyncResult: (success: boolean, revision?: number) => void;
}

function readRevisionFromPayload(payload: unknown): number {
  const parsed = JSON.parse(String(payload)) as { rev?: number };
  return parsed.rev ?? -1;
}

function SyncHarness({ onReady }: { onReady: (value: SyncHarnessValue) => void }) {
  const settingsRevisionRef = useRef(0);
  const sync = useSettingsSync({ settingsRevisionRef });

  useEffect(() => {
    onReady(sync);
  }, [onReady, sync]);

  return null;
}

describe('useSettingsSync', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
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
    delete window.onSettingsChanged;
  });

  it('retries the last dispatched payload once after sync failure', async () => {
    vi.useFakeTimers();
    const onSettingsChanged = vi.fn();
    let api: SyncHarnessValue | null = null;
    window.onSettingsChanged = onSettingsChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(<SyncHarness onReady={value => { api = value; }} />);
    });

    await act(async () => {
      api?.notifySettingsChanged({
        ...defaultSettings,
        general: { ...defaultSettings.general, opacity: 77 },
      });
      vi.advanceTimersByTime(200);
    });

    const dispatchedRevision = readRevisionFromPayload(onSettingsChanged.mock.calls[0]?.[0]);

    await act(async () => {
      api?.handleSettingsSyncResult(false, dispatchedRevision);
      vi.advanceTimersByTime(200);
    });

    expect(api!.settingsSyncState).toBe('retrying');
    expect(onSettingsChanged).toHaveBeenCalledTimes(2);
    expect(onSettingsChanged.mock.calls[1]?.[0]).toBe(onSettingsChanged.mock.calls[0]?.[0]);
  });

  it('allows same-value persist retry after a failed sync', async () => {
    vi.useFakeTimers();
    const onSettingsChanged = vi.fn();
    let api: SyncHarnessValue | null = null;
    window.onSettingsChanged = onSettingsChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(<SyncHarness onReady={value => { api = value; }} />);
    });

    expect(api).not.toBeNull();

    const currentSettings = {
      ...defaultSettings,
      general: { ...defaultSettings.general, opacity: 77 },
    };

    await act(async () => {
      api?.notifySettingsChanged(currentSettings);
      vi.advanceTimersByTime(200);
    });

    const dispatchedRevision = readRevisionFromPayload(onSettingsChanged.mock.calls[0]?.[0]);

    await act(async () => {
      api?.handleSettingsSyncResult(false, dispatchedRevision);
      vi.advanceTimersByTime(200);
    });

    const didRetry = api!.retryPersistedSettings(currentSettings);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(didRetry).toBe(true);
    expect(onSettingsChanged).toHaveBeenCalledTimes(3);
    const retriedPayload = JSON.parse(onSettingsChanged.mock.calls[2]?.[0] as string) as WidgetSettings & { rev?: number };
    expect(retriedPayload.general.opacity).toBe(77);
    expect(retriedPayload.rev).toBeGreaterThan(0);
  });

  it('marks the sync state as failed after the retry also fails', async () => {
    vi.useFakeTimers();
    const onSettingsChanged = vi.fn();
    let api: SyncHarnessValue | null = null;
    window.onSettingsChanged = onSettingsChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(<SyncHarness onReady={value => { api = value; }} />);
    });

    expect(api).not.toBeNull();

    await act(async () => {
      api!.notifySettingsChanged(defaultSettings);
      vi.advanceTimersByTime(200);
    });

    const dispatchedRevision = readRevisionFromPayload(onSettingsChanged.mock.calls[0]?.[0]);

    await act(async () => {
      api!.handleSettingsSyncResult(false, dispatchedRevision);
      vi.advanceTimersByTime(200);
    });

    expect(api!.settingsSyncState).toBe('retrying');

    await act(async () => {
      api!.handleSettingsSyncResult(false, dispatchedRevision);
      vi.advanceTimersByTime(200);
    });

    expect(api!.settingsSyncState).toBe('failed');
  });

  it('ignores stale sync results for older revisions', async () => {
    vi.useFakeTimers();
    const onSettingsChanged = vi.fn();
    let api: SyncHarnessValue | null = null;
    window.onSettingsChanged = onSettingsChanged;

    await act(async () => {
      root = createRoot(container);
      root.render(<SyncHarness onReady={value => { api = value; }} />);
    });

    await act(async () => {
      api!.notifySettingsChanged({
        ...defaultSettings,
        general: { ...defaultSettings.general, opacity: 70 },
      });
      vi.advanceTimersByTime(200);
    });

    const firstRevision = readRevisionFromPayload(onSettingsChanged.mock.calls[0]?.[0]);

    await act(async () => {
      api!.notifySettingsChanged({
        ...defaultSettings,
        general: { ...defaultSettings.general, opacity: 80 },
      });
      vi.advanceTimersByTime(200);
    });

    const secondRevision = readRevisionFromPayload(onSettingsChanged.mock.calls[1]?.[0]);

    await act(async () => {
      api!.handleSettingsSyncResult(true, firstRevision);
      vi.advanceTimersByTime(200);
    });

    expect(api!.lastSettingsSyncOk).toBe(null);
    expect(api!.settingsSyncState).toBe('idle');

    await act(async () => {
      api!.handleSettingsSyncResult(true, secondRevision);
      vi.advanceTimersByTime(200);
    });

    expect(api!.lastSettingsSyncOk).toBe(true);
    expect(api!.settingsSyncState).toBe('saved');
  });
});
