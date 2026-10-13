import type { Profile } from '../types';
import { fetchProfile } from '../api/profile';

class Profiles {
  map = $state<Record<string, Profile>>({});

  get(username: string): Profile | undefined {
    return this.map[username];
  }

  patch(username: string, part: Partial<Profile>) {
    const cur = this.map[username];
    if (!cur) return;
    this.map[username] = { ...cur, ...part };
  }

  async ensure(username: string): Promise<Profile | null> {
    if (this.map[username]) return this.map[username];
    try {
      const p = await fetchProfile(username);
      this.map[username] = p;
      return p;
    } catch {
      return null;
    }
  }
}

export const profiles = new Profiles();
