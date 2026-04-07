import { useEffect, useState } from 'react';
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
  const [draftReminderTimeLocal, setDraftReminderTimeLocal] = useState('09:00');

  usePageTitle(t('pageTitles.settings', { ns: 'common' }));

  useEffect(() => {
    setDraftReminderTimeLocal(reminders.reminderTimeLocal);
  }, [reminders.reminderTimeLocal]);

  return (
    <SettingsPageView
      currentLanguage={currentLanguage}
      onLanguageChange={setLanguage}
      remindersSection={
        <DailyRemindersSection
          status={reminders.status}
          remindersEnabled={reminders.remindersEnabled}
          hasActivePushSubscription={reminders.hasActivePushSubscription}
          reminderTimeLocal={draftReminderTimeLocal}
          timezone={reminders.timezone}
          isBusy={reminders.isBusy}
          showDebugActions={reminders.showDebugActions}
          onEnable={() => {
            void reminders.enable(draftReminderTimeLocal);
          }}
          onDisable={() => {
            void reminders.disable();
          }}
          onReminderTimeLocalChange={(value) => {
            setDraftReminderTimeLocal(value);
          }}
          onReminderTimeLocalBlur={() => {
            if (
              draftReminderTimeLocal &&
              draftReminderTimeLocal !== reminders.reminderTimeLocal
            ) {
              void reminders.saveReminderTimeLocal(draftReminderTimeLocal);
            }
          }}
          onRunDebugJobNow={() => {
            void reminders.runDebugJobNow();
          }}
        />
      }
    />
  );
}
