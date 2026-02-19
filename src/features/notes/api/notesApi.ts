import { http } from '../../../shared/api/http';
import type { Note, NoteListItem } from '../model/types';

export async function getNotes(): Promise<NoteListItem[]> {
  return http.get<NoteListItem[]>('/notes');
}

export async function getNote(id: string): Promise<Note> {
  return http.get<Note>(`/notes/${id}`);
}

export async function createNote(payload: {
  title?: string;
  parent_id?: string | null;
  rich_content?: unknown;
}): Promise<Note> {
  return http.post<Note>('/notes', {
    title: payload.title ?? 'Untitled',
    parent_id: payload.parent_id ?? undefined,
    rich_content: payload.rich_content ?? [{ type: 'paragraph', content: [] }],
  });
}

export async function updateNote(
  id: string,
  payload: { title: string; rich_content: unknown }
): Promise<Note> {
  return http.put<Note>(`/notes/${id}`, payload);
}

export async function deleteNote(id: string): Promise<void> {
  return http.delete<void>(`/notes/${id}`);
}

export async function getNoteEmbeds(noteId: string): Promise<NoteListItem[]> {
  return http.get<NoteListItem[]>(`/notes/${noteId}/embeds`);
}

export interface MoveNotePayload {
  new_parent_id: string | null;
  position?: number;
}

export async function moveNote(
  id: string,
  payload: MoveNotePayload
): Promise<Note> {
  return http.patch<Note>(`/notes/${id}/move`, payload);
}
