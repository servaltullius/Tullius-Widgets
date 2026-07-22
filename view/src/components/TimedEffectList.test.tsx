// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { TimedEffect } from '../types/stats';
import { TimedEffectList } from './TimedEffectList';

function buildEffects(): TimedEffect[] {
  return [
    {
      instanceId: 1,
      stableKey: 'a',
      snapshotAtMs: 0,
      sourceName: 'Oakflesh',
      effectName: 'Armor Bonus',
      remainingSec: 60,
      totalSec: 90,
      isDebuff: false,
      sourceFormId: 1,
      effectFormId: 2,
      spellFormId: 3,
    },
    {
      instanceId: 2,
      stableKey: 'b',
      snapshotAtMs: 0,
      sourceName: 'Flame Cloak',
      effectName: 'Fire Damage',
      remainingSec: 20,
      totalSec: 45,
      isDebuff: false,
      sourceFormId: 4,
      effectFormId: 5,
      spellFormId: 6,
    },
    {
      instanceId: 3,
      stableKey: 'c',
      snapshotAtMs: 0,
      sourceName: 'Weakness',
      effectName: 'Poison',
      remainingSec: 10,
      totalSec: 30,
      isDebuff: true,
      sourceFormId: 7,
      effectFormId: 8,
      spellFormId: 9,
    },
  ];
}

describe('TimedEffectList', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(Date, 'now').mockReturnValue(0);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    vi.restoreAllMocks();
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  it('keeps the default vertical stacked layout', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <TimedEffectList
          effects={buildEffects()}
          maxVisible={2}
          emptyLabel="없음"
          layout="vertical"
        />,
      );
    });

    const list = container.firstElementChild as HTMLDivElement | null;
    expect(list).toBeTruthy();
    expect(list?.classList.contains('tw-effect-list')).toBe(true);
    expect(list?.getAttribute('data-layout')).toBe('vertical');
    expect(list?.lastElementChild?.textContent).toBe('+1');
  });

  it('switches to horizontal wrapping layout and keeps hidden count as the last flow item', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <TimedEffectList
          effects={buildEffects()}
          maxVisible={2}
          emptyLabel="없음"
          layout="horizontal"
        />,
      );
    });

    const list = container.firstElementChild as HTMLDivElement | null;
    expect(list).toBeTruthy();
    expect(list?.classList.contains('tw-effect-list')).toBe(true);
    expect(list?.getAttribute('data-layout')).toBe('horizontal');
    expect(list?.lastElementChild?.textContent).toBe('+1');
  });

  it('renders the empty label when no effects are visible', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <TimedEffectList
          effects={[]}
          maxVisible={2}
          emptyLabel="표시할 지속 효과 없음"
          layout="horizontal"
        />,
      );
    });

    expect(container.textContent).toContain('표시할 지속 효과 없음');
    expect((container.firstElementChild as HTMLDivElement | null)?.classList.contains('tw-effect-empty')).toBe(true);
  });
});
