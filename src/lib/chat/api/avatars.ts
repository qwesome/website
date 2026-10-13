import { api } from './client';

export const fetchAvatar = async (username: string) =>
  (await api<{ avatar: string | null }>(`/api/avatar/${encodeURIComponent(username)}`)).avatar;

// The server reads the user from the session token; the body only carries the image.
export const setAvatar = (avatar: string | null) =>
  api<{ message: string; avatar: string | null }>('/api/avatar', { method: 'POST', json: { avatar } });
