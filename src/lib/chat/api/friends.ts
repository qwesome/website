import { api } from './client';
import type { FriendsData } from '../types';

export const fetchFriends = async () => await api<FriendsData>('/api/friends');

export const requestFriend = async (username: string) =>
  await api<{ status: 'pending' | 'accepted'; target: string; friend?: string }>('/api/friends/request', {
    method: 'POST',
    json: { username }
  });

export const respondFriend = async (username: string, accept: boolean) => {
  await api('/api/friends/respond', { method: 'POST', json: { username, accept } });
};

export const removeFriend = async (username: string) => {
  await api(`/api/friends/${encodeURIComponent(username)}`, { method: 'DELETE' });
};

export const searchUsers = async (q: string) =>
  await api<{ users: string[] }>(`/api/users/search?q=${encodeURIComponent(q)}`).then((r) => r.users);