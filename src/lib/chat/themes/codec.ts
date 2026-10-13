import type { CustomTheme } from './types';

const PREFIX = 'uct1:';

export async function exportThemeToString(theme: CustomTheme): Promise<string> {
  const jsonStr = JSON.stringify(theme);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const cs = new CompressionStream('deflate-raw');
  const compressedStream = blob.stream().pipeThrough(cs);
  const response = new Response(compressedStream);
  const buffer = await response.arrayBuffer();

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${PREFIX}${base64}`;
}

export async function importThemeFromString(input: string): Promise<CustomTheme> {
  if (!input.startsWith(PREFIX)) {
    throw new Error('Invalid theme code format: Missing uct1 prefix');
  }

  let base64 = input.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';

  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));

  const ds = new DecompressionStream('deflate-raw');
  const blob = new Blob([bytes]);
  const decompressedStream = blob.stream().pipeThrough(ds);
  const response = new Response(decompressedStream);
  const jsonStr = await response.text();

  const data = JSON.parse(jsonStr);

  // Validation
  if (!data.id || !data.name || !data.mode || !data.tokens) {
    throw new Error('Malformed custom theme data');
  }

  const hexRegex = /^#[0-9a-fA-F]{6}$/;
  Object.entries(data.tokens).forEach(([key, val]) => {
    if (typeof val === 'string' && val.startsWith('#') && !hexRegex.test(val)) {
      throw new Error(`Invalid color hex value for ${key}`);
    }
  });

  return {
    ...data,
    isCustom: true
  };
}