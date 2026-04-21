import { pool } from '../../db/pool.js';

export interface OfflineNoteRow {
  id: string;
  parent_id: string | null;
  title: string;
  rich_content: unknown;
  content_text: string;
  sort_order: number;
  is_favorite: boolean;
  last_visited_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface OfflineQaRow {
  id: string;
  page_id: string;
  question: string;
  answer: string;
  source: 'manual' | 'generated';
  created_at: Date;
  updated_at: Date;
}

export interface OfflineStudyItemRow {
  note_id: string;
  is_active: boolean;
  due_at: Date;
  last_reviewed_at: Date | null;
  stability_days: number;
  difficulty: number;
}

export interface OfflineUserPreferencesRow {
  ui_language: string;
}

export async function getAllNotesForOffline(
  userId: string
): Promise<OfflineNoteRow[]> {
  const result = await pool.query(
    `SELECT id, parent_id, title, rich_content, content_text,
            COALESCE(sort_order, 0) AS sort_order,
            is_favorite, last_visited_at, created_at, updated_at
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

export async function getAllStudyQuestionsForOffline(
  userId: string
): Promise<OfflineQaRow[]> {
  const result = await pool.query(
    `SELECT sqa.id, sqa.page_id, sqa.question, sqa.answer, sqa.source,
            sqa.created_at, sqa.updated_at
       FROM study_questions_answers sqa
       JOIN notes n ON n.id = sqa.page_id
      WHERE n.user_id = $1 AND n.trashed_at IS NULL
      ORDER BY sqa.page_id, sqa.created_at, sqa.id`,
    [userId]
  );
  return result.rows;
}

export async function getAllStudyItemsForOffline(
  userId: string
): Promise<OfflineStudyItemRow[]> {
  const result = await pool.query(
    `SELECT si.note_id, si.is_active, si.due_at, si.last_reviewed_at,
            COALESCE(si.stability_days, 0) AS stability_days,
            COALESCE(si.difficulty, 0)    AS difficulty
       FROM study_items si
       JOIN notes n ON n.id = si.note_id
      WHERE si.user_id = $1 AND n.trashed_at IS NULL`,
    [userId]
  );
  return result.rows;
}

export async function getUserPreferencesForOffline(
  userId: string
): Promise<OfflineUserPreferencesRow> {
  const result = await pool.query(
    'SELECT ui_language FROM users WHERE id = $1',
    [userId]
  );
  const row = result.rows[0] as { ui_language?: string | null } | undefined;
  return { ui_language: row?.ui_language ?? 'en' };
}

export async function getNotesChangedSince(
  userId: string,
  since: Date
): Promise<OfflineNoteRow[]> {
  const result = await pool.query(
    `SELECT id, parent_id, title, rich_content, content_text,
            COALESCE(sort_order, 0) AS sort_order,
            is_favorite, last_visited_at, created_at, updated_at
       FROM notes
      WHERE user_id = $1 AND trashed_at IS NULL AND updated_at > $2
      ORDER BY updated_at ASC`,
    [userId, since]
  );
  return result.rows;
}

/**
 * Returns ids of notes newly trashed or permanently deleted since `since`.
 * Permanent deletes are not individually tracked in v1; the client falls back
 * to whole-set reconciliation periodically. Trashed notes are the common case
 * and are returned here.
 */
export async function getNoteIdsRemovedSince(
  userId: string,
  since: Date
): Promise<string[]> {
  const result = await pool.query(
    `SELECT id FROM notes
      WHERE user_id = $1 AND trashed_at IS NOT NULL AND trashed_at > $2`,
    [userId, since]
  );
  return (result.rows as Array<{ id: string }>).map((r) => r.id);
}

export async function getQaChangedSince(
  userId: string,
  since: Date
): Promise<OfflineQaRow[]> {
  const result = await pool.query(
    `SELECT sqa.id, sqa.page_id, sqa.question, sqa.answer, sqa.source,
            sqa.created_at, sqa.updated_at
       FROM study_questions_answers sqa
       JOIN notes n ON n.id = sqa.page_id
      WHERE n.user_id = $1
        AND n.trashed_at IS NULL
        AND sqa.updated_at > $2`,
    [userId, since]
  );
  return result.rows;
}

/**
 * Returns the authoritative id set of Q/A rows per page. The client compares
 * this against its local set and deletes anything missing from the server.
 * This avoids the need for explicit Q/A tombstones in v1.
 */
export async function getQaIdsAllowedForUser(
  userId: string
): Promise<Array<{ page_id: string; id: string }>> {
  const result = await pool.query(
    `SELECT sqa.page_id, sqa.id
       FROM study_questions_answers sqa
       JOIN notes n ON n.id = sqa.page_id
      WHERE n.user_id = $1 AND n.trashed_at IS NULL`,
    [userId]
  );
  return result.rows;
}

/**
 * Returns the current user preferences for inclusion in an incremental
 * `changes` payload. The `users` table does not track `updated_at`, and
 * the payload is a single tiny row, so we always return the current value
 * and let the client overwrite its cached settings. The `since` parameter
 * is accepted for API symmetry and future use.
 */
export async function getUserPreferencesChangedSince(
  userId: string,
  _since: Date
): Promise<OfflineUserPreferencesRow | null> {
  const result = await pool.query(
    'SELECT ui_language FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as { ui_language?: string | null };
  return { ui_language: row.ui_language ?? 'en' };
}
