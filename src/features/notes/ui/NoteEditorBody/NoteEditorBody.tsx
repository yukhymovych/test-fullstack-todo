import { useCallback, useState } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { FormattingToolbarController, SuggestionMenuController } from '@blocknote/react';
import { useMediaQuery } from '@mantine/hooks';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { NoteTitlesContext } from '../../blocks/embeddedPage.context';
import type { NoteEditorBodyProps } from './NoteEditorBody.types';
import { MobileBlockToolbar } from './MobileBlockToolbar';
import { SelectionQaToolbar } from './SelectionQaToolbar';
import './NoteEditorBody.css';

export function NoteEditorBody({
  editor,
  noteTitlesMap,
  getSlashMenuItems,
  onGenerateOneQuestionFromSelection,
  onGenerateUpToFiveQuestionsFromSelection,
  isGeneratingOneQuestionFromSelection,
  isGeneratingUpToFiveQuestionsFromSelection,
  isStudyItemActive,
}: NoteEditorBodyProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [interactionVersion, setInteractionVersion] = useState(0);

  const handleEditorPointerDown = useCallback(() => {
    setInteractionVersion((current) => current + 1);
  }, []);

  return (
    <NoteTitlesContext.Provider value={noteTitlesMap}>
      <div className="note-editor-body" onPointerDownCapture={handleEditorPointerDown}>
        <BlockNoteView
          editor={editor}
          slashMenu={false}
          formattingToolbar={false}
          sideMenu={!isMobile}
        >
          <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />
          <MobileBlockToolbar
            isMobile={!!isMobile}
            interactionVersion={interactionVersion}
          />
          <FormattingToolbarController
            formattingToolbar={(props) => (
              <SelectionQaToolbar
                {...props}
                onGenerateOneQuestionFromSelection={onGenerateOneQuestionFromSelection}
                onGenerateUpToFiveQuestionsFromSelection={onGenerateUpToFiveQuestionsFromSelection}
                isGeneratingOneQuestionFromSelection={isGeneratingOneQuestionFromSelection}
                isGeneratingUpToFiveQuestionsFromSelection={
                  isGeneratingUpToFiveQuestionsFromSelection
                }
                isStudyItemActive={isStudyItemActive}
              />
            )}
          />
        </BlockNoteView>
      </div>
    </NoteTitlesContext.Provider>
  );
}
