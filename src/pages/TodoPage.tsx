import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodosQuery, useCreateTodo, useUpdateTodo, useDeleteTodo } from '../features/todos/model/useTodos';
import { useAuth } from '../app/contexts/AuthContext';
import type { Todo } from '../features/todos/model/types';

export function TodoPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const { data: todos, isLoading, error } = useTodosQuery();
  const createMutation = useCreateTodo();
  const updateMutation = useUpdateTodo();
  const deleteMutation = useDeleteTodo();

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    
    await createMutation.mutateAsync(newTitle.trim());
    setNewTitle('');
  };

  const handleEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
  };

  const handleSave = async (id: string) => {
    if (!editTitle.trim()) return;

    await updateMutation.mutateAsync({ id, patch: { title: editTitle.trim() } });
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleToggleComplete = async (todo: Todo) => {
    await updateMutation.mutateAsync({ 
      id: todo.id, 
      patch: { completed: !todo.completed } 
    });
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  if (isLoading) {
    return <div>Loading todos...</div>;
  }

  if (error) {
    return <div>Error loading todos: {error.message}</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Todo App</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/notes')}
            style={{ padding: '8px 16px', backgroundColor: '#666', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            Notes
          </button>
          <button
            onClick={logout}
            style={{ padding: '8px 16px', backgroundColor: '#666', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Add Todo Form */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Enter todo title"
          style={{ padding: '8px', width: '70%', marginRight: '10px' }}
        />
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim() || createMutation.isPending}
          style={{ padding: '8px 16px' }}
        >
          {createMutation.isPending ? 'Adding...' : 'Add'}
        </button>
        {createMutation.error && (
          <div style={{ color: 'red', marginTop: '5px' }}>
            Error: {createMutation.error.message}
          </div>
        )}
      </div>

      {/* Todos List */}
      <div>
        {!todos || todos.length === 0 ? (
          <p>No todos yet. Add one above!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {todos.map((todo) => (
              <li
                key={todo.id}
                style={{
                  padding: '10px',
                  marginBottom: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: todo.completed ? '#f0f0f0' : 'white',
                }}
              >
                {editingId === todo.id ? (
                  // Edit mode
                  <div>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSave(todo.id)}
                      style={{ padding: '8px', width: '60%', marginRight: '10px' }}
                    />
                    <button
                      onClick={() => handleSave(todo.id)}
                      disabled={!editTitle.trim() || updateMutation.isPending}
                      style={{ padding: '6px 12px', marginRight: '5px' }}
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={updateMutation.isPending}
                      style={{ padding: '6px 12px' }}
                    >
                      Cancel
                    </button>
                    {updateMutation.error && (
                      <div style={{ color: 'red', marginTop: '5px' }}>
                        Error: {updateMutation.error.message}
                      </div>
                    )}
                  </div>
                ) : (
                  // Normal view
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggleComplete(todo)}
                        disabled={updateMutation.isPending}
                        style={{ marginRight: '10px' }}
                      />
                      <span
                        style={{
                          textDecoration: todo.completed ? 'line-through' : 'none',
                          color: todo.completed ? '#999' : 'black',
                        }}
                      >
                        {todo.title}
                      </span>
                    </div>
                    <div>
                      <button
                        onClick={() => handleEdit(todo)}
                        disabled={updateMutation.isPending || deleteMutation.isPending}
                        style={{ padding: '6px 12px', marginRight: '5px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(todo.id)}
                        disabled={deleteMutation.isPending}
                        style={{ padding: '6px 12px', backgroundColor: '#ff4444', color: 'white', border: 'none', cursor: 'pointer' }}
                      >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
                {deleteMutation.error && (
                  <div style={{ color: 'red', marginTop: '5px' }}>
                    Error: {deleteMutation.error.message}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
