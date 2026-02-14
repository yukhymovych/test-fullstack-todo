import { pool } from '../../db/pool.js';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getAllTodos(userId: string): Promise<Todo[]> {
  const result = await pool.query(
    'SELECT id, title, completed, created_at, updated_at FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

export async function createTodo(
  userId: string,
  title: string
): Promise<Todo> {
  const result = await pool.query(
    'INSERT INTO todos (user_id, title) VALUES ($1, $2) RETURNING id, title, completed, created_at, updated_at',
    [userId, title]
  );
  return result.rows[0];
}

export async function updateTodo(
  id: string,
  userId: string,
  updates: { title?: string; completed?: boolean }
): Promise<Todo | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }

  if (updates.completed !== undefined) {
    fields.push(`completed = $${paramIndex++}`);
    values.push(updates.completed);
  }

  if (fields.length === 0) {
    const result = await pool.query(
      'SELECT id, title, completed, created_at, updated_at FROM todos WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id, userId);

  const result = await pool.query(
    `UPDATE todos SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING id, title, completed, created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteTodo(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM todos WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
