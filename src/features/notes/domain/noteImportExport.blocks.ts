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

type ImportInlineContent = {
  type?: string;
  text?: string;
  href?: string;
  content?: ImportInlineContent[];
};

function toTextInlineContent(text: string) {
  return [{ type: 'text', text, styles: {} }];
}

function toLinkedInlineContent(text: string, href: string) {
  return [{ type: 'link', href, content: toTextInlineContent(text) }];
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
    content: noteId ? toLinkedInlineContent(title, `/notes/${noteId}`) : toTextInlineContent(title),
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
      if (item && typeof item === 'object' && 'content' in item && Array.isArray(item.content)) {
        return getInlineText(item.content);
      }
      return '';
    })
    .join('');
}

function getEmbeddedPageNoteIdFromLink(content: unknown[] | undefined): string | null {
  if (!Array.isArray(content) || content.length !== 1) {
    return null;
  }

  const item = content[0] as ImportInlineContent;
  if (!item || item.type !== 'link' || typeof item.href !== 'string') {
    return null;
  }

  const href = item.href.trim();
  const routeMatch = href.match(/\/notes\/([^/?#]+)$/);
  if (routeMatch) {
    return routeMatch[1];
  }

  return null;
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
  const linkedNoteId = getEmbeddedPageNoteIdFromLink(nextBlock.content);
  if (linkedNoteId) {
    return {
      type: 'embeddedPage',
      props: { noteId: linkedNoteId },
      content: [],
    };
  }

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
