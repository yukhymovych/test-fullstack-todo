import type { NoteListItem } from '../../model/types';
import type { Grade } from '@/features/learning/domain/learning.types';

export interface RecentlyReviewedMeta {
  grade: Grade;
  reviewedAt: string;
}

export interface NotesListPageProps {
  notes: NoteListItem[] | undefined;
  recentNotes: NoteListItem[];
  mainLearningSessionNotes: NoteListItem[];
  dueReadyNotes: NoteListItem[];
  recentlyReviewedNotes: NoteListItem[];
  recentFormattedTimes: Map<string, string>;
  mainLearningSessionFormattedTimes: Map<string, string>;
  dueReadyFormattedTimes: Map<string, string>;
  recentlyReviewedMeta: Map<string, RecentlyReviewedMeta>;
  isLoading: boolean;
  error: Error | null;
  createError: Error | null;
  createPending: boolean;
  onNewNote: () => void;
  onNoteClick: (noteId: string) => void;
  onMainLearningSessionClick: () => void;
}
