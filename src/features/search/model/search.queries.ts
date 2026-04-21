import { useQuery } from '@tanstack/react-query';
import { searchNotes } from '../api/searchData';

export const SEARCH_KEYS = {
  all: ['notes-search'] as const,
  list: (query: string, rootNoteId?: string) =>
    [...SEARCH_KEYS.all, query, rootNoteId ?? null] as const,
};

export function useSearchNotesQuery(
  query: string,
  rootNoteId?: string,
  limit = 20
) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: SEARCH_KEYS.list(trimmed, rootNoteId),
    queryFn: () =>
      searchNotes({
        query: trimmed,
        limit,
        rootNoteId,
      }),
    enabled: trimmed.length >= 2,
  });
}
