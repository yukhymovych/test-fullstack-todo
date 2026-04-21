export type AccountKey = string;

export type AppMode =
  | 'initializing'
  | 'online_authenticated'
  | 'online_auth_required'
  | 'offline_cached_readonly'
  | 'offline_no_cache'
  | 'offline_enabled_snapshot_missing';

export interface CachedAccount {
  accountKey: AccountKey;
  userSub: string;
  email: string | null;
  displayName: string | null;
  offlineEnabled: boolean;
  isLastActive: boolean;
  lastSyncedAt: string | null;
  cacheBytesEstimate: number;
  createdAt: string;
}

export interface CachedNote {
  accountKey: AccountKey;
  id: string;
  parent_id: string | null;
  title: string;
  title_lc: string;
  rich_content: unknown;
  plain_text: string;
  plain_text_lc: string;
  sort_order: number;
  is_favorite: boolean;
  last_visited_at: string | null;
  created_at: string;
  updated_at: string;
  byte_size: number;
}

export interface CachedQA {
  accountKey: AccountKey;
  id: string;
  page_id: string;
  question: string;
  answer: string;
  source: 'manual' | 'generated';
  created_at: string;
  updated_at: string;
}

export interface CachedStudyItem {
  accountKey: AccountKey;
  noteId: string;
  status: 'active' | 'inactive';
  dueAt: string;
  lastReviewedAt: string | null;
  stabilityDays: number;
  difficulty: number;
}

export interface CachedSettingsKV {
  accountKey: AccountKey;
  key: string;
  value: string;
}

export interface CachedMeta {
  accountKey: AccountKey;
  snapshotVersion: number;
  lastFullSyncAt: string | null;
  integrityOk: boolean;
  schemaVersion: number;
}

export type OfflineEnableErrorCode =
  | 'not_authenticated'
  | 'network_error'
  | 'total_size_exceeded'
  | 'note_too_large'
  | 'persist_failed';

export interface OfflineEnableError {
  code: OfflineEnableErrorCode;
  message: string;
  details?: {
    totalBytes?: number;
    limitBytes?: number;
    noteId?: string;
    noteTitle?: string;
    noteBytes?: number;
  };
}
