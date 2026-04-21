import { getOfflineDb } from '../storage/db';
import {
  deleteAllNotes,
} from '../storage/notesRepo';
import { deleteAllQa } from '../storage/qaRepo';
import { deleteAllStudy } from '../storage/studyRepo';
import { deleteAllSettings } from '../storage/settingsRepo';
import { deleteMeta } from '../storage/metaRepo';
import { getAccount, upsertAccount } from '../storage/accountsRepo';
import type { AccountKey } from '../domain/offline.types';

/**
 * Clear offline data for the current account but keep the account entry so
 * future re-enablement picks up user identity. Flags offlineEnabled=false.
 */
export async function clearCurrentAccount(
  accountKey: AccountKey
): Promise<void> {
  const existing = await getAccount(accountKey);
  await Promise.all([
    deleteAllNotes(accountKey),
    deleteAllQa(accountKey),
    deleteAllStudy(accountKey),
    deleteAllSettings(accountKey),
    deleteMeta(accountKey),
  ]);
  if (existing) {
    await upsertAccount({
      ...existing,
      offlineEnabled: false,
      lastSyncedAt: null,
      cacheBytesEstimate: 0,
    });
  }
}

/**
 * Wipe the entire Dexie database — every account, every table. Used when
 * the user explicitly chooses to remove all cached offline data.
 */
export async function clearAll(): Promise<void> {
  const db = getOfflineDb();
  await db.delete();
  // Next call to getOfflineDb will re-open and recreate the schema.
}
