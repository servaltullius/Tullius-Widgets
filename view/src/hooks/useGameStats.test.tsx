// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { useGameStats } from './useGameStats';
import type { CombatStats } from '../types/stats';

function Harness({ onStats }: { onStats: (stats: CombatStats) => void }) {
  const stats = useGameStats();
  useEffect(() => {
    onStats(stats);
  }, [onStats, stats]);
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
});
