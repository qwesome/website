import { api } from './client';
import type { CustomStatus } from '../state/presence.svelte';

export const setStatusLine = (status: CustomStatus) =>
  api<{ message: string }>('/api/status', { method: 'POST', json: status });

export const fetchStatuses = () =>
  api<{ statuses: Record<string, CustomStatus> }>('/api/presence/statuses').then((r) => r.statuses);
