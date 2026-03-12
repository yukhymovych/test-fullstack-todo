import { API_URL } from '../config/env';

type TokenProvider = () => Promise<string>;

let tokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

interface FetchOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  skipAuth?: boolean;
}

async function fetchJson<T>(endpoint: string, options: FetchOptions): Promise<T> {
  const { method, body, skipAuth } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!skipAuth && tokenProvider) {
    const token = await tokenProvider();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    const errorText = await response.text();
    throw new Error(errorText || 'Unauthorized');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const http = {
  get: <T>(endpoint: string, skipAuth?: boolean) =>
    fetchJson<T>(endpoint, { method: 'GET', skipAuth }),
  post: <T>(endpoint: string, body?: unknown, skipAuth?: boolean) =>
    fetchJson<T>(endpoint, { method: 'POST', body, skipAuth }),
  patch: <T>(endpoint: string, body?: unknown) =>
    fetchJson<T>(endpoint, { method: 'PATCH', body }),
  put: <T>(endpoint: string, body?: unknown) =>
    fetchJson<T>(endpoint, { method: 'PUT', body }),
  delete: <T>(endpoint: string) =>
    fetchJson<T>(endpoint, { method: 'DELETE' }),
};
