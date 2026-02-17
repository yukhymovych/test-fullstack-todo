import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as authSQL from './auth.sql.js';
import type { RegisterInput, LoginInput } from './auth.schemas.js';

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '5d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

function signToken(userId: string, username: string): string {
  return jwt.sign(
    { sub: userId, username },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export async function register(input: RegisterInput): Promise<{ token: string }> {
  const existing = await authSQL.findUserByUsername(input.username);
  if (existing) {
    const err = new Error('Username already exists');
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await authSQL.createUser(input.username, passwordHash);
  const token = signToken(user.id, user.username);
  return { token };
}

export async function login(input: LoginInput): Promise<{ token: string }> {
  const user = await authSQL.findUserByUsername(input.username);
  if (!user) {
    const err = new Error('Invalid username or password');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid username or password');
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }

  const token = signToken(user.id, user.username);
  return { token };
}
