import { pool } from '../../db/pool.js';
import * as notesSQL from '../notes/notes.sql.js';
import * as learningSQL from './learning.sql.js';
import type { Grade } from './learning.schemas.js';

const GRADE_INTERVALS_DAYS: Record<Grade, number> = {
  again: 1,
  hard: 2,
  good: 5,
  easy: 10,
};

function getDayKey(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export async function startSession(userId: string, timezone: string) {
  const dayKey = getDayKey(timezone);
  let session = await learningSQL.getSessionByUserAndDay(userId, dayKey);
  const cap = learningSQL.getDailyCap();
  const items = await learningSQL.getDueStudyItems(userId, cap, null);

  if (!session) {
    if (items.length === 0) {
      return null;
    }
    session = await learningSQL.createSession(userId, dayKey);
    const sessionItems = items.map((item, i) => ({
      noteId: item.note_id,
      position: i,
      isRetry: false,
    }));
    await learningSQL.insertSessionItems(session.id, sessionItems);
  } else {
    const existingData = await learningSQL.getSessionWithItems(session.id, userId);
    if (existingData && existingData.items.length === 0 && items.length > 0) {
      const sessionItems = items.map((item, i) => ({
        noteId: item.note_id,
        position: i,
        isRetry: false,
      }));
      await learningSQL.insertSessionItems(session.id, sessionItems);
    }
  }

  const data = await learningSQL.getSessionWithItems(session.id, userId);
  return data;
}

export async function startScopedSession(
  userId: string,
  scopePageId: string,
  timezone: string
) {
  const note = await notesSQL.getNoteById(scopePageId, userId);
  if (!note) {
    return null;
  }

  const descendantIds = await notesSQL.getDescendantIds(scopePageId, userId);
  const scopeNoteIds = [scopePageId, ...descendantIds];

  const dayKey = getDayKey(timezone);
  let session = await learningSQL.getSessionByUserAndDay(userId, dayKey);

  const cap = learningSQL.getDailyCap();
  const items = await learningSQL.getDueStudyItems(userId, cap, scopeNoteIds);

  if (!session) {
    if (items.length === 0) {
      return null;
    }
    session = await learningSQL.createSession(userId, dayKey);
    const sessionItems = items.map((item, i) => ({
      noteId: item.note_id,
      position: i,
      isRetry: false,
    }));
    await learningSQL.insertSessionItems(session.id, sessionItems);
  } else {
    const existingData = await learningSQL.getSessionWithItems(session.id, userId);
    if (existingData && existingData.items.length === 0 && items.length > 0) {
      const sessionItems = items.map((item, i) => ({
        noteId: item.note_id,
        position: i,
        isRetry: false,
      }));
      await learningSQL.insertSessionItems(session.id, sessionItems);
    }
  }

  const data = await learningSQL.getSessionWithItems(session.id, userId);
  return data;
}

export async function resolveTimezone(userId: string, override?: string): Promise<string> {
  if (override) return override;
  return learningSQL.getUserTimezone(userId);
}

export async function getTodaySession(userId: string, timezone: string) {
  const dayKey = getDayKey(timezone);
  const session = await learningSQL.getSessionByUserAndDay(userId, dayKey);
  if (!session) return null;
  return learningSQL.getSessionWithItems(session.id, userId);
}

export async function gradeSessionItem(
  userId: string,
  sessionItemId: string,
  grade: Grade
) {
  const item = await learningSQL.getSessionItemById(sessionItemId, userId);
  if (!item) return { success: false, error: 'Session item not found' as const };
  if (item.state !== 'pending') {
    return { success: true, alreadyGraded: true as const };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!item.note_id) {
      await learningSQL.markSessionItemUnavailable(client, sessionItemId);
      await client.query('COMMIT');
      return { success: true };
    }

    const noteExists = await learningSQL.noteExistsForUser(
      client,
      item.note_id,
      userId
    );
    if (!noteExists) {
      await learningSQL.markSessionItemUnavailable(client, sessionItemId);
      await client.query('COMMIT');
      return { success: true };
    }

    const now = new Date();
    const intervalDays = GRADE_INTERVALS_DAYS[grade];
    const dueAt = addDays(now, intervalDays);

    await learningSQL.updateSessionItemGrade(client, sessionItemId, grade, now);
    await learningSQL.updateStudyItemAfterReview(
      client,
      userId,
      item.note_id,
      dueAt
    );
    await learningSQL.ensureStudyItemExists(client, userId, item.note_id);
    await learningSQL.insertReviewLog(
      client,
      userId,
      item.note_id,
      grade,
      'session',
      item.session_id
    );

    if (grade === 'again') {
      const maxPos = await learningSQL.getMaxPositionInSession(
        client,
        item.session_id
      );
      await learningSQL.insertRetrySessionItem(
        client,
        item.session_id,
        item.note_id,
        maxPos
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function gradeByPage(
  userId: string,
  pageId: string,
  grade: Grade,
  timezone: string
) {
  const note = await notesSQL.getNoteById(pageId, userId);
  if (!note) return { success: false, error: 'Page not found' as const };

  const studyItem = await learningSQL.getStudyItemByUserAndNote(userId, pageId);
  if (!studyItem || !studyItem.is_active) {
    return { success: false, error: 'Page not in learning' as const };
  }

  const dayKey = getDayKey(timezone);
  let session = await learningSQL.getSessionByUserAndDay(userId, dayKey);
  const existingSessionItem = session
    ? await learningSQL.getSessionItemBySessionAndNote(
        session.id,
        pageId,
        userId
      )
    : null;

  if (existingSessionItem) {
    if (existingSessionItem.state === 'pending') {
      const pendingItem = await learningSQL.getPendingSessionItemBySessionAndNote(
        session!.id,
        pageId,
        userId
      );
      if (pendingItem) return gradeSessionItem(userId, pendingItem.id, grade);
    }
    return { success: true, alreadyGraded: true as const };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!session) {
      const insertResult = await client.query(
        `INSERT INTO learning_sessions (user_id, day_key, status)
         VALUES ($1, $2, 'active')
         RETURNING id, user_id, day_key, status, created_at`,
        [userId, dayKey]
      );
      session = insertResult.rows[0];
    }

    if (!session) throw new Error('Failed to create or get session');

    const now = new Date();
    const intervalDays = GRADE_INTERVALS_DAYS[grade];
    const dueAt = addDays(now, intervalDays);
    const position = await learningSQL.getMaxPositionInSession(
      client,
      session.id
    );

    await learningSQL.insertSessionItemAsDone(
      client,
      session.id,
      pageId,
      position,
      grade,
      now
    );
    await learningSQL.updateStudyItemAfterReview(
      client,
      userId,
      pageId,
      dueAt
    );
    await learningSQL.insertReviewLog(
      client,
      userId,
      pageId,
      grade,
      'manual',
      session.id
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function activateStudyItem(userId: string, pageId: string) {
  const note = await notesSQL.getNoteById(pageId, userId);
  if (!note) return null;
  return learningSQL.createStudyItem(userId, pageId);
}

export async function activateStudyItemScoped(
  userId: string,
  scopePageId: string
) {
  const note = await notesSQL.getNoteById(scopePageId, userId);
  if (!note) return null;
  const descendantIds = await notesSQL.getDescendantIds(scopePageId, userId);
  const noteIds = [scopePageId, ...descendantIds];
  for (const id of noteIds) {
    await learningSQL.createStudyItem(userId, id);
  }
  return { activated: noteIds.length };
}

export async function deactivateStudyItem(userId: string, pageId: string) {
  const ok = await learningSQL.deactivateStudyItem(userId, pageId);
  return ok ? { ok: true } : null;
}

export async function getDueStudyItemsCount(userId: string): Promise<number> {
  return learningSQL.getDueStudyItemsCount(userId);
}

/** Debug: add up to 15 more items to today's session from active study_items */
export async function refillSessionDebug(
  userId: string,
  timezone: string
) {
  const dayKey = getDayKey(timezone);
  const session = await learningSQL.getSessionByUserAndDay(userId, dayKey);
  if (!session) return null;

  const cap = learningSQL.getDailyCap();
  const items = await learningSQL.getActiveStudyItemsForRefill(
    userId,
    session.id,
    cap
  );
  if (items.length === 0) return learningSQL.getSessionWithItems(session.id, userId);

  const maxPos = await learningSQL.getMaxPositionInSessionPool(session.id);
  const sessionItems = items.map((item, i) => ({
    noteId: item.note_id,
    position: maxPos + i,
    isRetry: false,
  }));
  await learningSQL.insertSessionItems(session.id, sessionItems);

  return learningSQL.getSessionWithItems(session.id, userId);
}

export async function getStudyItemStatus(
  userId: string,
  pageId: string,
  timezone?: string
) {
  const item = await learningSQL.getStudyItemByUserAndNote(userId, pageId);
  if (!item) return { status: 'inactive' as const };
  const status = item.is_active ? ('active' as const) : ('inactive' as const);
  const base = {
    status,
    dueAt: item.due_at,
    lastReviewedAt: item.last_reviewed_at,
  };

  if (!timezone) return base;
  const dayKey = getDayKey(timezone);
  const session = await learningSQL.getSessionByUserAndDay(userId, dayKey);
  if (!session) return base;
  const sessionItem = await learningSQL.getSessionItemBySessionAndNote(
    session.id,
    pageId,
    userId
  );
  if (!sessionItem) return base;
  return {
    ...base,
    inTodaySession: true as const,
    sessionItemState: sessionItem.state as 'pending' | 'done' | 'skipped' | 'unavailable',
  };
}
