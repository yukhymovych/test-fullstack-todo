import * as notesSQL from './notes.sql.js';
import { CreateNoteInput, UpdateNoteInput } from './notes.schemas.js';

function extractContentText(richContent: unknown): string {
  if (!Array.isArray(richContent)) return '';
  const texts: string[] = [];
  function walk(obj: unknown): void {
    if (obj === null || obj === undefined) return;
    if (typeof obj === 'string') {
      texts.push(obj);
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    if (typeof obj === 'object') {
      const o = obj as Record<string, unknown>;
      if ('text' in o && typeof o.text === 'string') {
        texts.push(o.text);
      }
      if ('content' in o) walk(o.content);
      if ('children' in o) walk(o.children);
      if (Array.isArray(o.content)) {
        o.content.forEach((c: unknown) => {
          if (c && typeof c === 'object' && 'text' in (c as object)) {
            const t = (c as { text: string }).text;
            if (typeof t === 'string') texts.push(t);
          }
        });
      }
    }
  }
  walk(richContent);
  return texts.join(' ').trim();
}

export async function getAllNotes(userId: string) {
  return notesSQL.getAllNotes(userId);
}

export async function getNoteById(id: string, userId: string) {
  return notesSQL.getNoteById(id, userId);
}

export async function createNote(userId: string, input: CreateNoteInput) {
  const contentText = extractContentText(input.rich_content);
  const title = input.title || 'Untitled';
  return notesSQL.createNote(userId, title, input.rich_content, contentText);
}

export async function updateNote(
  id: string,
  userId: string,
  input: UpdateNoteInput
) {
  const contentText = extractContentText(input.rich_content);
  const title = input.title ?? '';
  return notesSQL.updateNote(
    id,
    userId,
    title,
    input.rich_content,
    contentText
  );
}

export async function deleteNote(id: string, userId: string) {
  return notesSQL.deleteNote(id, userId);
}
