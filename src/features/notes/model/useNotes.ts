import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as notesApi from '../api/notesApi';
import { LEARNING_KEYS } from '@/features/learning/model/learning.queries';

const NOTES_KEY = ['notes'];
export const NOTE_KEY = (id: string) => ['notes', id];
export const TRASH_KEY = ['notes', 'trash'];
export const TRASH_NOTE_KEY = (id: string) => ['notes', 'trash', id];
export const NOTE_EMBEDS_KEY = (noteId: string) => ['notes', noteId, 'embeds'];

function invalidateNoteCollections(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: NOTES_KEY });
  queryClient.invalidateQueries({ queryKey: TRASH_KEY });
  queryClient.invalidateQueries({ queryKey: LEARNING_KEYS.all });
}

export function useNotesQuery() {
  return useQuery({
    queryKey: NOTES_KEY,
    queryFn: notesApi.getNotes,
  });
}

export function useTrashNotesQuery() {
  return useQuery({
    queryKey: TRASH_KEY,
    queryFn: notesApi.getTrashNotes,
  });
}

export function useNoteQuery(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: NOTE_KEY(id ?? ''),
    queryFn: () => notesApi.getNote(id!),
    enabled: !!id && enabled,
  });
}

export function useTrashNoteQuery(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: TRASH_NOTE_KEY(id ?? ''),
    queryFn: () => notesApi.getTrashNote(id!),
    enabled: !!id && enabled,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notesApi.createNote,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      if (variables.parent_id) {
        queryClient.invalidateQueries({ queryKey: NOTE_EMBEDS_KEY(variables.parent_id) });
      }
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { title: string; rich_content: unknown } }) =>
      notesApi.updateNote(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      queryClient.invalidateQueries({ queryKey: NOTE_KEY(variables.id) });
      queryClient.invalidateQueries({ queryKey: NOTE_EMBEDS_KEY(variables.id) });
    },
  });
}

export function useDeleteNote() {
  return useTrashNote();
}

export function useTrashNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notesApi.trashNote,
    onSuccess: (_, noteId) => {
      invalidateNoteCollections(queryClient);
      queryClient.invalidateQueries({ queryKey: NOTE_KEY(noteId) });
      queryClient.invalidateQueries({ queryKey: TRASH_NOTE_KEY(noteId) });
    },
  });
}

export function useRestoreNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notesApi.restoreNote,
    onSuccess: (note) => {
      invalidateNoteCollections(queryClient);
      queryClient.invalidateQueries({ queryKey: NOTE_KEY(note.id) });
      queryClient.invalidateQueries({ queryKey: TRASH_NOTE_KEY(note.id) });
    },
  });
}

export function usePermanentDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notesApi.permanentlyDeleteNote,
    onSuccess: (_, noteId) => {
      invalidateNoteCollections(queryClient);
      queryClient.removeQueries({ queryKey: NOTE_KEY(noteId) });
      queryClient.removeQueries({ queryKey: TRASH_NOTE_KEY(noteId) });
    },
  });
}

export function useSetNoteFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      notesApi.setNoteFavorite(id, isFavorite),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      queryClient.invalidateQueries({ queryKey: NOTE_KEY(variables.id) });
    },
  });
}

export function useUpdateNoteLastVisited() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesApi.updateNoteLastVisited(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

type MoveNoteVariables = {
  id: string;
  payload: Parameters<typeof notesApi.moveNote>[1];
  oldParentId?: string;
};

export function useMoveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: MoveNoteVariables) =>
      notesApi.moveNote(id, payload),
    onSuccess: (_, variables: MoveNoteVariables) => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      queryClient.invalidateQueries({ queryKey: NOTE_KEY(variables.id) });
      if (variables.payload.new_parent_id) {
        queryClient.invalidateQueries({
          queryKey: NOTE_EMBEDS_KEY(variables.payload.new_parent_id),
        });
      }
      if (variables.oldParentId) {
        queryClient.invalidateQueries({
          queryKey: NOTE_EMBEDS_KEY(variables.oldParentId),
        });
      }
    },
  });
}

export function useNoteEmbeds(noteId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: NOTE_EMBEDS_KEY(noteId ?? ''),
    queryFn: () => notesApi.getNoteEmbeds(noteId!),
    enabled: !!noteId && enabled,
  });
}
