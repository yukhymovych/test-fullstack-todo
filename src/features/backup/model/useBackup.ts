import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/shared/lib/toast';
import { downloadFile } from '@/shared/lib/downloadFile';
import { LEARNING_KEYS } from '@/features/learning/model/learning.queries';
import { STUDY_QUESTIONS_KEYS } from '@/features/study-questions/model/studyQuestions.queries';
import * as backupApi from '../api/backupApi';
import {
  BackupParseError,
  parseBackupFile,
} from '../domain/parseBackupFile';
import type {
  BackupDocument,
  BackupWarnings,
  ExportBackupInput,
  ImportBackupResult,
} from './types';

const DOWNLOAD_FILE_PREFIX = 'rememo-backup';
const DOWNLOAD_MIME = 'application/json';

function buildBackupFileName(scope: BackupDocument['scope']): string {
  const stamp = new Date().toISOString().replace(/[:]/g, '-').slice(0, 19);
  return `${DOWNLOAD_FILE_PREFIX}-${scope}-${stamp}.json`;
}

export interface UseBackupResult {
  isExporting: boolean;
  isImporting: boolean;
  exportToFile: (input?: ExportBackupInput) => Promise<void>;
  importFromFile: (file: File, preserveStudyState: boolean) => Promise<void>;
}

export function useBackup(): UseBackupResult {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();

  const exportMutation = useMutation({
    mutationFn: (input: ExportBackupInput | undefined) =>
      backupApi.exportBackup(input ?? {}),
  });

  const importMutation = useMutation({
    mutationFn: (input: { file: File; preserveStudyState: boolean }) =>
      runImport(input.file, input.preserveStudyState),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STUDY_QUESTIONS_KEYS.all });
    },
  });

  const exportToFile = useCallback(
    async (input?: ExportBackupInput) => {
      try {
        const document = await exportMutation.mutateAsync(input);
        downloadFile({
          fileName: buildBackupFileName(document.scope),
          mimeType: DOWNLOAD_MIME,
          content: JSON.stringify(document, null, 2),
        });
        showToast(t('backup.toast.exportSuccess'));
      } catch (error) {
        showToast(
          t('backup.toast.exportFailed', { error: extractMessage(error) })
        );
      }
    },
    [exportMutation, t]
  );

  const importFromFile = useCallback(
    async (file: File, preserveStudyState: boolean) => {
      try {
        const result = await importMutation.mutateAsync({
          file,
          preserveStudyState,
        });
        showToast(
          t('backup.toast.importSuccess', {
            notes: result.insertedNoteCount,
            questions: result.insertedQuestionAnswerCount,
            studyItems: result.insertedStudyItemCount,
          })
        );
        if (hasAnyWarning(result.warnings)) {
          showToast(
            t('backup.toast.importWarnings', {
              orphans: result.warnings.orphanNotesDemotedToRoot,
              cycles: result.warnings.cycleNotesDemotedToRoot,
              droppedEmbeds: result.warnings.droppedEmbeddedReferences,
              malformedEmbeds: result.warnings.malformedEmbeddedReferences,
            })
          );
        }
      } catch (error) {
        if (error instanceof BackupParseError) {
          showToast(t(`backup.toast.parseError.${error.message}`));
          return;
        }
        showToast(
          t('backup.toast.importFailed', { error: extractMessage(error) })
        );
      }
    },
    [importMutation, t]
  );

  return {
    isExporting: exportMutation.isPending,
    isImporting: importMutation.isPending,
    exportToFile,
    importFromFile,
  };
}

async function runImport(
  file: File,
  preserveStudyState: boolean
): Promise<ImportBackupResult> {
  const document = await parseBackupFile(file);
  return backupApi.importBackup({ document, preserveStudyState });
}

function extractMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  // The shared http client throws `new Error(await response.text())`, so the
  // message for a backend `400` is a JSON envelope like `{"error":"..."}`.
  // Surface just the `error` field so toasts are readable.
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'error' in parsed &&
        typeof (parsed as { error: unknown }).error === 'string'
      ) {
        return (parsed as { error: string }).error;
      }
    } catch {
      // fall through and return the raw message
    }
  }
  return raw;
}

function hasAnyWarning(warnings: BackupWarnings): boolean {
  return (
    warnings.orphanNotesDemotedToRoot > 0 ||
    warnings.cycleNotesDemotedToRoot > 0 ||
    warnings.droppedEmbeddedReferences > 0 ||
    warnings.malformedEmbeddedReferences > 0
  );
}
