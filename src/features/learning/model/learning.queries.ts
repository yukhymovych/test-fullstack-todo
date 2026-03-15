export const LEARNING_KEYS = {
  all: ['learning'] as const,
  todaySession: (timezone?: string) =>
    [...LEARNING_KEYS.all, 'today', timezone ?? 'browser'] as const,
  sessionById: (sessionId: string) =>
    [...LEARNING_KEYS.all, 'session', sessionId] as const,
  todayScopedSessions: (timezone?: string) =>
    [...LEARNING_KEYS.all, 'scoped', 'today', timezone ?? 'browser'] as const,
  todayReviewLogs: (timezone?: string) =>
    [...LEARNING_KEYS.all, 'reviews', 'today', timezone ?? 'browser'] as const,
  dueItems: () => [...LEARNING_KEYS.all, 'dueItems'] as const,
  studyItemStatus: (pageId: string) =>
    [...LEARNING_KEYS.all, 'studyItem', pageId] as const,
};

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}
