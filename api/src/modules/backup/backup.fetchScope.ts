import type { NoteRowForBackup } from './backup.mappers.js';
import type { ExportBackupOptions } from './backup.types.js';

/**
 * Thin dependency-injection surface used by `fetchNoteRowsForScope`.
 *
 * `getAllOrSubtree` maps to `backupSQL.getNotesForBackup`:
 *   - called with no `rootNoteId` for `scope=full`
 *   - called with a `rootNoteId` for `scope=subtree`
 *
 * `getSingle` maps to `backupSQL.getSingleNoteForBackup` and MUST return
 * at most one row for the selected note. It must NOT include descendants.
 */
export interface FetchNotesByScopeDeps {
  getAllOrSubtree: (
    userId: string,
    rootNoteId?: string
  ) => Promise<NoteRowForBackup[]>;
  getSingle: (
    userId: string,
    noteId: string
  ) => Promise<NoteRowForBackup[]>;
}

/**
 * Route an `ExportBackupOptions` to the correct SQL read.
 *
 * Split out of `backup.service.ts` so the routing contract can be locked
 * down by unit tests without touching the DB pool.
 *
 * Invariants (enforced here, not by callers):
 *   - `scope=single`  -> calls `getSingle` with `rootNoteId`; never `getAllOrSubtree`.
 *   - `scope=subtree` -> calls `getAllOrSubtree(userId, rootNoteId)`.
 *   - `scope=full`    -> calls `getAllOrSubtree(userId)` with NO `rootNoteId`.
 *   - `single` and `subtree` require `rootNoteId`; if missing we throw. The
 *     controller schema normally rejects this first; the throw here is
 *     defense-in-depth so a misuse at the service layer fails loudly.
 */
export async function fetchNoteRowsForScope(
  deps: FetchNotesByScopeDeps,
  userId: string,
  options: ExportBackupOptions
): Promise<NoteRowForBackup[]> {
  switch (options.scope) {
    case 'full':
      return deps.getAllOrSubtree(userId);
    case 'subtree': {
      if (!options.rootNoteId) {
        throw new Error('rootNoteId is required when scope is "subtree"');
      }
      return deps.getAllOrSubtree(userId, options.rootNoteId);
    }
    case 'single': {
      if (!options.rootNoteId) {
        throw new Error('rootNoteId is required when scope is "single"');
      }
      return deps.getSingle(userId, options.rootNoteId);
    }
  }
}
