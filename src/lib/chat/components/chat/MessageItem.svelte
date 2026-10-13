<script lang="ts">
  import { focusOnMount } from '../../actions/focusOnMount';
  import { deleteMessage, editMessage } from '../../socket';
  import { auth } from '../../state/auth.svelte';
  import { ui } from '../../state/ui.svelte';
  import { formatTime } from '../../utils/format';
  import { parseMarkdown } from '../../utils/markdown';
  import { firstUrl } from '../../utils/urls';
  import Avatar from '../ui/Avatar.svelte';
  import ZoomImage from '../ui/ZoomImage.svelte';
  import LinkEmbed from './LinkEmbed.svelte';
  import MessageActions from './MessageActions.svelte';
  import ReplyReference from './ReplyReference.svelte';
  import type { Message } from '../../types';

  let { m, parent }: { m: Message; parent?: Message } = $props();

  const mine = $derived(m.author === auth.user);
  const html = $derived(parseMarkdown(m.text));
  const embedUrl = $derived(m.text ? firstUrl(m.text) : null);

  let editing = $state(false);
  let editText = $state('');

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
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') editing = false;
  }
</script>

<div class="msg" class:self={mine} class:sending={m.sending} data-author={m.author}>
  <Avatar name={m.author} />

  <div class="body">
    <div class="meta">
      <span class="author" data-author={m.author}>{m.author}</span>
      <span class="time">{formatTime(m.ts)}</span>
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
        <input class="edit-input" bind:value={editText} onkeydown={onEditKey} use:focusOnMount />
        <div class="edit-actions">
          <button type="button" onclick={saveEdit}>save</button> •
          <button type="button" onclick={() => (editing = false)}>cancel</button>
        </div>
      </div>
    {:else}
      <div class="msg-bubble">
        {@html html}
        {#if m.edited}<span class="edited-tag">(edited)</span>{/if}
      </div>
      {#if embedUrl}<LinkEmbed url={embedUrl} />{/if}
    {/if}
  </div>
</div>

<style>
  .msg { padding: 8px 24px; display: flex; gap: 14px; }
  .msg:hover { background: rgba(255, 255, 255, 0.02); }
  .msg.sending { opacity: 0.5; filter: grayscale(0.3); transition: opacity 0.3s ease, filter 0.3s ease; }
  .msg.sending .msg-bubble { background: var(--surface0); color: var(--overlay0); border-color: var(--surface1); }
  .body { flex: 1; min-width: 0; }
  .meta { margin-bottom: 4px; display: flex; align-items: baseline; gap: 8px; }
  .author { font-size: 13px; font-weight: bold; color: var(--blue); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: text; }
  .author[data-author='orson'] { color: var(--teal); }
  .time { font-size: 11px; color: var(--surface2); user-select: text; }

  .msg-bubble { display: block; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 6px; padding: 10px 14px; font-size: 15px; color: var(--subtext0); line-height: normal; max-width: 100%; width: fit-content; word-wrap: break-word; user-select: text; }
  .msg-bubble :global(*) { user-select: text; }
  .msg.self .msg-bubble { background: var(--surface0); color: var(--text); }
  .msg[data-author='SYSTEM'] .msg-bubble { background: var(--crust); border-color: var(--red); color: var(--green); white-space: pre-wrap; }

  .edit-input { all: unset; box-sizing: border-box; width: 100%; background: var(--crust); border: 1px solid var(--mauve); color: var(--text); padding: 8px; border-radius: 4px; font-size: 14px; margin: 4px 0; user-select: text; }
  .edit-actions { font-size: 10px; color: var(--overlay0); }
  .edit-actions button { all: unset; cursor: pointer; }
  .edit-actions button:hover { color: var(--mauve); text-decoration: underline; }
  .edited-tag { font-size: 10px; color: var(--surface2); margin-left: 5px; }
</style>
