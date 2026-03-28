import type { TrashNoteListItem } from '../model/trash.types';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function isTrashRoot(note: Pick<TrashNoteListItem, 'id' | 'trashed_root_id'>): boolean {
  return note.trashed_root_id === note.id;
}

export function getTrashDaysRemaining(
  trashedAtIso: string,
  retentionDays: number,
  now = new Date()
): number {
  const trashedAt = new Date(trashedAtIso).getTime();
  if (!Number.isFinite(trashedAt)) {
    return retentionDays;
  }

  const elapsedDays = Math.floor((now.getTime() - trashedAt) / MILLISECONDS_PER_DAY);
  return Math.max(0, retentionDays - elapsedDays);
}

export function isNoteInSubtree(
  rootId: string,
  targetId: string,
  childrenByParent: Map<string | null, string[]>
): boolean {
  if (rootId === targetId) {
    return true;
  }

  const pending = [...(childrenByParent.get(rootId) ?? [])];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) {
      continue;
    }

    if (current === targetId) {
      return true;
    }

    visited.add(current);
    pending.push(...(childrenByParent.get(current) ?? []));
  }

  return false;
}
