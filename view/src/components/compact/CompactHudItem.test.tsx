// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultSettings } from '../../data/defaultSettings';
import { mockStats } from '../../data/mockStats';
import type { WidgetSettings } from '../../types/settings';
import type { CombatStats } from '../../types/stats';
import { CompactHudItem } from './CompactHudItem';

const NOW_MS = Date.UTC(2026, 9, 11, 3, 5);

describe('CompactHudItem', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
  });

  function render(itemId: string, mutate?: (stats: CombatStats, settings: WidgetSettings) => void) {
    const stats = structuredClone(mockStats);
    const settings = structuredClone(defaultSettings);
    mutate?.(stats, settings);
    act(() => {
      root!.render(<CompactHudItem itemId={itemId} stats={stats} settings={settings} lang="ko" nowMs={NOW_MS} />);
    });
    return container.textContent ?? '';
  }

  it('renders the weather in words', () => {
    expect(render('time.weather', stats => { stats.time.weather = 'snow'; })).toContain('눈');
    expect(render('time.weather', stats => { stats.time.weather = 'indoor'; })).toContain('실내');
  });

  it('shows the potion slot empty until a potion was used', () => {
    expect(render('equipped.potion', stats => { stats.equipped.potionCount = null; })).not.toContain('×');
    expect(render('equipped.potion', stats => {
      stats.equipped.potionCount = 3;
      stats.equipped.potionName = '체력 회복 물약';
    })).toContain('×3');
  });

  it('shows raw resistance as the main value in raw-only mode', () => {
    const text = render('resistance.fire', (stats, settings) => {
      settings.resistances.displayMode = 'rawOnly';
      stats.calcMeta.rawResistances.fire = 120;
      stats.resistances.fire = 85;
    });
    expect(text).toContain('120%');
    expect(text).not.toContain('원');
  });

  it('uses short clocks with optional dates', () => {
    expect(render('time.game', stats => { stats.time.hour = 21; stats.time.minute = 7; stats.time.snapshotAtMs = NOW_MS; })).toMatch(/게임\s*21:07/);
    expect(render('time.game', (stats, settings) => {
      settings.time.gameDisplay = 'dateTime';
      stats.time.month = 7;
      stats.time.day = 28;
      stats.time.snapshotAtMs = NOW_MS;
    })).toContain('8/28');
  });

  it('marks a capped damage reduction with its raw value', () => {
    const text = render('defense.damageReduction', stats => {
      stats.defense.damageReduction = 80;
      stats.calcMeta.rawDamageReduction = 91;
      stats.calcMeta.flags.damageReductionClamped = true;
    });
    expect(text).toContain('80%');
    expect(text).toContain('원 91');
  });
});
