// Emoji data is pulled from a public dataset (emoji-datasource via jsDelivr) at
// runtime so the picker automatically picks up newly added emoji, rather than
// shipping a frozen hard-coded list. The dataset renders as native/ system
// glyphs — no image sheets.

const EMOJI_URL = 'https://cdn.jsdelivr.net/npm/emoji-datasource/emoji.json';

export interface EmojiEntry {
  char: string;
  name: string;
  short: string;
  category: string;
}

export interface EmojiData {
  categories: string[];
  byCategory: Record<string, EmojiEntry[]>;
  all: EmojiEntry[];
}

interface RawEmoji {
  unified: string;
  short_name: string;
  name: string;
  category: string;
  sort_order: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  'Smileys & Emotion': 'smileys',
  'People & Body': 'people',
  'Animals & Nature': 'nature',
  'Food & Drink': 'food',
  'Travel & Places': 'travel',
  Activities: 'activity',
  Objects: 'objects',
  Symbols: 'symbols',
  Flags: 'flags'
};

// The dataset's own ordering is not intuitive, so categories are shown in this
// fixed, familiar order (anything unknown falls to the end).
const CATEGORY_ORDER = [
  'Smileys & Emotion',
  'People & Body',
  'Animals & Nature',
  'Food & Drink',
  'Travel & Places',
  'Activities',
  'Objects',
  'Symbols',
  'Flags'
];

// A tiny fallback so the picker still works if the network/dataset is blocked.
const FALLBACK = [
  '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😜 🤪 🤔 🤗 🤩 😎 😴 😢 😭 😡 🥺 😬 🙄 😳 🥶 🤯 🤤 😱',
  '👍 👎 👏 🙌 🙏 🤝 💪 👀 🧠 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 ✨ 🔥 ⭐ 🎉 🎊 🎁 🌟 💯 ✅ ❌ ⚡'
].join(' ');

function toChar(unified: string): string {
  try {
    return unified
      .split('-')
      .map((h) => String.fromCodePoint(parseInt(h, 16)))
      .join('');
  } catch {
    return '';
  }
}

function build(raw: RawEmoji[]): EmojiData {
  const buckets: Record<string, { e: EmojiEntry; o: number }[]> = {};
  const catOrder: Record<string, number> = {};
  const seen = new Set<string>();

  for (const r of raw) {
    if (!r || r.category === 'Component') continue;
    const char = toChar(r.unified);
    if (!char || seen.has(char)) continue;
    seen.add(char);
    const entry: EmojiEntry = {
      char,
      name: (r.name ?? '').toLowerCase(),
      short: r.short_name ?? '',
      category: r.category
    };
    (buckets[r.category] ??= []).push({ e: entry, o: r.sort_order ?? 0 });
    if (!(r.category in catOrder)) catOrder[r.category] = r.sort_order ?? 0;
  }

  const categories = Object.keys(buckets).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 || ib === -1) {
      if (ia === -1 && ib === -1) return (catOrder[a] ?? 0) - (catOrder[b] ?? 0);
      return ia === -1 ? 1 : -1;
    }
    return ia - ib;
  });

  const byCategory: Record<string, EmojiEntry[]> = {};
  const all: EmojiEntry[] = [];
  for (const cat of categories) {
    const list = buckets[cat].sort((x, y) => x.o - y.o).map((x) => x.e);
    byCategory[cat] = list;
    all.push(...list);
  }

  return { categories, byCategory, all };
}

function fallbackData(): EmojiData {
  const all = FALLBACK.split(/\s+/)
    .filter(Boolean)
    .map((char) => ({ char, name: '', short: '', category: 'Smileys & Emotion' }));
  return { categories: ['Smileys & Emotion'], byCategory: { 'Smileys & Emotion': all }, all };
}

let cache: EmojiData | null = null;
let inflight: Promise<EmojiData> | null = null;

export function loadEmojis(): Promise<EmojiData> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(EMOJI_URL);
      if (!res.ok) throw new Error('emoji source unavailable');
      cache = build((await res.json()) as RawEmoji[]);
    } catch {
      cache = fallbackData();
    } finally {
      inflight = null;
    }
    return cache;
  })();
  return inflight;
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.toLowerCase();
}
