import { fetchFriends } from '../api/friends';
import { auth } from './auth.svelte';
import { avatars } from './avatars.svelte';

class Friends {
  friends = $state<string[]>([]);
  incoming = $state<string[]>([]);
  outgoing = $state<string[]>([]);
  loaded = $state(false);

  async load() {
    const me = auth.user;
    if (!me) return;
    try {
      const data = await fetchFriends();
      this.friends = data.friends;
      this.incoming = data.incoming;
      this.outgoing = data.outgoing;
      for (const u of data.friends.concat(data.incoming, data.outgoing)) avatars.ensure(u);
    } catch (e) {
      console.error(e);
    } finally {
      this.loaded = true;
    }
  }

  get pendingCount() {
    return this.incoming.length;
  }

  isFriend(user: string) {
    return this.friends.includes(user);
  }

  hasRequestFrom(user: string) {
    return this.incoming.includes(user);
  }

  hasOutgoingTo(user: string) {
    return this.outgoing.includes(user);
  }
}

export const friends = new Friends();