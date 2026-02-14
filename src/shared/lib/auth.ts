const TOKEN_KEY = 'token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface JwtPayload {
  exp?: number;
  sub?: string;
  username?: string;
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  return atob(padded);
}

export function decodeTokenPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

export function getTokenMsLeft(token: string): number {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return 0;
  const expMs = payload.exp * 1000;
  const nowMs = Date.now();
  return Math.max(0, expMs - nowMs);
}

export function isTokenExpired(token: string): boolean {
  return getTokenMsLeft(token) <= 0;
}
