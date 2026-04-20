import { http } from '@/shared/api/http';
import type {
  BackupDocument,
  ExportBackupInput,
  ImportBackupInput,
  ImportBackupResult,
} from '../model/types';

export async function exportBackup(
  input: ExportBackupInput = {}
): Promise<BackupDocument> {
  const params = new URLSearchParams();
  if (input.rootNoteId) {
    params.set('rootNoteId', input.rootNoteId);
  }
  const query = params.toString();
  return http.get<BackupDocument>(`/backup/export${query ? `?${query}` : ''}`);
}

export async function importBackup(
  input: ImportBackupInput
): Promise<ImportBackupResult> {
  return http.post<ImportBackupResult>('/backup/import', {
    document: input.document,
    preserveStudyState: input.preserveStudyState,
  });
}
