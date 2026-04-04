import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { UiLanguage } from '@/shared/i18n/config';

export interface SettingsPageViewProps {
  currentLanguage: UiLanguage;
  onLanguageChange: (language: UiLanguage) => void;
}

export function SettingsPageView({
  currentLanguage,
  onLanguageChange,
}: SettingsPageViewProps) {
  const { t } = useTranslation('settings');

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onLanguageChange(event.target.value as UiLanguage);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('page.heading')}</h1>
        <p className="text-muted-foreground text-sm">{t('page.description')}</p>
      </header>

      <section className="bg-card flex flex-col gap-4 rounded-lg border p-5">
        <div className="space-y-1">
          <h2 className="text-base font-medium">{t('language.sectionTitle')}</h2>
          <p className="text-muted-foreground text-sm">{t('language.description')}</p>
        </div>

        <div className="flex max-w-sm flex-col gap-2">
          <label htmlFor="settings-language" className="text-sm font-medium">
            {t('language.label')}
          </label>
          <select
            id="settings-language"
            className="border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            value={currentLanguage}
            onChange={handleLanguageChange}
          >
            <option value="en">{t('language.options.en')}</option>
            <option value="uk">{t('language.options.uk')}</option>
          </select>
        </div>

        <div className="text-muted-foreground space-y-1 text-sm">
          <p>{t('language.hint')}</p>
          <p>{t('language.storageHint')}</p>
        </div>
      </section>
    </div>
  );
}
