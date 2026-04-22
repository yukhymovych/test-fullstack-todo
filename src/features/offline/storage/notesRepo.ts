import { getOfflineDb } from './db';
import type { AccountKey, CachedNote } from '../domain/offline.types';

export async function getNote(
  accountKey: AccountKey,
  id: string
): Promise<CachedNote | null> {
  const db = getOfflineDb();
  return (await db.cachedNotes.get([accountKey, id])) ?? null;
}

export async function getAllNotes(
  accountKey: AccountKey
): Promise<CachedNote[]> {
  const db = getOfflineDb();
  return await db.cachedNotes.where({ accountKey }).toArray();
}

export async function countNotes(accountKey: AccountKey): Promise<number> {
  const db = getOfflineDb();
  return await db.cachedNotes.where({ accountKey }).count();
}

export async function bulkPutNotes(notes: CachedNote[]): Promise<void> {
  if (notes.length === 0) return;
  const db = getOfflineDb();
  await db.cachedNotes.bulkPut(notes);
}

export async function deleteNotes(
  accountKey: AccountKey,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const db = getOfflineDb();
  await db.cachedNotes.bulkDelete(ids.map((id) => [accountKey, id] as const));
}

export async function deleteAllNotes(accountKey: AccountKey): Promise<void> {
  const db = getOfflineDb();
  await db.cachedNotes.where({ accountKey }).delete();
}

export async function getChildrenIds(
  accountKey: AccountKey,
  parentId: string | null
): Promise<string[]> {
  const db = getOfflineDb();
  const rows = await db.cachedNotes
    .where('[accountKey+parent_id]')
    .equals([accountKey, parentId as unknown as string])
    .toArray();
  return rows.map((n) => n.id);
}
