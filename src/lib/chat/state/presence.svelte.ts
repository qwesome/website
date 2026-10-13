import type { Status } from '../types';

export interface CustomStatus {
  emoji: string;
  text: string;
  expires: number | null;
}

class Presence {
  users = $state<Record<string, Status>>({});
  custom = $state<Record<string, CustomStatus>>({});

  set(map: Record<string, Status>) {
    this.users = map;
  }

  statusOf(user: string): Status {
    return this.users[user] ?? 'offline';
  }

  setCustom(username: string, cs: CustomStatus | null) {
    if (!cs || (!cs.emoji && !cs.text)) {
      delete this.custom[username];
      return;
    }
    this.custom[username] = cs;
  }

  setCustomMap(map: Record<string, CustomStatus>) {
    this.custom = map ?? {};
  }

  customOf(user: string): CustomStatus | null {
    const cs = this.custom[user];
    if (!cs) return null;
    if (cs.expires && cs.expires <= Date.now()) return null;
    return cs;
  }

  others(me: string): string[] {
    return Object.keys(this.users).filter((u) => u !== me);
  }
}

export const presence = new Presence();
