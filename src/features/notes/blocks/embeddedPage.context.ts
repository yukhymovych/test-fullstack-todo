import { createContext } from 'react';
import { notesRoutes } from '../lib/routes';

export const NoteTitlesContext = createContext<Map<string, string>>(new Map());

export const NoteRouteResolverContext = createContext<(noteId: string) => string>(
  (noteId) => notesRoutes.editor(noteId)
);
