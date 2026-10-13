import { fetchUnread, markChannelRead } from '../api/unread';

class Unread {
  /** channel id -> number of unread messages (0 / absent = none). */
  map = $state<Record<string, number>>({});

  has(channel: string) {
    return (this.map[channel] ?? 0) > 0;
  }

  count(channel: string) {
    return this.map[channel] ?? 0;
  }

  /** Increment the unread count for a channel (used on incoming messages). */
  inc(channel: string, by = 1) {
    this.map[channel] = (this.map[channel] ?? 0) + by;
  }

  /** Set a channel's unread state. `false` clears it; `true` marks at least 1. */
  set(channel: string, value: boolean) {
    if (value) {
      this.map[channel] = Math.max(1, this.map[channel] ?? 0);
    } else {
      this.markRead(channel);
    }
  }

  /** Clear locally and persist the read marker to the server. */
  markRead(channel: string) {
    this.map[channel] = 0;
    markChannelRead(channel).catch(() => {});
  }

  clear(channel: string) {
    this.markRead(channel);
  }

  /** Total unread messages for a set of channel ids. */
  totalFor(ids: string[]) {
    return ids.reduce((n, id) => n + (this.map[id] ?? 0), 0);
  }

  get any() {
    return Object.values(this.map).some((n) => n > 0);
  }

  /** Pull unread counts from the server (survives reloads). */
  async load() {
    try {
      const counts = await fetchUnread();
      // Merge rather than replace so counts for messages that arrived before
      // this resolved don't get dropped.
      const merged: Record<string, number> = { ...counts };
      for (const [ch, n] of Object.entries(this.map)) {
        if ((n ?? 0) > (merged[ch] ?? 0)) merged[ch] = n;
      }
      this.map = merged;
    } catch (e) {
      console.error(e);
    }
  }

  reset() {
    this.map = {};
  }
}

export const unread = new Unread();
