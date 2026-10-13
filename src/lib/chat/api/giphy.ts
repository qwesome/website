import { api } from './client';
import type { Gif } from '../types';

// The Giphy key lives on the server; the browser only talks to this proxy.
export async function searchGifs(query: string): Promise<Gif[]> {
  const q = query.trim();
  const path =
    !q || q === 'trending'
      ? '/api/giphy/trending'
      : `/api/giphy/search?q=${encodeURIComponent(q)}`;
  const json = await api<{ data: Gif[] }>(path);
  return json.data;
}
