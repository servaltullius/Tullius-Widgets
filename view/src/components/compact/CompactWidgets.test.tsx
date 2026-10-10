// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompactEquipSlot, CompactExperienceRing, CompactResistance, CompactStat } from './CompactWidgets';

describe('CompactWidgets', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
    vi.useRealTimers();
  });

  function render(node: React.ReactNode) {
    act(() => {
      root = root ?? createRoot(container);
      root.render(node);
    });
  }

  it('shows the raw resistance only when it differs from the effective value', () => {
    render(<CompactResistance icon="fire" iconColor="#fff" value={50} raw={50} cap={85} rawLabel="원" showRaw="auto" />);
    expect(container.textContent).toBe('50%');

    render(<CompactResistance icon="fire" iconColor="#fff" value={85} raw={112} cap={85} rawLabel="원" showRaw="auto" />);
    expect(container.textContent).toContain('원 112');
    expect(container.querySelector('[data-tone="capped"]')).not.toBeNull();

    render(<CompactResistance icon="fire" iconColor="#fff" value={85} raw={112} cap={85} rawLabel="원" showRaw="never" />);
    expect(container.textContent).not.toContain('원');
  });

  it('marks negative and zero resistances with distinct tones', () => {
    render(<CompactResistance icon="frost" iconColor="#fff" value={-25} raw={-25} cap={85} rawLabel="원" showRaw="auto" />);
    expect(container.querySelector('[data-tone="danger"]')?.textContent).toBe('-25%');

    render(<CompactResistance icon="frost" iconColor="#fff" value={0} raw={0} cap={85} rawLabel="원" showRaw="auto" />);
    expect(container.querySelector('[data-tone="muted"]')).not.toBeNull();
  });

  it('shows the experience ring progress as a percentage', () => {
    render(<CompactExperienceRing level={13} currentXp={447} totalXp={495} xpLabel="경험치" />);
    expect(container.textContent).toContain('13');
    expect(container.textContent).toContain('경험치 90%');
    expect(container.textContent).toContain('447 / 495');

    render(<CompactExperienceRing level={13} currentXp={447} totalXp={495} xpLabel="경험치" showNumbers={false} />);
    expect(container.querySelector('[data-compact-xp-numbers]')).toBeNull();
    expect(container.textContent).toContain('경험치 90%');
  });

  it('flashes the equipment name for three seconds after a swap in on-change mode', () => {
    vi.useFakeTimers();
    const slot = (name: string) => (
      <CompactEquipSlot slotKey="R" name={name} emptyLabel="(비어 있음)" kind="sword" value={14} nameDisplay="onChange" />
    );
    render(slot('철 검'));
    const nameEl = () => container.querySelector('[data-compact-equip-name]') as HTMLElement;
    expect(nameEl().style.visibility).toBe('hidden');

    render(slot('던브레이커'));
    act(() => { vi.advanceTimersByTime(10); });
    expect(nameEl().style.visibility).toBe('visible');
    expect(nameEl().textContent).toBe('던브레이커');

    act(() => { vi.advanceTimersByTime(3100); });
    expect(nameEl().style.visibility).toBe('hidden');
  });

  it('shows enchantment charge, ammo for ranged weapons and the shout cooldown', () => {
    vi.useFakeTimers();
    render(<CompactEquipSlot slotKey="R" name="황혼의 활" emptyLabel="-" kind="bow" value={40} nameDisplay="never" chargePct={15} ammoCount={39} />);
    expect(container.querySelector('[data-compact-ammo]')?.textContent).toBe('39');
    const fill = container.querySelector('[data-compact-charge] > div') as HTMLElement;
    expect(fill.style.width).toBe('15%');

    render(<CompactEquipSlot slotKey="R" name="철 검" emptyLabel="-" kind="sword" value={9} nameDisplay="never" chargePct={null} ammoCount={39} />);
    expect(container.querySelector('[data-compact-ammo]')).toBeNull();
    expect(container.querySelector('[data-compact-charge]')).toBeNull();

    act(() => root?.unmount());
    root = null;
    render(<CompactEquipSlot slotKey="Z" name="불사의 외침" emptyLabel="-" kind="other" nameDisplay="never" cooldownSec={0} />);
    expect(container.querySelector('[data-compact-cooldown]')).toBeNull();
    render(<CompactEquipSlot slotKey="Z" name="불사의 외침" emptyLabel="-" kind="other" nameDisplay="never" cooldownSec={20} />);
    act(() => { vi.advanceTimersByTime(10); });
    expect(container.querySelector('[data-compact-cooldown]')).not.toBeNull();
    expect(container.textContent).toContain('20');
    for (let step = 0; step < 84; step++) {
      act(() => { vi.advanceTimersByTime(250); });
    }
    expect(container.querySelector('[data-compact-cooldown]')).toBeNull();
  });

  it('flashes a short delta when a tracked counter changes, but not on mount', () => {
    vi.useFakeTimers();
    render(<CompactStat icon="gold" iconColor="#fff" value="100" trackValue={100} />);
    act(() => { vi.advanceTimersByTime(10); });
    expect(container.querySelector('[data-compact-delta]')).toBeNull();

    render(<CompactStat icon="gold" iconColor="#fff" value="220" trackValue={220} />);
    act(() => { vi.advanceTimersByTime(10); });
    expect(container.querySelector('[data-compact-delta]')?.textContent).toBe('+120');

    act(() => { vi.advanceTimersByTime(1700); });
    expect(container.querySelector('[data-compact-delta]')).toBeNull();

    render(<CompactStat icon="gold" iconColor="#fff" value="20" trackValue={20} />);
    act(() => { vi.advanceTimersByTime(10); });
    expect(container.querySelector('[data-compact-delta]')?.getAttribute('data-direction')).toBe('down');

    render(<CompactStat icon="gold" iconColor="#fff" value="1,284,530" trackValue={1_284_530} />);
    act(() => { vi.advanceTimersByTime(10); });
    expect(container.querySelector('[data-compact-delta]')?.textContent).toBe('+1.3M');
  });

  it('draws learned and unlocked shout words as pips', () => {
    render(<CompactEquipSlot slotKey="Z" name="불사의 외침" emptyLabel="-" kind="other" nameDisplay="never" wordsKnown={2} wordsUnlocked={1} />);
    const states = Array.from(container.querySelectorAll('[data-compact-shout-words] > span')).map(el => el.getAttribute('data-state'));
    expect(states).toEqual(['unlocked', 'known', 'unknown']);
  });

  it('shows the remaining count on the potion slot, including zero', () => {
    render(<CompactEquipSlot slotKey="P" name="체력 회복 물약" emptyLabel="-" kind="other" value={0} nameDisplay="always" potionKind="health" />);
    expect(container.textContent).toContain('\u00d70');
    expect(container.querySelector('[data-tone="danger"]')).not.toBeNull();
  });

  it('always shows names in always mode and the empty label for empty hands', () => {
    render(<CompactEquipSlot slotKey="L" name="" emptyLabel="(비어 있음)" kind="empty" nameDisplay="always" />);
    expect(container.textContent).toContain('(비어 있음)');
    expect(container.textContent).not.toMatch(/\d/);
  });
});
