import { BlockNoteEditor } from '@blocknote/core';

export function createTemporaryExportEditor(blocks: unknown[]) {
  const editor = BlockNoteEditor.create();
  const firstBlock = editor.document[0];

  if (!firstBlock) {
    throw new Error('Temporary export editor did not create an initial block.');
  }

  editor.replaceBlocks(
    [firstBlock.id],
    // BlockNote's block typing is wider than the app's persisted `unknown`.
    // Keep the unsafe cast isolated at the editor boundary.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks as any
  );

  return editor;
}
