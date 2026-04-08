import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { ReminderCapabilityStatus } from '../domain/reminders.types';
import './DailyRemindersSection.css';

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
    <section className="daily-reminders-section">
      <div className="daily-reminders-section__header">
        <h2 className="daily-reminders-section__title">{t('reminders.sectionTitle')}</h2>
        <p className="daily-reminders-section__description">{t('reminders.description')}</p>
      </div>

      <div className="daily-reminders-section__status">
        <p>
          {t('reminders.statusLabel')}:{' '}
          <span className="daily-reminders-section__status-value">
            {t(`reminders.status.${status}`)}
          </span>
        </p>
        <p className="daily-reminders-section__subscription">
          {t('reminders.subscriptionLabel')}:{' '}
          {hasActivePushSubscription
            ? t('reminders.subscriptionActive')
            : t('reminders.subscriptionMissing')}
        </p>
      </div>

      <div className="daily-reminders-section__time-field">
        <label htmlFor="daily-reminder-time" className="daily-reminders-section__label">
          {t('reminders.timeLabel')}
        </label>
        <div
          id="daily-reminder-time"
          className="daily-reminders-section__time-controls"
          onBlur={onReminderTimeLocalBlur}
        >
          <div className="daily-reminders-section__select-wrap">
            <select
              aria-label="Reminder hour"
              className="daily-reminders-section__select"
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
            <ChevronDown
              aria-hidden
              className="daily-reminders-section__select-icon"
            />
          </div>
          <span className="daily-reminders-section__separator">:</span>
          <div className="daily-reminders-section__select-wrap">
            <select
              aria-label="Reminder minute"
              className="daily-reminders-section__select"
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
            <ChevronDown
              aria-hidden
              className="daily-reminders-section__select-icon"
            />
          </div>
        </div>
      </div>

      <div className="daily-reminders-section__hints">
        <p>{t('reminders.catchUpHint')}</p>
        <p>
          {t('reminders.timezoneLabel')}:{' '}
          <span className="daily-reminders-section__timezone-value">{timezone}</span>
        </p>
      </div>

      <div className="daily-reminders-section__actions">
        {remindersEnabled ? (
          <button
            type="button"
            className="daily-reminders-section__disable-button"
            disabled={isBusy}
            onClick={onDisable}
          >
            {t('reminders.disableButton')}
          </button>
        ) : (
          <button
            type="button"
            className="daily-reminders-section__enable-button"
            disabled={isBusy || status === 'unsupported'}
            onClick={onEnable}
          >
            {t('reminders.enableButton')}
          </button>
        )}
      </div>
      {showDebugActions && onRunDebugJobNow ? (
        <div className="daily-reminders-section__debug">
          <button
            type="button"
            className="daily-reminders-section__debug-button"
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
