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

  // Sort children by updated_at DESC
  for (const [, ids] of childrenByParent) {
    ids.sort((a, b) => {
      const na = byId.get(a)!;
      const nb = byId.get(b)!;
      return new Date(nb.updated_at).getTime() - new Date(na.updated_at).getTime();
    });
  }

  return { byId, childrenByParent };
}

/** Walk parent_id upwards until null. Protects against cycles. */
export function getAncestors(noteId: string, byId: Map<string, NoteItem>): string[] {
  const seen = new Set<string>();
  const ancestors: string[] = [];
  let current: NoteItem | undefined = byId.get(noteId);
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    const pid = current.parent_id ?? null;
    if (pid) {
      ancestors.unshift(pid);
      current = byId.get(pid);
    } else {
      break;
    }
  }
  return ancestors;
}
