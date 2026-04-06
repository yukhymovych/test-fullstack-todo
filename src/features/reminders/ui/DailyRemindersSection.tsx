import { useTranslation } from 'react-i18next';
import type { ReminderCapabilityStatus } from '../domain/reminders.types';

export interface DailyRemindersSectionProps {
  status: ReminderCapabilityStatus;
  remindersEnabled: boolean;
  hasActivePushSubscription: boolean;
  isBusy: boolean;
  onEnable: () => void;
  onDisable: () => void;
  showDebugActions?: boolean;
  onRunDebugJobNow?: () => void;
}

export function DailyRemindersSection(props: DailyRemindersSectionProps) {
  const { t } = useTranslation('settings');
  const {
    status,
    remindersEnabled,
    hasActivePushSubscription,
    isBusy,
    onEnable,
    onDisable,
    showDebugActions,
    onRunDebugJobNow,
  } = props;

  return (
    <section className="bg-card flex flex-col gap-4 rounded-lg border p-5">
      <div className="space-y-1">
        <h2 className="text-base font-medium">{t('reminders.sectionTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('reminders.description')}</p>
      </div>

      <div className="text-sm">
        <p>
          {t('reminders.statusLabel')}:{' '}
          <span className="font-medium">{t(`reminders.status.${status}`)}</span>
        </p>
        <p className="text-muted-foreground">
          {t('reminders.subscriptionLabel')}:{' '}
          {hasActivePushSubscription
            ? t('reminders.subscriptionActive')
            : t('reminders.subscriptionMissing')}
        </p>
      </div>

      <div>
        {remindersEnabled ? (
          <button
            type="button"
            className="inline-flex h-10 cursor-pointer items-center rounded-md border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onDisable}
          >
            {t('reminders.disableButton')}
          </button>
        ) : (
          <button
            type="button"
            className="bg-foreground text-background inline-flex h-10 cursor-pointer items-center rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy || status === 'unsupported'}
            onClick={onEnable}
          >
            {t('reminders.enableButton')}
          </button>
        )}
      </div>
      {showDebugActions && onRunDebugJobNow ? (
        <div className="border-border border-t pt-3">
          <button
            type="button"
            className="inline-flex h-9 cursor-pointer items-center rounded-md border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={onRunDebugJobNow}
          >
            {t('reminders.debugRunJobButton')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
