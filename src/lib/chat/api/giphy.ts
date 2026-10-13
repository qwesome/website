import * as publicEnv from '$env/static/public';
import { api } from './client';
import type { Gif } from '../types';

// Optional browser-side Giphy key. If PUBLIC_GIPHY_API_KEY is set (e.g. a Giphy
// "public beta" key), the client talks to Giphy directly — the same approach as
// the original implementation — so GIFs work even when the server hasn't been
// configured. Otherwise we fall back to the server proxy (GIPHY_API_KEY).
const PUBLIC_KEY =
  (publicEnv as Record<string, string | undefined>).PUBLIC_GIPHY_API_KEY ||
  'oWs2bVS6WYDiTzwFkXqarN3xbQMZAV8E';

const LIMIT = 25;
const RATING = 'pg-13';

async function searchDirect(query: string): Promise<Gif[]> {
  const q = query.trim();
  const endpoint = !q || q === 'trending' ? 'trending' : 'search';
  const params = new URLSearchParams({
    api_key: PUBLIC_KEY ?? '',
    limit: String(LIMIT),
    rating: RATING
  });
  if (endpoint === 'search') params.set('q', q);
  const res = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params.toString()}`);
  if (!res.ok) throw new Error(`Giphy request failed (${res.status})`);
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function searchGifs(query: string): Promise<Gif[]> {
  const q = query.trim();
  if (PUBLIC_KEY) return searchDirect(q);
  const path =
    !q || q === 'trending'
      ? '/api/giphy/trending'
      : `/api/giphy/search?q=${encodeURIComponent(q)}`;
  const json = await api<{ data: Gif[] }>(path);
  return json.data;
}
