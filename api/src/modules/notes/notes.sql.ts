import { pool } from '../../db/pool.js';

export const TRASH_RETENTION_DAYS = 10;

export interface Note {
  id: string;
  user_id: string;
  title: string;
  parent_id: string | null;
  rich_content: unknown;
  content_text: string;
  created_at: Date;
  updated_at: Date;
}

export interface NoteRecord extends Note {
  sort_order?: number;
  is_favorite?: boolean;
  last_visited_at?: Date | null;
  trashed_at: Date | null;
  trashed_root_id: string | null;
}

export interface NoteListItem {
  id: string;
  title: string;
  parent_id?: string | null;
  sort_order?: number;
  updated_at: Date;
  is_favorite?: boolean;
  last_visited_at?: Date | null;
  trashed_at?: Date | null;
  trashed_root_id?: string | null;
}

export interface NoteSearchItem {
  id: string;
  title: string;
  parent_id: string | null;
  content_text: string;
  updated_at: Date;
}

export async function getAllNotes(userId: string): Promise<NoteListItem[]> {
  const result = await pool.query(
    `SELECT id, title, parent_id, sort_order, updated_at, is_favorite, last_visited_at
     FROM notes
     WHERE user_id = $1 AND trashed_at IS NULL
     ORDER BY updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function searchNotes(
  userId: string,
  normalizedQuery: string,
  tokens: string[],
  limit: number,
  rootNoteId?: string
): Promise<NoteSearchItem[]> {
  if (rootNoteId) {
    const result = await pool.query(
      `WITH RECURSIVE scope AS (
         SELECT id
         FROM notes
         WHERE id = $4 AND user_id = $1 AND trashed_at IS NULL
         UNION ALL
         SELECT n.id
         FROM notes n
         JOIN scope s ON n.parent_id = s.id
         WHERE n.user_id = $1 AND n.trashed_at IS NULL
       )
       SELECT n.id, n.title, n.parent_id, n.content_text, n.updated_at
       FROM notes n
       CROSS JOIN LATERAL (
         SELECT
           REGEXP_REPLACE(REPLACE(LOWER(n.title), '-', ' '), '\\s+', ' ', 'g') AS normalized_title,
           REGEXP_REPLACE(REPLACE(LOWER(n.content_text), '-', ' '), '\\s+', ' ', 'g') AS normalized_content
       ) norm
       CROSS JOIN LATERAL (
         SELECT
           COUNT(*) FILTER (
             WHERE n.title ILIKE ('%' || token || '%')
           ) AS title_token_matches,
           COUNT(*) FILTER (
             WHERE n.content_text ILIKE ('%' || token || '%')
           ) AS content_token_matches,
           COUNT(*) FILTER (
             WHERE n.title ILIKE ('%' || token || '%')
                OR n.content_text ILIKE ('%' || token || '%')
           ) AS total_token_matches,
           CARDINALITY($2::text[]) AS token_count
         FROM UNNEST($2::text[]) AS t(token)
       ) rank_data
       WHERE n.user_id = $1
         AND n.trashed_at IS NULL
         AND n.id IN (SELECT id FROM scope)
         AND rank_data.total_token_matches > 0
       ORDER BY
         CASE
           WHEN norm.normalized_title = $3 THEN 1
           ELSE 0
         END DESC,
         CASE
           WHEN norm.normalized_title LIKE ('%' || $3 || '%')
             OR norm.normalized_content LIKE ('%' || $3 || '%') THEN 1
           ELSE 0
         END DESC,
         CASE
           WHEN rank_data.total_token_matches = rank_data.token_count THEN 1
           ELSE 0
         END DESC,
         rank_data.title_token_matches DESC,
         rank_data.content_token_matches DESC,
         rank_data.total_token_matches DESC,
         n.updated_at DESC
       LIMIT $5`,
      [userId, tokens, normalizedQuery, rootNoteId, limit]
    );
    return result.rows;
  }

  const result = await pool.query(
    `SELECT n.id, n.title, n.parent_id, n.content_text, n.updated_at
     FROM notes n
     CROSS JOIN LATERAL (
       SELECT
         REGEXP_REPLACE(REPLACE(LOWER(n.title), '-', ' '), '\\s+', ' ', 'g') AS normalized_title,
         REGEXP_REPLACE(REPLACE(LOWER(n.content_text), '-', ' '), '\\s+', ' ', 'g') AS normalized_content
     ) norm
     CROSS JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (
           WHERE n.title ILIKE ('%' || token || '%')
         ) AS title_token_matches,
         COUNT(*) FILTER (
           WHERE n.content_text ILIKE ('%' || token || '%')
         ) AS content_token_matches,
         COUNT(*) FILTER (
           WHERE n.title ILIKE ('%' || token || '%')
              OR n.content_text ILIKE ('%' || token || '%')
         ) AS total_token_matches,
         CARDINALITY($2::text[]) AS token_count
       FROM UNNEST($2::text[]) AS t(token)
     ) rank_data
     WHERE n.user_id = $1
       AND n.trashed_at IS NULL
       AND rank_data.total_token_matches > 0
     ORDER BY
       CASE
         WHEN norm.normalized_title = $3 THEN 1
         ELSE 0
       END DESC,
       CASE
         WHEN norm.normalized_title LIKE ('%' || $3 || '%')
           OR norm.normalized_content LIKE ('%' || $3 || '%') THEN 1
         ELSE 0
       END DESC,
       CASE
         WHEN rank_data.total_token_matches = rank_data.token_count THEN 1
         ELSE 0
       END DESC,
       rank_data.title_token_matches DESC,
       rank_data.content_token_matches DESC,
       rank_data.total_token_matches DESC,
       n.updated_at DESC
     LIMIT $4`,
    [userId, tokens, normalizedQuery, limit]
  );
  return result.rows;
}

export async function getAllTrashedNotes(userId: string): Promise<NoteListItem[]> {
  const result = await pool.query(
    `SELECT id, title, parent_id, sort_order, updated_at, is_favorite, last_visited_at,
            trashed_at, trashed_root_id
     FROM notes
     WHERE user_id = $1 AND trashed_at IS NOT NULL
     ORDER BY trashed_at DESC, updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getNoteById(
  id: string,
  userId: string
): Promise<Note | null> {
  const result = await pool.query(
    `SELECT id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at
     FROM notes
     WHERE id = $1 AND user_id = $2 AND trashed_at IS NULL`,
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function getNoteByIdIncludingTrashed(
  id: string,
  userId: string
): Promise<NoteRecord | null> {
  const result = await pool.query(
    `SELECT id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at,
            sort_order, is_favorite, last_visited_at, trashed_at, trashed_root_id
     FROM notes
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function getTrashNoteById(
  id: string,
  userId: string
): Promise<NoteRecord | null> {
  const result = await pool.query(
    `SELECT id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at,
            sort_order, is_favorite, last_visited_at, trashed_at, trashed_root_id
     FROM notes
     WHERE id = $1 AND user_id = $2 AND trashed_at IS NOT NULL`,
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function createNote(
  userId: string,
  title: string,
  richContent: unknown,
  contentText: string,
  parentId: string | null = null
): Promise<Note> {
  const result = await pool.query(
    `INSERT INTO notes (user_id, title, rich_content, content_text, parent_id)
     VALUES ($1, $2, $3::jsonb, $4, $5)
     RETURNING id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at`,
    [userId, title, JSON.stringify(richContent), contentText, parentId]
  );
  return result.rows[0];
}

export async function updateNote(
  id: string,
  userId: string,
  title: string,
  richContent: unknown,
  contentText: string,
  parentId: string | null | undefined = undefined
): Promise<Note | null> {
  const richContentJson = JSON.stringify(richContent);

  if (parentId !== undefined) {
    const result = await pool.query(
      `UPDATE notes
       SET title = $1, rich_content = $2::jsonb, content_text = $3, parent_id = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6 AND trashed_at IS NULL
       RETURNING id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at`,
      [title, richContentJson, contentText, parentId, id, userId]
    );
    return result.rows[0] || null;
  }

  const result = await pool.query(
    `UPDATE notes
     SET title = $1, rich_content = $2::jsonb, content_text = $3, updated_at = NOW()
     WHERE id = $4 AND user_id = $5 AND trashed_at IS NULL
     RETURNING id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at`,
    [title, richContentJson, contentText, id, userId]
  );
  return result.rows[0] || null;
}

export async function updateNoteParentAndSortOrder(
  id: string,
  userId: string,
  parentId: string | null,
  sortOrder: number
): Promise<Note | null> {
  const result = await pool.query(
    `UPDATE notes
     SET parent_id = $1, sort_order = $2, updated_at = NOW()
     WHERE id = $3 AND user_id = $4 AND trashed_at IS NULL
     RETURNING id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at`,
    [parentId, sortOrder, id, userId]
  );
  return result.rows[0] || null;
}

export async function trashSubtree(
  noteId: string,
  userId: string,
  trashedAt: Date
): Promise<string[]> {
  const result = await pool.query(
    `WITH RECURSIVE subtree AS (
       SELECT id
       FROM notes
       WHERE id = $1 AND user_id = $2 AND trashed_at IS NULL
       UNION ALL
       SELECT n.id
       FROM notes n
       JOIN subtree s ON n.parent_id = s.id
       WHERE n.user_id = $2 AND n.trashed_at IS NULL
     )
     UPDATE notes
     SET trashed_at = $3,
         trashed_root_id = $1,
         updated_at = NOW()
     WHERE id IN (SELECT id FROM subtree)
     RETURNING id`,
    [noteId, userId, trashedAt]
  );
  return result.rows.map((row) => row.id as string);
}

export async function restoreTrashedSubtree(
  noteId: string,
  userId: string,
  newParentId: string | null,
  sortOrder: number
): Promise<string[]> {
  const result = await pool.query(
    `WITH RECURSIVE target AS (
       SELECT id, trashed_root_id
       FROM notes
       WHERE id = $1 AND user_id = $2 AND trashed_at IS NOT NULL
     ),
     subtree AS (
       SELECT id
       FROM target
       UNION ALL
       SELECT n.id
       FROM notes n
       JOIN subtree s ON n.parent_id = s.id
       JOIN target t ON TRUE
       WHERE n.user_id = $2
         AND n.trashed_at IS NOT NULL
         AND n.trashed_root_id = t.trashed_root_id
     )
     UPDATE notes
     SET trashed_at = NULL,
         trashed_root_id = NULL,
         parent_id = CASE WHEN id = $1 THEN $3 ELSE parent_id END,
         sort_order = CASE WHEN id = $1 THEN $4 ELSE sort_order END,
         updated_at = NOW()
     WHERE id IN (SELECT id FROM subtree)
     RETURNING id`,
    [noteId, userId, newParentId, sortOrder]
  );
  return result.rows.map((row) => row.id as string);
}

export async function permanentlyDeleteTrashedSubtree(
  noteId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM notes
     WHERE id = $1 AND user_id = $2 AND trashed_at IS NOT NULL`,
    [noteId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function purgeExpiredTrash(
  userId: string,
  expireBefore: Date
): Promise<number> {
  const result = await pool.query(
    `DELETE FROM notes
     WHERE user_id = $1
       AND id = trashed_root_id
       AND trashed_at IS NOT NULL
       AND trashed_at < $2`,
    [userId, expireBefore]
  );
  return result.rowCount ?? 0;
}

export async function getNextSortOrder(
  userId: string,
  parentId: string | null
): Promise<number> {
  const result = await pool.query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
     FROM notes
     WHERE user_id = $1
       AND parent_id IS NOT DISTINCT FROM $2
       AND trashed_at IS NULL`,
    [userId, parentId]
  );
  return Number(result.rows[0]?.next_sort_order ?? 0);
}

export async function getDescendantIds(
  noteId: string,
  userId: string
): Promise<string[]> {
  const result = await pool.query(
    `WITH RECURSIVE descendants AS (
       SELECT id
       FROM notes
       WHERE parent_id = $1 AND user_id = $2 AND trashed_at IS NULL
       UNION ALL
       SELECT n.id
       FROM notes n
       JOIN descendants d ON n.parent_id = d.id
       WHERE n.user_id = $2 AND n.trashed_at IS NULL
     )
     SELECT id FROM descendants`,
    [noteId, userId]
  );
  return result.rows.map((r) => r.id);
}

/** Descendants of root, ordered by depth, sort_order, id (breadth-first, deterministic). */
export async function getDescendantIdsOrdered(
  rootNoteId: string,
  userId: string
): Promise<string[]> {
  const result = await pool.query(
    `WITH RECURSIVE tree AS (
       SELECT id, 1 AS depth, COALESCE(sort_order, 0) AS sort_order
       FROM notes
       WHERE parent_id = $1 AND user_id = $2 AND trashed_at IS NULL
       UNION ALL
       SELECT n.id, t.depth + 1, COALESCE(n.sort_order, 0)
       FROM notes n
       JOIN tree t ON n.parent_id = t.id
       WHERE n.user_id = $2 AND n.trashed_at IS NULL
     )
     SELECT id FROM tree ORDER BY depth, sort_order, id`,
    [rootNoteId, userId]
  );
  return result.rows.map((r) => r.id);
}

export async function getChildrenByParent(
  userId: string,
  parentId: string | null
): Promise<{ id: string }[]> {
  const result = await pool.query(
    `SELECT id
     FROM notes
     WHERE user_id = $1
       AND parent_id IS NOT DISTINCT FROM $2
       AND trashed_at IS NULL
     ORDER BY sort_order ASC, updated_at DESC`,
    [userId, parentId]
  );
  return result.rows;
}

export async function updateNoteFavorite(
  id: string,
  userId: string,
  isFavorite: boolean
): Promise<Note | null> {
  const result = await pool.query(
    `UPDATE notes
     SET is_favorite = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3 AND trashed_at IS NULL
     RETURNING id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at`,
    [isFavorite, id, userId]
  );
  return result.rows[0] || null;
}

export async function updateNoteLastVisited(
  id: string,
  userId: string
): Promise<Note | null> {
  const result = await pool.query(
    `UPDATE notes
     SET last_visited_at = NOW()
     WHERE id = $1 AND user_id = $2 AND trashed_at IS NULL
     RETURNING id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at`,
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function updateSortOrdersForSiblings(
  userId: string,
  parentId: string | null,
  orderedIds: string[]
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(
      `UPDATE notes
       SET sort_order = $1, updated_at = NOW()
       WHERE id = $2
         AND user_id = $3
         AND parent_id IS NOT DISTINCT FROM $4
         AND trashed_at IS NULL`,
      [i, orderedIds[i], userId, parentId]
    );
  }
}
