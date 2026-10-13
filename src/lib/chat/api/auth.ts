import { api } from './client';

export interface AuthResponse {
  message: string;
  isAdmin?: boolean;
  /** Present once the server issues session tokens. */
  token?: string;
}

export const login = (username: string, password: string) =>
  api<AuthResponse>('/api/auth/login', { method: 'POST', json: { username, password } });

export const register = (username: string, password: string) =>
  api<AuthResponse>('/api/auth/register', { method: 'POST', json: { username, password } });
