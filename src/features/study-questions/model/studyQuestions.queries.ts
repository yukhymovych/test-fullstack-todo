export const STUDY_QUESTIONS_KEYS = {
  all: ['studyQuestions'] as const,
  byPage: (pageId: string) =>
    [...STUDY_QUESTIONS_KEYS.all, 'page', pageId] as const,
  generateByPage: (pageId: string) =>
    [...STUDY_QUESTIONS_KEYS.byPage(pageId), 'generate'] as const,
};
