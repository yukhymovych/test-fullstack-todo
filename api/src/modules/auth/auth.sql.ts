import { pool } from '../../db/pool.js';

export interface User {
  id: string;
  auth0_sub: string;
  email: string | null;
  name: string | null;
  timezone: string | null;
  ui_language?: string | null;
  created_at: Date;
}

export async function findByAuth0Sub(auth0Sub: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id, auth0_sub, email, name, timezone, created_at FROM users WHERE auth0_sub = $1',
    [auth0Sub]
  );
  return result.rows[0] || null;
}

export async function createFromAuth0(
  auth0Sub: string,
  email?: string | null,
  name?: string | null
): Promise<User> {
  const result = await pool.query(
    'INSERT INTO users (auth0_sub, email, name) VALUES ($1, $2, $3) RETURNING id, auth0_sub, email, name, timezone, created_at',
    [auth0Sub, email ?? null, name ?? null]
  );
  return result.rows[0];
}

export async function findOrCreateByAuth0Sub(
  auth0Sub: string,
  email?: string | null,
  name?: string | null
): Promise<User> {
  const existing = await findByAuth0Sub(auth0Sub);
  if (existing) return existing;
  return createFromAuth0(auth0Sub, email, name);
}

export async function getUiLanguageByUserId(
  userId: string
): Promise<'en' | 'uk'> {
  const result = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(ui_language), ''), 'en') AS ui_language
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.ui_language === 'uk' ? 'uk' : 'en';
}

export async function setUiLanguageByUserId(
  userId: string,
  uiLanguage: 'en' | 'uk'
): Promise<'en' | 'uk'> {
  const result = await pool.query(
    `UPDATE users
     SET ui_language = $2
     WHERE id = $1
     RETURNING COALESCE(NULLIF(TRIM(ui_language), ''), 'en') AS ui_language`,
    [userId, uiLanguage]
  );
  return result.rows[0]?.ui_language === 'uk' ? 'uk' : 'en';
}
