import { getOfflineDb } from './db';
import type { AccountKey, CachedSettingsKV } from '../domain/offline.types';

export async function getSetting(
  accountKey: AccountKey,
  key: string
): Promise<string | null> {
  const db = getOfflineDb();
  const row = await db.cachedSettings.get([accountKey, key]);
  return row?.value ?? null;
}

export async function putSetting(row: CachedSettingsKV): Promise<void> {
  const db = getOfflineDb();
  await db.cachedSettings.put(row);
}

export async function getAllSettings(
  accountKey: AccountKey
): Promise<Record<string, string>> {
  const db = getOfflineDb();
  const rows = await db.cachedSettings.where({ accountKey }).toArray();
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function deleteAllSettings(
  accountKey: AccountKey
): Promise<void> {
  const db = getOfflineDb();
  const rows = await db.cachedSettings.where({ accountKey }).toArray();
  await db.cachedSettings.bulkDelete(
    rows.map((r) => [r.accountKey, r.key] as const)
  );
}
