import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react';
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
  isReadOnly = false,
}: NoteEditorBodyProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [interactionVersion, setInteractionVersion] = useState(0);

  const handleEditorClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    // Ignore clicks coming from floating editor controls so they can handle
    // the interaction without being remounted mid-click.
    if (
      target.closest('.bn-toolbar') ||
      target.closest('.bn-menu-dropdown') ||
      target.closest('.mobile-block-toolbar-wrap')
    ) {
      return;
    }

    setInteractionVersion((current) => current + 1);
  }, []);

  return (
    <NoteTitlesContext.Provider value={noteTitlesMap}>
      <div className="note-editor-body" onClickCapture={handleEditorClick}>
        <BlockNoteView
          editor={editor}
          editable={!isReadOnly}
          slashMenu={false}
          formattingToolbar={false}
          sideMenu={!isMobile && !isReadOnly}
        >
          {!isReadOnly && (
            <SuggestionMenuController
              triggerCharacter="/"
              getItems={getSlashMenuItems}
            />
          )}
          {!isReadOnly && (
            <MobileBlockToolbar
              isMobile={!!isMobile}
              interactionVersion={interactionVersion}
            />
          )}
          {!isReadOnly && (
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
          )}
        </BlockNoteView>
      </div>
    </NoteTitlesContext.Provider>
  );
}
