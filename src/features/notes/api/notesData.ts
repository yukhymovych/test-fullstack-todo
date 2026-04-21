import * as notesApi from './notesApi';
import type { Note, NoteListItem } from '../model/types';
import type { TrashNote, TrashNoteListItem } from '../model/trash.types';
import { isOfflineMode } from '@/features/offline/sync/appModeRef';
import { getCurrentAccountKey } from '@/features/offline/sync/currentAccount';
import {
  getAllNotes as getAllCachedNotes,
  getNote as getCachedNote,
} from '@/features/offline/storage/notesRepo';
import { assertWritable } from '@/features/offline/domain/readOnlyGuard';
import type { CachedNote } from '@/features/offline/domain/offline.types';
import { applyMutationPatch } from '@/features/offline/sync/patchLocalCache';

/**
 * Data facade. Reads transparently switch between the online API and the
 * local offline cache based on the current app mode. Mutations are not
 * allowed in offline mode and are additionally guarded at the http layer.
 */

function toListItem(c: CachedNote): NoteListItem {
  return {
    id: c.id,
    title: c.title,
    updated_at: c.updated_at,
    parent_id: c.parent_id,
    sort_order: c.sort_order,
    is_favorite: c.is_favorite,
    last_visited_at: c.last_visited_at,
  };
}

function toNote(c: CachedNote): Note {
  return {
    id: c.id,
    title: c.title,
    parent_id: c.parent_id,
    rich_content: c.rich_content,
    content_text: c.plain_text,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

export async function getNotes(): Promise<NoteListItem[]> {
  if (isOfflineMode()) {
    const accountKey = getCurrentAccountKey();
    if (!accountKey) return [];
    const all = await getAllCachedNotes(accountKey);
    return all.map(toListItem);
  }
  return notesApi.getNotes();
}

export async function getTrashNotes(): Promise<TrashNoteListItem[]> {
  if (isOfflineMode()) return [];
  return notesApi.getTrashNotes();
}

export async function getNote(id: string): Promise<Note> {
  if (isOfflineMode()) {
    const accountKey = getCurrentAccountKey();
    const cached = accountKey ? await getCachedNote(accountKey, id) : null;
    if (!cached) {
      throw new Error('Note not cached offline');
    }
    return toNote(cached);
  }
  return notesApi.getNote(id);
}

export async function getTrashNote(id: string): Promise<TrashNote> {
  assertWritable(isOfflineMode());
  return notesApi.getTrashNote(id);
}

export async function createNote(payload: {
  title?: string;
  parent_id?: string | null;
  rich_content?: unknown;
}): Promise<Note> {
  assertWritable(isOfflineMode());
  const created = await notesApi.createNote(payload);
  await applyMutationPatch({
    upsertedNote: toNoteDtoFromNote(created),
  });
  return created;
}

export async function updateNote(
  id: string,
  payload: { title: string; rich_content: unknown }
): Promise<Note> {
  assertWritable(isOfflineMode());
  const updated = await notesApi.updateNote(id, payload);
  await applyMutationPatch({ upsertedNote: toNoteDtoFromNote(updated) });
  return updated;
}

export async function trashNote(id: string): Promise<void> {
  assertWritable(isOfflineMode());
  await notesApi.trashNote(id);
  await applyMutationPatch({ deletedNoteIds: [id] });
}

export async function restoreNote(id: string): Promise<Note> {
  assertWritable(isOfflineMode());
  const restored = await notesApi.restoreNote(id);
  await applyMutationPatch({ upsertedNote: toNoteDtoFromNote(restored) });
  return restored;
}

export async function permanentlyDeleteNote(id: string): Promise<void> {
  assertWritable(isOfflineMode());
  await notesApi.permanentlyDeleteNote(id);
  await applyMutationPatch({ deletedNoteIds: [id] });
}

export async function setNoteFavorite(
  id: string,
  isFavorite: boolean
): Promise<Note> {
  assertWritable(isOfflineMode());
  const updated = await notesApi.setNoteFavorite(id, isFavorite);
  await applyMutationPatch({ upsertedNote: toNoteDtoFromNote(updated) });
  return updated;
}

export async function updateNoteLastVisited(id: string): Promise<Note> {
  if (isOfflineMode()) {
    return getNote(id);
  }
  const updated = await notesApi.updateNoteLastVisited(id);
  await applyMutationPatch({ upsertedNote: toNoteDtoFromNote(updated) });
  return updated;
}

export async function getNoteEmbeds(noteId: string): Promise<NoteListItem[]> {
  if (isOfflineMode()) {
    // Offline: derive from cached notes via parent/children isn't accurate;
    // note embeds require a reverse index that isn't cached. Return empty.
    return [];
  }
  return notesApi.getNoteEmbeds(noteId);
}

export async function moveNote(
  id: string,
  payload: notesApi.MoveNotePayload
): Promise<Note> {
  assertWritable(isOfflineMode());
  const updated = await notesApi.moveNote(id, payload);
  await applyMutationPatch({ upsertedNote: toNoteDtoFromNote(updated) });
  return updated;
}

function toNoteDtoFromNote(n: Note) {
  return {
    id: n.id,
    parent_id: n.parent_id ?? null,
    title: n.title,
    rich_content: n.rich_content,
    content_text: n.content_text,
    sort_order: 0,
    is_favorite: false,
    last_visited_at: null,
    created_at: n.created_at,
    updated_at: n.updated_at,
  };
}
