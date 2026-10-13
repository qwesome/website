import { api } from './client';

/** Unread counts per channel, restored from the server on load. */
export async function fetchUnread(): Promise<Record<string, number>> {
  const res = await api<{ counts: Record<string, number> }>('/api/unread');
  return res.counts || {};
}

/** Persist that the user has read up to `ts` in `channel`. */
export function markChannelRead(channel: string, ts = Date.now()): Promise<void> {
  return api('/api/channels/read', { method: 'POST', json: { channel, ts } }).then(() => undefined);
}
