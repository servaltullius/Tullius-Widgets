import { describe, expect, it } from 'vitest';
import {
  FONT_PRESET_OPTIONS,
  resolveFontPresetStacks,
  resolveFontPresetVariables,
} from './fontPresets';

describe('fontPresets', () => {
  it.each(['classic', 'compact'] as const)('prepends a user family to the %s HUD stacks and level numbers only', hudStyle => {
    const preset = resolveFontPresetVariables('default', hudStyle);
    const withUserFont = resolveFontPresetVariables('default', hudStyle, 'TW User Font 3');
    expect(preset['--tw-font-level']).toBe('Georgia, "Times New Roman", serif');
    expect(withUserFont['--tw-font-ui']).toBe(preset['--tw-font-ui']);
    for (const property of ['--tw-font-hud', '--tw-font-compact', '--tw-font-level'] as const) {
      expect(withUserFont[property]).toBe(`"TW User Font 3", ${preset[property]}`);
    }
    expect(resolveFontPresetVariables('default', hudStyle, null)).toEqual(preset);
  });

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

  it('uses the bundled compact font only for the compact HUD with the default preset', () => {
    expect(resolveFontPresetVariables('default', 'compact')['--tw-font-compact']).toContain('Pretendard');
    expect(resolveFontPresetVariables('readable', 'compact')['--tw-font-compact']).toContain('Noto Sans KR');
    expect(resolveFontPresetVariables('default', 'classic')['--tw-font-compact']).not.toContain('Pretendard');
  });

  it('falls back to the default stack for unknown values', () => {
    const fallback = resolveFontPresetStacks('default');
    const unknown = resolveFontPresetStacks('something-else');

    expect(unknown).toEqual(fallback);
  });

  it('builds css custom properties for the selected preset', () => {
    const readable = resolveFontPresetVariables('readable');

    expect(readable['--tw-font-ui']).toContain('Noto Sans KR');
    expect(readable['--tw-font-ui']).not.toContain('Tullius Pretendard');
    expect(resolveFontPresetVariables('default')['--tw-font-ui'].startsWith('"Tullius Pretendard"')).toBe(true);
    expect(readable['--tw-font-hud']).toContain('Noto Sans KR');
  });
});
