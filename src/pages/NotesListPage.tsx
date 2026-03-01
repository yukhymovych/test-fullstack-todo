import { useNotesListPage } from '../features/notes/model/useNotesListPage';
import { NotesListPageView } from '../features/notes/ui/NotesListPage';

export function NotesListPage() {
  const {
    notes,
    recentNotes,
    mainLearningSessionNotes,
    dueReadyNotes,
    recentFormattedTimes,
    mainLearningSessionFormattedTimes,
    dueReadyFormattedTimes,
    isLoading,
    error,
    createMutation,
    handleNewNote,
    handleNoteClick,
    handleMainLearningSessionClick,
  } = useNotesListPage();

  return (
    <NotesListPageView
      notes={notes}
      recentNotes={recentNotes}
      mainLearningSessionNotes={mainLearningSessionNotes}
      dueReadyNotes={dueReadyNotes}
      recentFormattedTimes={recentFormattedTimes}
      mainLearningSessionFormattedTimes={mainLearningSessionFormattedTimes}
      dueReadyFormattedTimes={dueReadyFormattedTimes}
      isLoading={isLoading}
      error={error}
      createError={createMutation.error}
      createPending={createMutation.isPending}
      onNewNote={handleNewNote}
      onNoteClick={handleNoteClick}
      onMainLearningSessionClick={handleMainLearningSessionClick}
    />
  );
}
