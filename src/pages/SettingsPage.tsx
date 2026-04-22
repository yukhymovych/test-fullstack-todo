import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPageView } from '@/features/settings/ui/SettingsPageView';
import { useLanguagePreference } from '@/features/settings/model/useLanguagePreference';
import { DailyRemindersSection } from '@/features/reminders/ui/DailyRemindersSection';
import { useDailyReminders } from '@/features/reminders/model/useDailyReminders';
import { BackupSection } from '@/features/backup/ui/BackupSection';
import { OfflineAccessSection } from '@/features/offline/ui/OfflineAccessSection';
import { usePageTitle } from '@/shared/lib/usePageTitle';
import { useAppMode } from '@/features/offline/model/AppModeProvider';

export function SettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { isReadOnly } = useAppMode();
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
      readOnly={isReadOnly}
      remindersSection={
        <DailyRemindersSection
          readOnly={isReadOnly}
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
      backupSection={<BackupSection readOnly={isReadOnly} />}
      offlineSection={<OfflineAccessSection readOnly={isReadOnly} />}
    />
  );
}
