import { api } from './client';
import type { Conversation } from '../types';

export const fetchConversations = () => api<Conversation[]>(`/api/conversations`);

// The server reads the user from the session token.
export const hideConversation = (channel: string) =>
  api<{ message: string }>('/api/conversations/hide', { method: 'POST', json: { channel } });
