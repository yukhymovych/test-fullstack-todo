/**
 * Port of the server-side `extractContentText` in
 * `api/src/modules/notes/notes.content.ts`. Converts rich BlockNote content
 * into a compact plain-text string that is used for offline search.
 * Keep output deterministic and free of HTML/markup.
 */
interface TextRun {
  type?: string;
  text?: string;
  content?: unknown;
}

interface BlockLike {
  type?: string;
  content?: unknown;
  children?: unknown;
  props?: { caption?: unknown; name?: unknown; url?: unknown };
}

export function extractPlainText(richContent: unknown): string {
  if (!Array.isArray(richContent)) return '';
  const parts: string[] = [];
  for (const block of richContent) {
    if (!isBlockLike(block)) continue;
    walkBlock(block, parts);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function walkBlock(block: BlockLike, out: string[]): void {
  if (Array.isArray(block.content)) {
    for (const run of block.content) {
      if (isTextRun(run) && typeof run.text === 'string') {
        out.push(run.text);
      } else if (isBlockLike(run)) {
        walkBlock(run, out);
      }
    }
  }
  if (block.props) {
    const { caption, name } = block.props;
    if (typeof caption === 'string') out.push(caption);
    if (typeof name === 'string') out.push(name);
  }
  if (Array.isArray(block.children)) {
    for (const child of block.children) {
      if (isBlockLike(child)) walkBlock(child, out);
    }
  }
}

function isBlockLike(v: unknown): v is BlockLike {
  return typeof v === 'object' && v !== null;
}

function isTextRun(v: unknown): v is TextRun {
  return typeof v === 'object' && v !== null && 'text' in v;
}
