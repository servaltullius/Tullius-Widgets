import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bundledTranslations } from './translations';

// The shipped catalogs in public/i18n override the bundled strings at runtime and serve as the
// template for community translations. They must track the bundled strings exactly, or stale
// text wins in game and new settings are missing from the template.
describe('shipped i18n catalogs', () => {
  it.each(['ko', 'en'] as const)('%s.json matches the bundled strings', language => {
    const catalog = JSON.parse(
      readFileSync(new URL(`../../public/i18n/${language}.json`, import.meta.url), 'utf8'),
    ) as Record<string, string>;
    expect(catalog).toEqual(bundledTranslations[language]);
  });
});
