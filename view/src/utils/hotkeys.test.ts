import { describe, expect, it } from 'vitest';
import { formatHotkey, isBindableHotkey, keyboardEventToHotkey, sanitizeHotkeys } from './hotkeys';

describe('hotkeys', () => {
  it('maps physical key codes to DirectInput scan codes', () => {
    expect(keyboardEventToHotkey({ code: 'Insert', keyCode: 45 })).toBe(0xD2);
    expect(keyboardEventToHotkey({ code: 'F11', keyCode: 122 })).toBe(0x57);
    expect(keyboardEventToHotkey({ code: 'Numpad5', keyCode: 101 })).toBe(0x4C);
    expect(keyboardEventToHotkey({ code: 'PageDown', keyCode: 34 })).toBe(0xD1);
  });

  it('falls back to keyCode when the engine leaves code empty', () => {
    expect(keyboardEventToHotkey({ code: '', keyCode: 36 })).toBe(0xC7);
    expect(keyboardEventToHotkey({ code: '', keyCode: 123 })).toBe(0x58);
    // NumLock off: the numpad sends navigation keyCodes from the numpad location.
    expect(keyboardEventToHotkey({ code: '', keyCode: 45, location: 3 })).toBe(0x52);
    expect(keyboardEventToHotkey({ code: '', keyCode: 36, location: 3 })).toBe(0x47);
    expect(keyboardEventToHotkey({ code: '', keyCode: 45, location: 0 })).toBe(0xD2);
  });

  it('refuses keys the game, the console and the panel need', () => {
    for (const code of ['Escape', 'Tab', 'Enter', 'Space', 'ShiftLeft', 'ControlLeft', 'AltLeft', 'KeyK', 'Digit1', 'ArrowUp', 'Backspace', 'Slash']) {
      expect(keyboardEventToHotkey({ code, keyCode: 0 }), code).toBeNull();
    }
    expect(isBindableHotkey(0x01)).toBe(false);
  });

  it('labels keys for display', () => {
    expect(formatHotkey(0xD2)).toBe('Insert');
    expect(formatHotkey(0x4C)).toBe('Num 5');
    expect(formatHotkey(0x58)).toBe('F12');
  });

  it('falls back to defaults for invalid or clashing bindings', () => {
    expect(sanitizeHotkeys(0xC7, 0xCF)).toEqual({ settingsHotkey: 0xC7, visibilityHotkey: 0xCF });
    expect(sanitizeHotkeys(0x22, 0xCF)).toEqual({ settingsHotkey: 0xD2, visibilityHotkey: 0xCF });
    expect(sanitizeHotkeys(0x01, 'x')).toEqual({ settingsHotkey: 0xD2, visibilityHotkey: 0x57 });
    expect(sanitizeHotkeys(0xC7, 0xC7)).toEqual({ settingsHotkey: 0xC7, visibilityHotkey: 0x57 });
    expect(sanitizeHotkeys(0x57, 0x57)).toEqual({ settingsHotkey: 0x57, visibilityHotkey: 0xD2 });
  });
});
