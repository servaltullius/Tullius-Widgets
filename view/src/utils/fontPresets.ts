import type { CSSProperties } from 'react';
import type { FontPreset, HudStyle } from '../types/settings';

export interface FontPresetOption {
  value: FontPreset;
  labelKey: 'fontPresetDefault' | 'fontPresetReadable' | 'fontPresetCompact' | 'fontPresetClassic';
}

interface FontPresetStacks {
  uiFontStack: string;
  hudFontStack: string;
}

export interface FontPresetVariables extends CSSProperties {
  '--tw-font-ui': string;
  '--tw-font-hud': string;
  '--tw-font-compact': string;
  '--tw-font-level': string;
}

const COMPACT_HUD_FONT_STACK = '"Tullius Pretendard", "Pretendard", "Malgun Gothic", "Segoe UI", sans-serif';
const LEVEL_FONT_STACK = 'Georgia, "Times New Roman", serif';

const UNIVERSAL_FALLBACK_STACK = [
  '"Noto Sans KR"',
  '"Malgun Gothic"',
  '"Yu Gothic"',
  '"Meiryo"',
  '"Microsoft YaHei"',
  '"Microsoft JhengHei"',
  'sans-serif',
].join(', ');

const FONT_PRESET_STACKS: Record<FontPreset, FontPresetStacks> = {
  default: {
    uiFontStack: `"Segoe UI", ${UNIVERSAL_FALLBACK_STACK}`,
    hudFontStack: `"Segoe UI", ${UNIVERSAL_FALLBACK_STACK}`,
  },
  readable: {
    uiFontStack: `"Noto Sans KR", "Malgun Gothic", "Segoe UI", ${UNIVERSAL_FALLBACK_STACK}`,
    hudFontStack: `"Noto Sans KR", "Malgun Gothic", "Segoe UI", ${UNIVERSAL_FALLBACK_STACK}`,
  },
  compact: {
    uiFontStack: `"Arial Narrow", "Segoe UI", ${UNIVERSAL_FALLBACK_STACK}`,
    hudFontStack: `"Arial Narrow", "Segoe UI", ${UNIVERSAL_FALLBACK_STACK}`,
  },
  classic: {
    uiFontStack: `"Trebuchet MS", "Segoe UI", ${UNIVERSAL_FALLBACK_STACK}`,
    hudFontStack: `"Trebuchet MS", "Segoe UI", ${UNIVERSAL_FALLBACK_STACK}`,
  },
};

export const FONT_PRESET_OPTIONS: readonly FontPresetOption[] = [
  { value: 'default', labelKey: 'fontPresetDefault' },
  { value: 'readable', labelKey: 'fontPresetReadable' },
  { value: 'compact', labelKey: 'fontPresetCompact' },
  { value: 'classic', labelKey: 'fontPresetClassic' },
] as const;

export function resolveFontPresetStacks(preset: string): FontPresetStacks {
  return FONT_PRESET_STACKS[preset as FontPreset] ?? FONT_PRESET_STACKS.default;
}

export function resolveFontPresetVariables(preset: string, hudStyle: HudStyle = 'classic', userFamily?: string | null): FontPresetVariables {
  const resolvedStacks = resolveFontPresetStacks(preset);
  // The compact HUD is designed around the bundled font; a non-default preset still wins.
  const compactStack = hudStyle === 'compact' && (preset === 'default' || !(preset in FONT_PRESET_STACKS))
    ? COMPACT_HUD_FONT_STACK
    : resolvedStacks.hudFontStack;
  const userFontPrefix = userFamily ? `"${userFamily}", ` : '';

  return {
    '--tw-font-ui': resolvedStacks.uiFontStack,
    '--tw-font-hud': userFontPrefix + resolvedStacks.hudFontStack,
    '--tw-font-compact': userFontPrefix + compactStack,
    '--tw-font-level': userFontPrefix + LEVEL_FONT_STACK,
  };
}
