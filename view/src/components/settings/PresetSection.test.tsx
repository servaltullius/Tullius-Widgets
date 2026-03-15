// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { defaultSettings } from '../../data/defaultSettings';
import type { WidgetSettings } from '../../types/settings';
import { PresetSection } from './PresetSection';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
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
      'player.level': { visible: true, x: 120, y: 240, scale: 1.5 },
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
      'player.level': { visible: true, x: 120, y: 240, scale: 1.5 },
    });
    expect(payload.positions).toBeUndefined();
    expect(payload.layouts).toBeUndefined();
    expect(payload.groupScales).toBeUndefined();
  });
});
