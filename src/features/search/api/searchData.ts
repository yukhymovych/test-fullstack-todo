import * as searchApi from './searchApi';
import type { SearchNotesResponse, SearchParams } from '../model/search.types';
import { isOfflineMode } from '@/features/offline/sync/appModeRef';
import { resolveAccountKey } from '@/features/offline/sync/currentAccount';
import { searchOfflineNotes } from '@/features/offline/lib/offlineSearch';

export async function searchNotes(
  params: SearchParams
): Promise<SearchNotesResponse> {
  if (isOfflineMode()) {
    const accountKey = await resolveAccountKey();
    if (!accountKey) return { results: [] };
    return searchOfflineNotes(accountKey, params);
  }
  return searchApi.searchNotes(params);
}
