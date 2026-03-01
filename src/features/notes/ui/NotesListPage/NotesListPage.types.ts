import type { NoteListItem } from '../../model/types';

export interface NotesListPageProps {
  notes: NoteListItem[] | undefined;
  recentNotes: NoteListItem[];
  mainLearningSessionNotes: NoteListItem[];
  dueReadyNotes: NoteListItem[];
  recentFormattedTimes: Map<string, string>;
  mainLearningSessionFormattedTimes: Map<string, string>;
  dueReadyFormattedTimes: Map<string, string>;
  isLoading: boolean;
  error: Error | null;
  createError: Error | null;
  createPending: boolean;
  onNewNote: () => void;
  onNoteClick: (noteId: string) => void;
  onMainLearningSessionClick: () => void;
}
