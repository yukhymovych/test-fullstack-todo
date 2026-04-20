export const BACKUP_FORMAT_ID = 'rememo-backup' as const;
export const BACKUP_FORMAT_VERSION = 1 as const;

export interface BackupNote {
  id: string;
  parentId: string | null;
  title: string;
  richContent: unknown[];
  sortOrder: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackupQuestionAnswer {
  id: string;
  pageId: string;
  question: string;
  answer: string;
  source: 'manual' | 'generated';
}

export interface BackupStudyItem {
  noteId: string;
  isActive: boolean;
  dueAt: string;
  lastReviewedAt: string | null;
  stabilityDays: number;
  difficulty: number;
}

export type ExportBackupScope = 'full' | 'single' | 'subtree';

export interface BackupDocument {
  format: typeof BACKUP_FORMAT_ID;
  version: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  scope: ExportBackupScope;
  rootNoteId: string | null;
  data: {
    notes: BackupNote[];
    questionAnswers: BackupQuestionAnswer[];
    studyItems: BackupStudyItem[];
  };
}

export interface ExportBackupInput {
  scope?: ExportBackupScope;
  rootNoteId?: string;
}

export interface ImportBackupInput {
  document: BackupDocument;
  preserveStudyState: boolean;
}

export interface BackupWarnings {
  orphanNotesDemotedToRoot: number;
  cycleNotesDemotedToRoot: number;
  droppedEmbeddedReferences: number;
  malformedEmbeddedReferences: number;
}

export interface ImportBackupResult {
  insertedNoteCount: number;
  insertedQuestionAnswerCount: number;
  insertedStudyItemCount: number;
  skippedNoteCount: number;
  skippedQuestionAnswerCount: number;
  skippedStudyItemCount: number;
  warnings: BackupWarnings;
}
