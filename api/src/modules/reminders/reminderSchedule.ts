const TIME_FORMAT = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const DEFAULT_REMINDER_TIME_LOCAL = '09:00';
export const DEFAULT_REMINDER_TIMEZONE = 'UTC';

interface ReminderTimeParts {
  hour: number;
  minute: number;
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
