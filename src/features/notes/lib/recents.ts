import type { NoteListItem } from '../model/types';

/**
 * Returns last N visited notes, ordered from latest to earliest by last_visited_at.
 * Pure function - no side effects.
 */
export function getRecentNotes(
  notes: NoteListItem[] | undefined,
  limit = 15
): NoteListItem[] {
  if (!notes) return [];

  const recentWindow = notes
    .filter(
      (n): n is NoteListItem & { last_visited_at: string } =>
        typeof n.last_visited_at === 'string'
    )
    .map((n) => ({
      note: n,
      ts: new Date(n.last_visited_at).getTime(),
    }))
    .filter((entry) => Number.isFinite(entry.ts))
    .sort((a, b) => {
      if (a.ts !== b.ts) return b.ts - a.ts;
      return a.note.id.localeCompare(b.note.id);
    })
    .slice(0, limit);

  return recentWindow.map((entry) => entry.note);
}
