import { DEFAULT_NOTE_TITLE } from './types';

/** Minimal note shape needed for ancestor chain traversal */
export interface NoteWithParent {
  id: string;
  parent_id: string | null;
}

/** Note shape with optional title for lookup maps */
export interface NoteForLookup {
  id: string;
  title?: string;
  parent_id?: string | null;
}

export interface NoteLookupMaps {
  byId: Map<string, NoteWithParent>;
  titleById: Map<string, string>;
}

/**
 * Builds byId (for hierarchy) and titleById (for display) in a single pass.
 */
export function buildNoteLookupMaps(notes: NoteForLookup[]): NoteLookupMaps {
  const byId = new Map<string, NoteWithParent>();
  const titleById = new Map<string, string>();

  for (const n of notes) {
    byId.set(n.id, { id: n.id, parent_id: n.parent_id ?? null });
    titleById.set(n.id, n.title ?? DEFAULT_NOTE_TITLE);
  }

  return { byId, titleById };
}

/**
 * Splits ancestor IDs for collapsed breadcrumb: hidden go in dropdown, visible stay as links.
 * When total segments (Notes + ancestors + current) > maxVisible, collapse middle.
 */
export function splitBreadcrumbAncestors(
  ancestorIds: string[],
  maxVisible: number
): { hidden: string[]; visible: string[] } {
  const totalSegments = 1 + ancestorIds.length + 1; // Notes + ancestors + current
  const shouldCollapse = totalSegments > maxVisible;

  if (!shouldCollapse) {
    return { hidden: [], visible: ancestorIds };
  }

  return {
    hidden: ancestorIds.slice(0, -1),
    visible: ancestorIds.slice(-1),
  };
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
