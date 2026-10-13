import type { Status } from '../types';

class Presence {
  users = $state<Record<string, Status>>({});

  set(map: Record<string, Status>) {
    this.users = map;
  }

  statusOf(user: string): Status {
    return this.users[user] ?? 'offline';
  }

  others(me: string): string[] {
    return Object.keys(this.users).filter((u) => u !== me);
  }
}

export const presence = new Presence();
