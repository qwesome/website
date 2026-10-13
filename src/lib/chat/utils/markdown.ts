// Private-use characters: backslash-escape marker and placeholder delimiters.
const ESC = '\uE000';
const OPEN = '\uE001';
const CLOSE = '\uE002';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const cache = new Map<string, string>();

export function parseMarkdown(input: string): string {
  const hit = cache.get(input);
  if (hit !== undefined) return hit;
  const out = render(input);
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  cache.set(input, out);
  return out;
}

function render(input: string): string {
  const stash: string[] = [];
  const hold = (html: string) => `${OPEN}${stash.push(html) - 1}${CLOSE}`;

  // 1. Pull out code and links so later rules can't touch them.
  let text = input
    .replace(/```([\s\S]+?)```/g, (_, code: string) =>
      hold(`<div class="code-block"><pre><code>${escapeHtml(code)}</code></pre></div>`)
    )
    .replace(/`([^`]+)`/g, (_, code: string) => hold(`<code>${escapeHtml(code)}</code>`));

  // 2. Escape everything else (including quotes, so URLs can't break out of href="").
  text = escapeHtml(text).replace(/https?:\/\/[^\s<]+/g, (url) =>
    hold(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${url}</a>`)
  );

  // 3. Backslash escapes, then formatting.
  text = text.replace(/\\(.)/g, ESC + '$1');
  const lb = `(?<!${ESC})`;
  text = text
    .replace(new RegExp(`^(?!${ESC})### (.+)$`, 'gm'), '<span class="md-heading md-heading-3">$1</span>')
    .replace(new RegExp(`^(?!${ESC})## (.+)$`, 'gm'), '<span class="md-heading md-heading-2">$1</span>')
    .replace(new RegExp(`^(?!${ESC})-# (.+)$`, 'gm'), '<span class="md-heading md-heading-small">$1</span>')
    .replace(new RegExp(`^(?!${ESC})# (.+)$`, 'gm'), '<span class="md-heading md-heading-1">$1</span>')
    .replace(new RegExp(`${lb}\\*\\*\\*(.+?)${lb}\\*\\*\\*`, 'g'), '<strong><em>$1</em></strong>')
    .replace(new RegExp(`${lb}\\*\\*(.+?)${lb}\\*\\*`, 'g'), '<strong>$1</strong>')
    .replace(new RegExp(`${lb}\\*(?!\\*)(.+?)${lb}\\*`, 'g'), '<em>$1</em>')
    .replace(new RegExp(`${lb}__(.+?)${lb}__`, 'g'), '<u>$1</u>')
    .replace(new RegExp(`${lb}~~(.+?)${lb}~~`, 'g'), '<s>$1</s>')
    .replace(new RegExp(`${lb}\\|\\|(.+?)${lb}\\|\\|`, 'g'), '<span class="spoiler">$1</span>')
    .replace(/^&gt;(.*)$/gm, '<span class="greentext">&gt;$1</span>')
    .replace(/^mc:[ \t]*(.*)$/gm, '<span class="mc-text">$1</span>')
    // "minecraft" -> Minecraft font, but never inside an HTML tag
    .replace(/(<[^>]*>)|minecraft/gi, (_m, tag?: string) =>
      tag ? tag : '<span class="mc-text">Minecraft</span>'
    )
    .replace(/^[ \t]*\.[ \t]*(.*)$/gm, '<span class="pinktext">$1</span>')
    .replace(/\n/g, '<br>');

  text = text.replace(new RegExp(`${ESC}(.)`, 'gs'), '$1');

  // 4. Put the stashed pieces back (a few passes in case of nesting).
  const placeholder = new RegExp(`${OPEN}(\\d+)${CLOSE}`, 'g');
  for (let i = 0; i < 3 && placeholder.test(text); i++) {
    placeholder.lastIndex = 0;
    text = text.replace(placeholder, (_, n: string) => stash[Number(n)]);
  }
  return text;
}
