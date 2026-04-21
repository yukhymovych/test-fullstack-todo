import { getOfflineDb } from './db';
import type { AccountKey, CachedAccount } from '../domain/offline.types';

export async function getAccount(
  accountKey: AccountKey
): Promise<CachedAccount | null> {
  const db = getOfflineDb();
  return (await db.cachedAccounts.get(accountKey)) ?? null;
}

export async function getLastActiveAccount(): Promise<CachedAccount | null> {
  const db = getOfflineDb();
  const rows = await db.cachedAccounts.where('isLastActive').equals(1).toArray();
  if (rows.length > 0) return rows[0];
  const all = await db.cachedAccounts.toArray();
  return all.find((a) => a.isLastActive) ?? null;
}

export async function upsertAccount(account: CachedAccount): Promise<void> {
  const db = getOfflineDb();
  await db.cachedAccounts.put(account);
}

export async function markAccountActive(
  accountKey: AccountKey
): Promise<void> {
  const db = getOfflineDb();
  await db.transaction('rw', db.cachedAccounts, async () => {
    const all = await db.cachedAccounts.toArray();
    for (const a of all) {
      if (a.accountKey === accountKey) {
        if (!a.isLastActive) {
          await db.cachedAccounts.put({ ...a, isLastActive: true });
        }
      } else if (a.isLastActive) {
        await db.cachedAccounts.put({ ...a, isLastActive: false });
      }
    }
  });
}

export async function setOfflineEnabled(
  accountKey: AccountKey,
  enabled: boolean,
  patch?: Partial<CachedAccount>
): Promise<void> {
  const db = getOfflineDb();
  const existing = await db.cachedAccounts.get(accountKey);
  if (!existing) return;
  await db.cachedAccounts.put({
    ...existing,
    ...patch,
    offlineEnabled: enabled,
  });
}

export async function updateAccountBytes(
  accountKey: AccountKey,
  totalBytes: number,
  lastSyncedAt: string
): Promise<void> {
  const db = getOfflineDb();
  const existing = await db.cachedAccounts.get(accountKey);
  if (!existing) return;
  await db.cachedAccounts.put({
    ...existing,
    cacheBytesEstimate: totalBytes,
    lastSyncedAt,
  });
}
