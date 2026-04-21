import * as offlineSQL from './offline.sql.js';

export interface OfflineNoteDto {
  id: string;
  parent_id: string | null;
  title: string;
  rich_content: unknown;
  content_text: string;
  sort_order: number;
  is_favorite: boolean;
  last_visited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfflineQaDto {
  id: string;
  page_id: string;
  question: string;
  answer: string;
  source: 'manual' | 'generated';
  created_at: string;
  updated_at: string;
}

export interface OfflineStudyItemDto {
  note_id: string;
  is_active: boolean;
  due_at: string;
  last_reviewed_at: string | null;
  stability_days: number;
  difficulty: number;
}

export interface OfflineSettingsDto {
  ui_language: string;
}

export interface OfflineSnapshotResponse {
  serverTime: string;
  notes: OfflineNoteDto[];
  qa: OfflineQaDto[];
  study: OfflineStudyItemDto[];
  settings: OfflineSettingsDto;
}

export interface OfflineChangesResponse {
  serverTime: string;
  notesUpdated: OfflineNoteDto[];
  notesDeleted: string[];
  qaUpdated: OfflineQaDto[];
  qaAllowedIdsByPage: Record<string, string[]>;
  studyUpdated: OfflineStudyItemDto[];
  settingsUpdated: OfflineSettingsDto | null;
}

function toNoteDto(row: offlineSQL.OfflineNoteRow): OfflineNoteDto {
  return {
    id: row.id,
    parent_id: row.parent_id,
    title: row.title,
    rich_content: row.rich_content,
    content_text: row.content_text,
    sort_order: row.sort_order,
    is_favorite: row.is_favorite,
    last_visited_at: row.last_visited_at ? row.last_visited_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function toQaDto(row: offlineSQL.OfflineQaRow): OfflineQaDto {
  return {
    id: row.id,
    page_id: row.page_id,
    question: row.question,
    answer: row.answer,
    source: row.source,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function toStudyDto(row: offlineSQL.OfflineStudyItemRow): OfflineStudyItemDto {
  return {
    note_id: row.note_id,
    is_active: row.is_active,
    due_at: row.due_at.toISOString(),
    last_reviewed_at: row.last_reviewed_at ? row.last_reviewed_at.toISOString() : null,
    stability_days: Number(row.stability_days ?? 0),
    difficulty: Number(row.difficulty ?? 0),
  };
}

export async function buildSnapshot(
  userId: string
): Promise<OfflineSnapshotResponse> {
  const [notes, qa, study, settings] = await Promise.all([
    offlineSQL.getAllNotesForOffline(userId),
    offlineSQL.getAllStudyQuestionsForOffline(userId),
    offlineSQL.getAllStudyItemsForOffline(userId),
    offlineSQL.getUserPreferencesForOffline(userId),
  ]);
  return {
    serverTime: new Date().toISOString(),
    notes: notes.map(toNoteDto),
    qa: qa.map(toQaDto),
    study: study.map(toStudyDto),
    settings: { ui_language: settings.ui_language },
  };
}

export async function buildChangesSince(
  userId: string,
  since: Date
): Promise<OfflineChangesResponse> {
  const [
    notesUpdated,
    notesDeleted,
    qaUpdated,
    qaAllowed,
    studyAll,
    settingsChanged,
  ] = await Promise.all([
    offlineSQL.getNotesChangedSince(userId, since),
    offlineSQL.getNoteIdsRemovedSince(userId, since),
    offlineSQL.getQaChangedSince(userId, since),
    offlineSQL.getQaIdsAllowedForUser(userId),
    offlineSQL.getAllStudyItemsForOffline(userId),
    offlineSQL.getUserPreferencesChangedSince(userId, since),
  ]);

  const qaAllowedIdsByPage: Record<string, string[]> = {};
  for (const row of qaAllowed) {
    (qaAllowedIdsByPage[row.page_id] ??= []).push(row.id);
  }

  return {
    serverTime: new Date().toISOString(),
    notesUpdated: notesUpdated.map(toNoteDto),
    notesDeleted,
    qaUpdated: qaUpdated.map(toQaDto),
    qaAllowedIdsByPage,
    studyUpdated: studyAll.map(toStudyDto),
    settingsUpdated: settingsChanged
      ? { ui_language: settingsChanged.ui_language }
      : null,
  };
}
