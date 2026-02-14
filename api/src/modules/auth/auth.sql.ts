import { pool } from '../../db/pool.js';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id, username, password_hash, created_at FROM users WHERE username = $1',
    [username]
  );
  return result.rows[0] || null;
}

export async function createUser(
  username: string,
  passwordHash: string
): Promise<User> {
  const result = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, password_hash, created_at',
    [username, passwordHash]
  );
  return result.rows[0];
}
