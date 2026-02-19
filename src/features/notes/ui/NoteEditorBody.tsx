import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController } from '@blocknote/react';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { NoteTitlesContext } from '../blocks/EmbeddedPageBlock';

interface NoteEditorBodyProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
  noteTitlesMap: Map<string, string>;
  getSlashMenuItems: (query: string) => Promise<DefaultReactSuggestionItem[]>;
}

export function NoteEditorBody({ editor, noteTitlesMap, getSlashMenuItems }: NoteEditorBodyProps) {
  return (
    <NoteTitlesContext.Provider value={noteTitlesMap}>
      <div style={{ minHeight: '300px', padding: '16px' }}>
        <BlockNoteView editor={editor} slashMenu={false}>
          <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />
        </BlockNoteView>
      </div>
    </NoteTitlesContext.Provider>
  );
}
