import { useState } from 'react';
import { BookOpen, CircleAlert, Clock, History } from 'lucide-react';
import { Badge, Button, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui';
import { GRADE_BADGE_STYLES, GRADE_LABELS } from '@/features/learning/lib/gradePresentation';
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
  onNewNote,
  onLearningSessionClick,
  onNoteClick,
  onMainLearningSessionClick,
}: NotesListPageProps) {
  const [isDueTooltipOpen, setIsDueTooltipOpen] = useState(false);

  if (isLoading) {
    return <div className="notes-list-page__container">Loading data...</div>;
  }

  if (error) {
    return (
      <div className="notes-list-page__container notes-list-page__container--error">
        Error loading data: {error.message}
      </div>
    );
  }

  return (
    <div className="notes-list-page__container">
      <div className="notes-list-page__toolbar">
        <div className="notes-list-page__toolbar-actions">
          <Button
            variant="primary"
            size='sm'
            onClick={onNewNote}
            disabled={createPending}
          >
            {createPending ? 'Creating...' : 'New page'}
          </Button>
          {showLearningSessionButton && (
            <Button
              variant="ghost-muted"
              size='sm'
              onClick={onLearningSessionClick}
              disabled={learningSessionButtonDisabled}
            >
              {learningSessionButtonLabel}
            </Button>
          )}
        </div>
      </div>

      {createError && (
        <div className="notes-list-page__create-error">Error: {createError.message}</div>
      )}

      <div className="notes-list-page__middle">
        <NotesSliderSection
          title="Recently visited"
          icon={Clock}
          notes={recentNotes}
          formattedTimes={recentFormattedTimes}
          onNoteClick={onNoteClick}
        />
        <NotesSliderSection
          title="Today's main learning session"
          icon={BookOpen}
          notes={mainLearningSessionNotes}
          formattedTimes={mainLearningSessionFormattedTimes}
          onNoteClick={onMainLearningSessionClick}
        />
        <NotesSliderSection
          title="Ready for learning"
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
                    aria-label="Due items info"
                    className="inline-flex cursor-help items-center border-0 bg-transparent p-0 text-[#9ca3af] hover:text-[#d1d5db]"
                    onClick={() => setIsDueTooltipOpen((prev) => !prev)}
                  >
                    <CircleAlert className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  All notes with next review date equals Today or in the past.
                </TooltipContent>
              </Tooltip>
            </>
          }
          notes={dueReadyNotes}
          formattedTimes={dueReadyFormattedTimes}
          onNoteClick={onNoteClick}
        />
        <NotesSliderSection
          title="Recently reviewed"
          icon={History}
          notes={recentlyReviewedNotes}
          formattedTimes={new Map()}
          renderMeta={(noteId) => {
            const meta = recentlyReviewedMeta.get(noteId);
            if (!meta) return null;
            return (
              <span className="notes-list-page__reviewed-meta">
                <Badge className={GRADE_BADGE_STYLES[meta.grade]}>
                  {GRADE_LABELS[meta.grade]}
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
          <p>No notes yet. Click &quot;New note&quot; to create one.</p>
        )}
      </div>
    </div>
  );
}
