<script lang="ts">
  import { focusOnMount } from '../../actions/focusOnMount';
  import { deleteMessage, editMessage } from '../../socket';
  import { appearance } from '../../state/appearance.svelte';
  import { auth } from '../../state/auth.svelte';
  import { ui } from '../../state/ui.svelte';
  import { formatTime } from '../../utils/format';
  import { messageMenu } from '../../utils/menus';
  import { parseMarkdown } from '../../utils/markdown';
  import { firstUrl } from '../../utils/urls';
  import Avatar from '../ui/Avatar.svelte';
  import ZoomImage from '../ui/ZoomImage.svelte';
  import LinkEmbed from './LinkEmbed.svelte';
  import MessageActions from './MessageActions.svelte';
  import ReplyReference from './ReplyReference.svelte';
  import type { Message } from '../../types';

  let { m, parent, grouped = false }: { m: Message; parent?: Message; grouped?: boolean } = $props();

  const mine = $derived(m.author === auth.user);
  const html = $derived(parseMarkdown(m.text));
  const embedUrl = $derived(m.text ? firstUrl(m.text) : null);
  const showTime = $derived(appearance.showTimestamps !== 'never');

  let editing = $state(false);
  let editText = $state('');

  // For grouped messages the action row floats just past the end of the text,
  // but never further right than the message column (so it can't run offscreen).
  let bodyEl = $state<HTMLElement | null>(null);
  let metaEl = $state<HTMLElement | null>(null);
  let textEl = $state<HTMLElement | null>(null);
  let actionsLeft = $state(92);

  function placeActions() {
    if (!bodyEl || !metaEl) return;
    const bodyRect = bodyEl.getBoundingClientRect();
    const actionsWidth = metaEl.getBoundingClientRect().width;
    const maxLeft = Math.max(0, bodyEl.clientWidth - actionsWidth);
    let left = maxLeft;
    if (textEl) {
      const range = document.createRange();
      range.selectNodeContents(textEl);
      const rects = range.getClientRects();
      if (rects.length > 0) left = rects[rects.length - 1].right - bodyRect.left + 20;
    }
    actionsLeft = Math.max(0, Math.min(left, maxLeft));
  }

  $effect(() => {
    void grouped;
    void m.text;
    void m.image;
    void ui.windowWidth;
    requestAnimationFrame(placeActions);
  });

  $effect(() => {
    if (!bodyEl) return;
    const ro = new ResizeObserver(() => placeActions());
    ro.observe(bodyEl);
    return () => ro.disconnect();
  });

  function startEdit() {
    editText = m.text;
    editing = true;
  }

  function saveEdit() {
    const next = editText.trim();
    if (next && next !== m.text) editMessage({ id: m.id, channel: m.channel, newText: next });
    editing = false;
  }

  function onEditKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && appearance.enterToSend && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Enter' && !appearance.enterToSend && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      editing = false;
    }
  }

  $effect(() => {
    if (ui.editingId !== null && ui.editingId === m.id) {
      ui.editingId = null;
      startEdit();
    }
  });

  function onContextMenu(e: MouseEvent) {
    if (m.author === 'SYSTEM') return;
    if ((window.getSelection()?.toString() ?? '').length > 0) return;
    e.preventDefault();
    const canModify = mine || auth.adminMode;
    ui.openMenu(e.clientX, e.clientY, messageMenu(m, canModify, !m.image));
  }

  function showProfile(e: MouseEvent) {
    if (m.author !== 'SYSTEM') ui.showProfile(m.author, e.clientX, e.clientY);
  }
</script>

<div
  class="msg"
  role="group"
  class:self={mine}
  class:sending={m.sending}
  class:grouped
  class:ts-always={appearance.showTimestamps === 'always'}
  class:ts-hover={appearance.showTimestamps === 'hover'}
  data-author={m.author}
  oncontextmenu={onContextMenu}
>
  {#if grouped}
    {#if showTime}<span class="gutter-time">{formatTime(m.ts)}</span>{/if}
  {:else}
    <button type="button" class="pfp-btn" title="View profile" onclick={(e) => showProfile(e)}>
      <Avatar name={m.author} size={40} />
    </button>
  {/if}

  <div class="body" bind:this={bodyEl}>
    <div class="meta" class:empty={grouped} bind:this={metaEl} style={grouped ? `left: ${actionsLeft}px` : ''}>
      {#if !grouped}
        <button type="button" class="author" title="View profile" data-author={m.author} onclick={(e) => showProfile(e)}>{m.author}</button>
        {#if showTime}<span class="time">{formatTime(m.ts)}</span>{/if}
      {/if}
      {#if !m.sending}
        <MessageActions
          canModify={mine || auth.adminMode}
          canEdit={!m.image}
          onreply={() => (ui.replyingTo = m)}
          onedit={startEdit}
          ondelete={() => deleteMessage({ id: m.id, channel: m.channel })}
        />
      {/if}
    </div>

    {#if parent}<ReplyReference {parent} />{/if}

    {#if m.image}
      <ZoomImage src={m.image} alt="uploaded" />
    {:else if editing}
      <div class="edit-wrap">
        <textarea class="edit-input" bind:value={editText} onkeydown={onEditKey} rows="3" use:focusOnMount></textarea>
        <div class="edit-actions">
          <button type="button" onclick={saveEdit}>save</button> •
          <button type="button" onclick={() => (editing = false)}>cancel</button>
        </div>
      </div>
    {:else}
      {#if m.text}
        <div class="msg-text" bind:this={textEl}>
          {@html html}
          {#if m.edited}<span class="edited-tag">(edited)</span>{/if}
        </div>
      {/if}
      {#if embedUrl && appearance.showEmbeds}<LinkEmbed url={embedUrl} />{/if}
    {/if}
  </div>
</div>

<style>
  .msg {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    column-gap: 6px;
    padding: 2px 16px;
    transition: background 0.12s ease;
    font-size: calc(15px * var(--font-scale, 1));
  }
  .msg:hover { background: var(--hoverTint); }
  .msg:not(.grouped) { margin-top: 14px; }
  .msg.sending { opacity: 0.5; }

  .pfp-btn { all: unset; grid-column: 1; align-self: start; cursor: pointer; line-height: 0; border-radius: 50%; }
  .pfp-btn:hover { opacity: 0.85; }
  .pfp-btn :global(.avatar) { border-radius: 50%; }

  .gutter-time {
    grid-column: 1;
    align-self: start;
    justify-self: end;
    padding-top: 3px;
    font-size: 10px;
    line-height: 1.3;
    color: var(--surface2);
    display: none;
    user-select: none;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .msg:hover .gutter-time { display: block; }

  .body { grid-column: 2; min-width: 0; position: relative; }
  .meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 1px; }
  .meta.empty { position: absolute; top: 0; left: 92px; margin: 0; }

  .author {
    all: unset;
    font-size: calc(13px * var(--font-scale, 1));
    font-weight: bold;
    color: var(--blue);
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: text;
  }
  .author:hover { text-decoration: underline; }
  .author[data-author='orson'] { color: var(--teal); }

  .time { font-size: 10px; color: var(--surface2); user-select: none; display: none; }
  .ts-always .time { display: inline; }
  .ts-hover:hover .time { display: inline; }

  .msg-text {
    color: var(--subtext0);
    line-height: 1.4;
    white-space: pre-wrap;
    word-wrap: break-word;
    user-select: text;
  }
  .msg-text :global(*) { user-select: text; }
  .msg.self .msg-text { color: var(--text); }
  .msg[data-author='SYSTEM'] .msg-text { color: var(--green); font-size: calc(12px * var(--font-scale, 1)); }

  .edit-input { all: unset; box-sizing: border-box; display: block; width: 100%; min-height: 4.5em; background: var(--crust); border: 1px solid var(--accent); color: var(--text); padding: 8px; border-radius: var(--r-xs); font-size: 14px; line-height: 1.4; margin: 4px 0; resize: vertical; user-select: text; }
  .edit-actions { font-size: 10px; color: var(--overlay0); }
  .edit-actions button { all: unset; cursor: pointer; }
  .edit-actions button:hover { color: var(--accent); text-decoration: underline; }
  .edited-tag { font-size: 10px; color: var(--surface2); margin-left: 5px; }
</style>
