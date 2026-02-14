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
  rich_content?: unknown;
}): Promise<Note> {
  return http.post<Note>('/notes', {
    title: payload.title ?? 'Untitled',
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
