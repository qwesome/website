<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { connect, disconnect, setStatus } from '$lib/chat/socket';
  import { resetNotified } from '$lib/chat/notify';
  import { auth } from '$lib/chat/state/auth.svelte';
  import { conversations } from '$lib/chat/state/conversations.svelte';
  import { unread } from '$lib/chat/state/unread.svelte';
  import { ui } from '$lib/chat/state/ui.svelte';
  import { chatFromUrl } from '$lib/chat/utils/route';
  import Sidebar from '$lib/chat/components/sidebar/Sidebar.svelte';
  import Lightbox from '$lib/chat/components/ui/Lightbox.svelte';
  import ChatSkeleton from '$lib/chat/components/ui/ChatSkeleton.svelte';

  let { children } = $props();

  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const current = $derived(auth.user ? chatFromUrl(page.url, auth.user) : null);

  // Guard: not signed in -> login page (the skeleton covers the gap).
  $effect(() => {
    if (!auth.user) goto('/chat/login', { replaceState: true });
  });

  // Connect while signed in.
  $effect(() => {
    if (!auth.user) return;
    connect();
    conversations.load();
    return () => disconnect();
  });

  // Track which channel is on screen; viewing it clears its unread dot.
  $effect(() => {
    ui.activeChannel = current?.id ?? null;
    if (current && ui.focused) unread.set(current.id, false);
  });

  $effect(() => () => clearTimeout(idleTimer));

  function onFocus() {
    ui.focused = true;
    resetNotified();
    clearTimeout(idleTimer);
    if (auth.user) setStatus('online');
    if (ui.activeChannel) unread.set(ui.activeChannel, false);
  }

  function onBlur() {
    ui.focused = false;
    clearTimeout(idleTimer);
    if (auth.user) idleTimer = setTimeout(() => setStatus('away'), 5000);
  }
</script>

<svelte:window onfocus={onFocus} onblur={onBlur} />

{#if auth.user}
  <div class="app">
    <Sidebar />
    <div class="chat">{@render children()}</div>
  </div>
  <Lightbox />
{/if}

<!-- Covers the redirect, and the first conversation fetch after sign-in -->
{#if !auth.user || !conversations.loaded}
  <ChatSkeleton />
{/if}

<style>
  .app { display: flex; width: 100%; height: 100%; background: var(--base); overflow: hidden; }
  .chat { flex: 1; display: flex; flex-direction: column; background: var(--base); min-width: 0; }
</style>