import type { NoteListItem } from '../../model/types';
import type { SaveStatus } from '../../model/useNoteEditor';
import type { UseNoteImportExportResult } from '../../model/useNoteImportExport';

export interface NoteEditorToolbarProps {
  activeId: string;
  notes: NoteListItem[] | undefined;
  currentTitle: string;
  saveStatus: SaveStatus;
  isFavorite: boolean;
  onAddToFavorites?: (noteId: string) => void;
  onRemoveFromFavorites?: (noteId: string) => void;
  onCreateChild: (parentId: string) => void;
  onDelete: (noteId: string) => void;
  isDeleting: boolean;
  importExport: UseNoteImportExportResult;
}
