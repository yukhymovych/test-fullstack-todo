import { http } from '../../../shared/api/http';
import type { LoginResponse } from './authApi.types';

export type { LoginResponse } from './authApi.types';

export async function register(
  username: string,
  password: string
): Promise<LoginResponse> {
  return http.post<LoginResponse>('/auth/register', { username, password }, true);
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  return http.post<LoginResponse>('/auth/login', { username, password }, true);
}
