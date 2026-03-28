/** BlockNote blocks array - typed as unknown for flexibility with BlockNote's Block[] */
export type RichContent = unknown;

export const DEFAULT_NOTE_TITLE = 'Untitled';

export interface NoteListItem {
  id: string;
  title: string;
  updated_at: string;
  parent_id?: string | null;
  sort_order?: number;
  is_favorite?: boolean;
  last_visited_at?: string | null;
  trashed_at?: string | null;
  trashed_root_id?: string | null;
}

export interface Note {
  id: string;
  title: string;
  parent_id?: string | null;
  rich_content: RichContent;
  content_text: string;
  created_at: string;
  updated_at: string;
  trashed_at?: string | null;
  trashed_root_id?: string | null;
}

/** Block format for embedded page: { type: "embeddedPage", props: { noteId: "<uuid>" }, content: [] } */
export interface EmbeddedPageBlock {
  type: 'embeddedPage';
  props: { noteId: string };
  content: unknown[];
}
