// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../../data/defaultSettings';
import { isHotkeyCaptureActive } from '../../utils/hotkeys';
import { HotkeySettings } from './HotkeySettings';

describe('HotkeySettings', () => {
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

  function press(code: string, keyCode = 0) {
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, keyCode, key: code, bubbles: true, cancelable: true }));
    });
  }

  it('captures the next key as the new binding', () => {
    const onUpdate = vi.fn();
    const onHotkeyCapture = vi.fn();
    window.onHotkeyCapture = onHotkeyCapture;
    act(() => root!.render(<HotkeySettings lang="ko" settings={structuredClone(defaultSettings)} onUpdate={onUpdate} />));
    const button = () => container.querySelector('[data-hotkey-field="settingsHotkey"]') as HTMLButtonElement;
    expect(button().textContent).toBe('Insert');
    act(() => button().click());
    expect(button().textContent).toContain('누르세요');
    // Other panel key handlers (arrow nudges, Esc deselect, undo) check this and stand aside.
    expect(isHotkeyCaptureActive()).toBe(true);
    press('Home', 36);
    expect(onUpdate).toHaveBeenCalledWith('general.settingsHotkey', 0xC7);
    expect(isHotkeyCaptureActive()).toBe(false);
    // The plugin is told to let keys through while capturing, and told again when done.
    expect(onHotkeyCapture.mock.calls.map(call => call[0])).toEqual(['1', '0']);
    delete window.onHotkeyCapture;
  });

  it('refuses reserved keys and the key the other hotkey uses', () => {
    const onUpdate = vi.fn();
    act(() => root!.render(<HotkeySettings lang="ko" settings={structuredClone(defaultSettings)} onUpdate={onUpdate} />));
    act(() => (container.querySelector('[data-hotkey-field="visibilityHotkey"]') as HTMLButtonElement).click());
    press('Space');
    expect(container.textContent).toContain('지정할 수 있습니다');
    press('Insert', 45);
    expect(container.textContent).toContain('이미 쓰는 키');
    expect(onUpdate).not.toHaveBeenCalled();
    press('Escape', 27);
    expect((container.querySelector('[data-hotkey-field="visibilityHotkey"]') as HTMLButtonElement).textContent).toBe('F11');
  });
});
