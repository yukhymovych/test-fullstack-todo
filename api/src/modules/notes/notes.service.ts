import * as notesSQL from './notes.sql.js';
import * as noteEmbedsSQL from './noteEmbeds.sql.js';
import { CreateNoteInput, UpdateNoteInput, MoveNoteInput, SetFavoriteInput } from './notes.schemas.js';
import {
  buildTrashSubtreeNoteIds,
  getTrashExpiryCutoff,
  resolveRestoreParentId,
} from './trash.logic.js';
import { extractContentText, extractEmbeddedNoteIds } from './notes.content.js';

type BlockLike = { type?: string; props?: { noteId?: string }; content?: unknown[] };

async function purgeExpiredTrashIfNeeded(userId: string): Promise<void> {
  const expireBefore = getTrashExpiryCutoff(
    new Date(),
    notesSQL.TRASH_RETENTION_DAYS
  );
  await notesSQL.purgeExpiredTrash(userId, expireBefore);
}

function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSearchQuery(normalizedQuery: string): string[] {
  if (!normalizedQuery) return [];
  const parts = normalizedQuery.split(' ').filter(Boolean);
  return [...new Set(parts)];
}

const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'with',
  'are',
  'was',
  'were',
  'but',
  'not',
  'you',
  'your',
  'our',
  'their',
  'й',
  'та',
  'або',
  'але',
  'в',
  'у',
  'на',
  'до',
  'за',
  'із',
  'з',
  'це',
  'як',
  'не',
  'що',
  'де',
]);

function toMeaningfulTokens(tokens: string[]): string[] {
  return tokens.filter((token) => token.length >= 3 && !SEARCH_STOP_WORDS.has(token));
}

export async function getAllNotes(userId: string) {
  await purgeExpiredTrashIfNeeded(userId);
  return notesSQL.getAllNotes(userId);
}

export async function getNoteById(id: string, userId: string) {
  await purgeExpiredTrashIfNeeded(userId);
  return notesSQL.getNoteById(id, userId);
}

export async function getAllTrashedNotes(userId: string) {
  await purgeExpiredTrashIfNeeded(userId);
  return notesSQL.getAllTrashedNotes(userId);
}

export async function getTrashNoteById(id: string, userId: string) {
  await purgeExpiredTrashIfNeeded(userId);
  return notesSQL.getTrashNoteById(id, userId);
}

export async function searchNotes(
  userId: string,
  query: string,
  limit: number,
  rootNoteId?: string
) {
  await purgeExpiredTrashIfNeeded(userId);
  const normalizedQuery = normalizeSearchQuery(query);
  const tokens = tokenizeSearchQuery(normalizedQuery);
  const meaningfulTokens = toMeaningfulTokens(tokens);
  if (tokens.length === 0) {
    return [];
  }
  return notesSQL.searchNotes(
    userId,
    normalizedQuery,
    tokens,
    meaningfulTokens,
    limit,
    rootNoteId
  );
}

export async function createNote(userId: string, input: CreateNoteInput) {
  const contentText = extractContentText(input.rich_content);
  const title = input.title || 'Untitled';
  const parentId =
    input.parent_id !== undefined && input.parent_id !== ''
      ? input.parent_id
      : null;
  const note = await notesSQL.createNote(
    userId,
    title,
    input.rich_content,
    contentText,
    parentId
  );
  const embeddedIds = extractEmbeddedNoteIds(input.rich_content);
  const validIds = await noteEmbedsSQL.filterValidEmbeddedIds(
    userId,
    embeddedIds
  );
  await noteEmbedsSQL.replaceNoteEmbeds(userId, note.id, validIds);
  return note;
}

export async function updateNote(
  id: string,
  userId: string,
  input: UpdateNoteInput
) {
  const contentText = extractContentText(input.rich_content);
  const title = input.title ?? '';
  const parentId = input.parent_id;
  const note = await notesSQL.updateNote(
    id,
    userId,
    title,
    input.rich_content,
    contentText,
    parentId
  );
  if (note) {
    const embeddedIds = extractEmbeddedNoteIds(input.rich_content);
    const validIds = await noteEmbedsSQL.filterValidEmbeddedIds(
      userId,
      embeddedIds
    );
    await noteEmbedsSQL.replaceNoteEmbeds(userId, id, validIds);
  }
  return note;
}

export async function deleteNote(id: string, userId: string) {
  const learningSQL = await import('../learning/learning.sql.js');
  const note = await notesSQL.getNoteById(id, userId);
  if (!note) {
    return false;
  }

  const descendantIds = await notesSQL.getDescendantIds(id, userId);
  const subtreeIds = buildTrashSubtreeNoteIds(id, descendantIds);
  await learningSQL.markSessionItemsUnavailableByNoteIds(subtreeIds);

  const trashedIds = await notesSQL.trashSubtree(id, userId, new Date());
  if (trashedIds.length > 0 && note.parent_id) {
    const parentNote = await notesSQL.getNoteById(note.parent_id, userId);
    if (parentNote && Array.isArray(parentNote.rich_content)) {
      const updatedBlocks = removeEmbeddedBlock(
        parentNote.rich_content as BlockLike[],
        id
      );
      const contentText = extractContentText(updatedBlocks);
      await notesSQL.updateNote(
        note.parent_id,
        userId,
        parentNote.title,
        updatedBlocks,
        contentText,
        undefined
      );
      const embeddedIds = extractEmbeddedNoteIds(updatedBlocks);
      const validIds = await noteEmbedsSQL.filterValidEmbeddedIds(
        userId,
        embeddedIds
      );
      await noteEmbedsSQL.replaceNoteEmbeds(userId, note.parent_id, validIds);
    }
  }
  return trashedIds.length > 0;
}

export async function restoreNote(id: string, userId: string) {
  const note = await notesSQL.getTrashNoteById(id, userId);
  if (!note) {
    return null;
  }

  const parent = note.parent_id
    ? await notesSQL.getNoteByIdIncludingTrashed(note.parent_id, userId)
    : null;
  const restoredParentId = resolveRestoreParentId(note.parent_id, parent);
  const nextSortOrder = await notesSQL.getNextSortOrder(userId, restoredParentId);
  const restoredIds = await notesSQL.restoreTrashedSubtree(
    id,
    userId,
    restoredParentId,
    nextSortOrder
  );

  if (restoredIds.length > 0 && restoredParentId) {
    const parentNote = await notesSQL.getNoteById(restoredParentId, userId);
    if (parentNote && Array.isArray(parentNote.rich_content)) {
      const updatedBlocks = insertEmbeddedBlockAt(
        parentNote.rich_content as BlockLike[],
        id,
        nextSortOrder
      );
      const contentText = extractContentText(updatedBlocks);
      await notesSQL.updateNote(
        restoredParentId,
        userId,
        parentNote.title,
        updatedBlocks,
        contentText,
        undefined
      );
      const embeddedIds = extractEmbeddedNoteIds(updatedBlocks);
      const validIds = await noteEmbedsSQL.filterValidEmbeddedIds(
        userId,
        embeddedIds
      );
      await noteEmbedsSQL.replaceNoteEmbeds(userId, restoredParentId, validIds);
    }
  }

  return restoredIds.length > 0
    ? await notesSQL.getNoteById(id, userId)
    : null;
}

export async function permanentlyDeleteNote(id: string, userId: string) {
  return notesSQL.permanentlyDeleteTrashedSubtree(id, userId);
}

export async function setNoteFavorite(
  id: string,
  userId: string,
  input: SetFavoriteInput
) {
  return notesSQL.updateNoteFavorite(id, userId, input.is_favorite);
}

export async function updateNoteLastVisited(id: string, userId: string) {
  return notesSQL.updateNoteLastVisited(id, userId);
}

export async function getNoteEmbeds(hostNoteId: string, userId: string) {
  return noteEmbedsSQL.getNoteEmbeds(userId, hostNoteId);
}

/** Remove embeddedPage block with given noteId from blocks array. */
function removeEmbeddedBlock(blocks: BlockLike[], noteId: string): BlockLike[] {
  return blocks.filter(
    (b) => !(b?.type === 'embeddedPage' && b?.props?.noteId === noteId)
  );
}

/** Insert embeddedPage block at position (index among embedded blocks). */
function insertEmbeddedBlockAt(
  blocks: BlockLike[],
  noteId: string,
  position: number
): BlockLike[] {
  const embedded = { type: 'embeddedPage' as const, props: { noteId }, content: [] as unknown[] };
  const embeddedIndices: number[] = [];
  blocks.forEach((b, i) => {
    if (b?.type === 'embeddedPage') embeddedIndices.push(i);
  });
  const insertAt =
    position >= embeddedIndices.length
      ? blocks.length
      : embeddedIndices[position] ?? blocks.length;
  const result = [...blocks];
  result.splice(insertAt, 0, embedded);
  return result;
}

/** Reorder embeddedPage blocks to match the given noteId order. */
function reorderEmbeddedBlocks(
  blocks: BlockLike[],
  noteIdOrder: string[]
): BlockLike[] {
  const byNoteId = new Map<string, BlockLike>();
  const nonEmbedded: BlockLike[] = [];
  blocks.forEach((b) => {
    if (b?.type === 'embeddedPage' && b?.props?.noteId) {
      byNoteId.set(b.props.noteId, b);
    } else {
      nonEmbedded.push(b);
    }
  });
  const orderedEmbedded = noteIdOrder
    .map((id) => byNoteId.get(id))
    .filter((b): b is BlockLike => !!b);
  return [...nonEmbedded, ...orderedEmbedded];
}

export async function moveNote(
  noteId: string,
  userId: string,
  input: MoveNoteInput
) {
  const note = await notesSQL.getNoteById(noteId, userId);
  if (!note) return null;

  const newParentId = input.new_parent_id ?? null;
  const position = input.position ?? 0;

  if (newParentId === noteId) {
    throw new Error('Cannot move note into itself');
  }

  const descendantIds = await notesSQL.getDescendantIds(noteId, userId);
  if (newParentId && descendantIds.includes(newParentId)) {
    throw new Error('Cannot move note into its own descendant');
  }

  if (newParentId) {
    const parentExists = await notesSQL.getNoteById(newParentId, userId);
    if (!parentExists) {
      throw new Error('Target parent note not found');
    }
  }

  const oldParentId = note.parent_id;
  const isSameParent = oldParentId === newParentId;

  if (isSameParent) {
    const siblings = await notesSQL.getChildrenByParent(userId, newParentId);
    const siblingIds = siblings.map((s) => s.id);
    const currentIndex = siblingIds.indexOf(noteId);
    if (currentIndex === -1 || currentIndex === position) return note;

    const reordered = [...siblingIds];
    reordered.splice(currentIndex, 1);
    reordered.splice(position, 0, noteId);

    await notesSQL.updateSortOrdersForSiblings(
      userId,
      newParentId,
      reordered
    );

    if (newParentId) {
      const parentNote = await notesSQL.getNoteById(newParentId, userId);
      if (parentNote && Array.isArray(parentNote.rich_content)) {
        const contentText = extractContentText(parentNote.rich_content);
        const updatedBlocks = reorderEmbeddedBlocks(
          parentNote.rich_content as BlockLike[],
          reordered
        );
        await notesSQL.updateNote(
          newParentId,
          userId,
          parentNote.title,
          updatedBlocks,
          contentText,
          undefined
        );
        const embeddedIds = extractEmbeddedNoteIds(updatedBlocks);
        const validIds = await noteEmbedsSQL.filterValidEmbeddedIds(
          userId,
          embeddedIds
        );
        await noteEmbedsSQL.replaceNoteEmbeds(userId, newParentId, validIds);
      }
    }
    return notesSQL.getNoteById(noteId, userId);
  }

  const pool = await import('../../db/pool.js').then((m) => m.pool);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE notes SET parent_id = $1, sort_order = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4 AND trashed_at IS NULL`,
      [newParentId, position, noteId, userId]
    );

    if (oldParentId) {
      const oldResult = await client.query(
        'SELECT title, rich_content FROM notes WHERE id = $1 AND user_id = $2 AND trashed_at IS NULL',
        [oldParentId, userId]
      );
      const oldParent = oldResult.rows[0];
      if (oldParent && Array.isArray(oldParent.rich_content)) {
        const blocks = removeEmbeddedBlock(
          oldParent.rich_content as BlockLike[],
          noteId
        );
        const contentText = extractContentText(blocks);
        await client.query(
          'UPDATE notes SET rich_content = $1::jsonb, content_text = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 AND trashed_at IS NULL',
          [JSON.stringify(blocks), contentText, oldParentId, userId]
        );
        const embeddedIds = extractEmbeddedNoteIds(blocks);
        const validIds = await noteEmbedsSQL.filterValidEmbeddedIds(
          userId,
          embeddedIds
        );
        await noteEmbedsSQL.replaceNoteEmbedsWithClient(
          client,
          userId,
          oldParentId,
          validIds
        );
      }
    }

    if (newParentId) {
      const newResult = await client.query(
        'SELECT title, rich_content FROM notes WHERE id = $1 AND user_id = $2 AND trashed_at IS NULL',
        [newParentId, userId]
      );
      const newParent = newResult.rows[0];
      if (newParent && Array.isArray(newParent.rich_content)) {
        const blocks = insertEmbeddedBlockAt(
          newParent.rich_content as BlockLike[],
          noteId,
          position
        );
        const contentText = extractContentText(blocks);
        await client.query(
          'UPDATE notes SET rich_content = $1::jsonb, content_text = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 AND trashed_at IS NULL',
          [JSON.stringify(blocks), contentText, newParentId, userId]
        );
        const embeddedIds = extractEmbeddedNoteIds(blocks);
        const validIds = await noteEmbedsSQL.filterValidEmbeddedIds(
          userId,
          embeddedIds
        );
        await noteEmbedsSQL.replaceNoteEmbedsWithClient(
          client,
          userId,
          newParentId,
          validIds
        );
      }

      const childrenResult = await client.query(
        'SELECT id FROM notes WHERE user_id = $1 AND parent_id = $2 AND trashed_at IS NULL ORDER BY sort_order ASC, updated_at DESC',
        [userId, newParentId]
      );
      const childIds = childrenResult.rows.map((r) => r.id);
      for (let i = 0; i < childIds.length; i++) {
        await client.query(
          'UPDATE notes SET sort_order = $1 WHERE id = $2 AND user_id = $3 AND trashed_at IS NULL',
          [i, childIds[i], userId]
        );
      }
    }

    await client.query('COMMIT');
    return notesSQL.getNoteById(noteId, userId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
