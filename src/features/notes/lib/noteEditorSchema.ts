import { BlockNoteSchema, createCodeBlockSpec } from '@blocknote/core';
import { codeBlockOptions } from '@blocknote/code-block';
import { EmbeddedPageBlock } from '../blocks/EmbeddedPageBlock';

export function createNoteEditorSchema() {
  return BlockNoteSchema.create().extend({
    blockSpecs: {
      codeBlock: createCodeBlockSpec(codeBlockOptions),
      embeddedPage: EmbeddedPageBlock(),
    },
  });
}
