import { DEFAULT_EXPORT_NOTE_TITLE } from './noteImportExport.constants';
import { resolveUniqueFileName, sanitizeExportSegment } from './noteImportExport.files';
import type { SubtreeNoteRecord } from './noteImportExport.types';

export interface SubtreeExportNode {
  noteId: string;
  title: string;
  parentId: string | null;
  directorySegments: string[];
}

export function buildNoteTitlesById(
  notes: SubtreeNoteRecord[]
): Map<string, string> {
  return new Map(
    notes.map((note) => [note.id, note.title?.trim() || DEFAULT_EXPORT_NOTE_TITLE])
  );
}

export function flattenSubtreeForExport(
  rootNoteId: string,
  notes: SubtreeNoteRecord[]
): SubtreeExportNode[] {
  const byParent = new Map<string | null, SubtreeNoteRecord[]>();
  const byId = new Map<string, SubtreeNoteRecord>();
  const originalIndex = new Map<string, number>();

  notes.forEach((note, index) => {
    byId.set(note.id, note);
    originalIndex.set(note.id, index);
    const parentId = note.parent_id ?? null;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(note);
    byParent.set(parentId, siblings);
  });

  const root = byId.get(rootNoteId);
  if (!root) {
    throw new Error(`Root note "${rootNoteId}" was not found in the note tree.`);
  }

  const compareNotes = (left: SubtreeNoteRecord, right: SubtreeNoteRecord) => {
    const leftOrder = left.sort_order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const leftIndex = originalIndex.get(left.id) ?? 0;
    const rightIndex = originalIndex.get(right.id) ?? 0;
    return leftIndex - rightIndex;
  };

  const result: SubtreeExportNode[] = [];
  const usedDirectoryNamesByParentPath = new Map<string, Set<string>>();

  const visit = (note: SubtreeNoteRecord, directorySegments: string[]) => {
    const title = note.title?.trim() || DEFAULT_EXPORT_NOTE_TITLE;
    const parentDirectoryKey = directorySegments.join('/');
    const usedDirectoryNames =
      usedDirectoryNamesByParentPath.get(parentDirectoryKey) ?? new Set<string>();
    usedDirectoryNamesByParentPath.set(parentDirectoryKey, usedDirectoryNames);
    const uniqueDirectoryName = resolveUniqueFileName(
      sanitizeExportSegment(title),
      usedDirectoryNames
    );

    result.push({
      noteId: note.id,
      title,
      parentId: note.parent_id ?? null,
      directorySegments,
    });

    const children = [...(byParent.get(note.id) ?? [])].sort(compareNotes);
    const childDirectorySegments = [...directorySegments, uniqueDirectoryName];

    for (const child of children) {
      visit(child, childDirectorySegments);
    }
  };

  visit(root, []);
  return result;
}
