import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { useMemo } from 'react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import {
  NoteRouteResolverContext,
  NoteTitlesContext,
} from '../../blocks/embeddedPage.context';
import { ensureBlocksArray } from '../../lib/blocks';
import { createNoteEditorSchema } from '../../lib/noteEditorSchema';
import { notesRoutes } from '../../lib/routes';
import type { TrashNote } from '../../model/trash.types';

interface TrashNotePreviewProps {
  note: TrashNote;
  noteTitlesMap: Map<string, string>;
}

export function TrashNotePreview({
  note,
  noteTitlesMap,
}: TrashNotePreviewProps) {
  const schema = useMemo(() => createNoteEditorSchema(), []);
  const resolveNoteRoute = useMemo(
    () => (noteId: string) =>
      noteTitlesMap.has(noteId) ? notesRoutes.trashItem(noteId) : notesRoutes.editor(noteId),
    [noteTitlesMap]
  );
  const initialContent = ensureBlocksArray(note.rich_content);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useCreateBlockNote(
    { schema, initialContent: initialContent as any },
    [note.id]
  );

  return (
    <NoteRouteResolverContext.Provider value={resolveNoteRoute}>
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
    </NoteRouteResolverContext.Provider>
  );
}
