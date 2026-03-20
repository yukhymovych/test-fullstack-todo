import {
  DEFAULT_EXPORT_NOTE_TITLE,
  EXPORT_EXTENSION_BY_FORMAT,
} from './noteImportExport.constants';
import type { ExportFormat } from './noteImportExport.types';

export function sanitizeExportSegment(name: string | undefined): string {
  const normalized = (name ?? '').trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
  const withoutTrailingDots = normalized.replace(/[.\s]+$/g, '');
  return withoutTrailingDots || DEFAULT_EXPORT_NOTE_TITLE;
}

export function buildExportFileName(title: string, format: ExportFormat): string {
  const sanitized = sanitizeExportSegment(title);
  return `${sanitized}.${EXPORT_EXTENSION_BY_FORMAT[format]}`;
}

export function resolveUniqueFileName(
  fileName: string,
  usedNames: Set<string>
): string {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const dotIndex = fileName.lastIndexOf('.');
  const baseName = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex) : '';

  let attempt = 2;
  while (true) {
    const candidate = `${baseName} (${attempt})${extension}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    attempt += 1;
  }
}

export function buildZipFileName(rootTitle: string): string {
  return `${sanitizeExportSegment(rootTitle)} export.zip`;
}
