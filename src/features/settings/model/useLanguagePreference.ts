import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  normalizeLanguage,
  supportedLanguages,
  type UiLanguage,
  writeStoredLanguage,
} from '@/shared/i18n/config';

export function useLanguagePreference() {
  const { i18n } = useTranslation();

  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  const setLanguage = useCallback(
    async (language: UiLanguage) => {
      writeStoredLanguage(language);
      await i18n.changeLanguage(language);
    },
    [i18n]
  );

  return {
    currentLanguage,
    supportedLanguages,
    setLanguage,
  };
}
