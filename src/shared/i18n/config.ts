export const supportedLanguages = ['en', 'uk'] as const;

export type UiLanguage = (typeof supportedLanguages)[number];

export const defaultLanguage: UiLanguage = 'en';
export const languageStorageKey = 'rememo_language';

export function isSupportedLanguage(value: string): value is UiLanguage {
  return (supportedLanguages as readonly string[]).includes(value);
}

export function normalizeLanguage(input: string | null | undefined): UiLanguage {
  if (!input) {
    return defaultLanguage;
  }

  const normalized = input.trim().toLowerCase().split(/[-_]/)[0];

  return isSupportedLanguage(normalized) ? normalized : defaultLanguage;
}

export function readStoredLanguage(): UiLanguage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(languageStorageKey);
    if (!rawValue) {
      return null;
    }

    const normalized = rawValue.trim().toLowerCase();
    return isSupportedLanguage(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function writeStoredLanguage(language: UiLanguage): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(languageStorageKey, language);
  } catch {
    // Ignore localStorage failures and keep runtime language change working.
  }
}
