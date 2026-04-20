import type { BackupStudyItem, ImportBackupOptions } from './backup.types.js';

/** FSRS-light reset defaults used when `preserveStudyState=false`. */
export const STUDY_ITEM_RESET_STABILITY_DAYS = 7;
export const STUDY_ITEM_RESET_DIFFICULTY = 5;

export interface StudyItemRow {
  isActive: boolean;
  dueAt: string;
  lastReviewedAt: string | null;
  stabilityDays: number;
  difficulty: number;
}

/**
 * Pure builder for a study_items row from a backup entry.
 *
 * `preserveStudyState=false` resets to FSRS-light defaults (item is due now, never
 * reviewed, default stability/difficulty); `preserveStudyState=true` copies the
 * backup values verbatim. Extracted so the branch can be unit-tested without
 * pulling in the DB pool or the wider service module.
 */
export function buildStudyItemRow(
  backup: BackupStudyItem,
  options: ImportBackupOptions,
  nowIso: string
): StudyItemRow {
  if (options.preserveStudyState) {
    return {
      isActive: backup.isActive,
      dueAt: backup.dueAt,
      lastReviewedAt: backup.lastReviewedAt,
      stabilityDays: backup.stabilityDays,
      difficulty: backup.difficulty,
    };
  }
  return {
    isActive: true,
    dueAt: nowIso,
    lastReviewedAt: null,
    stabilityDays: STUDY_ITEM_RESET_STABILITY_DAYS,
    difficulty: STUDY_ITEM_RESET_DIFFICULTY,
  };
}
