// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { defaultSettings } from '../data/defaultSettings';
import { mockStats } from '../data/mockStats';
import { resolveWidgetItemLayouts } from '../hooks/useWidgetItemLayouts';
import type { CombatStats } from '../types/stats';
import type { WidgetSettings } from '../types/settings';
import { HudWidgetItems } from './HudWidgetItems';

function cloneSettings(): WidgetSettings {
  return structuredClone(defaultSettings);
}

function cloneStats(): CombatStats {
  return structuredClone(mockStats);
}

describe('HudWidgetItems', () => {
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
  });

  it('renders time.game independently when time.real is hidden', async () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    itemLayouts['time.real'] = { ...itemLayouts['time.real'], visible: false };

    await act(async () => {
      root = createRoot(container);
      root.render(
        <HudWidgetItems
          shouldShow
          stats={stats}
          settings={settings}
          settingsOpen={false}
          lang="ko"
          itemLayouts={itemLayouts}
          accentColor="#4fd1c5"
        />,
      );
    });

    expect(container.querySelector('[data-widget-item-id="time.game"]')).toBeTruthy();
    expect(container.querySelector('[data-widget-item-id="time.real"]')).toBeNull();
  });

  it('keeps timed effects rendered as one special list widget item', async () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    await act(async () => {
      root = createRoot(container);
      root.render(
        <HudWidgetItems
          shouldShow
          stats={stats}
          settings={settings}
          settingsOpen={false}
          lang="ko"
          itemLayouts={itemLayouts}
          accentColor="#4fd1c5"
        />,
      );
    });

    expect(container.querySelectorAll('[data-widget-item-id="timedEffects.list"]')).toHaveLength(1);
  });

  it('renders visible items in zIndex order so higher layers appear later', async () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    for (const itemId of Object.keys(itemLayouts)) {
      itemLayouts[itemId] = { ...itemLayouts[itemId], visible: false };
    }

    itemLayouts['player.level'] = {
      ...itemLayouts['player.level'],
      visible: true,
      x: 300,
      y: 300,
      zIndex: 2,
    };
    itemLayouts['time.game'] = {
      ...itemLayouts['time.game'],
      visible: true,
      x: 300,
      y: 300,
      zIndex: 8,
    };

    await act(async () => {
      root = createRoot(container);
      root.render(
        <HudWidgetItems
          shouldShow
          stats={stats}
          settings={settings}
          settingsOpen={false}
          lang="ko"
          itemLayouts={itemLayouts}
          accentColor="#4fd1c5"
        />,
      );
    });

    const renderedIds = Array.from(container.querySelectorAll('[data-widget-item-id]'))
      .map(element => element.getAttribute('data-widget-item-id'));

    expect(renderedIds).toEqual(['player.level', 'time.game']);
    expect((container.querySelector('[data-widget-item-id="player.level"]') as HTMLDivElement).style.zIndex).toBe('2');
    expect((container.querySelector('[data-widget-item-id="time.game"]') as HTMLDivElement).style.zIndex).toBe('8');
  });
});
