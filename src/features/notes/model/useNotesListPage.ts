import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotesQuery, useCreateNote } from './useNotes';
import { notesRoutes } from '../lib/routes';
import { formatRelativeTime, formatTodayOrPastDate } from '../domain/formatDate';
import { getRecentNotes } from '../lib/recents';
import { useDueStudyItems, useTodayLearningSession } from '@/features/learning/model';
import { learningRoutes } from '@/features/learning/lib/routes';

export function useNotesListPage() {
  const navigate = useNavigate();
  const { data: notes, isLoading, error } = useNotesQuery();
  const { data: todayLearningSession } = useTodayLearningSession();
  const { data: dueStudyItems = [] } = useDueStudyItems();
  const createMutation = useCreateNote();

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

  return {
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
  };
}
