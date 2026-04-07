const TIME_FORMAT = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const DEFAULT_REMINDER_TIME_LOCAL = '09:00';
export const DEFAULT_REMINDER_TIMEZONE = 'UTC';

interface ReminderTimeParts {
  hour: number;
  minute: number;
}

export type ReminderSkipReason = 'before-time' | 'already-sent-today' | null;

export interface ReminderTimingDecision {
  shouldAttempt: boolean;
  todayDayKey: string;
  skipReason: ReminderSkipReason;
}

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(value: string | null | undefined): string {
  if (!value) return DEFAULT_REMINDER_TIMEZONE;
  return isValidTimezone(value) ? value : DEFAULT_REMINDER_TIMEZONE;
}

export function normalizeReminderTimeLocal(
  value: string | null | undefined
): string {
  if (!value) return DEFAULT_REMINDER_TIME_LOCAL;
  return TIME_FORMAT.test(value) ? value : DEFAULT_REMINDER_TIME_LOCAL;
}

export function parseReminderTimeLocal(value: string): ReminderTimeParts {
  const normalized = normalizeReminderTimeLocal(value);
  const match = normalized.match(TIME_FORMAT);
  if (!match) {
    return { hour: 9, minute: 0 };
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export function getDayKeyForDate(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: timezone });
}

function getLocalHourAndMinute(date: Date, timezone: string): ReminderTimeParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  return { hour, minute };
}

export function shouldAttemptReminderNow(input: {
  now: Date;
  timezone: string | null | undefined;
  reminderTimeLocal: string | null | undefined;
  lastReminderSentDayKey: string | null | undefined;
}): ReminderTimingDecision {
  const timezone = normalizeTimezone(input.timezone);
  const reminderTimeLocal = normalizeReminderTimeLocal(input.reminderTimeLocal);
  const todayDayKey = getDayKeyForDate(input.now, timezone);

  if (input.lastReminderSentDayKey === todayDayKey) {
    return {
      shouldAttempt: false,
      todayDayKey,
      skipReason: 'already-sent-today',
    };
  }

  const localNow = getLocalHourAndMinute(input.now, timezone);
  const reminderTime = parseReminderTimeLocal(reminderTimeLocal);
  const currentMinutes = localNow.hour * 60 + localNow.minute;
  const reminderMinutes = reminderTime.hour * 60 + reminderTime.minute;

  if (currentMinutes < reminderMinutes) {
    return {
      shouldAttempt: false,
      todayDayKey,
      skipReason: 'before-time',
    };
  }

  return {
    shouldAttempt: true,
    todayDayKey,
    skipReason: null,
  };
}
