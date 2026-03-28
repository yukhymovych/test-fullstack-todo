import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useNotesQuery,
  useCreateNote,
  useUpdateNote,
  useTrashNote,
  useMoveNote,
  useSetNoteFavorite,
  NOTE_KEY,
} from './useNotes';
import * as notesApi from '../api/notesApi';
import { DEFAULT_NOTE_TITLE } from './types';
import { notesRoutes } from '../lib/routes';
import { createChildNote } from '../lib/createChildNote';
import { getAncestorChain } from './noteHierarchy';
import { buildMaps } from '../ui/SidebarNotesTree/treeUtils';
import { formatRelativeTime } from '../domain/formatDate';
import { getRecentNotes } from '../lib/recents';

const EXPANDED_STORAGE_KEY = 'notes-sidebar-expanded';
const RECENTS_EXPANDED_STORAGE_KEY = 'notes-sidebar-recents-expanded';
const FAVORITES_EXPANDED_STORAGE_KEY = 'notes-sidebar-favorites-expanded';
const FAVORITES_TREE_EXPANDED_STORAGE_KEY = 'notes-sidebar-favorites-tree-expanded';
const ALL_PAGES_EXPANDED_STORAGE_KEY = 'notes-sidebar-all-pages-expanded';

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

function loadRecentsExpandedFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(RECENTS_EXPANDED_STORAGE_KEY);
    if (raw === null) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

function saveRecentsExpandedToStorage(expanded: boolean) {
  try {
    localStorage.setItem(RECENTS_EXPANDED_STORAGE_KEY, JSON.stringify(expanded));
  } catch {
    // ignore
  }
}

function loadFavoritesExpandedFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(FAVORITES_EXPANDED_STORAGE_KEY);
    if (raw === null) return true;
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

function saveFavoritesExpandedToStorage(expanded: boolean) {
  try {
    localStorage.setItem(FAVORITES_EXPANDED_STORAGE_KEY, JSON.stringify(expanded));
  } catch {
    // ignore
  }
}

function loadFavoritesTreeExpandedFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_TREE_EXPANDED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveFavoritesTreeExpandedToStorage(set: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_TREE_EXPANDED_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

function loadAllPagesExpandedFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(ALL_PAGES_EXPANDED_STORAGE_KEY);
    if (raw === null) return true;
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

function saveAllPagesExpandedToStorage(expanded: boolean) {
  try {
    localStorage.setItem(ALL_PAGES_EXPANDED_STORAGE_KEY, JSON.stringify(expanded));
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
  const trashNote = useTrashNote();
  const moveNote = useMoveNote();
  const setNoteFavorite = useSetNoteFavorite();

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    loadExpandedFromStorage()
  );
  const [recentsExpanded, setRecentsExpanded] = useState<boolean>(() =>
    loadRecentsExpandedFromStorage()
  );
  const [favoritesExpanded, setFavoritesExpanded] = useState<boolean>(() =>
    loadFavoritesExpandedFromStorage()
  );
  const [favoritesTreeExpanded, setFavoritesTreeExpanded] = useState<Set<string>>(() =>
    loadFavoritesTreeExpandedFromStorage()
  );
  const [allPagesExpanded, setAllPagesExpanded] = useState<boolean>(() =>
    loadAllPagesExpandedFromStorage()
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

  const favoriteIds = useMemo(
    () =>
      (notes ?? [])
        .filter((n) => n.is_favorite)
        .sort((a, b) => {
          const sortA = a.sort_order ?? 0;
          const sortB = b.sort_order ?? 0;
          if (sortA !== sortB) return sortA - sortB;
          return a.id.localeCompare(b.id);
        })
        .map((n) => n.id),
    [notes]
  );

  const recentIds = useMemo(
    () => getRecentNotes(notes).map((n) => n.id),
    [notes]
  );

  const recentFormattedTimes = useMemo(() => {
    const map = new Map<string, string>();
    recentIds.forEach((id) => {
      const note = byId.get(id);
      if (note?.last_visited_at) {
        map.set(id, formatRelativeTime(note.last_visited_at));
      }
    });
    return map;
  }, [recentIds, byId]);

  const toggleRecentsExpand = useCallback(() => {
    setRecentsExpanded((prev) => {
      const next = !prev;
      saveRecentsExpandedToStorage(next);
      return next;
    });
  }, []);

  const toggleFavoritesExpand = useCallback(() => {
    setFavoritesExpanded((prev) => {
      const next = !prev;
      saveFavoritesExpandedToStorage(next);
      return next;
    });
  }, []);

  const toggleAllPagesExpand = useCallback(() => {
    setAllPagesExpanded((prev) => {
      const next = !prev;
      saveAllPagesExpandedToStorage(next);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveExpandedToStorage(next);
      return next;
    });
  }, []);

  const toggleFavoritesTreeExpand = useCallback((id: string) => {
    setFavoritesTreeExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavoritesTreeExpandedToStorage(next);
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

      const child = await createChildNote(parentId, {
        createNote: (payload) =>
          createNote.mutateAsync({
            title: payload.title,
            parent_id: payload.parent_id,
            rich_content: payload.rich_content,
          }),
        updateNote: (noteId, payload) =>
          updateNote.mutateAsync({ id: noteId, payload }),
        getParentNote: async (parentNoteId) => {
          const cached = queryClient.getQueryData<{
            title?: string;
            rich_content?: unknown;
          }>(NOTE_KEY(parentNoteId));
          return cached ?? notesApi.getNote(parentNoteId);
        },
      });

      navigate(notesRoutes.editor(child.id));
    },
    [createNote, updateNote, navigate, queryClient]
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
      if (!window.confirm('Move this page and its child pages to trash?')) return;
      await trashNote.mutateAsync(pageId);
      if (activeId === pageId) {
        navigate(notesRoutes.list());
      }
    },
    [trashNote, activeId, navigate]
  );

  const handleAddToFavorites = useCallback(
    async (noteId: string) => {
      await setNoteFavorite.mutateAsync({ id: noteId, isFavorite: true });
    },
    [setNoteFavorite]
  );

  const handleRemoveFromFavorites = useCallback(
    async (noteId: string) => {
      await setNoteFavorite.mutateAsync({ id: noteId, isFavorite: false });
    },
    [setNoteFavorite]
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
    recentIds,
    recentFormattedTimes,
    recentsExpanded,
    toggleRecentsExpand,
    favoritesTreeExpanded,
    toggleFavoritesTreeExpand,
    favoriteIds,
    favoritesExpanded,
    toggleFavoritesExpand,
    allPagesExpanded,
    toggleAllPagesExpand,
    handleCreateRoot,
    handleCreateChild,
    handleMoveNote,
    handleDeletePage,
    handleNavigate,
    handleAddToFavorites,
    handleRemoveFromFavorites,
    activeId,
    createNote,
    deleteNote: trashNote,
    moveNote,
    setNoteFavorite,
  };
}
