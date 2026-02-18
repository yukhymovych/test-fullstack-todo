import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateBlockNote, useEditorChange } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController } from '@blocknote/react';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { BlockNoteSchema, createCodeBlockSpec } from '@blocknote/core';
import { codeBlockOptions } from '@blocknote/code-block';
import { RiFileTextLine } from 'react-icons/ri';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useNoteQuery, useUpdateNote, useDeleteNote, useCreateNote, useNotesQuery, useNoteEmbeds } from '../features/notes/model/useNotes';
import { NoteTitlesContext, EmbeddedPageBlock } from '../features/notes/blocks/EmbeddedPageBlock';
import { Button } from '@/shared/ui';
import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';

const DEFAULT_BLOCKS = [{ type: 'paragraph', content: [] }];

function ensureBlocksArray(value: unknown): unknown[] {
  let v = value;

  // Handle legacy stringified JSON from DB
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      console.warn('[ensureBlocksArray] Failed to parse string as JSON, using default blocks');
      return DEFAULT_BLOCKS;
    }
  }

  // Ensure we have a valid array
  if (Array.isArray(v) && v.length > 0) {
    return v;
  }

  console.warn('[ensureBlocksArray] Invalid or empty blocks, using default blocks');
  return DEFAULT_BLOCKS;
}

function useDebouncedSave(saveFn: () => void, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  const scheduleSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      saveFnRef.current();
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return scheduleSave;
}

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: note, isLoading, error } = useNoteQuery(id, true);
  const { data: notes } = useNotesQuery();
  const { data: embeds } = useNoteEmbeds(id, !!id);
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();
  const createMutation = useCreateNote();

  const noteTitlesMap = useMemo(() => {
    const map = new Map<string, string>();
    notes?.forEach((n) => map.set(n.id, n.title || 'Untitled'));
    embeds?.forEach((e) => map.set(e.id, e.title || 'Untitled'));
    return map;
  }, [notes, embeds]);

  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Create schema with default blocks + custom blocks - memoized to avoid recreation
  const schema = useMemo(() => {
    // Start with default schema and extend with custom blocks
    const baseSchema = BlockNoteSchema.create();
    return baseSchema.extend({
      blockSpecs: {
        codeBlock: createCodeBlockSpec(codeBlockOptions),
        embeddedPage: EmbeddedPageBlock(),
      },
    });
  }, []);

  const initialContent = note
    ? ensureBlocksArray(note.rich_content)
    : DEFAULT_BLOCKS;

  // Debug log for troubleshooting (can remove after confirming fix)
  useEffect(() => {
    if (note) {
      console.log('[NoteEditorPage] Note rich_content type:', typeof note.rich_content);
      console.log('[NoteEditorPage] Processed initialContent:', initialContent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  const editor = useCreateBlockNote(
    {
      schema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialContent: initialContent as any,
    },
    [note?.id]
  );

  const getSlashMenuItems = useCallback(
    async (query: string) => {
      const defaultItems = (await import('@blocknote/react')).getDefaultReactSlashMenuItems(editor!);
      const pageItem = {
        title: 'Page',
        subtext: 'Embed a new page',
        onItemClick: () => {
          if (!editor || !id) return;
          createMutation
            .mutateAsync({
              title: 'Untitled',
              parent_id: id,
              rich_content: [{ type: 'paragraph', content: [] }],
            })
            .then((newNote) => {
              (insertOrUpdateBlockForSlashMenu as (a: typeof editor, b: { type: string; props: Record<string, unknown> }) => unknown)(editor, {
                type: 'embeddedPage',
                props: { noteId: newNote.id },
              });
            })
            .catch(() => { });
        },
        icon: <RiFileTextLine size={18} />,
        key: 'embeddedPage' as const,
        aliases: ['embed', 'page', 'subpage'],
      };
      return filterSuggestionItems([pageItem, ...defaultItems], query);
    },
    [editor, id, createMutation]
  );

  const performSave = useCallback(async () => {
    if (!id || !editor) return;
    setSaveStatus('saving');
    try {
      const blocks = editor.document;
      console.log('[performSave] blocks type:', typeof blocks);
      console.log('[performSave] blocks is array:', Array.isArray(blocks));
      console.log('[performSave] blocks sample:', JSON.stringify(blocks).slice(0, 200));

      const richContent = JSON.parse(JSON.stringify(blocks));
      console.log('[performSave] richContent type:', typeof richContent);
      console.log('[performSave] richContent is array:', Array.isArray(richContent));

      await updateMutation.mutateAsync({
        id,
        payload: {
          title: title.trim() || 'Untitled',
          rich_content: richContent,
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[performSave] Save error:', err);
      setSaveStatus('error');
    }
  }, [id, editor, title, updateMutation]);

  const scheduleSave = useDebouncedSave(performSave, 800);

  useEditorChange(() => {
    scheduleSave();
  }, editor);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
    }
  }, [note]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    scheduleSave();
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Delete this note?')) return;
    await deleteMutation.mutateAsync(id);
    navigate('/notes');
  };

  const handleBack = () => {
    navigate('/notes');
  };

  const contentStyles = {
    padding: '20px',
    maxWidth: 800,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box' as const,
  };

  if (isLoading || !id) {
    return <div style={contentStyles}>Loading note...</div>;
  }

  if (error || !note) {
    return (
      <div style={{ ...contentStyles, color: 'red' }}>
        Error: {error?.message ?? 'Note not found'}
      </div>
    );
  }

  return (
    <div style={contentStyles}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <Button variant="secondary" onClick={handleBack}>
          Back to list
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '13px',
              color:
                saveStatus === 'saving'
                  ? '#2563eb'
                  : saveStatus === 'saved'
                    ? '#16a34a'
                    : saveStatus === 'error'
                      ? '#dc2626'
                      : '#6b7280',
            }}
          >
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Error saving'}
            {saveStatus === 'idle' && '\u00A0'}
          </span>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Note title"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '12px 16px',
          fontSize: '40px',
          fontWeight: 'bold',
          marginBottom: '16px',
        }}
      />

      <NoteTitlesContext.Provider value={noteTitlesMap}>
        <div
          style={{
            minHeight: '300px',
            padding: '16px',
          }}
        >
          <BlockNoteView
            editor={editor}
            slashMenu={false}
          >
            <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />
          </BlockNoteView>
        </div>
      </NoteTitlesContext.Provider>

      {embeds && embeds.length > 0 && (
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
            Pages in this page
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {embeds.map((embed) => (
              <li key={embed.id} style={{ marginBottom: '6px' }}>
                <Button
                  variant="link"
                  onClick={() => navigate(`/notes/${embed.id}`)}
                >
                  {embed.title || 'Untitled'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
