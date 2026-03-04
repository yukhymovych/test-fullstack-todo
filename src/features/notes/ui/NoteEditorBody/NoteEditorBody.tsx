import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { NoteTitlesContext } from '../../blocks/EmbeddedPageBlock';
import type { NoteEditorBodyProps } from './NoteEditorBody.types';
import './NoteEditorBody.css';

export function NoteEditorBody({ editor, noteTitlesMap, getSlashMenuItems }: NoteEditorBodyProps) {
  return (
    <NoteTitlesContext.Provider value={noteTitlesMap}>
      <div className="note-editor-body">
        <BlockNoteView editor={editor} slashMenu={false}>
          <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />
        </BlockNoteView>
      </div>
    </NoteTitlesContext.Provider>
  );
}
