import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as notesApi from '../features/notes/api/notesApi';
import { useTodayLearningSession } from '../features/learning/model/useTodayLearningSession';
import { useNoteEmbeds } from '../features/notes/model/useNotes';
import { DEFAULT_NOTE_TITLE } from '../features/notes/model/types';
import { useSubmitLearningGrade } from '../features/learning/model/useSubmitLearningGrade';
import { LearningProgressHeader } from '../features/learning/ui/LearningProgressHeader';
import { LearningReveal } from '../features/learning/ui/LearningReveal';
import { LearningGradeBar } from '../features/learning/ui/LearningGradeBar';
import { LearningSummary } from '../features/learning/ui/LearningSummary';
import { LearningAnimatedSwitch } from '../features/learning/ui/LearningAnimatedSwitch';
import type { Grade } from '../features/learning/domain/learning.types';
import '../features/learning/ui/LearningPage.css';

export function LearningSessionPage() {
  const { data: session, isLoading, error } = useTodayLearningSession();
  const submitGrade = useSubmitLearningGrade();

  const pendingItems = session?.items.filter((i) => i.state === 'pending') ?? [];
  const currentItem = pendingItems[0];
  const noteQuery = useQuery({
    queryKey: ['note', currentItem?.note_id],
    queryFn: () => notesApi.getNote(currentItem!.note_id!),
    enabled: !!currentItem?.note_id,
  });
  const { data: embeds } = useNoteEmbeds(
    currentItem?.note_id ?? undefined,
    !!currentItem?.note_id
  );
  const noteTitlesMap = useMemo(() => {
    const map = new Map<string, string>();
    embeds?.forEach((e) => map.set(e.id, e.title || DEFAULT_NOTE_TITLE));
    return map;
  }, [embeds]);

  if (isLoading) {
    return <div className="learning-page-loading">Loading session...</div>;
  }

  if (error) {
    return (
      <div className="learning-page-error">
        Error: {error.message}
      </div>
    );
  }

  if (!session || session.items.length === 0) {
    return (
      <div className="learning-page-empty">
        <p>No items to review today.</p>
      </div>
    );
  }

  const allDone = pendingItems.length === 0;

  if (allDone) {
    return (
      <div className="learning-page">
        <LearningSummary items={session.items} />
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="learning-page-empty">
        <p>No pending items.</p>
      </div>
    );
  }

  const doneCount = session.items.filter((i) => i.state === 'done').length;
  const displayIndex = doneCount;
  const note = noteQuery.data;
  const title = currentItem.title ?? note?.title ?? '(Untitled)';
  const content = note?.content_text ?? '';
  const richContent = note?.rich_content;

  const handleGrade = (grade: Grade) => {
    if (submitGrade.isPending) return;
    submitGrade.mutate(
      { sessionItemId: currentItem.id, grade },
      {}
    );
  };

  return (
    <div className="learning-page">
      <LearningProgressHeader items={session.items} currentIndex={displayIndex} />
      <main className="learning-page__main">
        <LearningAnimatedSwitch key={currentItem.id}>
          <LearningReveal
            title={title}
            content={content}
            richContent={richContent}
            noteTitlesMap={noteTitlesMap}
            contentKey={currentItem.note_id ?? currentItem.id}
          />
        </LearningAnimatedSwitch>
        <div className="learning-page__grade-bar">
          <LearningGradeBar
            onGrade={handleGrade}
            disabled={submitGrade.isPending}
          />
        </div>
      </main>
    </div>
  );
}
