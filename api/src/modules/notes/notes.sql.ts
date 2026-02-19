import { pool } from '../../db/pool.js';

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

export interface NoteListItem {
  id: string;
  title: string;
  parent_id?: string | null;
  sort_order?: number;
  updated_at: Date;
}

export async function getAllNotes(userId: string): Promise<NoteListItem[]> {
  const result = await pool.query(
    'SELECT id, title, parent_id, sort_order, updated_at FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  return result.rows;
}

export async function getNoteById(
  id: string,
  userId: string
): Promise<Note | null> {
  const result = await pool.query(
    'SELECT id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at FROM notes WHERE id = $1 AND user_id = $2',
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
  // Stringify the richContent for PostgreSQL JSONB
  const richContentJson = JSON.stringify(richContent);
  
  if (parentId !== undefined) {
    const result = await pool.query(
      `UPDATE notes SET title = $1, rich_content = $2::jsonb, content_text = $3, parent_id = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at`,
      [title, richContentJson, contentText, parentId, id, userId]
    );
    return result.rows[0] || null;
  }
  const result = await pool.query(
    `UPDATE notes SET title = $1, rich_content = $2::jsonb, content_text = $3, updated_at = NOW()
     WHERE id = $4 AND user_id = $5
     RETURNING id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at`,
    [title, richContentJson, contentText, id, userId]
  );
  return result.rows[0] || null;
}

export async function deleteNote(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM notes WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateNoteParentAndSortOrder(
  id: string,
  userId: string,
  parentId: string | null,
  sortOrder: number
): Promise<Note | null> {
  const result = await pool.query(
    `UPDATE notes SET parent_id = $1, sort_order = $2, updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING id, user_id, title, parent_id, rich_content, content_text, created_at, updated_at`,
    [parentId, sortOrder, id, userId]
  );
  return result.rows[0] || null;
}

export async function getDescendantIds(
  noteId: string,
  userId: string
): Promise<string[]> {
  const result = await pool.query(
    `WITH RECURSIVE descendants AS (
      SELECT id FROM notes WHERE parent_id = $1 AND user_id = $2
      UNION ALL
      SELECT n.id FROM notes n
      JOIN descendants d ON n.parent_id = d.id AND n.user_id = $2
    )
    SELECT id FROM descendants`,
    [noteId, userId]
  );
  return result.rows.map((r) => r.id);
}

export async function getChildrenByParent(
  userId: string,
  parentId: string | null
): Promise<{ id: string }[]> {
  const result = await pool.query(
    `SELECT id FROM notes
     WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2
     ORDER BY sort_order ASC, updated_at DESC`,
    [userId, parentId]
  );
  return result.rows;
}

export async function updateSortOrdersForSiblings(
  userId: string,
  parentId: string | null,
  orderedIds: string[]
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(
      `UPDATE notes SET sort_order = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND parent_id IS NOT DISTINCT FROM $4`,
      [i, orderedIds[i], userId, parentId]
    );
  }
}
