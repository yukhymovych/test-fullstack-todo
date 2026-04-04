export const notesRoutes = {
  list: () => '/notes',
  settings: () => '/notes/settings',
  editor: (id: string) => `/notes/${id}`,
  trash: () => '/notes/trash',
  trashItem: (id: string) => `/notes/trash/${id}`,
} as const;
