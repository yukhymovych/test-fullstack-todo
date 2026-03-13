import {
  FormattingToolbar,
  getFormattingToolbarItems,
  useBlockNoteEditor,
  type FormattingToolbarProps,
} from '@blocknote/react';
import { SelectionQaToolbarButton } from './SelectionQaToolbarButton';

const MIN_SELECTION_LENGTH = 30;

interface SelectionQaToolbarProps extends FormattingToolbarProps {
  onGenerateOneQuestionFromSelection: (selectedText: string) => void;
  onGenerateUpToFiveQuestionsFromSelection: (selectedText: string) => void;
  isGeneratingOneQuestionFromSelection: boolean;
  isGeneratingUpToFiveQuestionsFromSelection: boolean;
  isStudyItemActive: boolean;
}

export function SelectionQaToolbar({
  blockTypeSelectItems,
  onGenerateOneQuestionFromSelection,
  onGenerateUpToFiveQuestionsFromSelection,
  isGeneratingOneQuestionFromSelection,
  isGeneratingUpToFiveQuestionsFromSelection,
  isStudyItemActive,
}: SelectionQaToolbarProps) {
  const editor = useBlockNoteEditor();

  const runForSelection = (handler: (selectedText: string) => void) => {
    const selectedText = editor.getSelectedText().trim();
    if (selectedText.length < MIN_SELECTION_LENGTH) return;
    handler(selectedText);
  };

  const isBusy =
    isGeneratingOneQuestionFromSelection || isGeneratingUpToFiveQuestionsFromSelection;

  const items = getFormattingToolbarItems(blockTypeSelectItems);
  if (isStudyItemActive) {
    items.push(
      <SelectionQaToolbarButton
        key="generateOneQuestionFromSelection"
        label="Q1"
        tooltip="Create 1 Q/A from selected text with AI"
        onClick={() => runForSelection(onGenerateOneQuestionFromSelection)}
        isDisabled={isBusy}
      />,
      <SelectionQaToolbarButton
        key="generateUpToFiveQuestionsFromSelection"
        label="Q5"
        tooltip="Create up to 5 Q/A from selected text with AI"
        onClick={() => runForSelection(onGenerateUpToFiveQuestionsFromSelection)}
        isDisabled={isBusy}
      />,
    );
  }

  return <FormattingToolbar blockTypeSelectItems={blockTypeSelectItems}>{items}</FormattingToolbar>;
}
