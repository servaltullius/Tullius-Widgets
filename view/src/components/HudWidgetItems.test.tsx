// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function hideAllItems(itemLayouts: ReturnType<typeof resolveWidgetItemLayouts>): void {
  for (const itemId of Object.keys(itemLayouts)) {
    itemLayouts[itemId] = { ...itemLayouts[itemId], visible: false };
  }
}

function getWidget(container: HTMLElement, itemId: string): HTMLElement {
  const widget = container.querySelector(`[data-widget-item-id="${itemId}"]`) as HTMLElement | null;
  expect(widget).toBeTruthy();
  return widget as HTMLElement;
}

function hasMeterWidth(widget: HTMLElement, widthPct: number): boolean {
  return Array.from(widget.querySelectorAll('div'))
    .some(element => {
      const width = (element as HTMLDivElement).style.width;
      if (!width.endsWith('%')) return false;
      const numericWidth = Number.parseFloat(width);
      return Number.isFinite(numericWidth) && Math.abs(numericWidth - widthPct) < 0.01;
    });
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
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it('drops the selected widget from HUD rendering as soon as it becomes hidden', async () => {
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
      visible: false,
    };
    itemLayouts['time.game'] = {
      ...itemLayouts['time.game'],
      visible: true,
    };

    await act(async () => {
      root = createRoot(container);
      root.render(
        <HudWidgetItems
          shouldShow
          stats={stats}
          settings={settings}
          settingsOpen
          lang="ko"
          itemLayouts={itemLayouts}
          accentColor="#4fd1c5"
          editable
          selectedItemId="player.level"
        />,
      );
    });

    expect(container.querySelector('[data-widget-item-id="player.level"]')).toBeNull();
    expect(container.querySelector('[data-widget-item-id="time.game"]')).toBeTruthy();
  });

  it('switches carry weight between combined, value-only, and meter-only displays', async () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    hideAllItems(itemLayouts);
    itemLayouts['player.carryWeight'] = { ...itemLayouts['player.carryWeight'], visible: true };

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

    const carryWidget = getWidget(container, 'player.carryWeight');
    expect(carryWidget.textContent).toContain('185.5/300');
    expect(carryWidget.textContent).toContain('62%');
    expect(hasMeterWidth(carryWidget, stats.alertData.carryPct)).toBe(true);

    settings.playerInfo.carryWeightDisplay = 'valueOnly';
    await act(async () => {
      root?.render(
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

    expect(carryWidget.textContent).toContain('185.5/300');
    expect(carryWidget.textContent).not.toContain('62%');
    expect(hasMeterWidth(carryWidget, stats.alertData.carryPct)).toBe(false);

    settings.playerInfo.carryWeightDisplay = 'meterOnly';
    await act(async () => {
      root?.render(
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

    expect(carryWidget.textContent).not.toContain('185.5/300');
    expect(carryWidget.textContent).not.toContain('62%');
    expect(hasMeterWidth(carryWidget, stats.alertData.carryPct)).toBe(true);
  });

  it('switches resistance widgets between effective-only, raw-only, and both displays', async () => {
    const settings = cloneSettings();
    const stats = cloneStats();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    hideAllItems(itemLayouts);
    itemLayouts['resistance.fire'] = { ...itemLayouts['resistance.fire'], visible: true };
    itemLayouts['resistance.magic'] = { ...itemLayouts['resistance.magic'], visible: true };

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

    const fireWidget = getWidget(container, 'resistance.fire');
    const magicWidget = getWidget(container, 'resistance.magic');

    expect(fireWidget.textContent).toContain('45%');
    expect(fireWidget.textContent).toContain('원본 120%');
    expect(magicWidget.textContent).not.toContain('원본 50%');

    settings.resistances.displayMode = 'effectiveOnly';
    await act(async () => {
      root?.render(
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

    expect(fireWidget.textContent).toContain('45%');
    expect(fireWidget.textContent).not.toContain('원본 120%');

    settings.resistances.displayMode = 'rawOnly';
    await act(async () => {
      root?.render(
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

    expect(fireWidget.textContent).toContain('120%');
    expect(fireWidget.textContent).not.toContain('원본 120%');
  });

  it('switches game time between date-time and time-only display', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T11:00:00Z'));

    const settings = cloneSettings();
    const stats = cloneStats();
    stats.time.snapshotAtMs = Date.now();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    hideAllItems(itemLayouts);
    itemLayouts['time.game'] = { ...itemLayouts['time.game'], visible: true };

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

    const gameTimeWidget = getWidget(container, 'time.game');
    expect(gameTimeWidget.textContent).toContain('4E 201년 8월 21일 14:35');

    settings.time.gameDisplay = 'timeOnly';
    await act(async () => {
      root?.render(
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

    expect(gameTimeWidget.textContent).toContain('14:35');
    expect(gameTimeWidget.textContent).not.toContain('4E');
  });

  it('updates real time-only display with the shared clock', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-16T11:00:00Z'));

    const settings = cloneSettings();
    settings.time.realDisplay = 'timeOnly';
    const stats = cloneStats();
    stats.time.snapshotAtMs = Date.now();
    const itemLayouts = resolveWidgetItemLayouts({
      settings,
      viewportWidth: 1920,
      viewportHeight: 1080,
    });

    hideAllItems(itemLayouts);
    itemLayouts['time.real'] = { ...itemLayouts['time.real'], visible: true };

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

    const realTimeWidget = getWidget(container, 'time.real');
    const initialText = realTimeWidget.textContent;
    expect(initialText).toBeTruthy();
    expect(initialText).not.toContain('2026');

    await act(async () => {
      vi.setSystemTime(new Date('2026-03-16T11:00:01Z'));
      vi.advanceTimersByTime(1000);
    });

    expect(realTimeWidget.textContent).not.toBe(initialText);
    expect(realTimeWidget.textContent).not.toContain('2026');
  });
});
