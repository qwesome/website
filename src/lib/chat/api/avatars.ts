import { api } from './client';

export const fetchAvatar = async (username: string) =>
  (await api<{ avatar: string | null }>(`/api/avatar/${encodeURIComponent(username)}`)).avatar;

// `username` is only needed while the server trusts the request body.
// Once the server reads the user from the auth token, drop it.
export const setAvatar = (username: string, avatar: string | null) =>
  api<{ message: string }>('/api/avatar', { method: 'POST', json: { username, avatar } });
