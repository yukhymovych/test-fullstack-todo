import type { Note, NoteListItem } from './types';

export interface TrashNoteListItem extends NoteListItem {
  trashed_at: string;
  trashed_root_id: string | null;
}

export interface TrashNote extends Note {
  trashed_at: string;
  trashed_root_id: string | null;
  sort_order?: number;
  is_favorite?: boolean;
  last_visited_at?: string | null;
}
