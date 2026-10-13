const URL_RE = /https?:\/\/[^\s<"]+/;
const IMAGE_RE = /\.(jpe?g|gif|png|webp)(\?.*)?$/i;

export const firstUrl = (text: string): string | null => text.match(URL_RE)?.[0] ?? null;
export const isImageUrl = (url: string): boolean => IMAGE_RE.test(url);
