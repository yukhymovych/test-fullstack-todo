export const DEFAULT_BLOCKS = [{ type: 'paragraph', content: [] }];

type BlockLike = { type?: string; props?: { noteId?: string }; content?: unknown[] };

export function ensureBlocksArray(value: unknown): unknown[] {
  let v = value;

  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return DEFAULT_BLOCKS;
    }
  }

  if (Array.isArray(v) && v.length > 0) {
    return v;
  }

  return DEFAULT_BLOCKS;
}

export function appendEmbeddedPageBlock(
  blocks: BlockLike[],
  noteId: string
): BlockLike[] {
  const embeddedBlock = {
    type: 'embeddedPage',
    props: { noteId },
    content: [] as unknown[],
  };
  const exists = blocks.some(
    (b) => b?.type === 'embeddedPage' && b?.props?.noteId === noteId
  );
  if (exists) return blocks;
  return [...blocks, embeddedBlock];
}
