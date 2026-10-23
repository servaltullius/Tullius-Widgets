import type { IconTheme } from '../types/settings';
import { isPlainObject } from '../utils/normalize';

// User icon packs for the compact HUD. A pack is a folder under
// PrismaUI/views/TulliusWidgets/icon-packs/<id>/ holding PNGs named like the built-in mini
// Dororong art ("health.png", "slot-sword.png", "slot-sword-left.png", ...) and an optional
// pack.json. The plugin lists the folders (a Prisma UI view cannot list files itself) and
// sends them through the updateIconPacks bridge call; the view only requests icons the
// listing contains, so a missing file never shows as a broken image.

export const ICON_PACKS_DIRECTORY = 'icon-packs';

export interface IconPack {
  id: string;
  name: string;
  author: string;
  version: string;
  /** Built-in theme the pack draws over: its layout and icon size, and the icons it lacks. */
  base: IconTheme;
  /** Lower-case icon name -> file name without ".png" as found on disk. */
  icons: ReadonlyMap<string, string>;
}

const MAX_PACKS = 64;
const MAX_ICONS_PER_PACK = 512;
const PACK_ID_PATTERN = /^[\p{L}\p{N} _\-.()'[\]]{1,64}$/u;
const ICON_NAME_PATTERN = /^[A-Za-z0-9_-]{1,48}$/;

// Folder names become part of a file URL, so path separators, ".." and hidden folders are out.
export function isValidIconPackId(value: string): boolean {
  return PACK_ID_PATTERN.test(value) && !value.startsWith('.') && !value.includes('..');
}

function readLabel(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function readManifest(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string' || raw.trim() === '') return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function normalizeIconPacks(jsonString: string): IconPack[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString) as unknown;
  } catch {
    return [];
  }
  const rawPacks = isPlainObject(parsed) && Array.isArray(parsed.packs) ? parsed.packs : [];
  const packs: IconPack[] = [];
  const seen = new Set<string>();
  for (const rawPack of rawPacks) {
    if (packs.length >= MAX_PACKS) break;
    if (!isPlainObject(rawPack) || typeof rawPack.id !== 'string' || !isValidIconPackId(rawPack.id)) continue;
    const key = rawPack.id.toLowerCase();
    if (seen.has(key)) continue;

    const icons = new Map<string, string>();
    for (const rawIcon of Array.isArray(rawPack.icons) ? rawPack.icons : []) {
      if (icons.size >= MAX_ICONS_PER_PACK) break;
      if (typeof rawIcon === 'string' && ICON_NAME_PATTERN.test(rawIcon) && !icons.has(rawIcon.toLowerCase())) {
        icons.set(rawIcon.toLowerCase(), rawIcon);
      }
    }
    if (icons.size === 0) continue;

    const manifest = readManifest(rawPack.manifest);
    seen.add(key);
    packs.push({
      id: rawPack.id,
      name: readLabel(manifest.name, 40) || rawPack.id,
      author: readLabel(manifest.author, 40),
      version: readLabel(manifest.version, 20),
      base: manifest.base === 'standard' ? 'standard' : 'dororong',
      icons,
    });
  }
  return packs.sort((a, b) => a.name.localeCompare(b.name));
}

// Case-insensitive like the folder names it stands for on Windows, so renaming a pack folder
// only by case keeps the player's choice.
export function findIconPack(packs: readonly IconPack[], id: string): IconPack | null {
  if (!id) return null;
  const key = id.toLowerCase();
  return packs.find(pack => pack.id.toLowerCase() === key) ?? null;
}

// Relative to the view's index.html (PrismaUI/views/TulliusWidgets/).
export function getIconPackUrl(pack: IconPack, name: string): string | undefined {
  const file = pack.icons.get(name.toLowerCase());
  return file ? `${ICON_PACKS_DIRECTORY}/${encodeURIComponent(pack.id)}/${encodeURIComponent(file)}.png` : undefined;
}
