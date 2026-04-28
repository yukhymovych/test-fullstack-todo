export type ReminderTimeSlotId = 'morning' | 'day' | 'evening';

export function isReminderTimeSlotId(value: string): value is ReminderTimeSlotId {
  return value === 'morning' || value === 'day' || value === 'evening';
}

export const REMINDER_TIME_SLOTS: readonly {
  id: ReminderTimeSlotId;
  reminderTimeLocal: string;
}[] = [
  { id: 'morning', reminderTimeLocal: '09:00' },
  { id: 'day', reminderTimeLocal: '13:00' },
  { id: 'evening', reminderTimeLocal: '18:00' },
] as const;

export function normalizeReminderTimeLocal(raw: string): string {
  const [h, m] = raw.split(':');
  const hour = Math.min(23, Math.max(0, Number.parseInt(h ?? '0', 10) || 0));
  const minute = Math.min(59, Math.max(0, Number.parseInt(m ?? '0', 10) || 0));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function minutesSinceMidnight(hhmm: string): number {
  const normalized = normalizeReminderTimeLocal(hhmm);
  const [hs, ms] = normalized.split(':');
  const hour = Number.parseInt(hs ?? '0', 10);
  const minute = Number.parseInt(ms ?? '0', 10);
  return hour * 60 + minute;
}

/** Maps any stored local time to the closest predefined slot for the UI. */
export function reminderTimeLocalToSlotId(reminderTimeLocal: string): ReminderTimeSlotId {
  const normalized = normalizeReminderTimeLocal(reminderTimeLocal);
  for (const slot of REMINDER_TIME_SLOTS) {
    if (slot.reminderTimeLocal === normalized) {
      return slot.id;
    }
  }
  const t = minutesSinceMidnight(normalized);
  let best: ReminderTimeSlotId = REMINDER_TIME_SLOTS[0].id;
  let bestDist = Infinity;
  for (const slot of REMINDER_TIME_SLOTS) {
    const d = Math.abs(t - minutesSinceMidnight(slot.reminderTimeLocal));
    if (d < bestDist) {
      bestDist = d;
      best = slot.id;
    }
  }
  return best;
}
