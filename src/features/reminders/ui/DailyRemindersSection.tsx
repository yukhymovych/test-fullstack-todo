import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { ReminderCapabilityStatus } from '../domain/reminders.types';
import {
  REMINDER_TIME_SLOTS,
  isReminderTimeSlotId,
  reminderTimeLocalToSlotId,
} from '../domain/reminderTimeSlots';
import './DailyRemindersSection.css';

export interface DailyRemindersSectionProps {
  readOnly?: boolean;
  status: ReminderCapabilityStatus;
  remindersEnabled: boolean;
  hasActivePushSubscription: boolean;
  reminderTimeLocal: string;
  timezone: string;
  isBusy: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onReminderTimeLocalChange: (value: string) => void;
  showDebugActions?: boolean;
  onRunDebugJobNow?: () => void;
}

export function DailyRemindersSection(props: DailyRemindersSectionProps) {
  const { t } = useTranslation('settings');
  const {
    readOnly = false,
    status,
    remindersEnabled,
    hasActivePushSubscription,
    reminderTimeLocal,
    timezone,
    isBusy,
    onEnable,
    onDisable,
    onReminderTimeLocalChange,
    showDebugActions,
    onRunDebugJobNow,
  } = props;
  const slotValue = reminderTimeLocalToSlotId(reminderTimeLocal);

  const applySlot = (rawId: string) => {
    if (!isReminderTimeSlotId(rawId)) return;
    const slot = REMINDER_TIME_SLOTS.find((s) => s.id === rawId);
    if (!slot) return;
    onReminderTimeLocalChange(slot.reminderTimeLocal);
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
        <div className="daily-reminders-section__time-controls">
          <div className="daily-reminders-section__select-wrap daily-reminders-section__select-wrap--full">
            <select
              id="daily-reminder-time"
              aria-label={t('reminders.timeSlotAriaLabel')}
              className="daily-reminders-section__select daily-reminders-section__select--slot"
              value={slotValue}
              disabled={isBusy || readOnly}
              onChange={(event) => {
                applySlot(event.target.value);
              }}
            >
              {REMINDER_TIME_SLOTS.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {t(`reminders.timeSlot.${slot.id}`)}
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
            disabled={isBusy || readOnly}
            onClick={onDisable}
          >
            {t('reminders.disableButton')}
          </button>
        ) : (
          <button
            type="button"
            className="daily-reminders-section__enable-button"
            disabled={isBusy || readOnly || status === 'unsupported'}
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
            disabled={isBusy || readOnly}
            onClick={onRunDebugJobNow}
          >
            {t('reminders.debugRunJobButton')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
