import type { IconTheme } from '../types/settings';

// Mini Dororong icons for the compact HUD (unofficial fan art; Dororong is from Goddess of
// Victory: NIKKE / SHIFT UP). Small stat icons are named after the stat key; equipment slot
// icons are "slot-<kind>". Any icon without a file falls back to the line icon.
const files = import.meta.glob('../assets/dororong-mini/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url]),
);

const STAT_ALIASES: Record<string, string> = {
  weatherClear: 'clear',
  weatherCloudy: 'cloudy',
  weatherRain: 'rain',
  weatherSnow: 'snow',
  weatherIndoor: 'indoor',
  weatherUnknown: 'cloudy',
};

// File name for a stat icon key (the weather keys share the weather art names).
export function resolveStatIconFile(name: string): string {
  return STAT_ALIASES[name] ?? name;
}

export function getDororongStatIcon(theme: IconTheme, name: string): string | undefined {
  if (theme !== 'dororong') return undefined;
  return ICONS[resolveStatIconFile(name)];
}

// The left-hand slot prefers art with the item in Doro's left paw ("slot-<kind>-left").
export function getDororongSlotIcon(theme: IconTheme, name: string, hand: 'right' | 'left' = 'right'): string | undefined {
  if (theme !== 'dororong') return undefined;
  return (hand === 'left' ? ICONS[`slot-${name}-left`] : undefined) ?? ICONS[`slot-${name}`];
}
