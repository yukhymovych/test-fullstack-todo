export function resolveRestoreParentId(
  originalParentId: string | null | undefined,
  parent: { id: string; trashed_at: Date | null } | null
): string | null {
  if (!originalParentId) {
    return null;
  }

  if (!parent) {
    return null;
  }

  return parent.trashed_at === null ? parent.id : null;
}

export function buildTrashSubtreeNoteIds(
  rootNoteId: string,
  descendantIds: string[]
): string[] {
  const uniqueIds = new Set([rootNoteId, ...descendantIds]);
  return [...uniqueIds];
}

export function getTrashExpiryCutoff(
  now: Date,
  retentionDays: number
): Date {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - retentionDays * millisecondsPerDay);
}
