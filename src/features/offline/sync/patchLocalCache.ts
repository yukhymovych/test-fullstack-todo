import {
  bulkPutNotes,
  deleteNotes,
  getNote,
} from '../storage/notesRepo';
import { deleteQaForPages } from '../storage/qaRepo';
import { toCachedNote } from './toCached';
import type { AccountKey, CachedNote } from '../domain/offline.types';
import type { OfflineNoteDto } from './offlineApi';
import { isOfflineMode } from './appModeRef';
import { getCurrentAccountKey } from './currentAccount';

/**
 * Patches the local offline cache after a successful online mutation.
 * IMPORTANT: study data is intentionally NOT patched here — it is refreshed
 * only via snapshot build or reconcile. See domain invariant on study
 * updates.
 */
export async function applyMutationPatch(args: {
  upsertedNote?: OfflineNoteDto;
  deletedNoteIds?: string[];
}): Promise<void> {
  if (isOfflineMode()) return;
  const accountKey = getCurrentAccountKey();
  if (!accountKey) return;

  if (args.upsertedNote) {
    await bulkPutNotes([toCachedNote(accountKey, args.upsertedNote)]);
  }
  if (args.deletedNoteIds && args.deletedNoteIds.length > 0) {
    await deleteNotes(accountKey, args.deletedNoteIds);
    await deleteQaForPages(accountKey, args.deletedNoteIds);
  }
}

export async function readCachedNote(
  accountKey: AccountKey,
  id: string
): Promise<CachedNote | null> {
  return getNote(accountKey, id);
}
