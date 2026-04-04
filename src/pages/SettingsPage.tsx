import { useTranslation } from 'react-i18next';
import { SettingsPageView } from '@/features/settings/ui/SettingsPageView';
import { useLanguagePreference } from '@/features/settings/model/useLanguagePreference';
import { usePageTitle } from '@/shared/lib/usePageTitle';

export function SettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { currentLanguage, setLanguage } = useLanguagePreference();

  usePageTitle(t('pageTitles.settings', { ns: 'common' }));

  return (
    <SettingsPageView
      currentLanguage={currentLanguage}
      onLanguageChange={setLanguage}
    />
  );
}
