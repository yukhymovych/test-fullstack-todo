import { getOfflineDb } from './db';
import type { AccountKey, CachedMeta } from '../domain/offline.types';
import { CACHE_SCHEMA_VERSION } from '../domain/offlineLimits';

export async function getMeta(
  accountKey: AccountKey
): Promise<CachedMeta | null> {
  const db = getOfflineDb();
  return (await db.cachedMeta.get(accountKey)) ?? null;
}

export async function putMeta(meta: CachedMeta): Promise<void> {
  const db = getOfflineDb();
  await db.cachedMeta.put(meta);
}

export async function ensureMeta(
  accountKey: AccountKey
): Promise<CachedMeta> {
  const existing = await getMeta(accountKey);
  if (existing) return existing;
  const meta: CachedMeta = {
    accountKey,
    snapshotVersion: 0,
    lastFullSyncAt: null,
    integrityOk: true,
    schemaVersion: CACHE_SCHEMA_VERSION,
  };
  await putMeta(meta);
  return meta;
}

export async function deleteMeta(accountKey: AccountKey): Promise<void> {
  const db = getOfflineDb();
  await db.cachedMeta.delete(accountKey);
}
