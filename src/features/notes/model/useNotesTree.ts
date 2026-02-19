import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useNotesQuery,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useMoveNote,
  NOTE_KEY,
} from './useNotes';
import * as notesApi from '../api/notesApi';
import { DEFAULT_NOTE_TITLE } from './types';
import { notesRoutes } from '../lib/routes';
import { ensureBlocksArray, appendEmbeddedPageBlock } from '../lib/blocks';
import { getAncestorChain } from './noteHierarchy';
import { buildMaps } from '../ui/SidebarNotesTree/treeUtils';

const EXPANDED_STORAGE_KEY = 'notes-sidebar-expanded';

function loadExpandedFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveExpandedToStorage(set: Set<string>) {
  try {
    localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export function useNotesTree() {
  const navigate = useNavigate();
  const { id: activeId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: notes, isLoading, error } = useNotesQuery();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const moveNote = useMoveNote();

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    loadExpandedFromStorage()
  );

  const { byId, childrenByParent } = useMemo(() => {
    if (!notes || notes.length === 0) {
      return {
        byId: new Map(),
        childrenByParent: new Map<string | null, string[]>(),
      };
    }
    return buildMaps(notes);
  }, [notes]);

  const rootIds = useMemo(
    () => childrenByParent.get(null) ?? [],
    [childrenByParent]
  );

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveExpandedToStorage(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!activeId || !byId.has(activeId)) return;
    const ancestors = getAncestorChain(activeId, byId);
    if (ancestors.length === 0) return;
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const a of ancestors) {
        if (!next.has(a)) {
          next.add(a);
          changed = true;
        }
      }
      if (changed) saveExpandedToStorage(next);
      return next;
    });
  }, [activeId, byId]);

  const handleCreateRoot = useCallback(async () => {
    const note = await createNote.mutateAsync({
      title: DEFAULT_NOTE_TITLE,
      parent_id: null,
      rich_content: [{ type: 'paragraph', content: [] }],
    });
    navigate(notesRoutes.editor(note.id));
  }, [createNote, navigate]);

  const handleCreateChild = useCallback(
    async (parentId: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        saveExpandedToStorage(next);
        return next;
      });

      const child = await createNote.mutateAsync({
        title: DEFAULT_NOTE_TITLE,
        parent_id: parentId,
        rich_content: [{ type: 'paragraph', content: [] }],
      });

      try {
        const cachedParent = queryClient.getQueryData<{
          title?: string;
          rich_content?: unknown;
        }>(NOTE_KEY(parentId));
        const parent = cachedParent ?? (await notesApi.getNote(parentId));
        const parentBlocks = ensureBlocksArray(parent?.rich_content) as {
          type?: string;
          props?: { noteId?: string };
          content?: unknown[];
        }[];
        const updatedBlocks = appendEmbeddedPageBlock(parentBlocks, child.id);

        await updateNote.mutateAsync({
          id: parentId,
          payload: {
            title: parent?.title?.trim() || DEFAULT_NOTE_TITLE,
            rich_content: updatedBlocks,
          },
        });
      } catch (e) {
        console.warn('Failed to append embedded page block to parent note', e);
      }

      navigate(notesRoutes.editor(child.id));
    },
    [createNote, navigate, queryClient, updateNote]
  );

  const handleMoveNote = useCallback(
    async (noteId: string, newParentId: string | null, position: number) => {
      const node = byId.get(noteId);
      const oldParentId = node?.parent_id ?? null;
      await moveNote.mutateAsync({
        id: noteId,
        payload: {
          new_parent_id: newParentId,
          position,
        },
        oldParentId: oldParentId ?? undefined,
      });
    },
    [byId, moveNote]
  );

  const handleNavigate = useCallback(
    (id: string) => {
      navigate(notesRoutes.editor(id));
    },
    [navigate]
  );

  const handleDeletePage = useCallback(
    async (pageId: string) => {
      if (!window.confirm('Delete this page?')) return;
      await deleteNote.mutateAsync(pageId);
      if (activeId === pageId) {
        navigate(notesRoutes.list());
      }
    },
    [deleteNote, activeId, navigate]
  );

  return {
    notes,
    isLoading,
    error,
    byId,
    childrenByParent,
    rootIds,
    expanded,
    toggleExpand,
    handleCreateRoot,
    handleCreateChild,
    handleMoveNote,
    handleDeletePage,
    handleNavigate,
    activeId,
    createNote,
    deleteNote,
    moveNote,
  };
}
