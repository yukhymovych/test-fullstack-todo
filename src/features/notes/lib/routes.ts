export const notesRoutes = {
  list: () => '/notes',
  editor: (id: string) => `/notes/${id}`,
  trash: () => '/notes/trash',
  trashItem: (id: string) => `/notes/trash/${id}`,
} as const;
