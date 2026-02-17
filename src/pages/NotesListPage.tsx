import { useNavigate } from 'react-router-dom';
import { useNotesQuery, useCreateNote } from '../features/notes/model/useNotes';
import { useAuth } from '../app/contexts/AuthContext';
import type { NoteListItem } from '../features/notes/model/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotesListPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data: notes, isLoading, error } = useNotesQuery();
  const createMutation = useCreateNote();

  const handleNewNote = async () => {
    const note = await createMutation.mutateAsync({});
    navigate(`/notes/${note.id}`);
  };

  const handleNoteClick = (note: NoteListItem) => {
    navigate(`/notes/${note.id}`);
  };

  if (isLoading) {
    return (
      <div
        style={{
          padding: '20px',
          maxWidth: 800,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        Loading notes...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          color: 'red',
          maxWidth: 800,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        Error loading notes: {error.message}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: 800,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{ margin: '50px 0', textAlign: 'center' }}>Notes</h1>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          width: '100%',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleNewNote}
            disabled={createMutation.isPending}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            {createMutation.isPending ? 'Creating...' : 'New note'}
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

      {createMutation.error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          Error: {createMutation.error.message}
        </div>
      )}

      <div>
        {!notes || notes.length === 0 ? (
          <p>No notes yet. Click &quot;New note&quot; to create one.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {notes.map((note) => (
              <li
                key={note.id}
                onClick={() => handleNoteClick(note)}
                style={{
                  padding: '12px 16px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 500, color: 'white' }}>
                  {note.title || 'Untitled'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {formatDate(note.updated_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
