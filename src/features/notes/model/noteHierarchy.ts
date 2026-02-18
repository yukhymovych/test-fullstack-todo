/** Minimal note shape needed for ancestor chain traversal */
export interface NoteWithParent {
  id: string;
  parent_id: string | null;
}

/**
 * Returns ancestor IDs from root to parent (NOT including activeId).
 * Protects against cycles using a visited set.
 */
export function getAncestorChain(
  activeId: string,
  byId: Map<string, NoteWithParent>
): string[] {
  const visited = new Set<string>();
  const ancestors: string[] = [];
  let current = byId.get(activeId);

  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);

    const pid = current.parent_id ?? null;
    if (pid) {
      ancestors.unshift(pid);
      current = byId.get(pid);
    } else {
      break;
    }
  }

  return ancestors;
}
