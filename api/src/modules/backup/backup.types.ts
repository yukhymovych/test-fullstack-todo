export const BACKUP_FORMAT_ID = 'rememo-backup' as const;
export const BACKUP_FORMAT_VERSION = 1 as const;

export type BackupScope = 'full' | 'subtree';

export interface BackupNote {
  /** Backup-local handle. Used only as a join key inside the document. */
  id: string;
  /** Refers to another `BackupNote.id`, or null for roots. */
  parentId: string | null;
  title: string;
  /** BlockNote `Block[]` JSON, persisted shape (Domain rule §8). */
  richContent: unknown[];
  sortOrder: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackupQuestionAnswer {
  id: string;
  /** Refers to a `BackupNote.id`. */
  pageId: string;
  question: string;
  answer: string;
  source: 'manual' | 'generated';
}

export interface BackupStudyItem {
  /** Refers to a `BackupNote.id`. */
  noteId: string;
  isActive: boolean;
  dueAt: string;
  lastReviewedAt: string | null;
  stabilityDays: number;
  difficulty: number;
}

export interface BackupDocument {
  format: typeof BACKUP_FORMAT_ID;
  version: number;
  exportedAt: string;
  scope: BackupScope;
  rootNoteId: string | null;
  data: {
    notes: BackupNote[];
    questionAnswers: BackupQuestionAnswer[];
    studyItems: BackupStudyItem[];
  };
}

export interface ExportBackupOptions {
  /** When provided, exports the subtree rooted at this note id. Otherwise: full export. */
  rootNoteId?: string;
}

export interface ImportBackupOptions {
  /**
   * When true, imported study_items keep their FSRS state (dueAt, stabilityDays,
   * difficulty, lastReviewedAt, isActive). When false (default), study_items are
   * created with default scheduling.
   */
  preserveStudyState: boolean;
}

/**
 * Lenient-recovery counters surfaced to the client.
 *
 * Import is not rejected when these occur: the backup is imported with safe
 * defaults applied (re-anchor to root, drop unresolvable embedded blocks).
 * The counters exist so the UI can tell the user what was silently repaired.
 */
export interface ImportBackupWarnings {
  /** Notes whose `parentId` pointed outside the document and were anchored to root. */
  orphanNotesDemotedToRoot: number;
  /** Notes participating in a cycle (including self-parent) that were demoted to root. */
  cycleNotesDemotedToRoot: number;
  /** `embeddedPage` blocks dropped because their target note was outside the document. */
  droppedEmbeddedReferences: number;
  /** `embeddedPage` blocks dropped because `props.noteId` was missing/invalid. */
  malformedEmbeddedReferences: number;
}

export interface ImportBackupResult {
  insertedNoteCount: number;
  insertedQuestionAnswerCount: number;
  insertedStudyItemCount: number;
  /** Notes from the document that were skipped (e.g. cycle-broken or invalid). */
  skippedNoteCount: number;
  /** Q/A rows skipped because their pageId did not resolve. */
  skippedQuestionAnswerCount: number;
  /** Study items skipped because their noteId did not resolve. */
  skippedStudyItemCount: number;
  warnings: ImportBackupWarnings;
}
