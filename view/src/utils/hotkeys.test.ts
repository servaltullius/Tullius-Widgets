import { describe, expect, it } from 'vitest';
import { formatHotkey, isBindableHotkey, keyboardEventToHotkey, sanitizeHotkeys } from './hotkeys';

describe('hotkeys', () => {
  it('maps physical key codes to DirectInput scan codes', () => {
    expect(keyboardEventToHotkey({ code: 'Insert', keyCode: 45 })).toBe(0xD2);
    expect(keyboardEventToHotkey({ code: 'F11', keyCode: 122 })).toBe(0x57);
    expect(keyboardEventToHotkey({ code: 'KeyK', keyCode: 75 })).toBe(0x25);
    expect(keyboardEventToHotkey({ code: 'Numpad5', keyCode: 101 })).toBe(0x4C);
    expect(keyboardEventToHotkey({ code: 'Digit0', keyCode: 48 })).toBe(0x0B);
  });

  it('falls back to keyCode when the engine leaves code empty', () => {
    expect(keyboardEventToHotkey({ code: '', keyCode: 36 })).toBe(0xC7);
    expect(keyboardEventToHotkey({ code: '', keyCode: 77 })).toBe(0x32);
  });

  it('refuses keys the game and the panel need', () => {
    for (const code of ['Escape', 'Tab', 'Enter', 'Space', 'ShiftLeft', 'ControlLeft', 'AltLeft']) {
      expect(keyboardEventToHotkey({ code, keyCode: 0 }), code).toBeNull();
    }
    expect(isBindableHotkey(0x01)).toBe(false);
  });

  it('labels keys for display', () => {
    expect(formatHotkey(0xD2)).toBe('Insert');
    expect(formatHotkey(0x4C)).toBe('Num 5');
    expect(formatHotkey(0x22)).toBe('G');
  });

  it('falls back to defaults for invalid or clashing bindings', () => {
    expect(sanitizeHotkeys(0x22, 0x23)).toEqual({ settingsHotkey: 0x22, visibilityHotkey: 0x23 });
    expect(sanitizeHotkeys(0x01, 'x')).toEqual({ settingsHotkey: 0xD2, visibilityHotkey: 0x57 });
    expect(sanitizeHotkeys(0x22, 0x22)).toEqual({ settingsHotkey: 0x22, visibilityHotkey: 0x57 });
    expect(sanitizeHotkeys(0x57, 0x57)).toEqual({ settingsHotkey: 0x57, visibilityHotkey: 0xD2 });
  });
});
