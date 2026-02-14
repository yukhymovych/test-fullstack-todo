import { pool } from '../../db/pool.js';

export interface Note {
  id: string;
  user_id: string;
  title: string;
  rich_content: unknown;
  content_text: string;
  created_at: Date;
  updated_at: Date;
}

export interface NoteListItem {
  id: string;
  title: string;
  updated_at: Date;
}

export async function getAllNotes(userId: string): Promise<NoteListItem[]> {
  const result = await pool.query(
    'SELECT id, title, updated_at FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  return result.rows;
}

export async function getNoteById(
  id: string,
  userId: string
): Promise<Note | null> {
  const result = await pool.query(
    'SELECT id, user_id, title, rich_content, content_text, created_at, updated_at FROM notes WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function createNote(
  userId: string,
  title: string,
  richContent: unknown,
  contentText: string
): Promise<Note> {
  const result = await pool.query(
    `INSERT INTO notes (user_id, title, rich_content, content_text)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, title, rich_content, content_text, created_at, updated_at`,
    [userId, title, JSON.stringify(richContent), contentText]
  );
  return result.rows[0];
}

export async function updateNote(
  id: string,
  userId: string,
  title: string,
  richContent: unknown,
  contentText: string
): Promise<Note | null> {
  const result = await pool.query(
    `UPDATE notes SET title = $1, rich_content = $2, content_text = $3, updated_at = NOW()
     WHERE id = $4 AND user_id = $5
     RETURNING id, user_id, title, rich_content, content_text, created_at, updated_at`,
    [title, JSON.stringify(richContent), contentText, id, userId]
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
