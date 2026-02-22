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
});

