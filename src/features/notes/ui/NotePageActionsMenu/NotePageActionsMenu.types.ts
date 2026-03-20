import type { UseNoteImportExportResult } from '../../model/useNoteImportExport';

export interface NotePageActionsMenuProps {
  noteId: string;
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
}
