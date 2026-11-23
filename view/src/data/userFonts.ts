import { isPlainObject } from '../utils/normalize';

export const USER_FONTS_DIRECTORY = 'user-fonts';

export interface UserFontFile {
  name: string;
  weight: number;
  format: 'woff2' | 'woff' | 'opentype' | 'truetype';
}

export interface UserFont {
  id: string;
  files: UserFontFile[];
}

const MAX_FONTS = 32;
const MAX_FILES_PER_FONT = 16;
const MAX_NAME_BYTES = 192;
// Same set as the plugin. Each is legal on Windows and is percent-encoded or CSS-escaped in URLs.
const NAME_PUNCTUATION = " _-.()'[]+&,!#@~=;";
const UTF8 = new TextEncoder();

const FORMAT_BY_EXTENSION = new Map<string, UserFontFile['format']>([
  ['woff2', 'woff2'],
  ['woff', 'woff'],
  ['otf', 'opentype'],
  ['ttf', 'truetype'],
]);

// Compound names come before their parts (semibold before bold). The regular-weight words come
// last because they also appear inside family names ("Bookman-Bold", "TimesNewRoman-Medium").
const WEIGHT_KEYWORDS = [
  ['extrabold', 800], ['ultrabold', 800],
  ['semibold', 600], ['demibold', 600],
  ['extralight', 200], ['ultralight', 200],
  ['hairline', 100],
  ['medium', 500], ['light', 300], ['black', 900], ['heavy', 900],
  ['thin', 100], ['bold', 700],
  ['regular', 400], ['normal', 400], ['book', 400], ['roman', 400],
] as const;
const DEFAULT_WEIGHT = 400;

export function isValidUserFontName(value: string): boolean {
  if (!value || value.startsWith('.') || value.endsWith('.') || value.includes('..')
    || value.startsWith(' ') || value.endsWith(' ')) return false;
  // A Unicode regex only matches unpaired surrogates here. TextEncoder would replace those.
  if (/[\uD800-\uDFFF]/u.test(value)) return false;
  const bytes = UTF8.encode(value);
  return bytes.length <= MAX_NAME_BYTES && bytes.every(byte => (
    byte >= 0x80 || /[A-Za-z0-9]/.test(String.fromCharCode(byte))
    || NAME_PUNCTUATION.includes(String.fromCharCode(byte))
  ));
}

function fontNameKeywords(fileName: string): string {
  const extensionStart = fileName.lastIndexOf('.');
  const stem = extensionStart < 0 ? fileName : fileName.slice(0, extensionStart);
  // Font weight and style tokens use ASCII letters in both the plugin and the view.
  return stem.replace(/[^A-Za-z]/g, '').toLowerCase();
}

export function inferUserFontWeight(fileName: string): number {
  return weightFromKeywords(fontNameKeywords(fileName));
}

function weightFromKeywords(keywords: string): number {
  return WEIGHT_KEYWORDS.find(([keyword]) => keywords.includes(keyword))?.[1] ?? DEFAULT_WEIGHT;
}

function asciiLowercase(value: string): string {
  return value.replace(/[A-Z]/g, letter => letter.toLowerCase());
}

function compareUtf8(left: string, right: string): number {
  const a = UTF8.encode(left);
  const b = UTF8.encode(right);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

export function normalizeUserFonts(json: string): UserFont[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    return [];
  }
  if (!isPlainObject(parsed) || !Array.isArray(parsed.fonts)) return [];

  const fonts: UserFont[] = [];
  for (const raw of parsed.fonts) {
    if (!isPlainObject(raw) || typeof raw.id !== 'string' || !isValidUserFontName(raw.id) || !Array.isArray(raw.files)) continue;
    const files: UserFontFile[] = [];
    for (const name of new Set(raw.files)) {
      if (typeof name !== 'string' || !isValidUserFontName(name)) continue;
      const dot = name.lastIndexOf('.');
      const format = dot < 0 ? undefined : FORMAT_BY_EXTENSION.get(name.slice(dot + 1).toLowerCase());
      if (!format) continue;
      const keywords = fontNameKeywords(name);
      if (keywords.includes('italic') || keywords.includes('oblique')) continue;
      files.push({ name, weight: weightFromKeywords(keywords), format });
    }
    if (!files.length) continue;
    files.sort((a, b) => compareUtf8(a.name, b.name));
    // Same rule as the plugin: names differing only in ASCII case are one file on Windows, and
    // duplicates must not use up the per-font limit before distinct files.
    const seenFiles = new Set<string>();
    const distinctFiles = files.filter(file => {
      const key = asciiLowercase(file.name);
      if (seenFiles.has(key)) return false;
      seenFiles.add(key);
      return true;
    });
    fonts.push({ id: raw.id, files: distinctFiles.slice(0, MAX_FILES_PER_FONT) });
  }

  fonts.sort((a, b) => compareUtf8(a.id.toLowerCase(), b.id.toLowerCase()) || compareUtf8(a.id, b.id));
  const unique = new Map<string, UserFont>();
  for (const font of fonts) {
    const key = font.id.toLowerCase();
    if (!unique.has(key)) unique.set(key, font);
    if (unique.size === MAX_FONTS) break;
  }
  return [...unique.values()];
}

export function findUserFont(fonts: readonly UserFont[], id: string): UserFont | null {
  if (!id) return null;
  const key = id.toLowerCase();
  return fonts.find(font => font.id.toLowerCase() === key) ?? null;
}

function encodeSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/['()*!]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function cssString(value: string): string {
  return `"${value.replace(/["\\\n\r\f]/g, char => (
    char === '"' || char === '\\' ? `\\${char}` : `\\${char.charCodeAt(0).toString(16)} `
  ))}"`;
}

export function buildUserFontFaceCss(font: UserFont, family: string): string {
  const filesByWeight = new Map<number, Map<UserFontFile['format'], string>>();
  for (const file of [...font.files].sort((a, b) => compareUtf8(a.name, b.name))) {
    let formats = filesByWeight.get(file.weight);
    if (!formats) {
      formats = new Map();
      filesByWeight.set(file.weight, formats);
    }
    if (!formats.has(file.format)) formats.set(file.format, file.name);
  }

  const folder = `${USER_FONTS_DIRECTORY}/${encodeSegment(font.id)}`;
  return [...filesByWeight.keys()].sort((a, b) => a - b).map(weight => {
    const formats = filesByWeight.get(weight);
    const sources: string[] = [];
    for (const format of FORMAT_BY_EXTENSION.values()) {
      const file = formats?.get(format);
      if (file) sources.push(`url(${cssString(`${folder}/${encodeSegment(file)}`)}) format(${cssString(format)})`);
    }
    return `@font-face { font-family: ${cssString(family)}; font-style: normal; font-weight: ${weight}; font-display: block; src: ${sources.join(', ')}; }`;
  }).join('\n');
}
