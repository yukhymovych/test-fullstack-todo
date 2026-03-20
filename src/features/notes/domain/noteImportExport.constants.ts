import type { ExportFormat } from './noteImportExport.types';

export const NOTE_EXPORT_VERSION = 'phase2';
export const DEFAULT_EXPORT_NOTE_TITLE = 'Untitled Note';

export const EXPORT_MIME_BY_FORMAT: Record<ExportFormat, string> = {
  html: 'text/html;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
};

export const EXPORT_EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
  html: 'html',
  txt: 'txt',
};
