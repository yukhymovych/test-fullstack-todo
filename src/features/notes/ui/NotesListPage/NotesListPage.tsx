import { useState } from 'react';
import { BookOpen, CircleAlert, Clock } from 'lucide-react';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui';
import { NotesSliderSection } from '../NotesSliderSection';
import type { NotesListPageProps } from './NotesListPage.types';
import './NotesListPage.css';

export function NotesListPageView({
  notes,
  recentNotes,
  mainLearningSessionNotes,
  dueReadyNotes,
  recentFormattedTimes,
  mainLearningSessionFormattedTimes,
  dueReadyFormattedTimes,
  isLoading,
  error,
  createError,
  createPending,
  onNewNote,
  onNoteClick,
  onMainLearningSessionClick,
}: NotesListPageProps) {
  const [isDueTooltipOpen, setIsDueTooltipOpen] = useState(false);

  if (isLoading) {
    return <div className="notes-list-page__container">Loading notes...</div>;
  }

  if (error) {
    return (
      <div className="notes-list-page__container notes-list-page__container--error">
        Error loading notes: {error.message}
      </div>
    );
  }

  return (
    <div className="notes-list-page__container">
      <div className="notes-list-page__toolbar">
        <div className="notes-list-page__toolbar-actions">
          <Button
            variant="primary"
            onClick={onNewNote}
            disabled={createPending}
          >
            {createPending ? 'Creating...' : 'New page'}
          </Button>
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
      </div>

      <div>
        {!notes || notes.length === 0 && (
          <p>No notes yet. Click &quot;New note&quot; to create one.</p>
        )}
      </div>
    </div>
  );
}
