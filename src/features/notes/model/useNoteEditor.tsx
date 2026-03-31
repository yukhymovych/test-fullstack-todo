import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateBlockNote, useEditorChange } from '@blocknote/react';
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import { FaRegFileAlt } from "react-icons/fa";
import {
  useNoteQuery,
  useUpdateNote,
  useTrashNote,
  useCreateNote,
  useNotesQuery,
  useNoteEmbeds,
  useUpdateNoteLastVisited,
  useSetNoteFavorite,
  NOTE_KEY,
} from './useNotes';
import { useQueryClient } from '@tanstack/react-query';
import * as notesApi from '../api/notesApi';
import { createChildNote } from '../lib/createChildNote';
import { DEFAULT_NOTE_TITLE } from './types';
import { createNoteEditorSchema } from '../lib/noteEditorSchema';
import { ensureBlocksArray, DEFAULT_BLOCKS } from '../lib/blocks';
import { notesRoutes } from '../lib/routes';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';
import { useGenerateStudyQuestions } from '@/features/study-questions/model/useStudyQuestions';
import type { GenerateStudyQuestionsMode } from '@/features/study-questions/domain/studyQuestions.types';
import { showToast } from '@/shared/lib/toast';
import { useNoteImportExport } from './useNoteImportExport';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
const MIN_SELECTION_TEXT_LENGTH = 30;
const HIDDEN_SLASH_MENU_ITEM_TITLES = new Set(['image', 'video', 'audio', 'file', 'emoji']);

export function useNoteEditor(id: string | undefined) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: note, isLoading, error } = useNoteQuery(id, true);
  const { data: notes } = useNotesQuery();
  const { data: embeds } = useNoteEmbeds(id, !!id);
  const updateMutation = useUpdateNote();
  const trashMutation = useTrashNote();
  const createMutation = useCreateNote();
  const setNoteFavorite = useSetNoteFavorite();
  const updateLastVisited = useUpdateNoteLastVisited();
  const generateOneQuestionFromSelection = useGenerateStudyQuestions(id ?? '');
  const generateUpToFiveQuestionsFromSelection = useGenerateStudyQuestions(id ?? '');

  const [title, setTitle] = useState('');
  const [userEditedTitle, setUserEditedTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const noteTitlesMap = useMemo(() => {
    const map = new Map<string, string>();
    notes?.forEach((n) => map.set(n.id, n.title || DEFAULT_NOTE_TITLE));
    embeds?.forEach((e) => map.set(e.id, e.title || DEFAULT_NOTE_TITLE));
    return map;
  }, [notes, embeds]);

  const schema = useMemo(() => createNoteEditorSchema(), []);

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
    setUserEditedTitle(false);
  }, [id]);

  useEffect(() => {
    if (!note) return;
    const displayTitle =
      note.title === DEFAULT_NOTE_TITLE || !note.title ? '' : note.title;
    setTitle(displayTitle);
  }, [note]);

  useEffect(() => {
    if (!note || !editor) return;

    const nextBlocks = ensureBlocksArray(note.rich_content);
    const nextSerialized = JSON.stringify(nextBlocks);
    const currentSerialized = JSON.stringify(editor.document);

    if (currentSerialized === nextSerialized) {
      return;
    }

    const currentBlockIds = editor.document.map((block) => block.id);
    if (currentBlockIds.length === 0) {
      return;
    }

    // Keep the editor in sync when the page changes remotely, such as
    // when drag-and-drop rewrites embedded child blocks on a parent page.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.replaceBlocks(currentBlockIds, nextBlocks as any);
  }, [editor, note]);

  const chromeTitle =
    title.trim() ||
    (userEditedTitle ? DEFAULT_NOTE_TITLE : (note?.title || DEFAULT_NOTE_TITLE));
  const hasChildren = notes?.some((n) => n.parent_id === id) ?? false;

  const lastVisitedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id || !note || id === lastVisitedIdRef.current) return;
    lastVisitedIdRef.current = id;
    updateLastVisited.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutate is stable; ref guard prevents duplicate calls
  }, [id, note?.id]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setUserEditedTitle(true);
      setTitle(e.target.value);
      scheduleSave();
    },
    [scheduleSave],
  );

  const handleDelete = useCallback(
    async (noteId?: string) => {
      const targetId = noteId ?? id;
      if (!targetId) return;
      if (!window.confirm('Move this page and its child pages to trash?')) return;
      await trashMutation.mutateAsync(targetId);
      navigate(notesRoutes.list());
    },
    [id, trashMutation, navigate]
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

  const handleCreateChild = useCallback(
    async (parentId: string) => {
      const child = await createChildNote(parentId, {
        createNote: (payload) =>
          createMutation.mutateAsync({
            title: payload.title,
            parent_id: payload.parent_id,
            rich_content: payload.rich_content,
          }),
        updateNote: (noteId, payload) =>
          updateMutation.mutateAsync({ id: noteId, payload }),
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
    [createMutation, updateMutation, queryClient, navigate]
  );

  const getSlashMenuItems = useCallback(
    async (query: string) => {
      const { getDefaultReactSlashMenuItems } = await import('@blocknote/react');
      const defaultItems = getDefaultReactSlashMenuItems(editor!).filter(
        (item) => !HIDDEN_SLASH_MENU_ITEM_TITLES.has(item.title.toLowerCase())
      );
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
        icon: <FaRegFileAlt size={18} />,
        key: 'embeddedPage' as const,
        aliases: ['embed', 'page', 'subpage'],
      };
      return filterSuggestionItems([pageItem, ...defaultItems], query);
    },
    [editor, id, createMutation],
  );

  const handleGenerateQuestionsFromSelection = useCallback(
    (selectedText: string, mode: GenerateStudyQuestionsMode) => {
      if (!id) return;
      const text = selectedText.trim();
      if (text.length < MIN_SELECTION_TEXT_LENGTH) return;
      showToast('Q/A creation has started');

      const run = async () => {
        const mutation =
          mode === 'one' ? generateOneQuestionFromSelection : generateUpToFiveQuestionsFromSelection;
        const created = await mutation.mutateAsync({ text, mode });
        if (created.length > 0) {
          showToast('Q/A creation completed');
        }
      };

      run().catch(() => {});
    },
    [id, generateOneQuestionFromSelection, generateUpToFiveQuestionsFromSelection],
  );

  const importExport = useNoteImportExport({
    editor,
    noteId: id,
    noteTitle: chromeTitle,
    notes,
    noteTitlesById: noteTitlesMap,
    hasChildren,
  });

  return {
    note,
    isLoading,
    error,
    notes,
    embeds,
    editor,
    title,
    handleTitleChange,
    chromeTitle,
    saveStatus,
    handleDelete,
    handleAddToFavorites,
    handleRemoveFromFavorites,
    handleCreateChild,
    isDeleting: trashMutation.isPending,
    isFavorite: notes?.find((n) => n.id === id)?.is_favorite ?? false,
    noteTitlesMap,
    importExport,
    getSlashMenuItems,
    handleGenerateOneQuestionFromSelection: (selectedText: string) =>
      handleGenerateQuestionsFromSelection(selectedText, 'one'),
    handleGenerateUpToFiveQuestionsFromSelection: (selectedText: string) =>
      handleGenerateQuestionsFromSelection(selectedText, 'up_to_five'),
    isGeneratingOneQuestionFromSelection: generateOneQuestionFromSelection.isPending,
    isGeneratingUpToFiveQuestionsFromSelection: generateUpToFiveQuestionsFromSelection.isPending,
  };
}
