import { dmId } from './dm';
import type { ChatTarget } from '../types';

// The chat lives at a single route (/chat) and uses query params, so it works
// with adapter-static without needing a fallback page:
//   /chat?c=global      /chat?dm=someone      /chat?c=admin-panel
export function chatFromUrl(url: URL, me: string): ChatTarget {
  const dm = url.searchParams.get('dm');
  if (dm) return { type: 'dm', id: dmId(me, dm), name: dm };
  return { type: 'channel', id: url.searchParams.get('c') || 'global' };
}

export const channelHref = (id: string) => `?c=${encodeURIComponent(id)}`;
export const dmHref = (user: string) => `?dm=${encodeURIComponent(user)}`;
