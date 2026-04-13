import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/contexts/AuthContext';
import * as userPreferencesApi from '@/features/settings/api/userPreferencesApi';
import { normalizeLanguage, writeStoredLanguage } from '@/shared/i18n/config';

/**
 * Persists and hydrates active UI language via dedicated user preferences API.
 * Runs for any authenticated screen, not only Settings.
 */
export function useSyncUiLanguageToServer(): void {
  const { i18n } = useTranslation();
  const { isAuthed, isApiReady } = useAuth();
  const hydratedRef = useRef(false);
  const syncingRef = useRef(false);
  const lastSyncedLanguageRef = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthed) return;
    hydratedRef.current = false;
    syncingRef.current = false;
    lastSyncedLanguageRef.current = null;
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed || !isApiReady || hydratedRef.current || syncingRef.current) return;
    syncingRef.current = true;

    void userPreferencesApi
      .getUserPreferences()
      .then(async (state) => {
        const serverLanguage = normalizeLanguage(state.uiLanguage);
        const currentLanguage = normalizeLanguage(
          i18n.resolvedLanguage ?? i18n.language
        );
        if (serverLanguage !== currentLanguage) {
          writeStoredLanguage(serverLanguage);
          await i18n.changeLanguage(serverLanguage);
        }
        lastSyncedLanguageRef.current = serverLanguage;
        hydratedRef.current = true;
      })
      .catch(() => {
        const currentLanguage = normalizeLanguage(
          i18n.resolvedLanguage ?? i18n.language
        );
        lastSyncedLanguageRef.current = currentLanguage;
        hydratedRef.current = true;
      })
      .finally(() => {
        syncingRef.current = false;
      });
  }, [isAuthed, isApiReady, i18n]);

  useEffect(() => {
    if (!isAuthed || !isApiReady || !hydratedRef.current || syncingRef.current) return;
    const lang = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
    if (lastSyncedLanguageRef.current === lang) return;

    syncingRef.current = true;
    void userPreferencesApi
      .updateUserPreferences({ uiLanguage: lang })
      .then(() => {
        lastSyncedLanguageRef.current = lang;
      })
      .finally(() => {
        syncingRef.current = false;
      });
  }, [isAuthed, isApiReady, i18n.resolvedLanguage, i18n.language]);
}
