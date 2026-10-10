// Hotkeys are stored as DirectInput scan codes, the codes the SKSE key handler matches.

export const DEFAULT_SETTINGS_HOTKEY = 0xD2; // Insert
export const DEFAULT_VISIBILITY_HOTKEY = 0x57; // F11

interface HotkeyDefinition {
  dik: number;
  code: string;
  keyCode: number;
  label: string;
}

const LETTER_ROWS: Array<[number, string]> = [
  [0x10, 'QWERTYUIOP'],
  [0x1E, 'ASDFGHJKL'],
  [0x2C, 'ZXCVBNM'],
];

function buildDefinitions(): HotkeyDefinition[] {
  const out: HotkeyDefinition[] = [];
  for (const [start, letters] of LETTER_ROWS) {
    [...letters].forEach((letter, index) => {
      out.push({ dik: start + index, code: `Key${letter}`, keyCode: letter.charCodeAt(0), label: letter });
    });
  }
  for (let digit = 1; digit <= 9; digit++) {
    out.push({ dik: 0x01 + digit, code: `Digit${digit}`, keyCode: 48 + digit, label: String(digit) });
  }
  out.push({ dik: 0x0B, code: 'Digit0', keyCode: 48, label: '0' });
  for (let index = 0; index < 10; index++) {
    out.push({ dik: 0x3B + index, code: `F${index + 1}`, keyCode: 112 + index, label: `F${index + 1}` });
  }
  out.push({ dik: 0x57, code: 'F11', keyCode: 122, label: 'F11' });
  out.push({ dik: 0x58, code: 'F12', keyCode: 123, label: 'F12' });
  const numpadDigits = [0x52, 0x4F, 0x50, 0x51, 0x4B, 0x4C, 0x4D, 0x47, 0x48, 0x49];
  numpadDigits.forEach((dik, digit) => {
    out.push({ dik, code: `Numpad${digit}`, keyCode: 96 + digit, label: `Num ${digit}` });
  });
  out.push(
    { dik: 0x37, code: 'NumpadMultiply', keyCode: 106, label: 'Num *' },
    { dik: 0x4E, code: 'NumpadAdd', keyCode: 107, label: 'Num +' },
    { dik: 0x4A, code: 'NumpadSubtract', keyCode: 109, label: 'Num -' },
    { dik: 0x53, code: 'NumpadDecimal', keyCode: 110, label: 'Num .' },
    { dik: 0xB5, code: 'NumpadDivide', keyCode: 111, label: 'Num /' },
    { dik: 0x0C, code: 'Minus', keyCode: 189, label: '-' },
    { dik: 0x0D, code: 'Equal', keyCode: 187, label: '=' },
    { dik: 0x1A, code: 'BracketLeft', keyCode: 219, label: '[' },
    { dik: 0x1B, code: 'BracketRight', keyCode: 221, label: ']' },
    { dik: 0x27, code: 'Semicolon', keyCode: 186, label: ';' },
    { dik: 0x28, code: 'Quote', keyCode: 222, label: '\'' },
    { dik: 0x29, code: 'Backquote', keyCode: 192, label: '`' },
    { dik: 0x2B, code: 'Backslash', keyCode: 220, label: '\\' },
    { dik: 0x33, code: 'Comma', keyCode: 188, label: ',' },
    { dik: 0x34, code: 'Period', keyCode: 190, label: '.' },
    { dik: 0x35, code: 'Slash', keyCode: 191, label: '/' },
    { dik: 0x0E, code: 'Backspace', keyCode: 8, label: 'Backspace' },
    { dik: 0x46, code: 'ScrollLock', keyCode: 145, label: 'Scroll Lock' },
    { dik: 0xC5, code: 'Pause', keyCode: 19, label: 'Pause' },
    { dik: 0xC7, code: 'Home', keyCode: 36, label: 'Home' },
    { dik: 0xCF, code: 'End', keyCode: 35, label: 'End' },
    { dik: 0xC9, code: 'PageUp', keyCode: 33, label: 'Page Up' },
    { dik: 0xD1, code: 'PageDown', keyCode: 34, label: 'Page Down' },
    { dik: 0xD2, code: 'Insert', keyCode: 45, label: 'Insert' },
    { dik: 0xD3, code: 'Delete', keyCode: 46, label: 'Delete' },
    { dik: 0xC8, code: 'ArrowUp', keyCode: 38, label: '↑' },
    { dik: 0xD0, code: 'ArrowDown', keyCode: 40, label: '↓' },
    { dik: 0xCB, code: 'ArrowLeft', keyCode: 37, label: '←' },
    { dik: 0xCD, code: 'ArrowRight', keyCode: 39, label: '→' },
  );
  return out;
}

// Escape, Tab, Enter, Space and modifiers are left out on purpose: the game and the settings
// panel already need them.
const DEFINITIONS = buildDefinitions();
const BY_DIK = new Map(DEFINITIONS.map(definition => [definition.dik, definition]));
const BY_CODE = new Map(DEFINITIONS.map(definition => [definition.code, definition]));
const BY_KEY_CODE = new Map(DEFINITIONS.map(definition => [definition.keyCode, definition]));

export function isBindableHotkey(dik: unknown): dik is number {
  return typeof dik === 'number' && BY_DIK.has(dik);
}

export function formatHotkey(dik: number): string {
  return BY_DIK.get(dik)?.label ?? `0x${dik.toString(16).toUpperCase()}`;
}

// Prefers the physical `code`; falls back to the legacy keyCode for engines that only set that.
export function keyboardEventToHotkey(event: Pick<KeyboardEvent, 'code' | 'keyCode'>): number | null {
  const byCode = event.code ? BY_CODE.get(event.code) : undefined;
  if (byCode) return byCode.dik;
  if (event.code) return null;
  return BY_KEY_CODE.get(event.keyCode)?.dik ?? null;
}

export function sanitizeHotkeys(
  settingsHotkey: unknown,
  visibilityHotkey: unknown,
): { settingsHotkey: number; visibilityHotkey: number } {
  const settingsKey = isBindableHotkey(settingsHotkey) ? settingsHotkey : DEFAULT_SETTINGS_HOTKEY;
  let visibilityKey = isBindableHotkey(visibilityHotkey) ? visibilityHotkey : DEFAULT_VISIBILITY_HOTKEY;
  if (visibilityKey === settingsKey) {
    visibilityKey = settingsKey === DEFAULT_VISIBILITY_HOTKEY ? DEFAULT_SETTINGS_HOTKEY : DEFAULT_VISIBILITY_HOTKEY;
  }
  return { settingsHotkey: settingsKey, visibilityHotkey: visibilityKey };
}
