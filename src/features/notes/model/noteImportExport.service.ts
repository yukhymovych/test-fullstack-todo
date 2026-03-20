import JSZip from 'jszip';
import mammoth from 'mammoth';
import {
  EXPORT_MIME_BY_FORMAT,
} from '../domain/noteImportExport.constants';
import { createExportableBlocks, restoreImportedBlocks } from '../domain/noteImportExport.blocks';
import {
  buildExportFileName,
  buildZipFileName,
  resolveUniqueFileName,
  sanitizeExportSegment,
} from '../domain/noteImportExport.files';
import {
  buildExportHtmlDocument,
  normalizeImportedHtml,
  sanitizeImportedHtml,
} from '../domain/noteImportExport.html';
import { convertTextToImportHtml, normalizeExportText } from '../domain/noteImportExport.text';
import { buildNoteTitlesById, flattenSubtreeForExport } from '../domain/noteImportExport.tree';
import type {
  ActiveNoteExportInput,
  AppendImportedBlocksInput,
  AppendImportedBlocksResult,
  ExportArtifact,
  ImportFileInput,
  ParseImportHtmlInput,
  ReadImportFileResult,
  StoredNoteExportInput,
  StoredNoteHtmlExport,
  StoredSubtreeExportInput,
  SubtreeExportFailure,
  ZipExportArtifact,
} from '../domain/noteImportExport.types';
import { createTemporaryExportEditor } from './noteImportExport.editor';

function getExportableBlocks(
  blocks: unknown[],
  noteTitlesById?: Map<string, string>
) {
  return createExportableBlocks(blocks, noteTitlesById);
}

async function convertDocxArrayBufferToHtml(arrayBuffer: ArrayBuffer) {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`DOCX import failed: ${message}`);
  }
}

function isBlankParagraphBlock(block: unknown): boolean {
  if (!block || typeof block !== 'object') return false;
  if ('type' in block && block.type !== 'paragraph') return false;
  const content =
    'content' in block && Array.isArray(block.content) ? block.content : [];

  return content.every((item) => {
    if (typeof item === 'string') {
      return item.trim() === '';
    }

    if (item && typeof item === 'object' && 'text' in item) {
      return typeof item.text !== 'string' || item.text.trim() === '';
    }

    return true;
  });
}

function createBlankParagraphBlock() {
  return { type: 'paragraph', content: [] as unknown[] };
}

export function renderStoredNoteAsHtml(
  input: StoredNoteExportInput
): StoredNoteHtmlExport {
  const exportableBlocks = getExportableBlocks(input.blocks, input.noteTitlesById);
  const editor = createTemporaryExportEditor(exportableBlocks);
  const bodyHtml = editor.blocksToFullHTML();
  const htmlDocument = buildExportHtmlDocument({
    title: input.noteTitle,
    noteId: input.noteId,
    bodyHtml,
  });

  return {
    htmlDocument,
    bodyHtml,
    exportableBlocks,
  };
}

export function exportStoredNoteAsHtml(
  input: StoredNoteExportInput
): ExportArtifact {
  const result = renderStoredNoteAsHtml(input);

  return {
    format: 'html',
    fileName: buildExportFileName(input.noteTitle, 'html'),
    mimeType: EXPORT_MIME_BY_FORMAT.html,
    content: result.htmlDocument,
  };
}

export function exportStoredNoteAsText(
  input: StoredNoteExportInput
): ExportArtifact {
  const exportableBlocks = getExportableBlocks(input.blocks, input.noteTitlesById);
  const editor = createTemporaryExportEditor(exportableBlocks);
  const content = normalizeExportText(editor.blocksToMarkdownLossy());

  return {
    format: 'txt',
    fileName: buildExportFileName(input.noteTitle, 'txt'),
    mimeType: EXPORT_MIME_BY_FORMAT.txt,
    content,
  };
}

export function exportActiveNoteAsHtml(
  input: ActiveNoteExportInput
): ExportArtifact {
  return exportStoredNoteAsHtml({
    blocks: input.editor.document,
    noteTitle: input.noteTitle,
    noteId: input.noteId,
    noteTitlesById: input.noteTitlesById,
  });
}

export function exportActiveNoteAsText(
  input: ActiveNoteExportInput
): ExportArtifact {
  return exportStoredNoteAsText({
    blocks: input.editor.document,
    noteTitle: input.noteTitle,
    noteId: input.noteId,
    noteTitlesById: input.noteTitlesById,
  });
}

export async function readImportFileToNormalizedHtml(
  file: File
): Promise<ReadImportFileResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.html') || name.endsWith('.htm') || file.type.includes('html')) {
    const rawHtml = await file.text();
    const sanitized = sanitizeImportedHtml(rawHtml);
    return {
      format: 'html',
      normalizedHtml: normalizeImportedHtml(sanitized),
    };
  }

  if (name.endsWith('.txt') || file.type === 'text/plain' || file.type === '') {
    const rawText = await file.text();
    const convertedHtml = convertTextToImportHtml(rawText);
    const sanitized = sanitizeImportedHtml(convertedHtml);
    return {
      format: 'txt',
      normalizedHtml: normalizeImportedHtml(sanitized),
    };
  }

  if (
    name.endsWith('.docx') ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const rawHtml = await convertDocxArrayBufferToHtml(await file.arrayBuffer());
    const sanitized = sanitizeImportedHtml(rawHtml);
    return {
      format: 'docx',
      normalizedHtml: normalizeImportedHtml(sanitized),
    };
  }

  throw new Error(`Unsupported import format for "${file.name}".`);
}

export function parseNormalizedHtmlToImportBlocks(
  input: ParseImportHtmlInput
): unknown[] {
  const html = input.normalizedHtml.trim();
  if (!html) {
    return [];
  }

  const parsedBlocks = input.editor.tryParseHTMLToBlocks(html);
  const restoredBlocks = restoreImportedBlocks(parsedBlocks as unknown[]);

  return restoredBlocks.filter((block) => !isBlankParagraphBlock(block));
}

export function appendImportedBlocksToEditor(
  input: AppendImportedBlocksInput
): AppendImportedBlocksResult {
  if (input.target !== 'document-end') {
    throw new Error(`Unsupported import target "${input.target}".`);
  }

  if (input.blocks.length === 0) {
    return {
      appendedBlockCount: 0,
      insertedSeparator: false,
      replacedEmptyDocument: false,
    };
  }

  const documentBlocks = input.editor.document as unknown[];
  const isEmptyDocument =
    documentBlocks.length === 0 ||
    (documentBlocks.length === 1 && isBlankParagraphBlock(documentBlocks[0]));

  if (isEmptyDocument) {
    const firstBlock = input.editor.document[0];
    if (firstBlock) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input.editor.replaceBlocks([firstBlock.id], input.blocks as any);
    }

    return {
      appendedBlockCount: input.blocks.length,
      insertedSeparator: false,
      replacedEmptyDocument: true,
    };
  }

  const lastBlock = input.editor.document[input.editor.document.length - 1];
  if (!lastBlock) {
    throw new Error('Cannot append imported blocks because the editor document is empty.');
  }

  const needsSeparator =
    !isBlankParagraphBlock(documentBlocks[documentBlocks.length - 1]) &&
    !isBlankParagraphBlock(input.blocks[0]);
  const blocksToInsert = needsSeparator
    ? [createBlankParagraphBlock(), ...input.blocks]
    : input.blocks;

  input.editor.insertBlocks(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocksToInsert as any,
    lastBlock.id,
    'after'
  );

  return {
    appendedBlockCount: input.blocks.length,
    insertedSeparator: needsSeparator,
    replacedEmptyDocument: false,
  };
}

export async function importFileIntoEditor(
  input: ImportFileInput
): Promise<AppendImportedBlocksResult> {
  const { normalizedHtml } = await readImportFileToNormalizedHtml(input.file);
  const blocks = parseNormalizedHtmlToImportBlocks({
    editor: input.editor,
    normalizedHtml,
  });

  return appendImportedBlocksToEditor({
    editor: input.editor,
    blocks,
    target: input.target,
  });
}

function buildSubtreeEntryPath(
  node: ReturnType<typeof flattenSubtreeForExport>[number],
  format: 'html' | 'txt',
  usedNamesByDirectory: Map<string, Set<string>>
) {
  const sanitizedDirectorySegments = node.directorySegments.map((segment) =>
    sanitizeExportSegment(segment)
  );
  const directoryKey = sanitizedDirectorySegments.join('/');
  const usedNames = usedNamesByDirectory.get(directoryKey) ?? new Set<string>();
  usedNamesByDirectory.set(directoryKey, usedNames);

  const uniqueFileName = resolveUniqueFileName(
    buildExportFileName(node.title, format),
    usedNames
  );

  return [...sanitizedDirectorySegments, uniqueFileName].join('/');
}

function buildFailureManifest(failures: SubtreeExportFailure[]) {
  return failures
    .map(
      (failure) =>
        `noteId: ${failure.noteId}\nzipPath: ${failure.zipPath}\nerror: ${failure.error}`
    )
    .join('\n\n');
}

export async function exportSubtreeAsZip(
  input: StoredSubtreeExportInput
): Promise<ZipExportArtifact> {
  const zip = new JSZip();
  const usedNamesByDirectory = new Map<string, Set<string>>();
  const failures: SubtreeExportFailure[] = [];
  const titleById = input.noteTitlesById ?? buildNoteTitlesById(input.notes);
  const nodes = flattenSubtreeForExport(input.rootNoteId, input.notes);

  for (const node of nodes) {
    const zipPath = buildSubtreeEntryPath(node, input.format, usedNamesByDirectory);

    try {
      const note = await input.getNoteById(node.noteId);
      const artifact =
        input.format === 'html'
          ? exportStoredNoteAsHtml({
              blocks: Array.isArray(note.rich_content) ? note.rich_content : [],
              noteTitle: note.title,
              noteId: note.id,
              noteTitlesById: titleById,
            })
          : exportStoredNoteAsText({
              blocks: Array.isArray(note.rich_content) ? note.rich_content : [],
              noteTitle: note.title,
              noteId: note.id,
              noteTitlesById: titleById,
            });

      zip.file(zipPath, artifact.content);
    } catch (error) {
      failures.push({
        noteId: node.noteId,
        zipPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (failures.length > 0) {
    zip.file('__export-errors.txt', buildFailureManifest(failures));
  }

  const rootNode = nodes[0];
  const blob = await zip.generateAsync({ type: 'blob' });

  return {
    fileName: buildZipFileName(rootNode?.title ?? input.rootNoteId),
    mimeType: 'application/zip',
    blob,
    entryCount: nodes.length - failures.length + (failures.length > 0 ? 1 : 0),
    failures,
  };
}
