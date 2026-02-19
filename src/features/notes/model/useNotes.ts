import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as notesApi from '../api/notesApi';

const NOTES_KEY = ['notes'];
export const NOTE_KEY = (id: string) => ['notes', id];
export const NOTE_EMBEDS_KEY = (noteId: string) => ['notes', noteId, 'embeds'];

export function useNotesQuery() {
  return useQuery({
    queryKey: NOTES_KEY,
    queryFn: notesApi.getNotes,
  });
}

export function useNoteQuery(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: NOTE_KEY(id ?? ''),
    queryFn: () => notesApi.getNote(id!),
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notesApi.deleteNote,
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
