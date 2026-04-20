import type { UseNoteImportExportResult } from '../../model/useNoteImportExport';
import type { UsePageBackupExportResult } from '@/features/backup/model/usePageBackupExport';

export interface NotePageActionsMenuProps {
  noteId: string;
  /** Used as the filename slug for backup downloads when `pageBackup` is provided. */
  noteTitle?: string;
  isFavorite: boolean;
  hasChildren?: boolean;
  /** Show "Learn all children pages" only when true (1+ descendants in GLOBAL learning list). */
  hasDescendantsInGlobal?: boolean;
  onAddToFavorites?: (noteId: string) => void;
  onRemoveFromFavorites?: (noteId: string) => void;
  onCreateChild: (parentId: string) => void;
  onDelete: (noteId: string) => void;
  isDeleting: boolean;
  importExport?: UseNoteImportExportResult;
  /**
   * Optional. When provided, renders the "Backup" submenu (page-only / page-with-children
   * JSON download). Restore/import is intentionally not exposed here; it lives in Settings.
   */
  pageBackup?: UsePageBackupExportResult;
}
