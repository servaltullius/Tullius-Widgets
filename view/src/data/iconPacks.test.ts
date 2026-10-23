import { describe, expect, it } from 'vitest';
import { findIconPack, getIconPackUrl, isValidIconPackId, normalizeIconPacks } from './iconPacks';
import { mergeWithDefaults } from '../hooks/settingsSchema';

describe('iconPacks', () => {
  it('reads the plugin listing with manifest labels and the base theme', () => {
    const packs = normalizeIconPacks(JSON.stringify({
      packs: [
        { id: 'zeta', icons: ['health'], manifest: '{"name":"Zeta Runes","author":"Serval","version":"1.0","base":"standard"}' },
        { id: '도로롱 리스킨', icons: ['gold', 'slot-sword'], manifest: '' },
      ],
    }));
    // Sorted by display name.
    expect(packs.map(pack => pack.id)).toEqual(['zeta', '도로롱 리스킨']);
    const [zeta, korean] = packs;
    expect(korean).toMatchObject({ name: '도로롱 리스킨', author: '', base: 'dororong' });
    expect(zeta).toMatchObject({ name: 'Zeta Runes', author: 'Serval', version: '1.0', base: 'standard' });
    expect(getIconPackUrl(korean, 'GOLD')).toBe('icon-packs/%EB%8F%84%EB%A1%9C%EB%A1%B1%20%EB%A6%AC%EC%8A%A4%ED%82%A8/gold.png');
    expect(getIconPackUrl(korean, 'health')).toBeUndefined();
    expect(findIconPack(packs, 'zeta')).toBe(zeta);
    expect(findIconPack(packs, 'ZETA')).toBe(zeta);
    expect(findIconPack(packs, '')).toBeNull();
    expect(findIconPack(packs, 'missing')).toBeNull();
  });

  it('drops unsafe folder names, unsafe icon names, empty packs and duplicates', () => {
    const packs = normalizeIconPacks(JSON.stringify({
      packs: [
        { id: '../escape', icons: ['health'] },
        { id: '.hidden', icons: ['health'] },
        { id: 'a/b', icons: ['health'] },
        { id: 'empty', icons: [] },
        { id: 'bad icons', icons: ['../x', 'he alth', 'ok-1'] },
        { id: 'Dup', icons: ['health'] },
        { id: 'dup', icons: ['gold'] },
        { id: 'broken manifest', icons: ['health'], manifest: '{not json' },
      ],
    }));
    expect(packs.map(pack => pack.id)).toEqual(['bad icons', 'broken manifest', 'Dup']);
    expect([...packs[0].icons.values()]).toEqual(['ok-1']);
    expect(packs[1]).toMatchObject({ name: 'broken manifest', base: 'dororong' });
    expect(normalizeIconPacks('not json')).toEqual([]);
    expect(normalizeIconPacks('{"packs":"x"}')).toEqual([]);
  });

  it('validates pack ids used as file URL segments', () => {
    expect(isValidIconPackId('My Pack (v2)')).toBe(true);
    expect(isValidIconPackId('룬 아이콘')).toBe(true);
    expect(isValidIconPackId('')).toBe(false);
    expect(isValidIconPackId('a\\b')).toBe(false);
    expect(isValidIconPackId('x..y')).toBe(false);
    expect(isValidIconPackId('a'.repeat(65))).toBe(false);
  });

  it('keeps a valid saved pack id and drops an unsafe one', () => {
    expect(mergeWithDefaults({ schemaVersion: 7, general: { iconPack: 'My Pack' } }).general.iconPack).toBe('My Pack');
    expect(mergeWithDefaults({ schemaVersion: 7, general: { iconPack: '../../x' } }).general.iconPack).toBe('');
    expect(mergeWithDefaults({ schemaVersion: 7 }).general.iconPack).toBe('');
  });
});
