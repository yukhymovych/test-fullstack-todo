import { http } from '@/shared/api/http';
import type { UiLanguage } from '@/shared/i18n/config';

export async function getUserPreferences(): Promise<{
  uiLanguage: UiLanguage;
}> {
  return http.get('/auth/me/preferences');
}

export async function updateUserPreferences(input: {
  uiLanguage: UiLanguage;
}): Promise<{ uiLanguage: UiLanguage }> {
  return http.patch('/auth/me/preferences', input);
}
