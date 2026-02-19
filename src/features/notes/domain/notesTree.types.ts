/** Parameters for moving a note in the tree. */
export interface MoveNoteParams {
  noteId: string;
  newParentId: string | null;
  position: number;
  /** Optional: for cache invalidation when moving between parents */
  oldParentId?: string | null;
}
