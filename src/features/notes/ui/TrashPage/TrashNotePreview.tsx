import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { NoteTitlesContext } from '../../blocks/EmbeddedPageBlock';
import { ensureBlocksArray } from '../../lib/blocks';
import type { TrashNote } from '../../model/trash.types';

interface TrashNotePreviewProps {
  note: TrashNote;
  noteTitlesMap: Map<string, string>;
}

export function TrashNotePreview({
  note,
  noteTitlesMap,
}: TrashNotePreviewProps) {
  const initialContent = ensureBlocksArray(note.rich_content);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useCreateBlockNote({ initialContent: initialContent as any }, [note.id]);

  return (
    <NoteTitlesContext.Provider value={noteTitlesMap}>
      <div className="trash-page__preview-body">
        <BlockNoteView
          editor={editor}
          editable={false}
          slashMenu={false}
          formattingToolbar={false}
          sideMenu={false}
        />
      </div>
    </NoteTitlesContext.Provider>
  );
}
