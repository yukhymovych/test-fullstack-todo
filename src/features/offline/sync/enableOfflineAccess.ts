import { fetchOfflineSnapshot } from './offlineApi';
import {
  getAccount,
  markAccountActive,
  setOfflineEnabled,
  upsertAccount,
  updateAccountBytes,
} from '../storage/accountsRepo';
import {
  bulkPutNotes,
  deleteAllNotes,
} from '../storage/notesRepo';
import { bulkPutQa, deleteAllQa } from '../storage/qaRepo';
import { replaceAllStudy } from '../storage/studyRepo';
import {
  deleteAllSettings,
  putSetting,
} from '../storage/settingsRepo';
import { ensureMeta, putMeta } from '../storage/metaRepo';
import { toCachedNote, toCachedQa, toCachedStudy } from './toCached';
import {
  MAX_NOTE_CONTENT_BYTES,
  MAX_TOTAL_CACHE_BYTES,
  CACHE_SCHEMA_VERSION,
} from '../domain/offlineLimits';
import type {
  AccountKey,
  CachedAccount,
  OfflineEnableError,
} from '../domain/offline.types';

export interface EnableOfflineProfile {
  accountKey: AccountKey;
  userSub: string;
  email: string | null;
  displayName: string | null;
}

export interface EnableOfflineSuccess {
  ok: true;
  totalBytes: number;
  serverTime: string;
}

export interface EnableOfflineFailure {
  ok: false;
  error: OfflineEnableError;
}

export type EnableOfflineResult = EnableOfflineSuccess | EnableOfflineFailure;

export async function enableOfflineAccess(
  profile: EnableOfflineProfile
): Promise<EnableOfflineResult> {
  let snapshot;
  try {
    snapshot = await fetchOfflineSnapshot();
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'network_error',
        message: err instanceof Error ? err.message : 'Network error',
      },
    };
  }

  const accountKey = profile.accountKey;

  const cachedNotes = snapshot.notes.map((n) => toCachedNote(accountKey, n));

  let totalBytes = 0;
  for (const n of cachedNotes) {
    if (n.byte_size > MAX_NOTE_CONTENT_BYTES) {
      return {
        ok: false,
        error: {
          code: 'note_too_large',
          message: 'A note exceeds the per-note size limit.',
          details: {
            noteId: n.id,
            noteTitle: n.title,
            noteBytes: n.byte_size,
          },
        },
      };
    }
    totalBytes += n.byte_size;
  }

  if (totalBytes > MAX_TOTAL_CACHE_BYTES) {
    return {
      ok: false,
      error: {
        code: 'total_size_exceeded',
        message: 'Total offline cache size exceeds the limit.',
        details: {
          totalBytes,
          limitBytes: MAX_TOTAL_CACHE_BYTES,
        },
      },
    };
  }

  try {
    const now = new Date().toISOString();
    const existing = await getAccount(accountKey);
    const account: CachedAccount = {
      accountKey,
      userSub: profile.userSub,
      email: profile.email,
      displayName: profile.displayName,
      offlineEnabled: true,
      isLastActive: true,
      lastSyncedAt: snapshot.serverTime,
      cacheBytesEstimate: totalBytes,
      createdAt: existing?.createdAt ?? now,
    };
    await upsertAccount(account);
    await markAccountActive(accountKey);

    await deleteAllNotes(accountKey);
    await deleteAllQa(accountKey);
    await bulkPutNotes(cachedNotes);
    await bulkPutQa(snapshot.qa.map((q) => toCachedQa(accountKey, q)));
    await replaceAllStudy(
      accountKey,
      snapshot.study.map((s) => toCachedStudy(accountKey, s))
    );
    await deleteAllSettings(accountKey);
    await putSetting({
      accountKey,
      key: 'ui_language',
      value: snapshot.settings.ui_language,
    });

    await ensureMeta(accountKey);
    await putMeta({
      accountKey,
      snapshotVersion: 1,
      lastFullSyncAt: snapshot.serverTime,
      integrityOk: true,
      schemaVersion: CACHE_SCHEMA_VERSION,
    });

    await setOfflineEnabled(accountKey, true);
    await updateAccountBytes(accountKey, totalBytes, snapshot.serverTime);

    return { ok: true, totalBytes, serverTime: snapshot.serverTime };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'persist_failed',
        message: err instanceof Error ? err.message : 'Persistence failed',
      },
    };
  }
}
