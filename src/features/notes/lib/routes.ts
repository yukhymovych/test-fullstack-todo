export const notesRoutes = {
  list: () => '/notes',
  editor: (id: string) => `/notes/${id}`,
} as const;
