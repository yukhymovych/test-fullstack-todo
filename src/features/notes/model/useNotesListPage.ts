import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotesQuery, useCreateNote } from './useNotes';
import { notesRoutes } from '../lib/routes';
import {
  formatRelativeTime,
  formatTodayOrPastDate,
} from '../domain/formatDate';
import { getRecentNotes } from '../lib/recents';
import {
  useDueStudyItems,
  useStartLearningSession,
  useTodayLearningSession,
  useTodayReviewLogs,
} from '@/features/learning/model';
import { learningRoutes } from '@/features/learning/lib/routes';
import type { Grade } from '@/features/learning/domain/learning.types';

export function useNotesListPage() {
  const navigate = useNavigate();
  const { data: notes, isLoading, error } = useNotesQuery();
  const {
    data: todayLearningSession,
    isLoading: isTodayLearningSessionLoading,
  } = useTodayLearningSession();
  const { data: dueStudyItems = [], isLoading: isDueStudyItemsLoading } =
    useDueStudyItems();
  const { data: todayReviewLogs = [] } = useTodayReviewLogs();
  const createMutation = useCreateNote();
  const startLearningSession = useStartLearningSession();

  const recentNotes = useMemo(() => getRecentNotes(notes), [notes]);

  const mainLearningSessionNotes = useMemo(() => {
    if (!notes || !todayLearningSession) return [];

    const byId = new Map(notes.map((n) => [n.id, n]));
    const pendingIds = todayLearningSession.items
      .filter((item) => item.state === 'pending' && !!item.note_id)
      .sort((a, b) => a.position - b.position)
      .map((item) => item.note_id as string);

    const uniquePendingIds = [...new Set(pendingIds)];

    return uniquePendingIds
      .map((noteId) => byId.get(noteId))
      .filter((note): note is NonNullable<typeof note> => !!note);
  }, [notes, todayLearningSession]);

  const dueReadyNotes = useMemo(() => {
    if (!notes || dueStudyItems.length === 0) return [];

    const byId = new Map(notes.map((n) => [n.id, n]));
    const uniqueDueIds = [...new Set(dueStudyItems.map((item) => item.noteId))];

    return uniqueDueIds
      .map((noteId) => byId.get(noteId))
      .filter((note): note is NonNullable<typeof note> => !!note);
  }, [notes, dueStudyItems]);

  const recentlyReviewedNotes = useMemo(() => {
    if (!notes || todayReviewLogs.length === 0) return [];

    const byId = new Map(notes.map((n) => [n.id, n]));
    const latestReviewedByNoteId = new Map<string, string>();

    todayReviewLogs.forEach((log) => {
      if (!log.grade) return;
      if (!latestReviewedByNoteId.has(log.note_id)) {
        latestReviewedByNoteId.set(log.note_id, log.reviewed_at);
      }
    });

    return [...latestReviewedByNoteId.entries()]
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      .map(([noteId]) => byId.get(noteId))
      .filter((note): note is NonNullable<typeof note> => !!note);
  }, [notes, todayReviewLogs]);

  const recentFormattedTimes = useMemo(() => {
    const map = new Map<string, string>();
    recentNotes.forEach((n) => {
      if (n.last_visited_at) {
        map.set(n.id, formatRelativeTime(n.last_visited_at));
      }
    });
    return map;
  }, [recentNotes]);

  const mainLearningSessionFormattedTimes = useMemo(() => {
    const map = new Map<string, string>();
    mainLearningSessionNotes.forEach((n) => {
      map.set(n.id, 'Pending in today session');
    });
    return map;
  }, [mainLearningSessionNotes]);

  const dueReadyFormattedTimes = useMemo(() => {
    const map = new Map<string, string>();
    const dueAtByNoteId = new Map(
      dueStudyItems.map((item) => [item.noteId, item.dueAt])
    );
    dueReadyNotes.forEach((note) => {
      const dueAt = dueAtByNoteId.get(note.id);
      if (dueAt) {
        map.set(note.id, formatTodayOrPastDate(dueAt));
      }
    });
    return map;
  }, [dueReadyNotes, dueStudyItems]);

  const recentlyReviewedMeta = useMemo(() => {
    const map = new Map<string, { grade: Grade; reviewedAt: string }>();
    todayReviewLogs.forEach((log) => {
      if (!log.grade || map.has(log.note_id)) return;
      map.set(log.note_id, {
        grade: log.grade,
        reviewedAt: formatRelativeTime(log.reviewed_at),
      });
    });
    return map;
  }, [todayReviewLogs]);

  const handleNewNote = async () => {
    const note = await createMutation.mutateAsync({});
    navigate(notesRoutes.editor(note.id));
  };

  const handleNoteClick = (noteId: string) => {
    navigate(notesRoutes.editor(noteId));
  };

  const handleMainLearningSessionClick = () => {
    navigate(learningRoutes.session());
  };

  const reviewableSessionItems =
    todayLearningSession?.items.filter((item) => item.state !== 'unavailable') ?? [];
  const pendingSessionItems = reviewableSessionItems.filter(
    (item) => item.state === 'pending'
  );
  const hasActiveTodayLearningSession = pendingSessionItems.length > 0;
  const hasItemsToLearnToday = dueStudyItems.length > 0;
  const shouldShowLearningSessionButton = hasActiveTodayLearningSession
    || (!todayLearningSession && !isDueStudyItemsLoading && hasItemsToLearnToday);
  const learningSessionButtonLabel = hasActiveTodayLearningSession
    ? 'Continue learning session'
    : 'Start learning session';

  const handleLearningSessionClick = () => {
    if (
      isTodayLearningSessionLoading
      || isDueStudyItemsLoading
      || startLearningSession.isPending
    ) {
      return;
    }

    if (hasActiveTodayLearningSession) {
      navigate(learningRoutes.session());
      return;
    }

    startLearningSession.mutate(undefined, {
      onSuccess: (session) => {
        if (session) {
          navigate(learningRoutes.session());
        }
      },
    });
  };

  return {
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
    isLearningSessionButtonDisabled:
      isTodayLearningSessionLoading
      || isDueStudyItemsLoading
      || startLearningSession.isPending,
    handleNewNote,
    handleLearningSessionClick,
    handleNoteClick,
    handleMainLearningSessionClick,
  };
}
