import { PAGE_SIZE } from '../config';
import { fetchMessages } from '../api/messages';
import type { ChannelMeta, Message, MessageId } from '../types';

const adminGuide = (): Message => ({
  id: 0,
  channel: 'admin-panel',
  author: 'SYSTEM',
  ts: Date.now(),
  text: [
    '### Admin Command Key',
    '* `list users` - Show all registered accounts',
    '* `count messages [channel]` - Total counts',
    '* `delete [num] [channel]` - Remove N messages',
    '* `delete all` - Wipe entire database',
    '* `deleteuser [username]` - Wipe account',
    '* `testpass [user] [pass]` - Verify credentials',
    '* `removepfp [username]` - Reset user avatar'
  ].join('\n')
});

class MessageStore {
  byChannel = $state<Record<string, Message[]>>({});
  meta = $state<Record<string, ChannelMeta>>({});

  list(channel: string): Message[] {
    return this.byChannel[channel] ?? [];
  }

  // Always push through the reactive proxy (not the raw array returned by `??=`).
  private ensure(channel: string): Message[] {
    if (!this.byChannel[channel]) this.byChannel[channel] = [];
    return this.byChannel[channel];
  }

  addOptimistic(msg: Message) {
    this.ensure(msg.channel).push(msg);
  }

  /** Incoming message from the server; swaps in for its optimistic copy if there is one. */
  receive(msg: Message) {
    const list = this.ensure(msg.channel);
    if (msg.tempId) {
      const i = list.findIndex((m) => m.id === msg.tempId);
      if (i !== -1) {
        list[i] = { ...msg, sending: false };
        return;
      }
    }
    if (list.some((m) => m.id === msg.id)) return;
    list.push(msg);
  }

  remove(channel: string, id: MessageId) {
    if (id === 'all') {
      for (const key of Object.keys(this.byChannel)) this.byChannel[key] = [];
      return;
    }
    if (this.byChannel[channel]) {
      this.byChannel[channel] = this.byChannel[channel].filter((m) => m.id !== id);
    }
  }

  edit(channel: string, id: MessageId, text: string) {
    const m = this.list(channel).find((m) => m.id === id);
    if (m) {
      m.text = text;
      m.edited = 1;
    }
  }

  /** Loads the next page of older messages. Returns true if anything was prepended. */
  async loadMore(channel: string): Promise<boolean> {
    if (channel === 'admin-panel') {
      if (!this.byChannel[channel]) this.byChannel[channel] = [adminGuide()];
      return false;
    }
    if (!this.meta[channel]) this.meta[channel] = { cursor: Date.now(), hasMore: true, loading: false };
    const meta = this.meta[channel];
    if (meta.loading || !meta.hasMore) return false;

    meta.loading = true;
    try {
      const older = await fetchMessages(channel, meta.cursor, PAGE_SIZE);
      meta.hasMore = older.length >= PAGE_SIZE;
      if (older.length === 0) return false;
      meta.cursor = older[0].ts;
      const have = new Set(this.list(channel).map((m) => m.id));
      this.byChannel[channel] = [...older.filter((m) => !have.has(m.id)), ...this.list(channel)];
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      meta.loading = false;
    }
  }
}

export const messages = new MessageStore();
