import { describe, expect, it } from 'vitest';
import {
  FONT_PRESET_OPTIONS,
  resolveFontPresetStacks,
  resolveFontPresetVariables,
} from './fontPresets';

describe('fontPresets', () => {
  it('exposes ui and hud stacks for every supported preset', () => {
    expect(FONT_PRESET_OPTIONS.map(option => option.value)).toEqual([
      'default',
      'readable',
      'compact',
      'classic',
    ]);

    for (const option of FONT_PRESET_OPTIONS) {
      const resolved = resolveFontPresetStacks(option.value);
      expect(resolved.uiFontStack).toBeTruthy();
      expect(resolved.hudFontStack).toBeTruthy();
      expect(resolved.uiFontStack).toContain('Noto Sans KR');
      expect(resolved.uiFontStack).toContain('Malgun Gothic');
      expect(resolved.uiFontStack).toContain('Yu Gothic');
      expect(resolved.uiFontStack).toContain('Meiryo');
      expect(resolved.uiFontStack).toContain('Microsoft YaHei');
      expect(resolved.uiFontStack).toContain('Microsoft JhengHei');
      expect(resolved.hudFontStack).toContain('Noto Sans KR');
      expect(resolved.hudFontStack).toContain('Malgun Gothic');
      expect(resolved.hudFontStack).toContain('Yu Gothic');
      expect(resolved.hudFontStack).toContain('Meiryo');
      expect(resolved.hudFontStack).toContain('Microsoft YaHei');
      expect(resolved.hudFontStack).toContain('Microsoft JhengHei');
    }
  });

  it('falls back to the default stack for unknown values', () => {
    const fallback = resolveFontPresetStacks('default');
    const unknown = resolveFontPresetStacks('something-else');

    expect(unknown).toEqual(fallback);
  });

  it('builds css custom properties for the selected preset', () => {
    const readable = resolveFontPresetVariables('readable');

    expect(readable['--tw-font-ui']).toContain('Noto Sans KR');
    expect(readable['--tw-font-hud']).toContain('Noto Sans KR');
  });
});
