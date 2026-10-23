import { createContext } from 'react';
import { getDororongSlotIcon, getDororongStatIcon, resolveStatIconFile } from '../../data/dororongMiniIcons';
import { getIconPackUrl, type IconPack } from '../../data/iconPacks';
import type { IconTheme } from '../../types/settings';

// Which icons the compact widgets draw: the built-in theme, and a user icon pack over it.
export interface CompactIconSource {
  theme: IconTheme;
  pack: IconPack | null;
}

export const STANDARD_ICON_SOURCE: CompactIconSource = { theme: 'standard', pack: null };

// Provided once per compact item.
export const CompactIconThemeContext = createContext<CompactIconSource>(STANDARD_ICON_SOURCE);

// Image art for a stat or effect icon: the pack's file, else the theme's built-in art, else
// undefined (the caller draws the line icon).
export function getCompactStatArt(source: CompactIconSource, name: string): string | undefined {
  return (source.pack ? getIconPackUrl(source.pack, resolveStatIconFile(name)) : undefined)
    ?? getDororongStatIcon(source.theme, name);
}

// Equipment slot art. Within a pack the left hand prefers "slot-<kind>-left"; a pack that only
// draws "slot-<kind>" still wins over built-in art so one slot never mixes two styles.
export function getCompactSlotArt(source: CompactIconSource, name: string, hand: 'right' | 'left' = 'right'): string | undefined {
  if (source.pack) {
    const fromPack = (hand === 'left' ? getIconPackUrl(source.pack, `slot-${name}-left`) : undefined)
      ?? getIconPackUrl(source.pack, `slot-${name}`);
    if (fromPack) return fromPack;
  }
  return getDororongSlotIcon(source.theme, name, hand);
}
