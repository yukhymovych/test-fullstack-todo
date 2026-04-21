import { http } from '@/shared/api/http';

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

export interface OfflineSnapshotDto {
  serverTime: string;
  notes: OfflineNoteDto[];
  qa: OfflineQaDto[];
  study: OfflineStudyItemDto[];
  settings: OfflineSettingsDto;
}

export interface OfflineChangesDto {
  serverTime: string;
  notesUpdated: OfflineNoteDto[];
  notesDeleted: string[];
  qaUpdated: OfflineQaDto[];
  qaAllowedIdsByPage: Record<string, string[]>;
  studyUpdated: OfflineStudyItemDto[];
  settingsUpdated: OfflineSettingsDto | null;
}

export function fetchOfflineSnapshot(): Promise<OfflineSnapshotDto> {
  return http.get<OfflineSnapshotDto>('/offline/snapshot');
}

export function fetchOfflineChangesSince(sinceIso: string): Promise<OfflineChangesDto> {
  const params = new URLSearchParams({ since: sinceIso });
  return http.get<OfflineChangesDto>(`/offline/changes?${params.toString()}`);
}
