import { useTranslation } from 'react-i18next';
import { SettingsPageView } from '@/features/settings/ui/SettingsPageView';
import { useLanguagePreference } from '@/features/settings/model/useLanguagePreference';
import { DailyRemindersSection } from '@/features/reminders/ui/DailyRemindersSection';
import { useDailyReminders } from '@/features/reminders/model/useDailyReminders';
import { usePageTitle } from '@/shared/lib/usePageTitle';

export function SettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { currentLanguage, setLanguage } = useLanguagePreference();
  const reminders = useDailyReminders();

  usePageTitle(t('pageTitles.settings', { ns: 'common' }));

  return (
    <SettingsPageView
      currentLanguage={currentLanguage}
      onLanguageChange={setLanguage}
      remindersSection={
        <DailyRemindersSection
          status={reminders.status}
          remindersEnabled={reminders.remindersEnabled}
          hasActivePushSubscription={reminders.hasActivePushSubscription}
          isBusy={reminders.isBusy}
          showDebugActions={reminders.showDebugActions}
          onEnable={() => {
            void reminders.enable();
          }}
          onDisable={() => {
            void reminders.disable();
          }}
          onRunDebugJobNow={() => {
            void reminders.runDebugJobNow();
          }}
        />
      }
    />
  );
}
