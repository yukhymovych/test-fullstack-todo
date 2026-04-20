import { randomUUID } from 'node:crypto';
import type {
  BackupNote,
  BackupQuestionAnswer,
  BackupStudyItem,
} from './backup.types.js';

export interface NoteRowForBackup {
  id: string;
  parent_id: string | null;
  title: string;
  rich_content: unknown;
  sort_order: number | null;
  is_favorite: boolean | null;
  created_at: Date;
  updated_at: Date;
}

export interface QuestionAnswerRowForBackup {
  id: string;
  page_id: string;
  question: string;
  answer: string;
  source: 'manual' | 'generated';
}

export interface StudyItemRowForBackup {
  note_id: string;
  is_active: boolean;
  due_at: Date;
  last_reviewed_at: Date | null;
  stability_days: number;
  difficulty: number;
}

/** Map a notes row (read for backup) into the public DTO. */
export function noteRecordToDto(row: NoteRowForBackup): BackupNote {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    richContent: Array.isArray(row.rich_content) ? row.rich_content : [],
    sortOrder: row.sort_order ?? 0,
    isFavorite: row.is_favorite ?? false,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function questionAnswerRecordToDto(
  row: QuestionAnswerRowForBackup
): BackupQuestionAnswer {
  return {
    id: row.id,
    pageId: row.page_id,
    question: row.question,
    answer: row.answer,
    source: row.source,
  };
}

export function studyItemRecordToDto(
  row: StudyItemRowForBackup
): BackupStudyItem {
  return {
    noteId: row.note_id,
    isActive: row.is_active,
    dueAt: row.due_at.toISOString(),
    lastReviewedAt: row.last_reviewed_at
      ? row.last_reviewed_at.toISOString()
      : null,
    stabilityDays: row.stability_days,
    difficulty: row.difficulty,
  };
}

/**
 * Re-anchor notes whose parent is outside the exported set.
 * Pure: returns a new array; never mutates input.
 */
export function reanchorOrphanParents(notes: BackupNote[]): BackupNote[] {
  const presentIds = new Set(notes.map((n) => n.id));
  return notes.map((n) =>
    n.parentId && !presentIds.has(n.parentId)
      ? { ...n, parentId: null }
      : n
  );
}

/**
 * Return every note id that appears more than once in the backup document.
 * Invoked before any write so a malformed backup can be rejected fast.
 *
 * Deterministic ordering: ids are returned in their first-duplicate-encounter order,
 * which keeps error messages stable across runs.
 */
export function findDuplicateNoteIds(notes: { id: string }[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const duplicateOrder: string[] = [];
  for (const note of notes) {
    if (seen.has(note.id)) {
      if (!duplicates.has(note.id)) {
        duplicates.add(note.id);
        duplicateOrder.push(note.id);
      }
    } else {
      seen.add(note.id);
    }
  }
  return duplicateOrder;
}

/**
 * Allocate a fresh UUID for every backup note id.
 * The same map is reused for parent_id, embeddedPage.noteId, page_id, study_item.note_id.
 */
export function buildIdMap(notes: { id: string }[]): Map<string, string> {
  const idMap = new Map<string, string>();
  for (const note of notes) {
    if (!idMap.has(note.id)) {
      idMap.set(note.id, randomUUID());
    }
  }
  return idMap;
}

/**
 * Topologically sort backup notes so each parent is inserted before its children.
 *
 * - Notes whose `parentId` is missing from the document are treated as roots
 *   and counted in `orphanDemotedCount`.
 * - Cycles and self-parents (which a valid DB cannot produce, but a hostile JSON
 *   might) are broken by demoting every cycle member to root with `parentId = null`,
 *   counted in `cycleDemotedCount`.
 * - Within a sibling group, original `sortOrder` then `id` order is preserved.
 *
 * Pure: returns new arrays/sets, never mutates the input.
 */
export function topologicallyOrderBackupNotes(notes: BackupNote[]): {
  ordered: BackupNote[];
  demotedToRoot: Set<string>;
  orphanDemotedCount: number;
  cycleDemotedCount: number;
} {
  const byId = new Map<string, BackupNote>(notes.map((n) => [n.id, n]));
  const childrenByParent = new Map<string | null, BackupNote[]>();
  const orphanIds = new Set<string>();

  function siblingPush(parentId: string | null, child: BackupNote): void {
    const list = childrenByParent.get(parentId);
    if (list) list.push(child);
    else childrenByParent.set(parentId, [child]);
  }

  for (const note of notes) {
    const hasDeclaredParent = note.parentId !== null && note.parentId !== undefined;
    const parentIsKnown = hasDeclaredParent && byId.has(note.parentId as string);
    if (hasDeclaredParent && !parentIsKnown) {
      orphanIds.add(note.id);
    }
    const effectiveParentId = parentIsKnown ? (note.parentId as string) : null;
    siblingPush(effectiveParentId, note);
  }

  const sortKey = (a: BackupNote, b: BackupNote): number => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };

  for (const list of childrenByParent.values()) list.sort(sortKey);

  const ordered: BackupNote[] = [];
  const visited = new Set<string>();

  function visit(node: BackupNote): void {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    ordered.push(node);
    const children = childrenByParent.get(node.id) ?? [];
    for (const child of children) visit(child);
  }

  for (const root of childrenByParent.get(null) ?? []) visit(root);

  // Anything not visited belongs to a cycle (self-parent included): demote each
  // to a root and emit at the end.
  const demotedToRoot = new Set<string>();
  for (const note of notes) {
    if (visited.has(note.id)) continue;
    demotedToRoot.add(note.id);
    visited.add(note.id);
    ordered.push({ ...note, parentId: null });
  }

  return {
    ordered,
    demotedToRoot,
    orphanDemotedCount: orphanIds.size,
    cycleDemotedCount: demotedToRoot.size,
  };
}

/**
 * Compute deterministic per-parent sort_order from an ordered list of (oldId, newParentId).
 * Returns a map keyed by oldId.
 */
export function computeSortOrders(
  orderedNotes: { id: string; parentId: string | null }[]
): Map<string, number> {
  const counters = new Map<string | null, number>();
  const result = new Map<string, number>();
  for (const note of orderedNotes) {
    const next = counters.get(note.parentId) ?? 0;
    result.set(note.id, next);
    counters.set(note.parentId, next + 1);
  }
  return result;
}
