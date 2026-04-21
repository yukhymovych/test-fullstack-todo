import Dexie, { type Table } from 'dexie';
import type {
  CachedAccount,
  CachedMeta,
  CachedNote,
  CachedQA,
  CachedSettingsKV,
  CachedStudyItem,
} from '../domain/offline.types';

export class OfflineDB extends Dexie {
  cachedAccounts!: Table<CachedAccount, string>;
  cachedNotes!: Table<CachedNote, [string, string]>;
  cachedQA!: Table<CachedQA, [string, string]>;
  cachedStudy!: Table<CachedStudyItem, [string, string]>;
  cachedSettings!: Table<CachedSettingsKV, [string, string]>;
  cachedMeta!: Table<CachedMeta, string>;

  constructor() {
    super('rememo_offline');

    // Indexes:
    // - cachedNotes: compound pk [accountKey+id]; indexes on title_lc and
    //   plain_text_lc keyed by accountKey to allow bounded prefix queries.
    //   The `parent_id` index supports children lookups; `updated_at` supports
    //   incremental reconcile bookkeeping.
    // - cachedQA: compound pk [accountKey+id]; `page_id` index for per-note
    //   queries.
    // - cachedStudy: compound pk [accountKey+noteId].
    // - cachedSettings: compound pk [accountKey+key].
    this.version(1).stores({
      cachedAccounts: '&accountKey, userSub, isLastActive',
      cachedNotes:
        '&[accountKey+id], accountKey, [accountKey+parent_id], [accountKey+updated_at], [accountKey+title_lc], [accountKey+plain_text_lc]',
      cachedQA: '&[accountKey+id], [accountKey+page_id]',
      cachedStudy: '&[accountKey+noteId]',
      cachedSettings: '&[accountKey+key]',
      cachedMeta: '&accountKey',
    });
  }
}

let instance: OfflineDB | null = null;

export function getOfflineDb(): OfflineDB {
  if (!instance) {
    instance = new OfflineDB();
  }
  return instance;
}
