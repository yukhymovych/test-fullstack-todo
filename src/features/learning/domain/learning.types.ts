export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type SessionItemState = 'pending' | 'done' | 'skipped' | 'unavailable';

export interface LearningSessionItem {
  id: string;
  session_id: string;
  note_id: string | null;
  position: number;
  state: SessionItemState;
  grade: string | null;
  reviewed_at: string | null;
  is_retry: boolean;
  title?: string;
}

export interface LearningSession {
  id: string;
  user_id: string;
  day_key: string;
  status: string;
  created_at: string;
  kind?: string;
  root_note_id?: string | null;
}

export interface TodaySessionResponse {
  session: LearningSession;
  items: LearningSessionItem[];
}

export interface ScopedSessionSummary {
  sessionId: string;
  rootNoteId: string;
  rootTitle: string;
  done: number;
  total: number;
}

export type StartScopedSessionResponse =
  | { created: true; sessionId: string; total: number; session: TodaySessionResponse }
  | { created: false; sessionId: string; total: number; session: TodaySessionResponse }
  | { created: false; reason: 'NO_ELIGIBLE_PAGES' }
  | { created: false; reason: 'ROOT_NOT_FOUND' };

export type StudyItemStatus = 'active' | 'inactive';

export interface StudyItemStatusResponse {
  status: StudyItemStatus;
  dueAt?: string;
  lastReviewedAt?: string | null;
  gradedToday?: boolean;
  inTodaySession?: boolean;
  sessionItemState?: SessionItemState;
}

export interface StudyItemReviewLog {
  id: string;
  user_id: string;
  note_id: string;
  reviewed_at: string;
  grade: Grade | null;
  source: string;
  session_id: string | null;
  elapsed_days: number | null;
  stability_before: number | null;
  difficulty_before: number | null;
  stability_after: number | null;
  difficulty_after: number | null;
  due_before: string | null;
  due_after: string | null;
  review_day_key: string | null;
}

export interface DueStudyItem {
  noteId: string;
  dueAt: string;
}
