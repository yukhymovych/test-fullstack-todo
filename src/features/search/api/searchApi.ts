import { http } from '@/shared/api/http';
import type { SearchNotesResponse, SearchParams } from '../model/search.types';

export async function searchNotes(params: SearchParams): Promise<SearchNotesResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', params.query);

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.rootNoteId) {
    searchParams.set('rootNoteId', params.rootNoteId);
  }

  return http.get<SearchNotesResponse>(`/notes/search?${searchParams.toString()}`);
}
