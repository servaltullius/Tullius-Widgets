// Hotkeys are stored as DirectInput scan codes, the codes the SKSE key handler matches.

export const DEFAULT_SETTINGS_HOTKEY = 0xD2; // Insert
export const DEFAULT_VISIBILITY_HOTKEY = 0x57; // F11

interface HotkeyDefinition {
  dik: number;
  code: string;
  keyCode: number;
  label: string;
}

function buildDefinitions(): HotkeyDefinition[] {
  const out: HotkeyDefinition[] = [];
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
    { dik: 0x46, code: 'ScrollLock', keyCode: 145, label: 'Scroll Lock' },
    { dik: 0xC5, code: 'Pause', keyCode: 19, label: 'Pause' },
    { dik: 0xC7, code: 'Home', keyCode: 36, label: 'Home' },
    { dik: 0xCF, code: 'End', keyCode: 35, label: 'End' },
    { dik: 0xC9, code: 'PageUp', keyCode: 33, label: 'Page Up' },
    { dik: 0xD1, code: 'PageDown', keyCode: 34, label: 'Page Down' },
    { dik: 0xD2, code: 'Insert', keyCode: 45, label: 'Insert' },
    { dik: 0xD3, code: 'Delete', keyCode: 46, label: 'Delete' },
  );
  return out;
}

// Only function keys, the navigation block and the numpad: letters, digits, arrows and the
// like are typed into the console and used by the settings panel itself. Keep in sync with
// IsBindableScanCode in src/WidgetHotkeys.cpp.
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

// With NumLock off the numpad reports navigation keyCodes (Insert, End, ...), but DirectInput
// still sees the numpad keys, so map them by location when only keyCode is available.
const NUMPAD_NAVIGATION_KEY_CODES: Record<number, number> = {
  45: 0x52, 35: 0x4F, 40: 0x50, 34: 0x51, 37: 0x4B, 12: 0x4C, 39: 0x4D, 36: 0x47, 38: 0x48, 33: 0x49, 46: 0x53,
};
const DOM_KEY_LOCATION_NUMPAD = 3;

// Prefers the physical `code`; falls back to the legacy keyCode for engines that only set that.
export function keyboardEventToHotkey(event: Pick<KeyboardEvent, 'code' | 'keyCode'> & { location?: number }): number | null {
  const byCode = event.code ? BY_CODE.get(event.code) : undefined;
  if (byCode) return byCode.dik;
  if (event.code) return null;
  if (event.location === DOM_KEY_LOCATION_NUMPAD && NUMPAD_NAVIGATION_KEY_CODES[event.keyCode] !== undefined) {
    return NUMPAD_NAVIGATION_KEY_CODES[event.keyCode];
  }
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

// While a hotkey button waits for a key, the panel's other key handlers (arrow nudges, Esc
// deselect, undo) must stand aside so the key reaches the capture instead.
let captureActive = false;

export function setHotkeyCaptureActive(active: boolean): void {
  captureActive = active;
  // The plugin's own hotkeys (and Esc) stand aside too, so the pressed key reaches the page.
  try {
    window.onHotkeyCapture?.(active ? '1' : '0');
  } catch (error) {
    console.error('[TulliusWidgets] Failed to report hotkey capture:', error);
  }
}

export function isHotkeyCaptureActive(): boolean {
  return captureActive;
}
