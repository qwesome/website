import type { UrlMeta } from '../types';

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

class Embeds {
  cache = $state<Record<string, UrlMeta | null>>({});

  get(url: string) {
    return this.cache[url];
  }

  async ensure(url: string) {
    if (url in this.cache) return;
    this.cache[url] = null;
    try {
      const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        this.cache[url] = {
          title: json.data.title || hostOf(url),
          description: json.data.description || '',
          image: json.data.image?.url || json.data.logo?.url || '',
          hostname: json.data.publisher || hostOf(url)
        };
      } else {
        this.cache[url] = { error: true };
      }
    } catch {
      this.cache[url] = { error: true };
    }
  }
}

export const embeds = new Embeds();
