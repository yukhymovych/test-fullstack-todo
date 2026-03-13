import { BlockNoteView } from '@blocknote/mantine';
import { FormattingToolbarController, SuggestionMenuController } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { NoteTitlesContext } from '../../blocks/EmbeddedPageBlock';
import type { NoteEditorBodyProps } from './NoteEditorBody.types';
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
  return (
    <NoteTitlesContext.Provider value={noteTitlesMap}>
      <div className="note-editor-body">
        <BlockNoteView editor={editor} slashMenu={false} formattingToolbar={false}>
          <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />
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
