import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { UiLanguage } from '@/shared/i18n/config';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import './SettingsPageView.css';

export interface SettingsPageViewProps {
  currentLanguage: UiLanguage;
  onLanguageChange: (language: UiLanguage) => void;
  remindersSection?: ReactNode;
  backupSection?: ReactNode;
}

export function SettingsPageView({
  currentLanguage,
  onLanguageChange,
  remindersSection,
  backupSection,
}: SettingsPageViewProps) {
  const { t } = useTranslation('settings');

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onLanguageChange(event.target.value as UiLanguage);
  };

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">{t('page.heading')}</h1>
      </header>

      <section className="settings-page__section">
        <div className="settings-page__section-heading">
          <h2 className="settings-page__section-title">{t('language.sectionTitle')}</h2>
          <p className="settings-page__section-description">{t('language.description')}</p>
        </div>
        <div className="settings-page__language-field">
          <div className="settings-page__select-wrap">
            <select
              id="settings-language"
              className="settings-page__select"
              value={currentLanguage}
              onChange={handleLanguageChange}
            >
              <option value="en">{t('language.options.en')}</option>
              <option value="uk">{t('language.options.uk')}</option>
            </select>
            <ChevronDown
              aria-hidden
              className="settings-page__select-icon"
            />
          </div>
        </div>

        <div className="settings-page__hints">
          <p>{t('language.hint')}</p>
        </div>
      </section>
      {remindersSection}
      {backupSection}
    </div>
  );
}
