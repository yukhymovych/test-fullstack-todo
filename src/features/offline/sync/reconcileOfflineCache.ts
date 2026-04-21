import { fetchOfflineChangesSince } from './offlineApi';
import {
  getAccount,
  updateAccountBytes,
} from '../storage/accountsRepo';
import {
  bulkPutNotes,
  deleteNotes,
  getAllNotes,
} from '../storage/notesRepo';
import {
  bulkPutQa,
  deleteQa,
  deleteQaForPages,
  getQaByPage,
} from '../storage/qaRepo';
import { replaceAllStudy } from '../storage/studyRepo';
import { putSetting } from '../storage/settingsRepo';
import { putMeta, ensureMeta } from '../storage/metaRepo';
import { toCachedNote, toCachedQa, toCachedStudy } from './toCached';
import type { AccountKey } from '../domain/offline.types';
import {
  MAX_NOTE_CONTENT_BYTES,
  MAX_TOTAL_CACHE_BYTES,
  CACHE_SCHEMA_VERSION,
} from '../domain/offlineLimits';
import { enableOfflineAccess, type EnableOfflineProfile } from './enableOfflineAccess';

export interface ReconcileSuccess {
  ok: true;
  applied: boolean;
  totalBytes: number;
  serverTime: string;
}

export interface ReconcileFailure {
  ok: false;
  reason: 'network_error' | 'persist_failed' | 'over_limit';
  message: string;
}

export type ReconcileResult = ReconcileSuccess | ReconcileFailure;

/**
 * Applies only the diff since `lastSyncedAt`. Does NOT refetch the full
 * dataset. Full rebuild is available as a separate fallback via
 * `rebuildOfflineCache`.
 */
export async function reconcileOfflineCache(
  accountKey: AccountKey
): Promise<ReconcileResult> {
  const account = await getAccount(accountKey);
  if (!account || !account.offlineEnabled) {
    return { ok: true, applied: false, totalBytes: 0, serverTime: '' };
  }

  const since = account.lastSyncedAt ?? new Date(0).toISOString();

  let changes;
  try {
    changes = await fetchOfflineChangesSince(since);
  } catch (err) {
    return {
      ok: false,
      reason: 'network_error',
      message: err instanceof Error ? err.message : 'Network error',
    };
  }

  try {
    const cachedToPut = changes.notesUpdated.map((n) =>
      toCachedNote(accountKey, n)
    );

    for (const n of cachedToPut) {
      if (n.byte_size > MAX_NOTE_CONTENT_BYTES) {
        return {
          ok: false,
          reason: 'over_limit',
          message: `Note "${n.title}" exceeds the per-note limit and will not be cached.`,
        };
      }
    }

    if (cachedToPut.length > 0) await bulkPutNotes(cachedToPut);
    if (changes.notesDeleted.length > 0) {
      await deleteNotes(accountKey, changes.notesDeleted);
      await deleteQaForPages(accountKey, changes.notesDeleted);
    }

    if (changes.qaUpdated.length > 0) {
      await bulkPutQa(changes.qaUpdated.map((q) => toCachedQa(accountKey, q)));
    }

    // Reconcile Q/A tombstones by comparing allowed ids per page.
    await pruneOrphanQa(accountKey, changes.qaAllowedIdsByPage);

    // Study items are refreshed wholesale during reconcile; not patched
    // incrementally elsewhere.
    await replaceAllStudy(
      accountKey,
      changes.studyUpdated.map((s) => toCachedStudy(accountKey, s))
    );

    if (changes.settingsUpdated) {
      await putSetting({
        accountKey,
        key: 'ui_language',
        value: changes.settingsUpdated.ui_language,
      });
    }

    const allNotes = await getAllNotes(accountKey);
    const totalBytes = allNotes.reduce((sum, n) => sum + n.byte_size, 0);

    if (totalBytes > MAX_TOTAL_CACHE_BYTES) {
      return {
        ok: false,
        reason: 'over_limit',
        message: 'Total offline cache size exceeds the limit.',
      };
    }

    await ensureMeta(accountKey);
    await putMeta({
      accountKey,
      snapshotVersion: Date.now(),
      lastFullSyncAt: changes.serverTime,
      integrityOk: true,
      schemaVersion: CACHE_SCHEMA_VERSION,
    });
    await updateAccountBytes(accountKey, totalBytes, changes.serverTime);

    return {
      ok: true,
      applied: true,
      totalBytes,
      serverTime: changes.serverTime,
    };
  } catch (err) {
    return {
      ok: false,
      reason: 'persist_failed',
      message: err instanceof Error ? err.message : 'Persistence failed',
    };
  }
}

async function pruneOrphanQa(
  accountKey: AccountKey,
  allowedIdsByPage: Record<string, string[]>
): Promise<void> {
  for (const [pageId, allowedIdsArr] of Object.entries(allowedIdsByPage)) {
    const allowed = new Set(allowedIdsArr);
    const localRows = await getQaByPage(accountKey, pageId);
    const toDelete: string[] = [];
    for (const row of localRows) {
      if (!allowed.has(row.id)) toDelete.push(row.id);
    }
    if (toDelete.length > 0) await deleteQa(accountKey, toDelete);
  }
}

/**
 * Full rebuild fallback — wipes per-account data and re-enables from a fresh
 * snapshot. Intended for integrity repair; not invoked on normal bootstrap.
 */
export async function rebuildOfflineCache(
  profile: EnableOfflineProfile
): Promise<ReconcileResult> {
  const result = await enableOfflineAccess(profile);
  if (!result.ok) {
    return {
      ok: false,
      reason:
        result.error.code === 'network_error'
          ? 'network_error'
          : result.error.code === 'total_size_exceeded'
          ? 'over_limit'
          : 'persist_failed',
      message: result.error.message,
    };
  }
  return {
    ok: true,
    applied: true,
    totalBytes: result.totalBytes,
    serverTime: result.serverTime,
  };
}
