import { useEffect, useState } from 'react';
import type { Language } from '../types/settings';
import {
  ensureLanguageCatalog,
  ensureLocalizationManifest,
  getAvailableLanguages,
  resolveLanguage,
  subscribeLocalization,
  type LocalizationLanguageEntry,
} from './translations';

interface UseLocalizationResult {
  activeLanguage: Language;
  availableLanguages: LocalizationLanguageEntry[];
}

export function useLocalization(language: Language): UseLocalizationResult {
  const [, setVersion] = useState(0);
  const activeLanguage = resolveLanguage(language);

  useEffect(() => {
    return subscribeLocalization(() => {
      setVersion(previous => previous + 1);
    });
  }, []);

  useEffect(() => {
    void ensureLocalizationManifest();
    void ensureLanguageCatalog(activeLanguage);
  }, [activeLanguage]);

  return {
    activeLanguage,
    availableLanguages: getAvailableLanguages(),
  };
}
