import { useMemo } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { NoteTitlesContext } from '@/features/notes/blocks/EmbeddedPageBlock';
import { createNoteEditorSchema } from '@/features/notes/lib/noteEditorSchema';
import { ensureBlocksArray } from '@/features/notes/lib/blocks';
import { Button } from '@/shared/ui';

export interface LearningRevealRichContentProps {
  title: string;
  richContent: unknown;
  noteTitlesMap: Map<string, string>;
  revealed: boolean;
  onReveal: () => void;
  contentKey?: string;
}

export function LearningRevealRichContent({
  title,
  richContent,
  noteTitlesMap,
  revealed,
  onReveal,
  contentKey = '',
}: LearningRevealRichContentProps) {
  const schema = useMemo(() => createNoteEditorSchema(), []);
  const initialContent = useMemo(
    () => ensureBlocksArray(richContent),
    [richContent]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useCreateBlockNote(
    { schema, initialContent: initialContent as any },
    [contentKey]
  );

  return (
    <div className="learning-reveal">
      <h2 className="learning-reveal__title">{title}</h2>
      {!revealed ? (
        <Button
          variant="secondary"
          onClick={onReveal}
          className="learning-reveal__show-btn"
        >
          Show Answer
        </Button>
      ) : (
        <NoteTitlesContext.Provider value={noteTitlesMap}>
          <div className="learning-reveal__rich-content">
            <BlockNoteView editor={editor} editable={false} slashMenu={false} />
          </div>
        </NoteTitlesContext.Provider>
      )}
    </div>
  );
}
