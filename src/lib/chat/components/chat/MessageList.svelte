<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { appearance } from '../../state/appearance.svelte';
  import { auth } from '../../state/auth.svelte';
  import { messages } from '../../state/messages.svelte';
  import MessageItem from './MessageItem.svelte';
  import type { MessageId } from '../../types';

  let { channel }: { channel: string } = $props();

  let el = $state<HTMLDivElement>();
  const list = $derived(messages.list(channel));
  const meta = $derived(messages.meta[channel]);
  const byId = $derived(new Map(list.map((m) => [m.id, m])));

  let stick = true; // is the user parked at the bottom?
  let lastId: MessageId | undefined;

  async function scrollToBottom() {
    await tick();
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function loadOlder(ch: string, initial = false) {
    const before = el?.scrollHeight ?? 0;
    const added = await messages.loadMore(ch);
    if (!added) return;
    await tick();
    if (!el) return;
    el.scrollTop = initial ? el.scrollHeight : el.scrollHeight - before;
  }

  // Switching channel: reset scroll state and load the first page if needed.
  $effect(() => {
    const ch = channel;
    stick = true;
    lastId = undefined;
    untrack(() => {
      if (messages.list(ch).length === 0) loadOlder(ch, true);
      else scrollToBottom();
    });
  });

  // New message at the bottom: follow it if we're at the bottom or it's ours.
  $effect(() => {
    const last = list[list.length - 1];
    if (!last || last.id === lastId) return;
    lastId = last.id;
    if (stick || last.author === auth.user) {
      stick = true;
      scrollToBottom();
    }
  });

  function onscroll() {
    if (!el) return;
    stick = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (el.scrollTop < 100 && !meta?.loading) loadOlder(channel);
  }

  function toggleSpoiler(e: MouseEvent) {
    (e.target as HTMLElement).closest('.spoiler')?.classList.toggle('revealed');
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="messages" bind:this={el} {onscroll} onclick={toggleSpoiler}>
  {#if meta?.loading}<div class="loading-status">loading history...</div>{/if}

  {#each list as m, i (m.id)}
    {@const parent = m.reply_to != null ? byId.get(m.reply_to) : undefined}
    {@const prev = i > 0 ? list[i - 1] : undefined}
    {@const grouped = !!appearance.groupConsecutiveMessages && !!prev && prev.author === m.author && m.author !== 'SYSTEM' && m.reply_to == null}
    <MessageItem {m} {parent} {grouped} />
  {/each}
</div>

<style>
  .messages { flex: 1; overflow-y: auto; padding: 20px 0 calc(20px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; overscroll-behavior: contain; }
  .loading-status { text-align: center; font-size: 11px; color: var(--accent); padding: 10px; opacity: 0.8; }
</style>
