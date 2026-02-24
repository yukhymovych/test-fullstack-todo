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
}

export interface TodaySessionResponse {
  session: LearningSession;
  items: LearningSessionItem[];
}

export type StudyItemStatus = 'active' | 'inactive';

export interface StudyItemStatusResponse {
  status: StudyItemStatus;
  dueAt?: string;
  lastReviewedAt?: string | null;
  gradedToday?: boolean;
  inTodaySession?: boolean;
  sessionItemState?: SessionItemState;
}
