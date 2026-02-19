import { pool } from '../../db/pool.js';

export interface NoteEmbedItem {
  id: string;
  title: string;
  updated_at: Date;
}

/** Returns only IDs that exist in notes and belong to the user */
export async function filterValidEmbeddedIds(
  userId: string,
  embeddedIds: string[]
): Promise<string[]> {
  if (embeddedIds.length === 0) return [];
  const uniqueIds = [...new Set(embeddedIds)].filter(
    (id) => typeof id === 'string' && id.length > 0
  );
  if (uniqueIds.length === 0) return [];
  const result = await pool.query(
    'SELECT id FROM notes WHERE user_id = $1 AND id = ANY($2)',
    [userId, uniqueIds]
  );
  return result.rows.map((r) => r.id);
}

export async function replaceNoteEmbeds(
  userId: string,
  hostNoteId: string,
  embeddedIds: string[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM note_embeds WHERE user_id = $1 AND host_note_id = $2',
      [userId, hostNoteId]
    );
    const uniqueIds = [...new Set(embeddedIds)];
    if (uniqueIds.length > 0) {
      const values = uniqueIds
        .map((_, i) => `($1, $2, $${i + 3}, NOW())`)
        .join(', ');
      const params = [userId, hostNoteId, ...uniqueIds];
      await client.query(
        `INSERT INTO note_embeds (user_id, host_note_id, embedded_note_id, created_at)
         VALUES ${values}`,
        params
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Replace embeds using an existing DB client (for transactions). */
export async function replaceNoteEmbedsWithClient(
  client: { query: (q: string, p?: unknown[]) => Promise<{ rows: unknown[] }> },
  userId: string,
  hostNoteId: string,
  embeddedIds: string[]
): Promise<void> {
  await client.query(
    'DELETE FROM note_embeds WHERE user_id = $1 AND host_note_id = $2',
    [userId, hostNoteId]
  );
  const uniqueIds = [...new Set(embeddedIds)];
  if (uniqueIds.length > 0) {
    const values = uniqueIds
      .map((_, i) => `($1, $2, $${i + 3}, NOW())`)
      .join(', ');
    const params = [userId, hostNoteId, ...uniqueIds];
    await client.query(
      `INSERT INTO note_embeds (user_id, host_note_id, embedded_note_id, created_at)
       VALUES ${values}`,
      params
    );
  }
}

export async function getNoteEmbeds(
  userId: string,
  hostNoteId: string
): Promise<NoteEmbedItem[]> {
  const result = await pool.query(
    `SELECT n.id, n.title, n.updated_at
     FROM note_embeds ne
     JOIN notes n ON n.id = ne.embedded_note_id AND n.user_id = ne.user_id
     WHERE ne.user_id = $1 AND ne.host_note_id = $2
     ORDER BY ne.created_at ASC`,
    [userId, hostNoteId]
  );
  return result.rows;
}
