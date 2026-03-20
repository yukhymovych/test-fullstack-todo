import { BlockNoteView } from '@blocknote/mantine';
import { FormattingToolbarController, SuggestionMenuController } from '@blocknote/react';
import { useMediaQuery } from '@mantine/hooks';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { NoteTitlesContext } from '../../blocks/EmbeddedPageBlock';
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

  return (
    <NoteTitlesContext.Provider value={noteTitlesMap}>
      <div className="note-editor-body">
        <BlockNoteView
          editor={editor}
          slashMenu={false}
          formattingToolbar={false}
          sideMenu={!isMobile}
        >
          <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />
          <MobileBlockToolbar isMobile={!!isMobile} />
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
