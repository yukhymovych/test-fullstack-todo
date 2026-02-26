/**
 * Timezone/date helpers used by learning status, grade-by-page, and scoped sessions.
 */

export function getDayKey(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

export function isDateTodayInTimezone(
  date: Date | null,
  timezone: string
): boolean {
  if (!date) return false;
  const dayKey = date.toLocaleDateString('en-CA', { timeZone: timezone });
  return dayKey === getDayKey(timezone);
}
