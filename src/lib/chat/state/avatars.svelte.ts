import { fetchAvatar } from '../api/avatars';

class AvatarCache {
  map = $state<Record<string, string | null>>({});
  private pending = new Set<string>();
  /** users whose avatar was fetched successfully (may legitimately be null) */
  private known = new Set<string>();

  get(user: string): string | null {
    return this.map[user] ?? null;
  }

  set(user: string, avatar: string | null) {
    this.map[user] = avatar;
    this.known.add(user);
  }

  /**
   * Fetches a user's avatar once. Failures are NOT cached so the request is
   * retried the next time the user becomes visible (e.g. on remount).
   */
  async ensure(user: string) {
    if (!user || this.known.has(user) || this.pending.has(user)) return;
    this.pending.add(user);
    try {
      this.map[user] = await fetchAvatar(user);
      this.known.add(user);
    } catch {
      /* leave uncached so a later render can retry */
    } finally {
      this.pending.delete(user);
    }
  }

  /** Ensures avatars for a batch of users (e.g. a visible member/friend list). */
  ensureAll(users: Iterable<string>) {
    for (const user of users) this.ensure(user);
  }

  /** Forces a re-fetch (e.g. after an avatar change). */
  refresh(user: string) {
    this.known.delete(user);
    this.ensure(user);
  }
}

export const avatars = new AvatarCache();
