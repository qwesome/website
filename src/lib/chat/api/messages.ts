import { api } from './client';
import type { Message } from '../types';

export const fetchMessages = (channel: string, before: number, limit: number) =>
  api<Message[]>(`/api/messages/${encodeURIComponent(channel)}?before=${before}&limit=${limit}`);
