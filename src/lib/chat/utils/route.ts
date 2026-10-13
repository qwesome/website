import { dmId } from './dm';
import type { ChatTarget } from '../types';

// The chat lives at a single route (/chat) and uses query params, so it works
// with adapter-static without needing a fallback page:
//   /chat?dm=someone         a direct message
//   /chat?s=1&ch=2           a channel inside server 1
//   /chat?c=admin-panel      the admin panel
export function chatFromUrl(url: URL, me: string): ChatTarget {
  const dm = url.searchParams.get('dm');
  if (dm) return { type: 'dm', id: dmId(me, dm), name: dm };

  if (url.searchParams.get('c') === 'admin-panel') return { type: 'admin', id: 'admin-panel' };

  const s = Number(url.searchParams.get('s'));
  const ch = Number(url.searchParams.get('ch'));
  if (Number.isInteger(s) && s > 0 && Number.isInteger(ch) && ch > 0) {
    return { type: 'server', id: String(ch), serverId: s, channelId: ch };
  }

  return { type: 'home', id: '' };
}

export const channelHref = (serverId: number, channelId: number) =>
  `?s=${serverId}&ch=${channelId}`;
export const adminHref = () => `?c=admin-panel`;
export const dmHref = (user: string) => `?dm=${encodeURIComponent(user)}`;

// Marked so the layout doesn't bounce a plain `/chat` visit straight into the
// default channel — the user explicitly asked for the home/DM view.
export const homeHref = () => `/chat?home=1`;