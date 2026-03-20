import {
  DEFAULT_EXPORT_NOTE_TITLE,
} from './noteImportExport.constants';

type ExportBlock = {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown[];
  children?: ExportBlock[];
};

type ImportBlock = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown[];
  children?: ImportBlock[];
};

function toTextInlineContent(text: string) {
  return [{ type: 'text', text, styles: {} }];
}

function normalizeEmbeddedPageBlock(
  block: ExportBlock,
  noteTitlesById?: Map<string, string>
): ExportBlock {
  const noteId =
    typeof block.props?.noteId === 'string' ? block.props.noteId : '';
  const title =
    (noteId ? noteTitlesById?.get(noteId) : undefined) ??
    DEFAULT_EXPORT_NOTE_TITLE;

  return {
    type: 'paragraph',
    content: toTextInlineContent(
      noteId ? `[Embedded page: ${title}] (note: ${noteId})` : `[Embedded page: ${title}]`
    ),
  };
}

function normalizeSingleBlock(
  block: ExportBlock,
  noteTitlesById?: Map<string, string>
): ExportBlock {
  if (block.type === 'embeddedPage') {
    return normalizeEmbeddedPageBlock(block, noteTitlesById);
  }

  const normalizedChildren = Array.isArray(block.children)
    ? (createExportableBlocks(block.children, noteTitlesById) as ExportBlock[])
    : undefined;

  return normalizedChildren ? { ...block, children: normalizedChildren } : block;
}

export function createExportableBlocks(
  blocks: unknown[],
  noteTitlesById?: Map<string, string>
): unknown[] {
  return blocks.map((block) =>
    normalizeSingleBlock(block as ExportBlock, noteTitlesById)
  );
}

function getInlineText(content: unknown[] | undefined): string {
  if (!Array.isArray(content)) return '';

  return content
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'text' in item) {
        return typeof item.text === 'string' ? item.text : '';
      }
      return '';
    })
    .join('');
}

function restoreSingleImportBlock(block: ImportBlock): ImportBlock {
  const restoredChildren = Array.isArray(block.children)
    ? restoreImportedBlocks(block.children) as ImportBlock[]
    : undefined;
  const nextBlock = restoredChildren ? { ...block, children: restoredChildren } : block;

  if (nextBlock.type !== 'paragraph') {
    return nextBlock;
  }

  const text = getInlineText(nextBlock.content).trim();
  const embeddedMatch = text.match(/^\[Embedded page:\s*(.+?)\]\s+\(note:\s*([^)]+)\)$/);
  if (!embeddedMatch) {
    return nextBlock;
  }

  return {
    type: 'embeddedPage',
    props: { noteId: embeddedMatch[2].trim() },
    content: [],
  };
}

export function restoreImportedBlocks(blocks: unknown[]): unknown[] {
  return blocks.map((block) => restoreSingleImportBlock(block as ImportBlock));
}
