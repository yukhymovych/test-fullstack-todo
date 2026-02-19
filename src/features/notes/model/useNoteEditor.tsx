import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateBlockNote, useEditorChange } from '@blocknote/react';
import { BlockNoteSchema, createCodeBlockSpec } from '@blocknote/core';
import { codeBlockOptions } from '@blocknote/code-block';
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import { RiFileTextLine } from 'react-icons/ri';
import {
  useNoteQuery,
  useUpdateNote,
  useDeleteNote,
  useCreateNote,
  useNotesQuery,
  useNoteEmbeds,
} from './useNotes';
import { DEFAULT_NOTE_TITLE } from './types';
import { EmbeddedPageBlock } from '../blocks/EmbeddedPageBlock';
import { ensureBlocksArray, DEFAULT_BLOCKS } from '../lib/blocks';
import { notesRoutes } from '../lib/routes';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useNoteEditor(id: string | undefined) {
  const navigate = useNavigate();
  const { data: note, isLoading, error } = useNoteQuery(id, true);
  const { data: notes } = useNotesQuery();
  const { data: embeds } = useNoteEmbeds(id, !!id);
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();
  const createMutation = useCreateNote();

  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const noteTitlesMap = useMemo(() => {
    const map = new Map<string, string>();
    notes?.forEach((n) => map.set(n.id, n.title || DEFAULT_NOTE_TITLE));
    embeds?.forEach((e) => map.set(e.id, e.title || DEFAULT_NOTE_TITLE));
    return map;
  }, [notes, embeds]);

  const schema = useMemo(() => {
    return BlockNoteSchema.create().extend({
      blockSpecs: {
        codeBlock: createCodeBlockSpec(codeBlockOptions),
        embeddedPage: EmbeddedPageBlock(),
      },
    });
  }, []);

  const initialContent = note ? ensureBlocksArray(note.rich_content) : DEFAULT_BLOCKS;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useCreateBlockNote({ schema, initialContent: initialContent as any }, [note?.id]);

  const performSave = useCallback(async () => {
    if (!id || !editor) return;
    setSaveStatus('saving');
    try {
      const richContent = JSON.parse(JSON.stringify(editor.document));
      await updateMutation.mutateAsync({
        id,
        payload: { title: title.trim() || DEFAULT_NOTE_TITLE, rich_content: richContent },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [id, editor, title, updateMutation]);

  const scheduleSave = useDebouncedCallback(performSave, 800);

  useEditorChange(() => {
    scheduleSave();
  }, editor);

  useEffect(() => {
    if (note) setTitle(note.title || '');
  }, [note]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      scheduleSave();
    },
    [scheduleSave],
  );

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!window.confirm('Delete this note?')) return;
    await deleteMutation.mutateAsync(id);
    navigate(notesRoutes.list());
  }, [id, deleteMutation, navigate]);

  const getSlashMenuItems = useCallback(
    async (query: string) => {
      const { getDefaultReactSlashMenuItems } = await import('@blocknote/react');
      const defaultItems = getDefaultReactSlashMenuItems(editor!);
      const pageItem = {
        title: 'Page',
        subtext: 'Embed a new page',
        onItemClick: () => {
          if (!editor || !id) return;
          createMutation
            .mutateAsync({
              title: DEFAULT_NOTE_TITLE,
              parent_id: id,
              rich_content: [{ type: 'paragraph', content: [] }],
            })
            .then((newNote) => {
              (
                insertOrUpdateBlockForSlashMenu as (
                  a: typeof editor,
                  b: { type: string; props: Record<string, unknown> },
                ) => unknown
              )(editor, { type: 'embeddedPage', props: { noteId: newNote.id } });
            })
            .catch(() => {});
        },
        icon: <RiFileTextLine size={18} />,
        key: 'embeddedPage' as const,
        aliases: ['embed', 'page', 'subpage'],
      };
      return filterSuggestionItems([pageItem, ...defaultItems], query);
    },
    [editor, id, createMutation],
  );

  return {
    note,
    isLoading,
    error,
    notes,
    embeds,
    editor,
    title,
    handleTitleChange,
    saveStatus,
    handleDelete,
    isDeleting: deleteMutation.isPending,
    noteTitlesMap,
    getSlashMenuItems,
  };
}
