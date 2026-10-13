import { api } from './client';
import type { Conversation } from '../types';

export const fetchConversations = (username: string) =>
  api<Conversation[]>(`/api/conversations/${encodeURIComponent(username)}`);

export const hideConversation = (username: string, channel: string) =>
  api<{ message: string }>('/api/conversations/hide', { method: 'POST', json: { username, channel } });
