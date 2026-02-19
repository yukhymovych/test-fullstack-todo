import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useNotesQuery,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '../../model/useNotes';
import { DEFAULT_NOTE_TITLE } from '../../model/types';
import { notesRoutes } from '../../lib/routes';
import * as notesApi from '../../api/notesApi';
import { getAncestorChain } from '../../model/noteHierarchy';
import { buildMaps } from './treeUtils';
import { TreeNode } from './TreeNode';
import { Button } from '@/shared/ui';
import { UserInfo } from '@/app/components/UserInfo';

const NOTE_KEY = (id: string) => ['notes', id];
const EXPANDED_STORAGE_KEY = 'notes-sidebar-expanded';

const DEFAULT_BLOCKS = [{ type: 'paragraph', content: [] }];

function ensureBlocksArray(value: unknown): { type: string; content: unknown[] }[] {
  let v: unknown = value;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  if (Array.isArray(v) && v.length > 0) return v as { type: string; content: unknown[] }[];
  return DEFAULT_BLOCKS;
}

function appendEmbeddedPageBlock(
  blocks: { type?: string; props?: { noteId?: string }; content?: unknown[] }[],
  noteId: string
) {
  const embeddedBlock = {
    type: 'embeddedPage',
    props: { noteId },
    content: [] as unknown[],
  };

  const exists = blocks.some(
    (b) => b?.type === 'embeddedPage' && b?.props?.noteId === noteId
  );
  if (exists) return blocks;

  return [...blocks, embeddedBlock];
}

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

export function SidebarNotesTree() {
  const navigate = useNavigate();
  const { id: activeId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: notes, isLoading, error } = useNotesQuery();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [expanded, setExpanded] = useState<Set<string>>(() => loadExpandedFromStorage());

  const { byId, childrenByParent } = useMemo(() => {
    if (!notes || notes.length === 0) {
      return { byId: new Map(), childrenByParent: new Map<string | null, string[]>() };
    }
    return buildMaps(notes);
  }, [notes]);

  const rootIds = useMemo(() => {
    return childrenByParent.get(null) ?? [];
  }, [childrenByParent]);

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
        const cachedParent = queryClient.getQueryData<{ title?: string; rich_content?: unknown }>(
          NOTE_KEY(parentId)
        );
        const parent = cachedParent ?? (await notesApi.getNote(parentId));

        const parentBlocks = ensureBlocksArray(parent?.rich_content);
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

      navigate(`/notes/${child.id}`);
    },
    [createNote, navigate, queryClient, updateNote]
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

  if (isLoading) {
    return (
      <div style={{ padding: '12px', color: '#9ca3af', fontSize: '13px' }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '12px', color: '#ef4444', fontSize: '13px' }}>
        Error: {error.message}
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div className="px-2 pb-2">
        <UserInfo />
      </div>
      <Button
        variant="ghost-muted"
        fullWidth
        onClick={handleCreateRoot}
        disabled={createNote.isPending}
      >
        {createNote.isPending ? 'Creating...' : 'New page'}
      </Button>
      <div>
        {rootIds.map((nodeId) => (
          <TreeNode
            key={nodeId}
            nodeId={nodeId}
            depth={0}
            byId={byId}
            childrenByParent={childrenByParent}
            expandedSet={expanded}
            toggleExpand={toggleExpand}
            onCreateChild={handleCreateChild}
            onDeletePage={handleDeletePage}
            isDeleting={deleteNote.isPending}
            navigate={handleNavigate}
            activeId={activeId}
          />
        ))}
      </div>
    </div>
  );
}
