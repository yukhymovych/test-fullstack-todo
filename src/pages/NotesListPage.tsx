import { useNotesListPage } from '../features/notes/model/useNotesListPage';
import { NotesListPageView } from '../features/notes/ui/NotesListPage';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../shared/lib/usePageTitle';

export function NotesListPage() {
  const { t } = useTranslation('common');
  usePageTitle(t('pageTitles.notes'));

  const {
    notes,
    recentNotes,
    mainLearningSessionNotes,
    dueReadyNotes,
    recentlyReviewedNotes,
    recentFormattedTimes,
    mainLearningSessionFormattedTimes,
    dueReadyFormattedTimes,
    recentlyReviewedMeta,
    isLoading,
    error,
    createMutation,
    shouldShowLearningSessionButton,
    learningSessionButtonLabel,
    isLearningSessionButtonDisabled,
    handleNewNote,
    handleLearningSessionClick,
    handleNoteClick,
    handleMainLearningSessionClick,
  } = useNotesListPage();

  return (
    <NotesListPageView
      notes={notes}
      recentNotes={recentNotes}
      mainLearningSessionNotes={mainLearningSessionNotes}
      dueReadyNotes={dueReadyNotes}
      recentlyReviewedNotes={recentlyReviewedNotes}
      recentFormattedTimes={recentFormattedTimes}
      mainLearningSessionFormattedTimes={mainLearningSessionFormattedTimes}
      dueReadyFormattedTimes={dueReadyFormattedTimes}
      recentlyReviewedMeta={recentlyReviewedMeta}
      isLoading={isLoading}
      error={error}
      createError={createMutation.error}
      createPending={createMutation.isPending}
      showLearningSessionButton={shouldShowLearningSessionButton}
      learningSessionButtonLabel={learningSessionButtonLabel}
      learningSessionButtonDisabled={isLearningSessionButtonDisabled}
      onNewNote={handleNewNote}
      onLearningSessionClick={handleLearningSessionClick}
      onNoteClick={handleNoteClick}
      onMainLearningSessionClick={handleMainLearningSessionClick}
    />
  );
}
