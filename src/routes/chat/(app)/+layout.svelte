<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { connect, disconnect, setStatus } from '$lib/chat/socket';
  import { resetNotified } from '$lib/chat/notify';
  import { auth } from '$lib/chat/state/auth.svelte';
  import { conversations } from '$lib/chat/state/conversations.svelte';
  import { servers } from '$lib/chat/state/servers.svelte';
  import { friends } from '$lib/chat/state/friends.svelte';
  import { unread } from '$lib/chat/state/unread.svelte';
  import { ui } from '$lib/chat/state/ui.svelte';
  import { channelHref, chatFromUrl, homeHref } from '$lib/chat/utils/route';
  import Sidebar from '$lib/chat/components/sidebar/Sidebar.svelte';
  import Lightbox from '$lib/chat/components/ui/Lightbox.svelte';
  import UserContextMenu from '$lib/chat/components/ui/UserContextMenu.svelte';
  import ProfileModal from '$lib/chat/components/ui/ProfileModal.svelte';
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
    servers.load();
    friends.load();
    return () => disconnect();
  });

  // Fresh visits to /chat land on the default channel; unknown or legacy
  // targets (e.g. the old ?c=global, or a channel the user can't see) are
  // redirected to a safe default.
  $effect(() => {
    if (!auth.user || !servers.loaded) return;
    const url = page.url;

    const hasTarget =
      url.searchParams.has('dm') || url.searchParams.has('s') || url.searchParams.has('c');
    if (!hasTarget && !url.searchParams.has('home')) {
      const def = servers.defaultChannel();
      goto(def ? channelHref(def.server.id, def.channel.id) : homeHref(), { replaceState: true });
      return;
    }

    const c = url.searchParams.get('c');
    if (c && c !== 'admin-panel') {
      const def = servers.defaultChannel();
      goto(def ? channelHref(def.server.id, def.channel.id) : homeHref(), { replaceState: true });
      return;
    }

    const cur = chatFromUrl(url, auth.user);
    if (cur.type === 'server') {
      const srv = servers.serverOf(cur.serverId);
      const canSee = !!srv && servers.visible.some((s) => s.id === srv.id);
      const chOk = !!srv?.channels.some((ch) => String(ch.id) === cur.id);
      if (!canSee || !chOk) {
        const def = servers.defaultChannel();
        goto(def ? channelHref(def.server.id, def.channel.id) : homeHref(), { replaceState: true });
      }
    }
  });

  // Track which channel is on screen; viewing it clears its unread dot.
  $effect(() => {
    ui.activeChannel = current?.id || null;
    if (current?.id && ui.focused) unread.set(current.id, false);
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
  <UserContextMenu />
  <ProfileModal />
{/if}

<!-- Covers the redirect, and the first conversation/servers fetch after sign-in -->
{#if !auth.user || !conversations.loaded || !servers.loaded}
  <ChatSkeleton />
{/if}

<style>
  .app { display: flex; width: 100%; height: 100%; background: var(--base); overflow: hidden; }
  .chat { flex: 1; display: flex; flex-direction: column; background: var(--base); min-width: 0; }
</style>