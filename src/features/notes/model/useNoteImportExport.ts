import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BlockNoteEditor } from '@blocknote/core';
import i18n from '@/shared/i18n/i18n';
import * as notesApi from '../api/notesApi';
import { NOTE_KEY } from './useNotes';
import {
  exportActiveNoteAsHtml,
  exportActiveNoteAsPdfPrint,
  exportActiveNoteAsText,
  exportSubtreeAsZip,
  importFileIntoEditor,
} from './noteImportExport.service';
import type { ExportFormat } from '../domain/noteImportExport.types';
import type { Note, NoteListItem } from './types';
import { downloadFile } from '@/shared/lib/downloadFile';
import { printHtmlDocument } from '@/shared/lib/printHtmlDocument';
import { showToast } from '@/shared/lib/toast';

export interface UseNoteImportExportInput {
  editor: BlockNoteEditor<any, any, any> | null;
  noteId: string | undefined;
  noteTitle: string;
  notes: NoteListItem[] | undefined;
  noteTitlesById: Map<string, string>;
  hasChildren: boolean;
}

export interface UseNoteImportExportResult {
  canExport: boolean;
  isExporting: boolean;
  isImporting: boolean;
  isBusy: boolean;
  pendingLabel: string | null;
  canExportPdf: boolean;
  canExportTree: boolean;
  canImport: boolean;
  treeExportFormats: readonly ['html', 'txt'];
  importAccept: '.html,.htm,.txt,.docx';
  handleExport: (format: ExportFormat) => Promise<void>;
  handleExportTree: (format: 'html' | 'txt') => Promise<void>;
  handleImportFile: (file: File | null) => Promise<void>;
}

const TREE_EXPORT_FORMATS = ['html', 'txt'] as const;

export function useNoteImportExport({
  editor,
  noteId,
  noteTitle,
  notes,
  noteTitlesById,
  hasChildren,
}: UseNoteImportExportInput): UseNoteImportExportResult {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const isBusy = isExporting || isImporting;
  const canExport = Boolean(editor && noteId);
  const canImport = Boolean(editor);
  const canExportTree = canExport && hasChildren;

  const getNoteById = useCallback(
    async (targetNoteId: string): Promise<Note> => {
      const cached = queryClient.getQueryData<Note>(NOTE_KEY(targetNoteId));
      return cached ?? notesApi.getNote(targetNoteId);
    },
    [queryClient]
  );

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (isBusy) return;
      if (!canExport || !noteId) {
        showToast(i18n.t('importExport.openBeforeExporting', { ns: 'notes' }));
        return;
      }
      const activeEditor = editor;
      if (!activeEditor) {
        showToast(i18n.t('importExport.openBeforeExporting', { ns: 'notes' }));
        return;
      }

      setIsExporting(true);
      setPendingLabel(
        format === 'pdf'
          ? i18n.t('importExport.preparingPdf', { ns: 'notes' })
          : i18n.t('importExport.exporting', { ns: 'notes' })
      );
      try {
        if (format === 'pdf') {
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            throw new Error('Could not open the browser print window.');
          }

          const artifact = exportActiveNoteAsPdfPrint({
            editor: activeEditor,
            noteId,
            noteTitle,
            noteTitlesById,
          });

          await printHtmlDocument({
            htmlDocument: artifact.htmlDocument,
            title: artifact.title,
            printWindow,
          });
          showToast(i18n.t('importExport.openedPrintDialog', { ns: 'notes' }));
          return;
        }

        const artifact =
          format === 'html'
            ? exportActiveNoteAsHtml({
                editor: activeEditor,
                noteId,
                noteTitle,
                noteTitlesById,
              })
            : exportActiveNoteAsText({
                editor: activeEditor,
                noteId,
                noteTitle,
                noteTitlesById,
              });

        downloadFile({
          fileName: artifact.fileName,
          mimeType: artifact.mimeType,
          content: artifact.content,
        });
        showToast(i18n.t('importExport.exportedFile', { ns: 'notes', fileName: artifact.fileName }));
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : i18n.t('importExport.couldNotExportPage', { ns: 'notes' })
        );
      } finally {
        setIsExporting(false);
        setPendingLabel(null);
      }
    },
    [canExport, editor, isBusy, noteId, noteTitle, noteTitlesById]
  );

  const handleExportTree = useCallback(
    async (format: 'html' | 'txt') => {
      if (isBusy) return;
      if (!noteId || !notes || !canExportTree) {
        showToast(i18n.t('importExport.noChildPagesToExport', { ns: 'notes' }));
        return;
      }

      setIsExporting(true);
      setPendingLabel(i18n.t('importExport.exportingTree', { ns: 'notes' }));
      try {
        const artifact = await exportSubtreeAsZip({
          rootNoteId: noteId,
          format,
          notes,
          noteTitlesById,
          getNoteById: async (targetNoteId) => {
            const note = await getNoteById(targetNoteId);
            return {
              id: note.id,
              title: note.title,
              rich_content: note.rich_content,
            };
          },
        });

        downloadFile({
          fileName: artifact.fileName,
          mimeType: artifact.mimeType,
          content: artifact.blob,
        });

        if (artifact.failures.length > 0) {
          showToast(
            i18n.t('importExport.exportedFileWithErrors', {
              ns: 'notes',
              fileName: artifact.fileName,
              count: artifact.failures.length,
            })
          );
        } else {
          showToast(i18n.t('importExport.exportedFile', { ns: 'notes', fileName: artifact.fileName }));
        }
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : i18n.t('importExport.couldNotExportTree', { ns: 'notes' })
        );
      } finally {
        setIsExporting(false);
        setPendingLabel(null);
      }
    },
    [canExportTree, getNoteById, isBusy, noteId, noteTitlesById, notes]
  );

  const handleImportFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (isBusy) return;
      if (!canImport || !editor) {
        showToast(i18n.t('importExport.openBeforeImporting', { ns: 'notes' }));
        return;
      }

      setIsImporting(true);
      setPendingLabel(i18n.t('importExport.importing', { ns: 'notes' }));
      try {
        const result = await importFileIntoEditor({
          editor,
          file,
          target: 'document-end',
        });

        if (result.appendedBlockCount === 0) {
          showToast(i18n.t('importExport.nothingImportable', { ns: 'notes' }));
        } else {
          showToast(
            i18n.t('importExport.importedBlocks', {
              ns: 'notes',
              count: result.appendedBlockCount,
            })
          );
        }
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : i18n.t('importExport.couldNotImportFile', { ns: 'notes' })
        );
      } finally {
        setIsImporting(false);
        setPendingLabel(null);
      }
    },
    [canImport, editor, isBusy]
  );

  return useMemo(
    () => ({
      canExport,
      isExporting,
      isImporting,
      isBusy,
      pendingLabel,
      canExportPdf: canExport,
      canExportTree,
      canImport,
      treeExportFormats: TREE_EXPORT_FORMATS,
      importAccept: '.html,.htm,.txt,.docx' as const,
      handleExport,
      handleExportTree,
      handleImportFile,
    }),
    [
      canExport,
      canExportTree,
      canImport,
      handleExport,
      handleExportTree,
      handleImportFile,
      isBusy,
      isExporting,
      isImporting,
      pendingLabel,
    ]
  );
}
