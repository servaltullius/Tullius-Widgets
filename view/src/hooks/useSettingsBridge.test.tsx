// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import type { RuntimeDiagnostics } from '../types/runtime';
import { useSettingsBridge } from './useSettingsBridge';
import { createRuntimeDiagnosticsPayload } from '../test-fixtures/bridgePayloads';

function BridgeHarness(props: {
  applyIncomingSettings: (jsonString: string, persist: boolean) => boolean;
  setRuntimeDiagnostics: (value: RuntimeDiagnostics | null) => void;
  toggleSettings: () => void;
  toggleWidgetsVisibility: () => void;
  closeSettings: () => void;
  setHUDColor: (hex: string) => void;
  handleSettingsSyncResult: (success: boolean) => void;
}) {
  useSettingsBridge(props);
  useEffect(() => undefined, []);
  return null;
}

describe('useSettingsBridge', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
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
    delete window.TulliusWidgetsBridge;
    delete window.onImportResult;
  });

  it('registers both legacy and namespaced bridge handlers and cleans them up on unmount', async () => {
    const applyIncomingSettings = vi.fn(() => true);
    const setRuntimeDiagnostics = vi.fn();
    const toggleSettings = vi.fn();
    const toggleWidgetsVisibility = vi.fn();
    const closeSettings = vi.fn();
    const setHUDColor = vi.fn();
    const handleSettingsSyncResult = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <BridgeHarness
          applyIncomingSettings={applyIncomingSettings}
          setRuntimeDiagnostics={setRuntimeDiagnostics}
          toggleSettings={toggleSettings}
          toggleWidgetsVisibility={toggleWidgetsVisibility}
          closeSettings={closeSettings}
          setHUDColor={setHUDColor}
          handleSettingsSyncResult={handleSettingsSyncResult}
        />,
      );
    });

    expect(typeof window.updateSettings).toBe('function');
    expect(typeof window.TulliusWidgetsBridge?.v1?.updateSettings).toBe('function');
    expect(typeof window.onSettingsSyncResult).toBe('function');

    await act(async () => {
      root?.unmount();
      root = null;
    });

    expect(window.updateSettings).toBeUndefined();
    expect(window.TulliusWidgetsBridge).toBeUndefined();
    expect(window.onSettingsSyncResult).toBeUndefined();
  });

  it('normalizes runtime diagnostics payloads before forwarding them', async () => {
    const setRuntimeDiagnostics = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <BridgeHarness
          applyIncomingSettings={() => true}
          setRuntimeDiagnostics={setRuntimeDiagnostics}
          toggleSettings={() => {}}
          toggleWidgetsVisibility={() => {}}
          closeSettings={() => {}}
          setHUDColor={() => {}}
          handleSettingsSyncResult={() => {}}
        />,
      );
    });

    await act(async () => {
      window.updateRuntimeStatus?.(JSON.stringify(createRuntimeDiagnosticsPayload({
        addressLibraryPresent: false,
        warningCode: 'missing-address-library',
      })));
    });

    expect(setRuntimeDiagnostics).toHaveBeenCalledWith({
      runtimeVersion: '1.6.1170',
      skseVersion: '2.2.6',
      addressLibraryPath: 'Data/SKSE/Plugins/versionlib-1-6-1170-0.bin',
      addressLibraryPresent: false,
      runtimeSupported: true,
      usesAddressLibrary: true,
      warningCode: 'missing-address-library',
    });
  });

  it('falls back to warningCode none for unknown runtime warning codes', async () => {
    const setRuntimeDiagnostics = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(
        <BridgeHarness
          applyIncomingSettings={() => true}
          setRuntimeDiagnostics={setRuntimeDiagnostics}
          toggleSettings={() => {}}
          toggleWidgetsVisibility={() => {}}
          closeSettings={() => {}}
          setHUDColor={() => {}}
          handleSettingsSyncResult={() => {}}
        />,
      );
    });

    await act(async () => {
      window.TulliusWidgetsBridge?.v1?.updateRuntimeStatus?.(JSON.stringify({
        ...createRuntimeDiagnosticsPayload(),
        warningCode: 'totally-unknown-code',
      }));
    });

    expect(setRuntimeDiagnostics).toHaveBeenCalledWith({
      ...createRuntimeDiagnosticsPayload(),
      warningCode: 'none',
    });
  });
});
