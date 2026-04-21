import { useParams } from 'react-router-dom';
import { useNoteEditor } from '../features/notes/model/useNoteEditor';
import { NoteEditorToolbar } from '../features/notes/ui/NoteEditorToolbar';
import { NoteTitleInput } from '../features/notes/ui/NoteTitleInput';
import { NoteEditorBody } from '../features/notes/ui/NoteEditorBody';
import { NoteEditorLearningGradeBar } from '../features/learning/ui/NoteEditorLearningGradeBar';
import { useStudyItemStatus } from '../features/learning/model/useStudyItemStatus';
import { StudyQuestionsAnswersBlock } from '../features/study-questions/ui';
import { usePageTitle } from '../shared/lib/usePageTitle';
import { useAppMode } from '@/features/offline/model/AppModeProvider';
import './NoteEditorPage.css';

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const {
    note,
    isLoading,
    error,
    notes,
    editor,
    title,
    chromeTitle,
    handleTitleChange,
    saveStatus,
    handleDelete,
    handleAddToFavorites,
    handleRemoveFromFavorites,
    handleCreateChild,
    isDeleting,
    isFavorite,
    noteTitlesMap,
    importExport,
    getSlashMenuItems,
    handleGenerateOneQuestionFromSelection,
    handleGenerateUpToFiveQuestionsFromSelection,
    isGeneratingOneQuestionFromSelection,
    isGeneratingUpToFiveQuestionsFromSelection,
  } = useNoteEditor(id);
  const { data: studyItemStatus } = useStudyItemStatus(id ?? null);
  const { isReadOnly } = useAppMode();
  usePageTitle(chromeTitle);

  if (isLoading || !id) {
    return <div className="note-editor-page note-editor-page--loading">Loading data...</div>;
  }

  if (error || !note) {
    return (
      <div className="note-editor-page note-editor-page--error">
        Error: {error?.message ?? 'Note not found'}
      </div>
    );
  }

  return (
    <div className="note-editor-page">
      {!isReadOnly && (
        <NoteEditorToolbar
          activeId={id}
          notes={notes}
          currentTitle={chromeTitle}
          saveStatus={saveStatus}
          isFavorite={isFavorite}
          onAddToFavorites={handleAddToFavorites}
          onRemoveFromFavorites={handleRemoveFromFavorites}
          onCreateChild={handleCreateChild}
          onDelete={handleDelete}
          isDeleting={isDeleting}
          importExport={importExport}
        />
      )}
      <NoteTitleInput
        value={title}
        onChange={handleTitleChange}
        readOnly={isReadOnly}
      />
      <NoteEditorBody
        key={id}
        editor={editor}
        noteTitlesMap={noteTitlesMap}
        getSlashMenuItems={getSlashMenuItems}
        onGenerateOneQuestionFromSelection={handleGenerateOneQuestionFromSelection}
        onGenerateUpToFiveQuestionsFromSelection={handleGenerateUpToFiveQuestionsFromSelection}
        isGeneratingOneQuestionFromSelection={isGeneratingOneQuestionFromSelection}
        isGeneratingUpToFiveQuestionsFromSelection={isGeneratingUpToFiveQuestionsFromSelection}
        isStudyItemActive={studyItemStatus?.status === 'active'}
        isReadOnly={isReadOnly}
      />
      {id && studyItemStatus?.status === 'active' && !isReadOnly ? (
        <StudyQuestionsAnswersBlock pageId={id} />
      ) : null}
      {!isReadOnly && <NoteEditorLearningGradeBar noteId={id} />}
    </div>
  );
}
