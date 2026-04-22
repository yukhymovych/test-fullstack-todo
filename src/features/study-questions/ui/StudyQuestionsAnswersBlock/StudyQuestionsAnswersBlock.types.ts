import type { StudyQuestionAnswer } from '../../domain/studyQuestions.types';

export interface StudyQuestionsAnswersBlockProps {
  pageId: string;
  /** Offline / read-only: show cached Q&A only, hide create/edit/AI. */
  readOnly?: boolean;
}

export interface StudyQuestionsAccordionProps {
  pairs: StudyQuestionAnswer[];
}
