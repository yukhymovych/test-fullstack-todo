import {
  noteRecordToDto,
  questionAnswerRecordToDto,
  reanchorOrphanParents,
  studyItemRecordToDto,
  type NoteRowForBackup,
  type QuestionAnswerRowForBackup,
  type StudyItemRowForBackup,
} from './backup.mappers.js';
import {
  BACKUP_FORMAT_ID,
  BACKUP_FORMAT_VERSION,
  type BackupDocument,
  type BackupScope,
} from './backup.types.js';

export interface BuildBackupDocumentInput {
  scope: BackupScope;
  rootNoteId: string | null;
  noteRows: NoteRowForBackup[];
  qaRows: QuestionAnswerRowForBackup[];
  studyItemRows: StudyItemRowForBackup[];
  exportedAt: string;
}

/**
 * Pure assembler for the backup envelope.
 *
 * The service performs scope-aware SQL fetches and hands the rows to this
 * function, which only maps DTOs and applies `reanchorOrphanParents` (so that
 * subtree roots and single notes whose parent is outside scope import cleanly).
 *
 * Extracted from `backup.service.ts` so the assembly logic can be unit-tested
 * without dragging in the DB pool.
 */
export function buildBackupDocument(input: BuildBackupDocumentInput): BackupDocument {
  const notesDto = reanchorOrphanParents(input.noteRows.map(noteRecordToDto));
  const questionAnswersDto = input.qaRows.map(questionAnswerRecordToDto);
  const studyItemsDto = input.studyItemRows.map(studyItemRecordToDto);

  return {
    format: BACKUP_FORMAT_ID,
    version: BACKUP_FORMAT_VERSION,
    exportedAt: input.exportedAt,
    scope: input.scope,
    rootNoteId: input.scope === 'full' ? null : input.rootNoteId,
    data: {
      notes: notesDto,
      questionAnswers: questionAnswersDto,
      studyItems: studyItemsDto,
    },
  };
}
