import { api } from './client';

export const changeUsername = (password: string, newUsername: string) =>
  api<{ message: string; username: string }>('/api/account/username', {
    method: 'POST',
    json: { password, newUsername }
  });
