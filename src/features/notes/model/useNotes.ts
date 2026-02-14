import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as notesApi from '../api/notesApi';

const NOTES_KEY = ['notes'];
const NOTE_KEY = (id: string) => ['notes', id];

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
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
