import {
  BACKUP_FORMAT_ID,
  BACKUP_FORMAT_VERSION,
  type BackupDocument,
} from '../model/types';

export class BackupParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupParseError';
  }
}

export async function parseBackupFile(file: File): Promise<BackupDocument> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new BackupParseError('cannotReadFile');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupParseError('invalidJson');
  }

  if (!isPlainObject(parsed)) {
    throw new BackupParseError('invalidShape');
  }

  if (parsed.format !== BACKUP_FORMAT_ID) {
    throw new BackupParseError('unsupportedFormat');
  }
  if (parsed.version !== BACKUP_FORMAT_VERSION) {
    throw new BackupParseError('unsupportedVersion');
  }

  return parsed as unknown as BackupDocument;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
