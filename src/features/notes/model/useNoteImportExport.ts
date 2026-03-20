import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BlockNoteEditor } from '@blocknote/core';
import * as notesApi from '../api/notesApi';
import { NOTE_KEY } from './useNotes';
import {
  exportActiveNoteAsHtml,
  exportActiveNoteAsText,
  exportSubtreeAsZip,
  importFileIntoEditor,
} from './noteImportExport.service';
import type { ExportFormat } from '../domain/noteImportExport.types';
import type { Note, NoteListItem } from './types';
import { downloadFile } from '@/shared/lib/downloadFile';
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
        showToast('Open a page before exporting.');
        return;
      }
      const activeEditor = editor;
      if (!activeEditor) {
        showToast('Open a page before exporting.');
        return;
      }

      setIsExporting(true);
      setPendingLabel('Exporting...');
      try {
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
        showToast(`Exported ${artifact.fileName}`);
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Could not export this page.'
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
        showToast('This page has no child pages to export.');
        return;
      }

      setIsExporting(true);
      setPendingLabel('Exporting tree...');
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
            `Exported ${artifact.fileName} with ${artifact.failures.length} error${artifact.failures.length === 1 ? '' : 's'}.`
          );
        } else {
          showToast(`Exported ${artifact.fileName}`);
        }
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Could not export this page tree.'
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
        showToast('Open a page before importing.');
        return;
      }

      setIsImporting(true);
      setPendingLabel('Importing...');
      try {
        const result = await importFileIntoEditor({
          editor,
          file,
          target: 'document-end',
        });

        if (result.appendedBlockCount === 0) {
          showToast('Nothing importable was found.');
        } else {
          showToast(`Imported ${result.appendedBlockCount} block${result.appendedBlockCount === 1 ? '' : 's'}.`);
        }
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Could not import this file.'
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
      canExportPdf: false,
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
