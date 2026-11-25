// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ESCAPE_DUPLICATE_WINDOW_MS,
  claimEscape,
  handleEscapeFromPlugin,
  hasEscapeOwner,
  isEscapeKey,
  isSelectMenuOpen,
} from './escapeOwners';

const noop = () => {};

describe('escapeOwners', () => {
  afterEach(() => {
    delete window.onEscapeOwner;
  });

  it('tells the plugin only when the page starts or stops owning Esc', () => {
    const report = vi.fn();
    window.onEscapeOwner = report;

    const releaseSelection = claimEscape('selection', noop);
    const releaseMenu = claimEscape('selectMenu', noop);
    expect(report.mock.calls).toEqual([['1']]);
    expect(isSelectMenuOpen()).toBe(true);

    releaseMenu();
    expect(isSelectMenuOpen()).toBe(false);
    expect(report.mock.calls).toEqual([['1']]);

    releaseSelection();
    expect(report.mock.calls).toEqual([['1'], ['0']]);
  });

  it('ignores a second release of the same claim', () => {
    const report = vi.fn();
    window.onEscapeOwner = report;

    const release = claimEscape('selection', noop);
    release();
    release();
    expect(report.mock.calls).toEqual([['1'], ['0']]);
  });

  it('keeps working when the plugin callback throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.onEscapeOwner = () => {
      throw new Error('bridge down');
    };
    try {
      const release = claimEscape('selectMenu', noop);
      expect(isSelectMenuOpen()).toBe(true);
      release();
      expect(isSelectMenuOpen()).toBe(false);
      expect(error).toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it('sends a lost report again once the plugin callback is available', () => {
    delete window.onEscapeOwner;
    const release = claimEscape('layoutMode', noop);
    const report = vi.fn();
    window.onEscapeOwner = report;

    const releaseMenu = claimEscape('selectMenu', noop);
    expect(report.mock.calls).toEqual([['1']]);
    expect(hasEscapeOwner('layoutMode')).toBe(true);

    releaseMenu();
    release();
    expect(report.mock.calls).toEqual([['1'], ['0']]);
    expect(hasEscapeOwner('layoutMode')).toBe(false);
  });
});

describe('Esc routing', () => {
  let clock = 0;
  const releases: Array<() => void> = [];

  beforeEach(() => {
    clock += 10_000;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
  });

  afterEach(() => {
    while (releases.length > 0) releases.pop()?.();
    vi.restoreAllMocks();
  });

  function later(): void {
    clock += ESCAPE_DUPLICATE_WINDOW_MS + 1;
  }

  // Each owner gives up Esc when its step runs, as the real owners do.
  function claimStep(kind: Parameters<typeof claimEscape>[0], steps: string[]): void {
    const release = claimEscape(kind, () => {
      steps.push(kind);
      release();
    });
    releases.push(release);
  }

  function pressKey(init: KeyboardEventInit = { key: 'Escape' }): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    window.dispatchEvent(event);
    return event;
  }

  it('walks the owners strongest first whatever order they were claimed in', () => {
    const steps: string[] = [];
    claimStep('layoutMode', steps);
    claimStep('selection', steps);
    claimStep('hotkeyCapture', steps);
    claimStep('selectMenu', steps);

    for (let press = 0; press < 5; press += 1) {
      handleEscapeFromPlugin();
      later();
    }
    expect(steps).toEqual(['hotkeyCapture', 'selectMenu', 'selection', 'layoutMode']);
  });

  it('takes one step for a keydown alone', () => {
    const steps: string[] = [];
    claimStep('layoutMode', steps);
    claimStep('selection', steps);

    const event = pressKey();
    expect(event.defaultPrevented).toBe(true);
    expect(steps).toEqual(['selection']);
  });

  it('takes one step when the keydown and the plugin both deliver the same press, in either order', () => {
    const steps: string[] = [];
    claimStep('layoutMode', steps);
    claimStep('selection', steps);
    claimStep('selectMenu', steps);

    pressKey();
    handleEscapeFromPlugin();
    expect(steps).toEqual(['selectMenu']);

    later();
    handleEscapeFromPlugin();
    const copy = pressKey();
    expect(copy.defaultPrevented).toBe(true);
    expect(steps).toEqual(['selectMenu', 'selection']);

    later();
    pressKey();
    expect(steps).toEqual(['selectMenu', 'selection', 'layoutMode']);
  });

  it('pairs the copies of two presses that arrive interleaved', () => {
    const steps: string[] = [];
    claimStep('layoutMode', steps);
    claimStep('selection', steps);
    claimStep('selectMenu', steps);

    // Both keydowns arrive before either plugin copy: two steps, and the copies take none.
    pressKey();
    pressKey();
    handleEscapeFromPlugin();
    handleEscapeFromPlugin();
    expect(steps).toEqual(['selectMenu', 'selection']);
  });

  it('keeps the keydown copy of a plugin press from reaching the panel close after the last owner went', () => {
    const steps: string[] = [];
    claimStep('layoutMode', steps);
    let panelCloseCalls = 0;
    const panelClose = (event: KeyboardEvent) => {
      if (!event.defaultPrevented) panelCloseCalls += 1;
    };
    window.addEventListener('keydown', panelClose);
    try {
      handleEscapeFromPlugin();
      pressKey();
      expect(steps).toEqual(['layoutMode']);
      expect(panelCloseCalls).toBe(0);

      later();
      pressKey();
      expect(panelCloseCalls).toBe(1);
    } finally {
      window.removeEventListener('keydown', panelClose);
    }
  });

  it('stops waiting for a plugin copy once nothing owns Esc any more', () => {
    const steps: string[] = [];
    claimStep('selection', steps);
    pressKey();
    expect(steps).toEqual(['selection']);

    // The plugin closes the panel itself now, so the next press it passes on is a new one.
    claimStep('layoutMode', steps);
    handleEscapeFromPlugin();
    expect(steps).toEqual(['selection', 'layoutMode']);
  });

  it('marks a release caused by its own keydown, and only that one', () => {
    const report = vi.fn();
    window.onEscapeOwner = report;
    try {
      const steps: string[] = [];
      claimStep('layoutMode', steps);
      pressKey();
      expect(report.mock.calls).toEqual([['1'], ['0e']]);

      later();
      claimStep('layoutMode', steps);
      handleEscapeFromPlugin();
      claimStep('layoutMode', steps);
      releases.pop()?.();
      expect(report.mock.calls).toEqual([['1'], ['0e'], ['1'], ['0'], ['1'], ['0']]);
    } finally {
      delete window.onEscapeOwner;
    }
  });

  it('swallows a held key without taking a step', () => {
    const steps: string[] = [];
    claimStep('layoutMode', steps);

    const held = pressKey({ key: 'Escape', repeat: true });
    expect(held.defaultPrevented).toBe(true);
    expect(steps).toEqual([]);
  });

  it('leaves Esc alone when the page owns nothing', () => {
    const event = pressKey();
    expect(event.defaultPrevented).toBe(false);
    expect(() => handleEscapeFromPlugin()).not.toThrow();
  });

  it('recognises Esc from the older key fields too', () => {
    expect(isEscapeKey({ key: 'Escape', code: '', keyCode: 0 })).toBe(true);
    expect(isEscapeKey({ key: 'Esc', code: '', keyCode: 0 })).toBe(true);
    expect(isEscapeKey({ key: '', code: 'Escape', keyCode: 0 })).toBe(true);
    expect(isEscapeKey({ key: 'Unidentified', code: '', keyCode: 27 })).toBe(true);
    expect(isEscapeKey({ key: 'Enter', code: 'Enter', keyCode: 13 })).toBe(false);
  });
});
