import { describe, expect, it } from 'vitest';
import nameCases from './userFontNameCases.json';
import { buildUserFontFaceCss, findUserFont, inferUserFontWeight, isValidUserFontName, normalizeUserFonts } from './userFonts';

describe('user font names', () => {
  it.each(nameCases)('validates $label', ({ name, repeat, suffix, valid }) => {
    expect(isValidUserFontName(name.repeat(repeat ?? 1) + (suffix ?? ''))).toBe(valid);
  });
});

describe('user font discovery', () => {
  it.each([
    ['MyFont-Thin.ttf', 100], ['Foo Hairline.otf', 100], ['Extra Light', 200], ['Ultra-Light.woff2', 200],
    ['Font_Light.woff', 300], ['Foo-Regular.subset.woff2', 400], ['Normal.otf', 400], ['Book.ttf', 400],
    ['Roman.ttf', 400], ['Font.ttf', 400], ['Medium.ttf', 500], ['Semi-Bold', 600], ['Demi Bold.OTF', 600],
    ['Bold.woff', 700], ['ExtraBold.otf', 800], ['UltraBold.woff2', 800], ['Black.otf', 900], ['Heavy.ttf', 900],
    // Regular-weight words inside family names must not hide the real weight.
    ['Bookman-Bold.ttf', 700], ['TimesNewRoman-Medium.ttf', 500], ['Normalidad-Light.otf', 300], ['Bookman-Regular.ttf', 400],
  ])('infers %s as weight %i', (fileName, weight) => {
    expect(inferUserFontWeight(fileName)).toBe(weight);
  });

  it('drops files that differ only in ASCII case before the per-font limit', () => {
    const variants = Array.from({ length: 16 }, (_, i) => [...'aaaa'].map((ch, j) => (i >> j) & 1 ? ch.toUpperCase() : ch).join('') + '.ttf');
    const [font] = normalizeUserFonts(JSON.stringify({ fonts: [{ id: 'Dup', files: [...variants, 'z-Bold.ttf'] }] }));
    expect(font.files.map(file => file.name)).toEqual(['AAAA.ttf', 'z-Bold.ttf']);
  });

  it.each(['{', 'null', '[]', '{"fonts":{}}'])('ignores malformed listings %s', json => {
    expect(normalizeUserFonts(json)).toEqual([]);
  });

  it('validates folders and files including face style and extension', () => {
    const fonts = normalizeUserFonts(JSON.stringify({ fonts: [
      { id: '../Hidden', files: ['Font.ttf'] },
      { id: 'Empty', files: ['MyFont-Italic.woff2', 'MyFont-OB_LIQUE.ttf'] },
      { id: 'Broken', files: './Font.ttf' },
      {
        id: '한글 👑',
        files: ['Font.BOLD.OTF', "King's [Light].ttf", 'Other-Italic.ttf', 'no-extension', 'Foo.eot', 'a/b.ttf', 'bad%.woff', 42],
      },
    ] }));
    expect(fonts).toEqual([{ id: '한글 👑', files: [
      { name: 'Font.BOLD.OTF', weight: 700, format: 'opentype' },
      { name: "King's [Light].ttf", weight: 300, format: 'truetype' },
    ] }]);
  });

  it('sorts before de-duplicating and limiting the fonts and their files', () => {
    const unorderedFiles = Array.from({ length: 20 }, (_, i) => `File${String(i).padStart(2, '0')}.ttf`).reverse();
    const unorderedFonts = Array.from({ length: 35 }, (_, i) => ({
      id: `Other${String(i).padStart(2, '0')}`, files: ['Font.ttf'],
    })).reverse();
    const fonts = normalizeUserFonts(JSON.stringify({ fonts: [
      ...unorderedFonts,
      { id: 'alpine', files: ['Ignored.ttf'] },
      { id: 'Alpine', files: [...unorderedFiles, 'File00.ttf'] },
    ] }));
    expect(fonts.map(font => font.id)).toEqual(['Alpine', ...unorderedFonts.reverse().slice(0, 31).map(font => font.id)]);
    expect(fonts[0].files.map(file => file.name)).toEqual(unorderedFiles.reverse().slice(0, 16));
    expect(findUserFont(fonts, 'ALPINE')).toBe(fonts[0]);
    expect(findUserFont(fonts, 'Missing')).toBeNull();
  });

  it('sorts UTF-8 bytes even when UTF-16 would put the emoji first', () => {
    const fonts = normalizeUserFonts(JSON.stringify({ fonts: [
      { id: '👑', files: ['Font.ttf'] },
      { id: '\ue000', files: ['👑.ttf', '\ue000.ttf'] },
    ] }));
    expect(fonts.map(font => font.id)).toEqual(['\ue000', '👑']);
    expect(fonts[0].files.map(file => file.name)).toEqual(['\ue000.ttf', '👑.ttf']);
  });
});

describe('user font CSS', () => {
  const [font] = normalizeUserFonts(JSON.stringify({ fonts: [{
    id: "King's (HUD)",
    files: ['Font-Regular.ttf', 'Font-Regular.otf', 'Font-Regular.woff', "King's Regular.woff2", 'Z-Regular.woff2', 'Font-Black.otf'],
  }] }));

  it('groups existing weights and chooses the first file for each format in the source order', () => {
    const css = buildUserFontFaceCss(font, 'TW User Font 3');
    const faces = css.split('\n');
    expect(faces).toHaveLength(2);
    expect(faces[0]).toMatch(/@font-face .*font-family: "TW User Font 3"; font-style: normal; font-weight: 400; font-display: block;/);
    expect(faces[0]).toContain([
      'url("user-fonts/King%27s%20%28HUD%29/King%27s%20Regular.woff2") format("woff2")',
      'url("user-fonts/King%27s%20%28HUD%29/Font-Regular.woff") format("woff")',
      'url("user-fonts/King%27s%20%28HUD%29/Font-Regular.otf") format("opentype")',
      'url("user-fonts/King%27s%20%28HUD%29/Font-Regular.ttf") format("truetype")',
    ].join(', '));
    expect(faces[0]).not.toContain('Z-Regular');
    expect(faces[1]).toContain('font-weight: 900');
    expect(css).not.toContain(font.id);
  });

  it('percent-encodes the extra punctuation allowed in folder and file names', () => {
    const [symbols] = normalizeUserFonts(JSON.stringify({ fonts: [{
      id: 'A & B, #1',
      files: ['Font+Hangul! @2 ~3=4;-Bold.ttf'],
    }] }));
    expect(buildUserFontFaceCss(symbols, 'TW User Font 4')).toContain(
      'url("user-fonts/A%20%26%20B%2C%20%231/Font%2BHangul%21%20%402%20~3%3D4%3B-Bold.ttf") format("truetype")',
    );
  });

  it('escapes quotes, backslashes and line breaks in CSS strings', () => {
    const css = buildUserFontFaceCss(font, 'TW "Family" \\ Name\nLine');
    expect(css).toContain(String.raw`font-family: "TW \"Family\" \\ Name\a Line";`);
  });
});
