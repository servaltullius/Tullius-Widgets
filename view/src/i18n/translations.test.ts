import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureLanguageCatalog,
  ensureLocalizationManifest,
  formatSkyrimDateTime,
  getAvailableLanguages,
  resetLocalizationStateForTests,
  resolveLanguage,
  t,
} from './translations';

describe('translations', () => {
  beforeEach(() => {
    resetLocalizationStateForTests();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to the current default language when a custom language is not loaded yet', () => {
    expect(t('fr', 'title')).toBe('툴리우스 위젯');
  });

  it('loads external language packs from manifest and falls back for missing keys', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const target = input.toString();

      if (target.endsWith('/i18n/manifest.json') || target === './i18n/manifest.json') {
        return {
          ok: true,
          json: async () => ({
            defaultLanguage: 'ko',
            languages: [
              { code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' },
              { code: 'en', label: 'English', file: 'en.json', locale: 'en-US' },
              { code: 'fr', label: 'Français', file: 'fr.json', locale: 'fr-FR' },
            ],
          }),
        };
      }

      if (target.endsWith('/i18n/fr.json') || target === './i18n/fr.json') {
        return {
          ok: true,
          json: async () => ({
            title: 'Widgets de Tullius',
            general: 'Général',
          }),
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      };
    });

    vi.stubGlobal('fetch', fetchMock);

    await ensureLocalizationManifest();
    await ensureLanguageCatalog('fr');

    expect(getAvailableLanguages().map(language => language.code)).toContain('fr');
    expect(t('fr', 'title')).toBe('Widgets de Tullius');
    expect(t('fr', 'showWidgets')).toBe('Show Widgets');
  });

  it('uses manifest defaultLanguage as the resolved active language', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        defaultLanguage: 'fr',
        languages: [
          { code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' },
          { code: 'en', label: 'English', file: 'en.json', locale: 'en-US' },
          { code: 'fr', label: 'Français', file: 'fr.json', locale: 'fr-FR' },
        ],
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);

    await ensureLocalizationManifest();

    expect(resolveLanguage('')).toBe('fr');
  });

  it('retries manifest loading after a transient failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          defaultLanguage: 'fr',
          languages: [
            { code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' },
            { code: 'en', label: 'English', file: 'en.json', locale: 'en-US' },
            { code: 'fr', label: 'Français', file: 'fr.json', locale: 'fr-FR' },
          ],
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    await ensureLocalizationManifest();
    expect(getAvailableLanguages().map(language => language.code)).not.toContain('fr');

    await ensureLocalizationManifest();
    expect(getAvailableLanguages().map(language => language.code)).toContain('fr');
  });

  it('formats Skyrim date/time using localization patterns and month names', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const target = input.toString();

      if (target.endsWith('/i18n/manifest.json') || target === './i18n/manifest.json') {
        return {
          ok: true,
          json: async () => ({
            defaultLanguage: 'fr',
            languages: [
              { code: 'ko', label: '한국어', file: 'ko.json', locale: 'ko-KR' },
              { code: 'en', label: 'English', file: 'en.json', locale: 'en-US' },
              { code: 'fr', label: 'Français', file: 'fr.json', locale: 'fr-FR' },
            ],
          }),
        };
      }

      if (target.endsWith('/i18n/fr.json') || target === './i18n/fr.json') {
        return {
          ok: true,
          json: async () => ({
            gameDateTimePattern: '4E {day} {monthName} {year} {time}',
            monthMorningStar: 'Etoile du Matin',
          }),
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      };
    });

    vi.stubGlobal('fetch', fetchMock);

    await ensureLocalizationManifest();
    await ensureLanguageCatalog('fr');

    expect(formatSkyrimDateTime('fr', { year: 201, month: 0, day: 5, time: '08:30' })).toBe(
      '4E 5 Etoile du Matin 201 08:30',
    );
  });

  it('formats Korean Skyrim date/time with numeric months', () => {
    expect(formatSkyrimDateTime('ko', { year: 201, month: 7, day: 21, time: '14:35' })).toBe(
      '4E 201년 8월 21일 14:35',
    );
  });

  it('includes quick-edit card strings in bundled languages', () => {
    expect(t('ko', 'positionX')).toBe('X 위치');
    expect(t('ko', 'positionY')).toBe('Y 위치');
    expect(t('ko', 'resetPosition')).toBe('위치 초기화');
    expect(t('ko', 'lock')).toBe('잠금');
    expect(t('ko', 'bringForward')).toBe('앞으로');
    expect(t('ko', 'sendBackward')).toBe('뒤로');

    expect(t('en', 'positionX')).toBe('X Position');
    expect(t('en', 'positionY')).toBe('Y Position');
    expect(t('en', 'resetPosition')).toBe('Reset Position');
    expect(t('en', 'lock')).toBe('Lock');
    expect(t('en', 'bringForward')).toBe('Bring Forward');
    expect(t('en', 'sendBackward')).toBe('Send Backward');
  });

  it('includes voice slot labels in bundled languages', () => {
    expect(t('ko', 'voiceEquipped')).toBe('포효/파워');
    expect(t('ko', 'voiceShout')).toBe('포효');
    expect(t('ko', 'voicePower')).toBe('파워');

    expect(t('en', 'voiceEquipped')).toBe('Voice / Power');
    expect(t('en', 'voiceShout')).toBe('Shout');
    expect(t('en', 'voicePower')).toBe('Power');
  });

  it('includes font preset labels in bundled languages', () => {
    expect(t('ko', 'fontPreset')).toBe('글꼴 프리셋');
    expect(t('ko', 'fontPresetDefault')).toBe('기본');
    expect(t('ko', 'fontPresetReadable')).toBe('가독성');
    expect(t('ko', 'fontPresetCompact')).toBe('압축형');
    expect(t('ko', 'fontPresetClassic')).toBe('고전형');

    expect(t('en', 'fontPreset')).toBe('Font Preset');
    expect(t('en', 'fontPresetDefault')).toBe('Default');
    expect(t('en', 'fontPresetReadable')).toBe('Readable');
    expect(t('en', 'fontPresetCompact')).toBe('Compact');
    expect(t('en', 'fontPresetClassic')).toBe('Classic');
  });
});
