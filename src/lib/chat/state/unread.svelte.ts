class Unread {
  map = $state<Record<string, boolean>>({});

  has(channel: string) {
    return !!this.map[channel];
  }

  set(channel: string, value: boolean) {
    this.map[channel] = value;
  }

  get any() {
    return Object.values(this.map).some(Boolean);
  }
}

export const unread = new Unread();
