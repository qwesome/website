import { fetchConversations } from '../api/conversations';
import { auth } from './auth.svelte';
import { avatars } from './avatars.svelte';
import type { Conversation } from '../types';

class Conversations {
  list = $state<Conversation[]>([]);
  /** true once the first load has finished (success or failure) */
  loaded = $state(false);

  async load() {
    const me = auth.user;
    if (!me) return;
    try {
      this.list = await fetchConversations();
      for (const c of this.list) avatars.ensure(c.username);
    } catch (e) {
      console.error(e);
    } finally {
      this.loaded = true;
    }
  }
}

export const conversations = new Conversations();