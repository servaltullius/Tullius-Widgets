import type { CSSProperties } from 'react';
import type { FontPreset } from '../types/settings';

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
}

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

export function resolveFontPresetVariables(preset: string): FontPresetVariables {
  const resolvedStacks = resolveFontPresetStacks(preset);

  return {
    '--tw-font-ui': resolvedStacks.uiFontStack,
    '--tw-font-hud': resolvedStacks.hudFontStack,
  };
}
