type EmbeddedPageBlock = {
  type: 'embeddedPage';
  props?: { noteId?: string };
  content?: unknown;
  children?: unknown;
};

type AnyRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmbeddedPageBlock(value: unknown): value is EmbeddedPageBlock {
  if (!isPlainObject(value)) return false;
  return value.type === 'embeddedPage';
}

/** Walk blocks and extract noteId from embeddedPage blocks. Handles nested content/children. */
export function extractEmbeddedNoteIds(richContent: unknown): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  function walk(node: unknown): void {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!isPlainObject(node)) return;

    if (isEmbeddedPageBlock(node)) {
      const noteId = node.props?.noteId;
      if (typeof noteId === 'string' && noteId.length > 0 && !seen.has(noteId)) {
        seen.add(noteId);
        ids.push(noteId);
      }
    }

    if ('content' in node) walk(node.content);
    if ('children' in node) walk(node.children);
  }

  walk(richContent);
  return ids;
}

/** Flatten BlockNote rich content into a single plaintext string for search. */
export function extractContentText(richContent: unknown): string {
  if (!Array.isArray(richContent)) return '';
  const texts: string[] = [];

  function walk(node: unknown): void {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      texts.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!isPlainObject(node)) return;

    if (typeof node.text === 'string') {
      texts.push(node.text);
    }
    if ('content' in node) walk(node.content);
    if ('children' in node) walk(node.children);
  }

  walk(richContent);
  return texts.join(' ').trim();
}

export interface RemapEmbeddedStats {
  /** embeddedPage blocks dropped because their target is missing from `idMap`. */
  droppedMissingTargetCount: number;
  /** embeddedPage blocks dropped because `props.noteId` was missing/invalid. */
  droppedMalformedCount: number;
}

export interface RemapEmbeddedResult {
  richContent: unknown;
  stats: RemapEmbeddedStats;
}

/**
 * Return a structurally cloned version of `richContent` where every
 * `embeddedPage.noteId` is rewritten via `idMap`, along with counters for the
 * two kinds of dropped blocks.
 *
 * - Recurses through arrays and through `content` / `children` keys so nested
 *   embeddedPage blocks inside other blocks' children are handled.
 * - Blocks whose noteId is missing from `idMap` are removed from their parent
 *   array and counted in `droppedMissingTargetCount`.
 * - Blocks whose `props.noteId` is missing/non-string/empty are removed and
 *   counted in `droppedMalformedCount`.
 * - All other fields/props/marks are preserved as-is.
 *
 * Pure; never mutates the input.
 */
export function remapEmbeddedNoteIdsInRichContent(
  richContent: unknown,
  idMap: ReadonlyMap<string, string>
): RemapEmbeddedResult {
  let droppedMissingTargetCount = 0;
  let droppedMalformedCount = 0;

  function transformArray(items: unknown[]): unknown[] {
    const result: unknown[] = [];
    for (const item of items) {
      if (isEmbeddedPageBlock(item)) {
        const oldNoteId = item.props?.noteId;
        if (typeof oldNoteId !== 'string' || oldNoteId.length === 0) {
          droppedMalformedCount += 1;
          continue;
        }
        const newNoteId = idMap.get(oldNoteId);
        if (!newNoteId) {
          droppedMissingTargetCount += 1;
          continue;
        }
        result.push({
          ...item,
          props: { ...(item.props ?? {}), noteId: newNoteId },
          content: 'content' in item ? transformValue(item.content) : item.content,
          children:
            'children' in item ? transformValue(item.children) : item.children,
        });
        continue;
      }
      result.push(transformValue(item));
    }
    return result;
  }

  function transformValue(value: unknown): unknown {
    if (Array.isArray(value)) return transformArray(value);
    if (!isPlainObject(value)) return value;

    const next: AnyRecord = { ...value };
    if ('content' in next) next.content = transformValue(next.content);
    if ('children' in next) next.children = transformValue(next.children);
    return next;
  }

  const transformed = transformValue(richContent);
  return {
    richContent: transformed,
    stats: { droppedMissingTargetCount, droppedMalformedCount },
  };
}
