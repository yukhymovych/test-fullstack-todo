export interface SearchResultItem {
  id: string;
  title: string;
  parent_id: string | null;
  content_text: string;
  updated_at: string;
}

export interface SearchNotesResponse {
  results: SearchResultItem[];
}

export interface SearchParams {
  query: string;
  limit?: number;
  rootNoteId?: string;
}
