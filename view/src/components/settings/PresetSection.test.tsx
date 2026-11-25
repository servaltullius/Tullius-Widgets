// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { defaultSettings } from '../../data/defaultSettings';
import type { WidgetSettings } from '../../types/settings';
import { useSettings } from '../../hooks/useSettings';
import { PresetSection } from './PresetSection';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
}

function PresetRoundTrip() {
  const { settings } = useSettings();
  return (
    <>
      <PresetSection lang="ko" settings={settings} />
      <output>{settings.general.userFont}</output>
    </>
  );
}

function AutoHidePresetRoundTrip({ onSettings }: { onSettings: (settings: WidgetSettings) => void }) {
  const { settings } = useSettings();
  onSettings(settings);
  return <PresetSection lang="ko" settings={settings} />;
}

describe('PresetSection', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
    delete window.onExportSettings;
  });

  it('exports itemLayouts as canonical preset layout data without legacy layout fields', async () => {
    const settings = cloneSettings();
    const onExportSettings = vi.fn();
    window.onExportSettings = onExportSettings;
    settings.positions = { playerInfo: { x: 10, y: 20 } };
    settings.layouts = { playerInfo: 'horizontal' };
    settings.groupScales = { playerInfo: 1.4 };
    settings.itemLayouts = {
      'player.level': { visible: true, x: 120, y: 240, scale: 1.5, locked: true, zIndex: 14 },
    };

    await act(async () => {
      root = createRoot(container);
      root.render(<PresetSection lang="ko" settings={settings} />);
    });

    const exportButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('프리셋 내보내기'),
    );

    expect(exportButton).toBeTruthy();

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const payload = JSON.parse(onExportSettings.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(payload.itemLayouts).toEqual({
      'player.level': { visible: true, x: 120, y: 240, scale: 1.5, locked: true, zIndex: 14 },
    });
    expect(payload.positions).toBeUndefined();
    expect(payload.layouts).toBeUndefined();
    expect(payload.groupScales).toBeUndefined();
    // Key bindings stay with the player.
    expect(payload.general).not.toHaveProperty('settingsHotkey');
    expect(payload.general).not.toHaveProperty('visibilityHotkey');
    expect(payload.layoutSlots).toBeUndefined();
    expect(payload.general).toHaveProperty('hudStyle');
  });

  it('preserves the user font selection through preset export and import', async () => {
    const exportSettings = vi.fn<(json: string) => void>();
    window.onExportSettings = exportSettings;
    const userFont = "King's 글꼴";
    await act(async () => {
      root = createRoot(container);
      root.render(<PresetRoundTrip />);
    });
    await act(async () => window.updateSettings?.(JSON.stringify({ schemaVersion: 7, general: { userFont } })));
    const exportButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('프리셋 내보내기'));
    expect(exportButton).toBeDefined();
    await act(async () => exportButton!.click());
    const exported = exportSettings.mock.calls[0][0];
    expect(JSON.parse(exported).general.userFont).toBe(userFont);

    await act(async () => window.updateSettings?.(JSON.stringify({ schemaVersion: 7, general: { userFont: '' } })));
    expect(container.querySelector('output')?.textContent).toBe('');
    await act(async () => window.importSettingsFromNative?.(exported));
    expect(container.querySelector('output')?.textContent).toBe(userFont);
  });

  it('round-trips auto-hide and free camera while preserving the destination hotkeys and slots', async () => {
    const onExport = vi.fn<(json: string) => void>();
    window.onExportSettings = onExport;
    const onSettings = vi.fn<(settings: WidgetSettings) => void>();
    await act(async () => {
      root = createRoot(container);
      root.render(<AutoHidePresetRoundTrip onSettings={onSettings} />);
    });

    const autoHide = { ...defaultSettings.general.autoHide, enabled: true, showSneaking: true, hideDelaySeconds: 17 };
    await act(async () => window.updateSettings?.(JSON.stringify({ schemaVersion: 7, general: {
      autoHide, freeCameraDisplay: 'vitals', settingsHotkey: 0xD2, visibilityHotkey: 0x57,
    } })));
    const exportButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('프리셋 내보내기'))!;
    await act(async () => exportButton.click());
    const exported = onExport.mock.calls[0][0];
    const parsed = JSON.parse(exported);
    expect(parsed).not.toHaveProperty('schemaVersion');
    expect(parsed).not.toHaveProperty('layoutSlots');
    expect(parsed.general).toMatchObject({ autoHide, freeCameraDisplay: 'vitals' });
    expect(parsed.general).not.toHaveProperty('settingsHotkey');
    expect(parsed.general).not.toHaveProperty('visibilityHotkey');

    const slot = {
      savedAt: 42, hudStyle: 'compact', compactAnchor: 'bottomLeft',
      itemLayouts: { 'player.gold': { visible: true, x: 1, y: 2, scale: 1, locked: false, zIndex: 1 } },
    };
    await act(async () => window.updateSettings?.(JSON.stringify({
      schemaVersion: 7, general: { settingsHotkey: 0xC7, visibilityHotkey: 0xCF }, layoutSlots: [slot, null, null],
    })));
    const destination = onSettings.mock.lastCall![0];
    expect(destination.layoutSlots[0]?.savedAt).toBe(42);
    await act(async () => window.importSettingsFromNative?.(exported));
    const imported = onSettings.mock.lastCall![0];
    expect(imported.general).toMatchObject({ autoHide, freeCameraDisplay: 'vitals', settingsHotkey: 0xC7, visibilityHotkey: 0xCF });
    expect(imported.layoutSlots).toEqual(destination.layoutSlots);
  });
});
