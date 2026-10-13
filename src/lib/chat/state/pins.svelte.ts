const KEY = 'chat:pins';

function load(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

class Pins {
  list = $state<string[]>(load());

  isPinned(name: string): boolean {
    return this.list.includes(name);
  }

  toggle(name: string) {
    this.list = this.isPinned(name) ? this.list.filter((n) => n !== name) : [...this.list, name];
    this.persist();
  }

  /** Sorts names so pinned entries float to the top, preserving each group's order. */
  sort(names: string[]): string[] {
    return [...names].sort((a, b) => Number(this.isPinned(b)) - Number(this.isPinned(a)));
  }

  private persist() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.list));
    } catch {
      /* storage may be unavailable */
    }
  }
}

export const pins = new Pins();
