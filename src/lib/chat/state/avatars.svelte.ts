import { fetchAvatar } from '../api/avatars';

class AvatarCache {
  map = $state<Record<string, string | null>>({});
  private pending = new Set<string>();

  get(user: string): string | null {
    return this.map[user] ?? null;
  }

  set(user: string, avatar: string | null) {
    this.map[user] = avatar;
  }

  async ensure(user: string) {
    if (user in this.map || this.pending.has(user)) return;
    this.pending.add(user);
    try {
      this.map[user] = await fetchAvatar(user);
    } catch {
      this.map[user] = null;
    } finally {
      this.pending.delete(user);
    }
  }
}

export const avatars = new AvatarCache();
