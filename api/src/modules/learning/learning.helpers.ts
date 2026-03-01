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
 * Pure: compute eligible note IDs for scoped session from descendants.
 * Only includes pages in GLOBAL (active study_items). Excludes those studied today.
 */
export function computeEligibleScopedNoteIds(params: {
  descendantIds: string[];
  studyItems: StudyItemForEligibility[];
  timezone: string;
}): string[] {
  const { descendantIds, studyItems, timezone } = params;
  const inGlobalAndNotStudiedToday = new Set<string>();
  for (const si of studyItems) {
    if (!si.is_active) continue;
    if (isDateTodayInTimezone(si.last_reviewed_at, timezone)) continue;
    inGlobalAndNotStudiedToday.add(si.note_id);
  }
  return descendantIds.filter((id) => inGlobalAndNotStudiedToday.has(id));
}

/**
 * Pure: compute due-only scoped note IDs from descendants.
 * Includes only pages in GLOBAL (active study_items) that are due today or in the past.
 */
export function computeDueOnlyScopedNoteIds(params: {
  descendantIds: string[];
  studyItems: StudyItemForEligibility[];
  timezone: string;
  dayKey: string;
}): string[] {
  const { descendantIds, studyItems, timezone, dayKey } = params;
  const dueInGlobal = new Set<string>();
  for (const si of studyItems) {
    if (!si.is_active) continue;
    if (!isDueTodayOrPast(si.due_at, timezone, dayKey)) continue;
    dueInGlobal.add(si.note_id);
  }
  return descendantIds.filter((id) => dueInGlobal.has(id));
}
