import { useTranslation } from 'react-i18next';
import type { ReminderCapabilityStatus } from '../domain/reminders.types';

const HOURS_24 = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, '0')
);

const MINUTES_60 = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, '0')
);

export interface DailyRemindersSectionProps {
  status: ReminderCapabilityStatus;
  remindersEnabled: boolean;
  hasActivePushSubscription: boolean;
  reminderTimeLocal: string;
  timezone: string;
  isBusy: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onReminderTimeLocalChange: (value: string) => void;
  onReminderTimeLocalBlur: () => void;
  showDebugActions?: boolean;
  onRunDebugJobNow?: () => void;
}

export function DailyRemindersSection(props: DailyRemindersSectionProps) {
  const { t } = useTranslation('settings');
  const {
    status,
    remindersEnabled,
    hasActivePushSubscription,
    reminderTimeLocal,
    timezone,
    isBusy,
    onEnable,
    onDisable,
    onReminderTimeLocalChange,
    onReminderTimeLocalBlur,
    showDebugActions,
    onRunDebugJobNow,
  } = props;
  const [hourPart = '09', minutePart = '00'] = reminderTimeLocal.split(':');

  const applyReminderTime = (nextHour: string, nextMinute: string) => {
    onReminderTimeLocalChange(`${nextHour}:${nextMinute}`);
  };

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

      <div className="flex max-w-sm flex-col gap-2">
        <label htmlFor="daily-reminder-time" className="text-sm font-medium">
          {t('reminders.timeLabel')}
        </label>
        <div
          id="daily-reminder-time"
          className="flex items-center gap-2"
          onBlur={onReminderTimeLocalBlur}
        >
          <select
            aria-label="Reminder hour"
            className="border-input bg-background ring-offset-background h-10 w-20 rounded-md border px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            value={hourPart}
            disabled={isBusy}
            onChange={(event) => {
              applyReminderTime(event.target.value, minutePart);
            }}
          >
            {HOURS_24.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
          <span className="text-sm">:</span>
          <select
            aria-label="Reminder minute"
            className="border-input bg-background ring-offset-background h-10 w-20 rounded-md border px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            value={minutePart}
            disabled={isBusy}
            onChange={(event) => {
              applyReminderTime(hourPart, event.target.value);
            }}
          >
            {MINUTES_60.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-muted-foreground space-y-1 text-sm">
        <p>{t('reminders.timeHint')}</p>
        <p>{t('reminders.catchUpHint')}</p>
        <p>
          {t('reminders.timezoneLabel')}: <span className="font-medium">{timezone}</span>
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
