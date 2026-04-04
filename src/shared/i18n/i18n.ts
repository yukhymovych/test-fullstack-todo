import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import commonEn from './locales/en/common.json';
import settingsEn from './locales/en/settings.json';
import learningEn from './locales/en/learning.json';
import notesEn from './locales/en/notes.json';
import studyEn from './locales/en/study.json';
import commonUk from './locales/uk/common.json';
import settingsUk from './locales/uk/settings.json';
import learningUk from './locales/uk/learning.json';
import notesUk from './locales/uk/notes.json';
import studyUk from './locales/uk/study.json';
import {
  defaultLanguage,
  normalizeLanguage,
  readStoredLanguage,
  supportedLanguages,
} from './config';

const languageDetector = new LanguageDetector();

languageDetector.addDetector({
  name: 'rememoPreference',
  lookup() {
    return readStoredLanguage() ?? undefined;
  },
  cacheUserLanguage() {
    // Explicit persistence is handled by the language preference hook.
  },
});

const resources = {
  en: {
    common: commonEn,
    settings: settingsEn,
    learning: learningEn,
    notes: notesEn,
    study: studyEn,
  },
  uk: {
    common: commonUk,
    settings: settingsUk,
    learning: learningUk,
    notes: notesUk,
    study: studyUk,
  },
} as const;

function syncDocumentLanguage(language: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = normalizeLanguage(language);
}

if (!i18n.isInitialized) {
  void i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: defaultLanguage,
      supportedLngs: [...supportedLanguages],
      defaultNS: 'common',
      ns: ['common', 'settings', 'learning', 'notes', 'study'],
      detection: {
        order: ['rememoPreference', 'navigator'],
        caches: [],
        convertDetectedLanguage: (language: string) => normalizeLanguage(language),
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language ?? defaultLanguage);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
