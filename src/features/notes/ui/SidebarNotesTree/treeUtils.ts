import type { NoteListItem } from '../../model/types';

export type NoteItem = NoteListItem;

export interface TreeMaps {
  byId: Map<string, NoteItem>;
  childrenByParent: Map<string | null, string[]>;
}

export function buildMaps(notes: NoteItem[]): TreeMaps {
  const byId = new Map<string, NoteItem>();
  const childrenByParent = new Map<string | null, string[]>();

  for (const n of notes) {
    byId.set(n.id, n);
  }

  for (const n of notes) {
    const pid = n.parent_id ?? null;
    const arr = childrenByParent.get(pid) ?? [];
    arr.push(n.id);
    childrenByParent.set(pid, arr);
  }

  // Sort children by sort_order ASC, then by id (stable tiebreaker).
  // Using updated_at as tiebreaker caused positions to jump when switching between
  // siblings, since the editor triggers saves on mount which update updated_at.
  for (const [, ids] of childrenByParent) {
    ids.sort((a, b) => {
      const na = byId.get(a)!;
      const nb = byId.get(b)!;
      const sortA = na.sort_order ?? 0;
      const sortB = nb.sort_order ?? 0;
      if (sortA !== sortB) return sortA - sortB;
      return a.localeCompare(b);
    });
  }

  return { byId, childrenByParent };
}

