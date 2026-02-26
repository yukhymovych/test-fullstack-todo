export const learningRoutes = {
  session: () => '/learning',
  sessionById: (sessionId: string) =>
    `/learning?sessionId=${encodeURIComponent(sessionId)}`,
} as const;
