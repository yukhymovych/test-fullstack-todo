import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateBlockNote, useEditorChange } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useNoteQuery, useUpdateNote, useDeleteNote } from '../features/notes/model/useNotes';
import { useAuth } from '../app/contexts/AuthContext';

const DEFAULT_BLOCKS = [{ type: 'paragraph', content: [] }];

function ensureBlocksArray(value: unknown): unknown[] {
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }
  return DEFAULT_BLOCKS;
}

function useDebouncedSave(saveFn: () => void, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

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
  const { logout } = useAuth();
  const { data: note, isLoading, error } = useNoteQuery(id, true);
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const initialContent = note
    ? ensureBlocksArray(note.rich_content)
    : DEFAULT_BLOCKS;

  const editor = useCreateBlockNote({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialContent: initialContent as any,
  }, [note?.id]);

  const performSave = useCallback(async () => {
    if (!id || !editor) return;
    setSaveStatus('saving');
    try {
      const blocks = editor.document;
      const richContent = JSON.parse(JSON.stringify(blocks));
      await updateMutation.mutateAsync({
        id,
        payload: {
          title: title.trim() || 'Untitled',
          rich_content: richContent,
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
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
  }, [note?.id, note?.title]);

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

  if (isLoading || !id) {
    return <div style={{ padding: '20px' }}>Loading note...</div>;
  }

  if (error || !note) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        Error: {error?.message ?? 'Note not found'}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '12px',
        }}
      >
        <button
          onClick={handleBack}
          style={{
            padding: '8px 16px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          Back to list
        </button>
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
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={() => navigate('/todos')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            Todos
          </button>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Note title"
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: '24px',
          fontWeight: 600,
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          marginBottom: '16px',
        }}
      />

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          minHeight: '300px',
          padding: '16px',
        }}
      >
        <BlockNoteView editor={editor} />
      </div>
    </div>
  );
}
