import type { BlockNoteEditor } from '@blocknote/core';

export type ExportFormat = 'html' | 'txt';
export type ImportFormat = 'html' | 'txt' | 'docx';
export type ImportTarget = 'document-end';

export interface ExportArtifact {
  format: ExportFormat;
  fileName: string;
  mimeType: string;
  content: string;
}

export interface ExportContext {
  noteTitle: string;
  noteId?: string;
  noteTitlesById?: Map<string, string>;
}

export interface StoredNoteExportInput extends ExportContext {
  blocks: unknown[];
}

export interface StoredNoteHtmlExport {
  htmlDocument: string;
  bodyHtml: string;
  exportableBlocks: unknown[];
}

export interface ActiveNoteExportInput extends ExportContext {
  editor: BlockNoteEditor<any, any, any>;
}

export type TreeExportFormat = ExportFormat;

export interface SubtreeExportFailure {
  noteId: string;
  zipPath: string;
  error: string;
}

export interface ZipExportArtifact {
  fileName: string;
  mimeType: 'application/zip';
  blob: Blob;
  entryCount: number;
  failures: SubtreeExportFailure[];
}

export interface SubtreeNoteRecord {
  id: string;
  title?: string;
  parent_id?: string | null;
  sort_order?: number;
}

export interface StoredSubtreeExportInput {
  rootNoteId: string;
  format: TreeExportFormat;
  notes: SubtreeNoteRecord[];
  getNoteById: (noteId: string) => Promise<{ id: string; title: string; rich_content: unknown }>;
  noteTitlesById?: Map<string, string>;
}

export interface ReadImportFileResult {
  format: ImportFormat;
  normalizedHtml: string;
}

export interface ParseImportHtmlInput {
  editor: BlockNoteEditor<any, any, any>;
  normalizedHtml: string;
}

export interface AppendImportedBlocksInput {
  editor: BlockNoteEditor<any, any, any>;
  blocks: unknown[];
  target: ImportTarget;
}

export interface AppendImportedBlocksResult {
  appendedBlockCount: number;
  insertedSeparator: boolean;
  replacedEmptyDocument: boolean;
}

export interface ImportFileInput {
  editor: BlockNoteEditor<any, any, any>;
  file: File;
  target: ImportTarget;
}
