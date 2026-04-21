import { getOfflineDb } from './db';
import type { AccountKey, CachedQA } from '../domain/offline.types';

export async function getQaByPage(
  accountKey: AccountKey,
  pageId: string
): Promise<CachedQA[]> {
  const db = getOfflineDb();
  return await db.cachedQA
    .where('[accountKey+page_id]')
    .equals([accountKey, pageId])
    .toArray();
}

export async function bulkPutQa(rows: CachedQA[]): Promise<void> {
  if (rows.length === 0) return;
  const db = getOfflineDb();
  await db.cachedQA.bulkPut(rows);
}

export async function deleteQa(
  accountKey: AccountKey,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const db = getOfflineDb();
  await db.cachedQA.bulkDelete(ids.map((id) => [accountKey, id] as const));
}

export async function deleteQaForPages(
  accountKey: AccountKey,
  pageIds: string[]
): Promise<void> {
  if (pageIds.length === 0) return;
  const db = getOfflineDb();
  const ids: string[] = [];
  for (const pageId of pageIds) {
    const rows = await db.cachedQA
      .where('[accountKey+page_id]')
      .equals([accountKey, pageId])
      .toArray();
    ids.push(...rows.map((r) => r.id));
  }
  await deleteQa(accountKey, ids);
}

export async function deleteAllQa(accountKey: AccountKey): Promise<void> {
  const db = getOfflineDb();
  const rows = await db.cachedQA.where({ accountKey }).toArray();
  await db.cachedQA.bulkDelete(
    rows.map((r) => [r.accountKey, r.id] as const)
  );
}
