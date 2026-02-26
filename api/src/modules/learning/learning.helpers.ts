/**
 * Pure helpers for learning module. No DB or service dependencies.
 */

import { isDateTodayInTimezone } from './learning.timezone.js';

export function isDueTodayOrPast(
  dueAt: Date,
  timezone: string,
  dayKey: string
): boolean {
  const dueDayKey = dueAt.toLocaleDateString('en-CA', {
    timeZone: timezone,
  });
  return dueDayKey <= dayKey;
}

export interface StudyItemForEligibility {
  note_id: string;
  is_active: boolean;
  due_at: Date;
  last_reviewed_at: Date | null;
}

/**
 * Pure: compute eligible note IDs for scoped session from descendants,
 * excluding notes in global due list or already studied today.
 */
export function computeEligibleScopedNoteIds(params: {
  descendantIds: string[];
  studyItems: StudyItemForEligibility[];
  timezone: string;
  dayKey: string;
}): string[] {
  const { descendantIds, studyItems, timezone, dayKey } = params;
  const excludedIds = new Set<string>();
  for (const si of studyItems) {
    const inGlobalDue =
      si.is_active && isDueTodayOrPast(si.due_at, timezone, dayKey);
    const studiedToday = isDateTodayInTimezone(si.last_reviewed_at, timezone);
    if (inGlobalDue || studiedToday) {
      excludedIds.add(si.note_id);
    }
  }
  return descendantIds.filter((id) => !excludedIds.has(id));
}
