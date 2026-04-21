import { getOfflineDb } from './db';
import type { AccountKey, CachedStudyItem } from '../domain/offline.types';

export async function getStudyByNote(
  accountKey: AccountKey,
  noteId: string
): Promise<CachedStudyItem | null> {
  const db = getOfflineDb();
  return (await db.cachedStudy.get([accountKey, noteId])) ?? null;
}

export async function bulkPutStudy(rows: CachedStudyItem[]): Promise<void> {
  if (rows.length === 0) return;
  const db = getOfflineDb();
  await db.cachedStudy.bulkPut(rows);
}

export async function replaceAllStudy(
  accountKey: AccountKey,
  rows: CachedStudyItem[]
): Promise<void> {
  const db = getOfflineDb();
  await db.transaction('rw', db.cachedStudy, async () => {
    const existing = await db.cachedStudy.where({ accountKey }).toArray();
    await db.cachedStudy.bulkDelete(
      existing.map((r) => [r.accountKey, r.noteId] as const)
    );
    if (rows.length > 0) await db.cachedStudy.bulkPut(rows);
  });
}

export async function deleteStudyForNotes(
  accountKey: AccountKey,
  noteIds: string[]
): Promise<void> {
  if (noteIds.length === 0) return;
  const db = getOfflineDb();
  await db.cachedStudy.bulkDelete(
    noteIds.map((id) => [accountKey, id] as const)
  );
}

export async function deleteAllStudy(accountKey: AccountKey): Promise<void> {
  const db = getOfflineDb();
  const rows = await db.cachedStudy.where({ accountKey }).toArray();
  await db.cachedStudy.bulkDelete(
    rows.map((r) => [r.accountKey, r.noteId] as const)
  );
}
