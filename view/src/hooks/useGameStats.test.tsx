// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { useGameStats, useGameStatsState } from './useGameStats';
import type { CombatStats } from '../types/stats';

function Harness({ onStats }: { onStats: (stats: CombatStats) => void }) {
  const stats = useGameStats();
  useEffect(() => {
    onStats(stats);
  }, [onStats, stats]);
  return null;
}

function StateHarness({ onState }: { onState: (state: { stats: CombatStats; hasLiveStats: boolean }) => void }) {
  const state = useGameStatsState();
  useEffect(() => {
    onState(state);
  }, [onState, state]);
  return null;
}

describe('useGameStats', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let latest: CombatStats | null = null;

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
    // Safety: tests shouldn't leak bridge functions.
    delete window.updateStats;
    delete window.TulliusWidgetsBridge;
  });

  it('preserves fractional XP values from updateStats payload', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onStats={stats => { latest = stats; }} />);
    });

    expect(typeof window.updateStats).toBe('function');

    await act(async () => {
      window.updateStats?.(JSON.stringify({
        playerInfo: {
          experience: 1280.25,
          expToNextLevel: 619.75,
          nextLevelTotalXp: 1900.0,
        },
      }));
    });

    expect(latest).not.toBeNull();
    expect(latest!.playerInfo.experience).toBeCloseTo(1280.25, 2);
    expect(latest!.playerInfo.expToNextLevel).toBeCloseTo(619.75, 2);
    expect(latest!.playerInfo.nextLevelTotalXp).toBeCloseTo(1900.0, 2);
  });

  it('accepts updateStats from namespaced bridge handler', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onStats={stats => { latest = stats; }} />);
    });

    expect(typeof window.TulliusWidgetsBridge?.v1?.updateStats).toBe('function');

    await act(async () => {
      window.TulliusWidgetsBridge?.v1?.updateStats?.(JSON.stringify({
        playerInfo: {
          level: 77,
        },
      }));
    });

    expect(latest).not.toBeNull();
    expect(latest!.playerInfo.level).toBe(77);
  });

  it('ignores out-of-order stats payload by sequence number', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onStats={stats => { latest = stats; }} />);
    });

    await act(async () => {
      window.updateStats?.(JSON.stringify({
        schemaVersion: 1,
        seq: 10,
        playerInfo: { level: 50 },
      }));
    });

    await act(async () => {
      window.updateStats?.(JSON.stringify({
        schemaVersion: 1,
        seq: 8,
        playerInfo: { level: 1 },
      }));
    });

    expect(latest).not.toBeNull();
    expect(latest!.playerInfo.level).toBe(50);
  });

  it('keeps previous timed effects when fast payload omits timedEffects', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onStats={stats => { latest = stats; }} />);
    });

    await act(async () => {
      window.updateStats?.(JSON.stringify({
        timedEffects: [
          {
            instanceId: 987,
            sourceName: 'Test Source',
            effectName: 'Test Effect',
            remainingSec: 30,
            totalSec: 60,
            isDebuff: false,
            sourceFormId: 1,
            effectFormId: 2,
            spellFormId: 3,
          },
        ],
      }));
    });

    const firstStableKey = latest?.timedEffects[0]?.stableKey;
    expect(firstStableKey).toBeTruthy();

    await act(async () => {
      window.updateStats?.(JSON.stringify({
        playerInfo: {
          health: 123,
        },
      }));
    });

    expect(latest).not.toBeNull();
    expect(latest!.playerInfo.health).toBe(123);
    expect(latest!.timedEffects[0]?.stableKey).toBe(firstStableKey);
  });

  it('clamps negative health/magicka/stamina values to 0', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<Harness onStats={stats => { latest = stats; }} />);
    });

    expect(typeof window.updateStats).toBe('function');

    await act(async () => {
      window.updateStats?.(JSON.stringify({
        playerInfo: {
          health: -10,
          magicka: -1,
          stamina: -250.5,
        },
      }));
    });

    expect(latest).not.toBeNull();
    expect(latest!.playerInfo.health).toBe(0);
    expect(latest!.playerInfo.magicka).toBe(0);
    expect(latest!.playerInfo.stamina).toBe(0);
  });

  it('marks live stats as unavailable when payload is empty object', async () => {
    let latestState: { stats: CombatStats; hasLiveStats: boolean } | null = null;

    await act(async () => {
      root = createRoot(container);
      root.render(<StateHarness onState={state => { latestState = state; }} />);
    });

    expect(typeof window.updateStats).toBe('function');

    await act(async () => {
      window.updateStats?.('{}');
    });

    expect(latestState).not.toBeNull();
    expect(latestState!.hasLiveStats).toBe(false);
  });
});
