import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, CircleAlert, Clock, History } from 'lucide-react';
import { Badge, Button, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui';
import { GRADE_BADGE_STYLES, getGradeLabel } from '@/features/learning/lib/gradePresentation';
import { NotesSliderSection } from '../NotesSliderSection';
import type { NotesListPageProps } from './NotesListPage.types';
import './NotesListPage.css';

export function NotesListPageView({
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
  createError,
  createPending,
  showLearningSessionButton,
  learningSessionButtonLabel,
  learningSessionButtonDisabled,
  showNewPageButton = true,
  onNewNote,
  onLearningSessionClick,
  onNoteClick,
  onMainLearningSessionClick,
}: NotesListPageProps) {
  const [isDueTooltipOpen, setIsDueTooltipOpen] = useState(false);
  const { t } = useTranslation(['common', 'learning', 'notes']);

  if (isLoading) {
    return <div className="notes-list-page__container">{t('list.loading', { ns: 'notes' })}</div>;
  }

  if (error) {
    return (
      <div className="notes-list-page__container notes-list-page__container--error">
        {t('list.errorLoading', { ns: 'notes', message: error.message })}
      </div>
    );
  }

  const showToolbar = showNewPageButton || showLearningSessionButton;

  return (
    <div className="notes-list-page__container">
      {showToolbar ? (
        <div className="notes-list-page__toolbar">
          <div className="notes-list-page__toolbar-actions">
            {showNewPageButton ? (
              <Button
                variant="primary"
                size='sm'
                onClick={onNewNote}
                disabled={createPending}
              >
                {createPending
                  ? t('sidebar.creating', { ns: 'notes' })
                  : t('sidebar.newPage', { ns: 'notes' })}
              </Button>
            ) : null}
            {showLearningSessionButton ? (
              <Button
                variant="ghost-muted"
                size='sm'
                onClick={onLearningSessionClick}
                disabled={learningSessionButtonDisabled}
              >
                {learningSessionButtonLabel}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {createError && (
        <div className="notes-list-page__create-error">
          {t('errors.withMessage', { ns: 'common', message: createError.message })}
        </div>
      )}

      <div className="notes-list-page__middle">
        <NotesSliderSection
          title={t('list.recentlyVisited', { ns: 'notes' })}
          icon={Clock}
          notes={recentNotes}
          formattedTimes={recentFormattedTimes}
          onNoteClick={onNoteClick}
        />
        <NotesSliderSection
          title={t('list.todayMainLearningSession', { ns: 'notes' })}
          icon={BookOpen}
          notes={mainLearningSessionNotes}
          formattedTimes={mainLearningSessionFormattedTimes}
          onNoteClick={onMainLearningSessionClick}
        />
        <NotesSliderSection
          title={t('list.readyForLearning', { ns: 'notes' })}
          icon={BookOpen}
          titleSuffix={
            <>
              <span className="font-medium text-[#9ca3af]">
                {dueReadyNotes.length}
              </span>
              <Tooltip open={isDueTooltipOpen} onOpenChange={setIsDueTooltipOpen}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('list.dueItemsInfo', { ns: 'notes' })}
                    className="inline-flex cursor-help items-center border-0 bg-transparent p-0 text-[#9ca3af] hover:text-[#d1d5db]"
                    onClick={() => setIsDueTooltipOpen((prev) => !prev)}
                  >
                    <CircleAlert className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('list.dueItemsTooltip', { ns: 'notes' })}
                </TooltipContent>
              </Tooltip>
            </>
          }
          notes={dueReadyNotes}
          formattedTimes={dueReadyFormattedTimes}
          onNoteClick={onNoteClick}
        />
        <NotesSliderSection
          title={t('list.recentlyReviewed', { ns: 'notes' })}
          icon={History}
          notes={recentlyReviewedNotes}
          formattedTimes={new Map()}
          renderMeta={(noteId) => {
            const meta = recentlyReviewedMeta.get(noteId);
            if (!meta) return null;
            return (
              <span className="notes-list-page__reviewed-meta">
                <Badge className={GRADE_BADGE_STYLES[meta.grade]}>
                  {getGradeLabel(t, meta.grade)}
                </Badge>
                <span>{meta.reviewedAt}</span>
              </span>
            );
          }}
          onNoteClick={onNoteClick}
        />
      </div>

      <div>
        {!notes || notes.length === 0 && (
          <p>{t('list.empty', { ns: 'notes' })}</p>
        )}
      </div>
    </div>
  );
}
