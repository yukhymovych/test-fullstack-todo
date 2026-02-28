import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';

const DAILY_CAP = 15;

export interface StudyItem {
  id: string;
  user_id: string;
  note_id: string;
  is_active: boolean;
  due_at: Date;
  last_reviewed_at: Date | null;
  stability_days: number;
  difficulty: number;
}

export interface LearningSession {
  id: string;
  user_id: string;
  day_key: string;
  status: string;
  created_at: Date;
  kind?: string;
  root_note_id?: string | null;
}

export interface LearningSessionItem {
  id: string;
  session_id: string;
  note_id: string | null;
  position: number;
  state: string;
  grade: string | null;
  reviewed_at: Date | null;
  is_retry: boolean;
}

export interface StudyItemReviewLog {
  id: string;
  user_id: string;
  note_id: string;
  reviewed_at: Date;
  grade: string | null;
  source: string;
  session_id: string | null;
  elapsed_days: number | null;
  stability_before: number | null;
  difficulty_before: number | null;
  stability_after: number | null;
  difficulty_after: number | null;
  due_before: Date | null;
  due_after: Date | null;
  review_day_key: string | null;
}

export async function getUserTimezone(userId: string): Promise<string> {
  const result = await pool.query(
    "SELECT COALESCE(timezone, 'UTC') AS tz FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0]?.tz ?? 'UTC';
}

export async function getSessionByUserAndDay(
  userId: string,
  dayKey: string
): Promise<LearningSession | null> {
  const result = await pool.query(
    `SELECT id, user_id, day_key, status, created_at, kind, root_note_id
     FROM learning_sessions
     WHERE user_id = $1 AND day_key = $2 AND kind = 'global'`,
    [userId, dayKey]
  );
  return result.rows[0] || null;
}

/** Debug: delete today's session (items cascade). Returns deleted count. */
export async function deleteSessionByUserAndDay(
  userId: string,
  dayKey: string
): Promise<number> {
  const result = await pool.query(
    `DELETE FROM learning_sessions WHERE user_id = $1 AND day_key = $2 AND kind = 'global'`,
    [userId, dayKey]
  );
  return result.rowCount ?? 0;
}

/** Debug: delete all today's sessions (global + scoped). Returns deleted count. */
export async function deleteSessionsByUserAndDayAllKinds(
  userId: string,
  dayKey: string
): Promise<number> {
  const result = await pool.query(
    `DELETE FROM learning_sessions WHERE user_id = $1 AND day_key = $2`,
    [userId, dayKey]
  );
  return result.rowCount ?? 0;
}

/** Debug: reset due_at to NOW() for all active study items of a user */
export async function resetStudyItemsDueAt(userId: string): Promise<number> {
  const result = await pool.query(
    `UPDATE study_items SET due_at = NOW() WHERE user_id = $1 AND is_active = true`,
    [userId]
  );
  return result.rowCount ?? 0;
}

/** Debug: reset study item review state and FSRS params. */
export async function resetStudyItemsForRefreshAllGrades(
  userId: string
): Promise<number> {
  const result = await pool.query(
    `UPDATE study_items
     SET due_at = NOW(),
         last_reviewed_at = NULL,
         stability_days = 7,
         difficulty = 5
     WHERE user_id = $1`,
    [userId]
  );
  return result.rowCount ?? 0;
}

/** Debug: delete all user review logs. */
export async function deleteReviewLogsByUser(userId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM review_logs WHERE user_id = $1`,
    [userId]
  );
  return result.rowCount ?? 0;
}

/** Debug: delete sessions where day_key > todayKey (future sessions). Returns deleted count. */
export async function deleteFutureSessions(
  userId: string,
  todayKey: string
): Promise<number> {
  const result = await pool.query(
    `DELETE FROM learning_sessions WHERE user_id = $1 AND day_key > $2`,
    [userId, todayKey]
  );
  return result.rowCount ?? 0;
}

/** Debug: delete today's scoped sessions. Returns deleted count. */
export async function deleteTodayScopedSessions(
  userId: string,
  dayKey: string
): Promise<number> {
  const result = await pool.query(
    `DELETE FROM learning_sessions WHERE user_id = $1 AND day_key = $2 AND kind = 'scoped'`,
    [userId, dayKey]
  );
  return result.rowCount ?? 0;
}

export async function createSession(
  userId: string,
  dayKey: string
): Promise<LearningSession> {
  const result = await pool.query(
    `INSERT INTO learning_sessions (user_id, day_key, status, kind)
     VALUES ($1, $2, 'active', 'global')
     RETURNING id, user_id, day_key, status, created_at, kind, root_note_id`,
    [userId, dayKey]
  );
  return result.rows[0];
}

export async function getDueStudyItems(
  userId: string,
  limit: number,
  scopeNoteIds: string[] | null
): Promise<StudyItem[]> {
  if (scopeNoteIds && scopeNoteIds.length > 0) {
    const result = await pool.query(
      `SELECT si.id, si.user_id, si.note_id, si.is_active, si.due_at, si.last_reviewed_at,
              si.stability_days, si.difficulty
       FROM study_items si
       WHERE si.user_id = $1 AND si.is_active = true AND si.due_at <= NOW()
         AND si.note_id = ANY($2::uuid[])
       ORDER BY si.due_at ASC, si.last_reviewed_at NULLS FIRST, si.note_id ASC
       LIMIT $3`,
      [userId, scopeNoteIds, limit]
    );
    return result.rows;
  }
  const result = await pool.query(
    `SELECT id, user_id, note_id, is_active, due_at, last_reviewed_at,
            stability_days, difficulty
     FROM study_items
     WHERE user_id = $1 AND is_active = true AND due_at <= NOW()
     ORDER BY due_at ASC, last_reviewed_at NULLS FIRST, note_id ASC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function insertSessionItems(
  sessionId: string,
  items: { noteId: string; position: number; isRetry: boolean }[]
): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    await pool.query(
      `INSERT INTO learning_session_items (session_id, note_id, position, state, is_retry)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [sessionId, item.noteId, item.position, item.isRetry]
    );
  }
}

export async function insertSessionItemAsDone(
  client: PoolClient,
  sessionId: string,
  noteId: string,
  position: number,
  grade: string,
  reviewedAt: Date
): Promise<void> {
  await client.query(
    `INSERT INTO learning_session_items (session_id, note_id, position, state, grade, reviewed_at, is_retry)
     VALUES ($1, $2, $3, 'done', $4, $5, false)`,
    [sessionId, noteId, position, grade, reviewedAt]
  );
}

export async function getSessionWithItems(
  sessionId: string,
  userId: string
): Promise<{
  session: LearningSession;
  items: (LearningSessionItem & { title?: string })[];
} | null> {
  const sessionResult = await pool.query(
    `SELECT id, user_id, day_key, status, created_at, kind, root_note_id
     FROM learning_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  const session = sessionResult.rows[0];
  if (!session) return null;

  const itemsResult = await pool.query(
    `SELECT lsi.id, lsi.session_id, lsi.note_id, lsi.position, lsi.state, lsi.grade, lsi.reviewed_at, lsi.is_retry,
            n.title
     FROM learning_session_items lsi
     LEFT JOIN notes n ON n.id = lsi.note_id AND n.user_id = $1
     WHERE lsi.session_id = $2
     ORDER BY lsi.position ASC`,
    [userId, sessionId]
  );

  const items = itemsResult.rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    session_id: row.session_id as string,
    note_id: row.note_id as string | null,
    position: row.position as number,
    state: (row.note_id === null ? 'unavailable' : row.state) as string,
    grade: row.grade as string | null,
    reviewed_at: row.reviewed_at as Date | null,
    is_retry: row.is_retry as boolean,
    title: (row.title ?? '(deleted)') as string,
  }));

  return { session, items };
}

export async function getSessionById(
  sessionId: string,
  userId: string
): Promise<LearningSession | null> {
  const result = await pool.query(
    `SELECT id, user_id, day_key, status, created_at, kind, root_note_id
     FROM learning_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  return result.rows[0] || null;
}

export async function getSessionItemById(
  itemId: string,
  userId: string
): Promise<(LearningSessionItem & { session_id: string }) | null> {
  const result = await pool.query(
    `SELECT lsi.id, lsi.session_id, lsi.note_id, lsi.position, lsi.state, lsi.grade, lsi.reviewed_at, lsi.is_retry
     FROM learning_session_items lsi
     JOIN learning_sessions ls ON ls.id = lsi.session_id AND ls.user_id = $1
     WHERE lsi.id = $2`,
    [userId, itemId]
  );
  return result.rows[0] || null;
}

export async function getPendingSessionItemBySessionAndNote(
  sessionId: string,
  noteId: string,
  userId: string
): Promise<(LearningSessionItem & { session_id: string }) | null> {
  const result = await pool.query(
    `SELECT lsi.id, lsi.session_id, lsi.note_id, lsi.position, lsi.state, lsi.grade, lsi.reviewed_at, lsi.is_retry
     FROM learning_session_items lsi
     JOIN learning_sessions ls ON ls.id = lsi.session_id AND ls.user_id = $1
     WHERE lsi.session_id = $2 AND lsi.note_id = $3 AND lsi.state = 'pending'`,
    [userId, sessionId, noteId]
  );
  return result.rows[0] || null;
}

export async function getSessionItemBySessionAndNote(
  sessionId: string,
  noteId: string,
  userId: string
): Promise<{ state: string } | null> {
  const result = await pool.query(
    `SELECT lsi.state
     FROM learning_session_items lsi
     JOIN learning_sessions ls ON ls.id = lsi.session_id AND ls.user_id = $1
     WHERE lsi.session_id = $2 AND lsi.note_id = $3`,
    [userId, sessionId, noteId]
  );
  return result.rows[0] || null;
}

/** Returns IDs of pending session_items for the same note in today's other sessions (for grade sync). */
export async function getOtherPendingSessionItemIdsForNoteToday(
  client: PoolClient,
  userId: string,
  excludeSessionId: string,
  noteId: string,
  dayKey: string
): Promise<string[]> {
  const result = await client.query(
    `SELECT lsi.id
     FROM learning_session_items lsi
     JOIN learning_sessions ls ON ls.id = lsi.session_id AND ls.user_id = $1 AND ls.day_key = $2
     WHERE ls.id != $3 AND lsi.note_id = $4 AND lsi.state = 'pending'`,
    [userId, dayKey, excludeSessionId, noteId]
  );
  return result.rows.map((r) => r.id as string);
}

/** Returns first pending session_item for note in any of today's sessions, or null. */
export async function getPendingSessionItemForNoteInTodaySessions(
  userId: string,
  noteId: string,
  dayKey: string
): Promise<{ id: string; session_id: string } | null> {
  const result = await pool.query(
    `SELECT lsi.id, lsi.session_id
     FROM learning_session_items lsi
     JOIN learning_sessions ls ON ls.id = lsi.session_id AND ls.user_id = $1 AND ls.day_key = $2
     WHERE lsi.note_id = $3 AND lsi.state = 'pending'
     LIMIT 1`,
    [userId, dayKey, noteId]
  );
  const row = result.rows[0];
  return row ? { id: row.id as string, session_id: row.session_id as string } : null;
}

/** Returns first session_item for note in any of today's sessions (any state), or null. */
export async function getAnySessionItemForNoteInTodaySessions(
  userId: string,
  noteId: string,
  dayKey: string
): Promise<{ id: string; state: string } | null> {
  const result = await pool.query(
    `SELECT lsi.id, lsi.state
     FROM learning_session_items lsi
     JOIN learning_sessions ls ON ls.id = lsi.session_id AND ls.user_id = $1 AND ls.day_key = $2
     WHERE lsi.note_id = $3
     LIMIT 1`,
    [userId, dayKey, noteId]
  );
  const row = result.rows[0];
  return row ? { id: row.id as string, state: row.state as string } : null;
}

export async function getStudyItemByUserAndNote(
  userId: string,
  noteId: string
): Promise<StudyItem | null> {
  const result = await pool.query(
    `SELECT id, user_id, note_id, is_active, due_at, last_reviewed_at,
            stability_days, difficulty
     FROM study_items
     WHERE user_id = $1 AND note_id = $2`,
    [userId, noteId]
  );
  return result.rows[0] || null;
}

export async function getStudyItemByUserAndNoteForUpdate(
  client: PoolClient,
  userId: string,
  noteId: string
): Promise<StudyItem | null> {
  const result = await client.query(
    `SELECT id, user_id, note_id, is_active, due_at, last_reviewed_at,
            stability_days, difficulty
     FROM study_items
     WHERE user_id = $1 AND note_id = $2
     FOR UPDATE`,
    [userId, noteId]
  );
  return result.rows[0] || null;
}

export async function createStudyItem(
  userId: string,
  noteId: string
): Promise<StudyItem> {
  const result = await pool.query(
    `INSERT INTO study_items (user_id, note_id, is_active, due_at)
     VALUES ($1, $2, true, NOW())
     ON CONFLICT (user_id, note_id) DO UPDATE SET is_active = true
     RETURNING id, user_id, note_id, is_active, due_at, last_reviewed_at,
               stability_days, difficulty`,
    [userId, noteId]
  );
  return result.rows[0];
}

export async function deactivateStudyItem(
  userId: string,
  noteId: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE study_items SET is_active = false
     WHERE user_id = $1 AND note_id = $2
     RETURNING id`,
    [userId, noteId]
  );
  return (result.rowCount ?? 0) > 0;
}

export function getDailyCap(): number {
  return DAILY_CAP;
}

export async function getDueStudyItemsCount(
  userId: string
): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM study_items
     WHERE user_id = $1 AND is_active = true AND due_at <= NOW()`,
    [userId]
  );
  return result.rows[0]?.cnt ?? 0;
}

/** Debug: get active study items not yet in session, for refilling (ignores due_at) */
export async function getActiveStudyItemsForRefill(
  userId: string,
  sessionId: string,
  limit: number
): Promise<StudyItem[]> {
  const result = await pool.query(
    `SELECT si.id, si.user_id, si.note_id, si.is_active, si.due_at, si.last_reviewed_at,
            si.stability_days, si.difficulty
     FROM study_items si
     WHERE si.user_id = $1 AND si.is_active = true
       AND si.note_id NOT IN (
         SELECT note_id FROM learning_session_items
         WHERE session_id = $2 AND note_id IS NOT NULL
       )
     ORDER BY si.due_at ASC, si.last_reviewed_at NULLS FIRST, si.note_id ASC
     LIMIT $3`,
    [userId, sessionId, limit]
  );
  return result.rows;
}

export async function getMaxPositionInSessionPool(
  sessionId: string
): Promise<number> {
  const result = await pool.query(
    `SELECT COALESCE(MAX(position), -1) AS max_pos FROM learning_session_items WHERE session_id = $1`,
    [sessionId]
  );
  return (result.rows[0]?.max_pos ?? -1) + 1;
}

export async function updateSessionItemGrade(
  client: PoolClient,
  itemId: string,
  grade: string,
  reviewedAt: Date
): Promise<void> {
  await client.query(
    `UPDATE learning_session_items
     SET state = 'done', grade = $1, reviewed_at = $2
     WHERE id = $3`,
    [grade, reviewedAt, itemId]
  );
}

export async function markSessionItemUnavailable(
  client: PoolClient,
  itemId: string
): Promise<void> {
  await client.query(
    `UPDATE learning_session_items SET state = 'unavailable' WHERE id = $1`,
    [itemId]
  );
}

/** Mark all session items referencing this note as unavailable (e.g. when note is deleted). */
export async function markSessionItemsUnavailableByNoteId(
  noteId: string
): Promise<number> {
  const result = await pool.query(
    `UPDATE learning_session_items SET state = 'unavailable'
     WHERE note_id = $1 AND state = 'pending'`,
    [noteId]
  );
  return result.rowCount ?? 0;
}

export async function updateStudyItemAfterReviewV2(
  client: PoolClient,
  userId: string,
  noteId: string,
  dueAt: Date,
  stabilityDays: number,
  difficulty: number
): Promise<void> {
  await client.query(
    `UPDATE study_items
     SET due_at = $1,
         last_reviewed_at = NOW(),
         stability_days = $2,
         difficulty = $3
     WHERE user_id = $4 AND note_id = $5`,
    [dueAt, stabilityDays, difficulty, userId, noteId]
  );
}

export async function ensureStudyItemExists(
  client: PoolClient,
  userId: string,
  noteId: string
): Promise<void> {
  await client.query(
    `INSERT INTO study_items (user_id, note_id, is_active, due_at)
     VALUES ($1, $2, true, NOW())
     ON CONFLICT (user_id, note_id) DO UPDATE SET is_active = true`,
    [userId, noteId]
  );
}

export async function getMaxPositionInSession(
  client: PoolClient,
  sessionId: string
): Promise<number> {
  const result = await client.query(
    `SELECT COALESCE(MAX(position), -1) AS max_pos FROM learning_session_items WHERE session_id = $1`,
    [sessionId]
  );
  return (result.rows[0]?.max_pos ?? -1) + 1;
}

export async function insertRetrySessionItem(
  client: PoolClient,
  sessionId: string,
  noteId: string,
  position: number
): Promise<void> {
  await client.query(
    `INSERT INTO learning_session_items (session_id, note_id, position, state, is_retry)
     VALUES ($1, $2, $3, 'pending', true)`,
    [sessionId, noteId, position]
  );
}

export async function noteExistsForUser(
  client: PoolClient,
  noteId: string,
  userId: string
): Promise<boolean> {
  const result = await client.query(
    'SELECT 1 FROM notes WHERE id = $1 AND user_id = $2',
    [noteId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function insertReviewLog(
  client: PoolClient,
  userId: string,
  noteId: string,
  grade: string,
  source: string,
  sessionId: string | null
): Promise<void> {
  await insertReviewLogV2(client, {
    userId,
    noteId,
    grade,
    source,
    sessionId,
    elapsedDays: null,
    stabilityBefore: null,
    difficultyBefore: null,
    stabilityAfter: null,
    difficultyAfter: null,
    dueBefore: null,
    dueAfter: null,
    reviewDayKey: null,
  });
}

interface InsertReviewLogV2Params {
  userId: string;
  noteId: string;
  grade: string;
  source: string;
  sessionId: string | null;
  elapsedDays: number | null;
  stabilityBefore: number | null;
  difficultyBefore: number | null;
  stabilityAfter: number | null;
  difficultyAfter: number | null;
  dueBefore: Date | null;
  dueAfter: Date | null;
  reviewDayKey: string | null;
}

export async function insertReviewLogV2(
  client: PoolClient,
  params: InsertReviewLogV2Params
): Promise<void> {
  await client.query(
    `INSERT INTO review_logs (
      user_id,
      note_id,
      grade,
      source,
      session_id,
      elapsed_days,
      stability_before,
      difficulty_before,
      stability_after,
      difficulty_after,
      due_before,
      due_after,
      review_day_key
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      params.userId,
      params.noteId,
      params.grade,
      params.source,
      params.sessionId,
      params.elapsedDays,
      params.stabilityBefore,
      params.difficultyBefore,
      params.stabilityAfter,
      params.difficultyAfter,
      params.dueBefore,
      params.dueAfter,
      params.reviewDayKey,
    ]
  );
}

export async function findActiveScopedSession(
  userId: string,
  dayKey: string,
  rootNoteId: string
): Promise<LearningSession | null> {
  const result = await pool.query(
    `SELECT id, user_id, day_key, status, created_at, kind, root_note_id
     FROM learning_sessions
     WHERE user_id = $1 AND day_key = $2 AND kind = 'scoped' AND root_note_id = $3 AND status = 'active'`,
    [userId, dayKey, rootNoteId]
  );
  return result.rows[0] || null;
}

export async function createScopedSession(
  userId: string,
  dayKey: string,
  rootNoteId: string
): Promise<LearningSession> {
  const result = await pool.query(
    `INSERT INTO learning_sessions (user_id, day_key, status, kind, root_note_id)
     VALUES ($1, $2, 'active', 'scoped', $3)
     RETURNING id, user_id, day_key, status, created_at, kind, root_note_id`,
    [userId, dayKey, rootNoteId]
  );
  return result.rows[0];
}

export interface ScopedSessionSummary {
  sessionId: string;
  rootNoteId: string;
  rootTitle: string;
  done: number;
  total: number;
}

/** Returns count of descendants of rootNoteId that have active study_items. */
export async function getDescendantsWithLearningCount(
  userId: string,
  rootNoteId: string
): Promise<number> {
  const result = await pool.query(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM notes WHERE parent_id = $1 AND user_id = $2
       UNION ALL
       SELECT n.id FROM notes n
       JOIN descendants d ON n.parent_id = d.id AND n.user_id = $2
     )
     SELECT COUNT(*)::int AS cnt
     FROM descendants d
     JOIN study_items si ON si.note_id = d.id AND si.user_id = $2 AND si.is_active = true`,
    [rootNoteId, userId]
  );
  return result.rows[0]?.cnt ?? 0;
}

export async function getStudyItemsByNoteIds(
  userId: string,
  noteIds: string[]
): Promise<StudyItem[]> {
  if (noteIds.length === 0) return [];
  const result = await pool.query(
    `SELECT id, user_id, note_id, is_active, due_at, last_reviewed_at,
            stability_days, difficulty
     FROM study_items
     WHERE user_id = $1 AND note_id = ANY($2::uuid[])`,
    [userId, noteIds]
  );
  return result.rows;
}

export async function listTodayScopedSessions(
  userId: string,
  dayKey: string
): Promise<ScopedSessionSummary[]> {
  const result = await pool.query(
    `SELECT ls.id AS session_id, ls.root_note_id, n.title AS root_title,
            COUNT(lsi.id) FILTER (WHERE lsi.state = 'done') AS done,
            COUNT(lsi.id) AS total
     FROM learning_sessions ls
     LEFT JOIN notes n ON n.id = ls.root_note_id AND n.user_id = ls.user_id
     LEFT JOIN learning_session_items lsi ON lsi.session_id = ls.id
     WHERE ls.user_id = $1 AND ls.day_key = $2 AND ls.kind = 'scoped' AND ls.status = 'active'
     GROUP BY ls.id, ls.root_note_id, n.title`,
    [userId, dayKey]
  );
  return result.rows.map((r) => ({
    sessionId: r.session_id,
    rootNoteId: r.root_note_id,
    rootTitle: r.root_title ?? '(deleted)',
    done: Number(r.done),
    total: Number(r.total),
  }));
}

export async function getReviewLogsByUserAndNote(
  userId: string,
  noteId: string
): Promise<StudyItemReviewLog[]> {
  const result = await pool.query(
    `SELECT
        id,
        user_id,
        note_id,
        reviewed_at,
        grade,
        source,
        session_id,
        elapsed_days,
        stability_before,
        difficulty_before,
        stability_after,
        difficulty_after,
        due_before,
        due_after,
        review_day_key
     FROM review_logs
     WHERE user_id = $1 AND note_id = $2
     ORDER BY reviewed_at DESC`,
    [userId, noteId]
  );
  return result.rows;
}
