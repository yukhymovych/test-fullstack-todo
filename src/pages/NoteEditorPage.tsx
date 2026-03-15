import { useParams } from 'react-router-dom';
import { useNoteEditor } from '../features/notes/model/useNoteEditor';
import { DEFAULT_NOTE_TITLE } from '../features/notes/model/types';
import { NoteEditorToolbar } from '../features/notes/ui/NoteEditorToolbar';
import { NoteTitleInput } from '../features/notes/ui/NoteTitleInput';
import { NoteEditorBody } from '../features/notes/ui/NoteEditorBody';
import { NoteEditorLearningGradeBar } from '../features/learning/ui/NoteEditorLearningGradeBar';
import { useStudyItemStatus } from '../features/learning/model/useStudyItemStatus';
import { StudyQuestionsAnswersBlock } from '../features/study-questions/ui';
import { usePageTitle } from '../shared/lib/usePageTitle';
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
    handleTitleChange,
    saveStatus,
    handleDelete,
    handleAddToFavorites,
    handleRemoveFromFavorites,
    handleCreateChild,
    isDeleting,
    isFavorite,
    noteTitlesMap,
    getSlashMenuItems,
    handleGenerateOneQuestionFromSelection,
    handleGenerateUpToFiveQuestionsFromSelection,
    isGeneratingOneQuestionFromSelection,
    isGeneratingUpToFiveQuestionsFromSelection,
  } = useNoteEditor(id);
  const { data: studyItemStatus } = useStudyItemStatus(id ?? null);
  const resolvedTitle = title.trim() || note?.title || DEFAULT_NOTE_TITLE;
  usePageTitle(resolvedTitle);

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
      <NoteEditorToolbar
        activeId={id}
        notes={notes}
        currentTitle={resolvedTitle}
        saveStatus={saveStatus}
        isFavorite={isFavorite}
        onAddToFavorites={handleAddToFavorites}
        onRemoveFromFavorites={handleRemoveFromFavorites}
        onCreateChild={handleCreateChild}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
      <NoteTitleInput value={title} onChange={handleTitleChange} />
      <NoteEditorBody
        editor={editor}
        noteTitlesMap={noteTitlesMap}
        getSlashMenuItems={getSlashMenuItems}
        onGenerateOneQuestionFromSelection={handleGenerateOneQuestionFromSelection}
        onGenerateUpToFiveQuestionsFromSelection={handleGenerateUpToFiveQuestionsFromSelection}
        isGeneratingOneQuestionFromSelection={isGeneratingOneQuestionFromSelection}
        isGeneratingUpToFiveQuestionsFromSelection={isGeneratingUpToFiveQuestionsFromSelection}
        isStudyItemActive={studyItemStatus?.status === 'active'}
      />
      {id && studyItemStatus?.status === 'active' ? (
        <StudyQuestionsAnswersBlock pageId={id} />
      ) : null}
      <NoteEditorLearningGradeBar noteId={id} />
    </div>
  );
}
