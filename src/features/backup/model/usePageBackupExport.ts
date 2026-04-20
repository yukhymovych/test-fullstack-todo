import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/shared/lib/toast';
import { downloadFile } from '@/shared/lib/downloadFile';
import * as backupApi from '../api/backupApi';
import { buildPageBackupFileName } from '../domain/backupFilename';

const DOWNLOAD_MIME = 'application/json';

export interface UsePageBackupExportResult {
  isExporting: boolean;
  exportPage: (noteId: string, noteTitle: string) => Promise<void>;
  exportSubtree: (noteId: string, noteTitle: string) => Promise<void>;
}

/**
 * Backup-export hook for the page-actions menu.
 *
 * Distinct from `useBackup` (Settings) so the menu flow can use the `notes` i18n
 * namespace and per-page filename rules without leaking concerns into Settings.
 * Restore/import remains intentionally absent from this hook (Settings only).
 */
export function usePageBackupExport(): UsePageBackupExportResult {
  const { t } = useTranslation('notes');
  const [isExporting, setIsExporting] = useState(false);

  const runExport = useCallback(
    async (
      scope: 'single' | 'subtree',
      fileScope: 'page' | 'subtree',
      noteId: string,
      noteTitle: string
    ) => {
      if (isExporting) return;
      setIsExporting(true);
      try {
        const document = await backupApi.exportBackup({
          scope,
          rootNoteId: noteId,
        });
        const fileName = buildPageBackupFileName(fileScope, noteTitle);
        downloadFile({
          fileName,
          mimeType: DOWNLOAD_MIME,
          content: JSON.stringify(document, null, 2),
        });
        showToast(t('importExport.exportedFile', { fileName }));
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : t('importExport.couldNotExportBackup')
        );
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting, t]
  );

  const exportPage = useCallback(
    (noteId: string, noteTitle: string) =>
      runExport('single', 'page', noteId, noteTitle),
    [runExport]
  );

  const exportSubtree = useCallback(
    (noteId: string, noteTitle: string) =>
      runExport('subtree', 'subtree', noteId, noteTitle),
    [runExport]
  );

  return { isExporting, exportPage, exportSubtree };
}
