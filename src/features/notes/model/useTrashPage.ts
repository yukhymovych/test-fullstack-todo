import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  usePermanentDeleteNote,
  useRestoreNote,
  useTrashNoteQuery,
  useTrashNotesQuery,
} from './useNotes';
import { notesRoutes } from '../lib/routes';
import { buildMaps } from '../ui/SidebarNotesTree/treeUtils';
import { getAncestorChain } from './noteHierarchy';
import { getTrashDaysRemaining, isNoteInSubtree, isTrashRoot } from '../domain/trash';

const TRASH_RETENTION_DAYS = 10;

export function useTrashPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('notes');
  const { id: selectedId } = useParams<{ id: string }>();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { data: trashedNotes = [], isLoading, error } = useTrashNotesQuery();
  const { data: selectedNote, isLoading: isSelectedNoteLoading } = useTrashNoteQuery(
    selectedId,
    !!selectedId
  );
  const restoreNote = useRestoreNote();
  const permanentlyDeleteNote = usePermanentDeleteNote();

  const { byId, childrenByParent } = useMemo(
    () => buildMaps(trashedNotes),
    [trashedNotes]
  );
  const hierarchyById = useMemo(
    () =>
      new Map(
        [...byId.entries()].map(([noteId, note]) => [
          noteId,
          { id: noteId, parent_id: note.parent_id ?? null },
        ])
      ),
    [byId]
  );

  const rootIds = useMemo(
    () => trashedNotes.filter(isTrashRoot).map((note) => note.id),
    [trashedNotes]
  );

  useEffect(() => {
    if (!selectedId || !byId.has(selectedId)) {
      return;
    }

    const ancestors = getAncestorChain(selectedId, hierarchyById);
    if (ancestors.length === 0) {
      return;
    }

    setExpanded((current) => {
      const next = new Set(current);
      ancestors.forEach((ancestorId) => next.add(ancestorId));
      return next;
    });
  }, [hierarchyById, selectedId]);

  useEffect(() => {
    if (selectedId && !isLoading && !byId.has(selectedId)) {
      navigate(notesRoutes.trash(), { replace: true });
    }
  }, [byId, isLoading, navigate, selectedId]);

  const toggleExpand = useCallback((noteId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }, []);

  const handleOpen = useCallback(
    (noteId: string) => {
      navigate(notesRoutes.trashItem(noteId));
    },
    [navigate]
  );

  const handleRestore = useCallback(
    async (noteId: string) => {
      if (!window.confirm(t('confirm.restorePage'))) {
        return;
      }

      const restored = await restoreNote.mutateAsync(noteId);
      navigate(notesRoutes.editor(restored.id));
    },
    [navigate, restoreNote, t]
  );

  const handlePermanentDelete = useCallback(
    async (noteId: string) => {
      if (!window.confirm(t('confirm.deletePagePermanently'))) {
        return;
      }

      await permanentlyDeleteNote.mutateAsync(noteId);

      if (selectedId && isNoteInSubtree(noteId, selectedId, childrenByParent)) {
        navigate(notesRoutes.trash(), { replace: true });
      }
    },
    [childrenByParent, navigate, permanentlyDeleteNote, selectedId, t]
  );

  const selectedRootId = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    const selected = byId.get(selectedId);
    return selected?.trashed_root_id ?? null;
  }, [byId, selectedId]);

  const selectedNoteDaysRemaining = selectedNote?.trashed_at
    ? getTrashDaysRemaining(selectedNote.trashed_at, TRASH_RETENTION_DAYS)
    : null;

  return {
    byId,
    childrenByParent,
    rootIds,
    expanded,
    toggleExpand,
    selectedId,
    selectedRootId,
    selectedNote,
    selectedNoteDaysRemaining,
    isLoading,
    isSelectedNoteLoading,
    error,
    isRestoring: restoreNote.isPending,
    isPermanentlyDeleting: permanentlyDeleteNote.isPending,
    getDaysRemaining: (trashedAtIso: string) =>
      getTrashDaysRemaining(trashedAtIso, TRASH_RETENTION_DAYS),
    handleOpen,
    handleRestore,
    handlePermanentDelete,
  };
}
