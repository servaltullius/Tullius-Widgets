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
});
