/** BlockNote blocks array - typed as unknown for flexibility with BlockNote's Block[] */
export type RichContent = unknown;

export interface NoteListItem {
  id: string;
  title: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  rich_content: RichContent;
  content_text: string;
  created_at: string;
  updated_at: string;
}
