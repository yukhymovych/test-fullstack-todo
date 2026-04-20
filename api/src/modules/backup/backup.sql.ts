import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import type {
  NoteRowForBackup,
  QuestionAnswerRowForBackup,
  StudyItemRowForBackup,
} from './backup.mappers.js';

/**
 * Read all non-trashed notes for the user, ordered for deterministic backups.
 * If `rootNoteId` is provided, restrict to the subtree rooted at that note (inclusive).
 */
export async function getNotesForBackup(
  userId: string,
  rootNoteId?: string
): Promise<NoteRowForBackup[]> {
  if (rootNoteId) {
    const result = await pool.query(
      `WITH RECURSIVE subtree AS (
         SELECT id
         FROM notes
         WHERE id = $2 AND user_id = $1 AND trashed_at IS NULL
         UNION ALL
         SELECT n.id
         FROM notes n
         JOIN subtree s ON n.parent_id = s.id
         WHERE n.user_id = $1 AND n.trashed_at IS NULL
       )
       SELECT n.id, n.parent_id, n.title, n.rich_content, n.sort_order, n.is_favorite,
              n.created_at, n.updated_at
       FROM notes n
       WHERE n.id IN (SELECT id FROM subtree)
       ORDER BY (n.parent_id IS NULL) DESC,
                n.parent_id NULLS FIRST,
                COALESCE(n.sort_order, 0) ASC,
                n.id ASC`,
      [userId, rootNoteId]
    );
    return result.rows;
  }

  const result = await pool.query(
    `SELECT id, parent_id, title, rich_content, sort_order, is_favorite,
            created_at, updated_at
     FROM notes
     WHERE user_id = $1 AND trashed_at IS NULL
     ORDER BY (parent_id IS NULL) DESC,
              parent_id NULLS FIRST,
              COALESCE(sort_order, 0) ASC,
              id ASC`,
    [userId]
  );
  return result.rows;
}

export async function noteExistsForUserNonTrashed(
  userId: string,
  noteId: string
): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM notes WHERE id = $1 AND user_id = $2 AND trashed_at IS NULL',
    [noteId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getQuestionAnswersForNotes(
  userId: string,
  noteIds: string[]
): Promise<QuestionAnswerRowForBackup[]> {
  if (noteIds.length === 0) return [];
  const result = await pool.query(
    `SELECT sqa.id, sqa.page_id, sqa.question, sqa.answer, sqa.source
     FROM study_questions_answers sqa
     JOIN notes n ON n.id = sqa.page_id
     WHERE n.user_id = $1
       AND n.trashed_at IS NULL
       AND sqa.page_id = ANY($2::uuid[])
     ORDER BY sqa.page_id ASC, sqa.created_at ASC, sqa.id ASC`,
    [userId, noteIds]
  );
  return result.rows;
}

export async function getStudyItemsForNotes(
  userId: string,
  noteIds: string[]
): Promise<StudyItemRowForBackup[]> {
  if (noteIds.length === 0) return [];
  const result = await pool.query(
    `SELECT note_id, is_active, due_at, last_reviewed_at, stability_days, difficulty
     FROM study_items
     WHERE user_id = $1 AND note_id = ANY($2::uuid[])
     ORDER BY note_id ASC`,
    [userId, noteIds]
  );
  return result.rows;
}

export interface InsertNotePayload {
  id: string;
  userId: string;
  title: string;
  richContent: unknown;
  contentText: string;
  parentId: string | null;
  sortOrder: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function insertNoteWithClient(
  client: PoolClient,
  payload: InsertNotePayload
): Promise<void> {
  await client.query(
    `INSERT INTO notes (
       id, user_id, title, rich_content, content_text,
       parent_id, sort_order, is_favorite, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)`,
    [
      payload.id,
      payload.userId,
      payload.title,
      JSON.stringify(payload.richContent),
      payload.contentText,
      payload.parentId,
      payload.sortOrder,
      payload.isFavorite,
      payload.createdAt,
      payload.updatedAt,
    ]
  );
}

export interface InsertQuestionAnswerPayload {
  userId: string;
  pageId: string;
  question: string;
  answer: string;
  source: 'manual' | 'generated';
  questionNormalized: string;
  answerNormalized: string;
}

/**
 * Insert a Q/A row for a page, verifying in the same statement that the page
 * belongs to the given user and is not trashed. Mirrors the ownership-guarded
 * `INSERT … SELECT … FROM notes WHERE …` pattern used by the study-questions
 * service. Returns true only when a row was actually inserted.
 */
export async function insertStudyQuestionAnswerWithClient(
  client: PoolClient,
  payload: InsertQuestionAnswerPayload
): Promise<boolean> {
  const result = await client.query(
    `INSERT INTO study_questions_answers (
       page_id, question, answer, source, question_normalized, answer_normalized
     )
     SELECT n.id, $2, $3, $4, $5, $6
     FROM notes n
     WHERE n.id = $1 AND n.user_id = $7 AND n.trashed_at IS NULL
     ON CONFLICT (page_id, question_normalized, answer_normalized) DO NOTHING`,
    [
      payload.pageId,
      payload.question,
      payload.answer,
      payload.source,
      payload.questionNormalized,
      payload.answerNormalized,
      payload.userId,
    ]
  );
  return (result.rowCount ?? 0) > 0;
}

export interface InsertStudyItemPayload {
  userId: string;
  noteId: string;
  isActive: boolean;
  dueAt: string;
  lastReviewedAt: string | null;
  stabilityDays: number;
  difficulty: number;
}

export async function insertStudyItemWithClient(
  client: PoolClient,
  payload: InsertStudyItemPayload
): Promise<boolean> {
  const result = await client.query(
    `INSERT INTO study_items (
       user_id, note_id, is_active, due_at, last_reviewed_at,
       stability_days, difficulty
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, note_id) DO NOTHING`,
    [
      payload.userId,
      payload.noteId,
      payload.isActive,
      payload.dueAt,
      payload.lastReviewedAt,
      payload.stabilityDays,
      payload.difficulty,
    ]
  );
  return (result.rowCount ?? 0) > 0;
}
