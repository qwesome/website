<script lang="ts">
  import '$lib/chat/styles/theme.css';
  import '$lib/chat/styles/global.css';

  import { onMount } from 'svelte';
  import { swipeSidebar } from '$lib/chat/actions/swipeSidebar';
  import { auth } from '$lib/chat/state/auth.svelte';
  import { unread } from '$lib/chat/state/unread.svelte';
  import { ui } from '$lib/chat/state/ui.svelte';
  import { appearance } from '$lib/chat/state/appearance.svelte';
  import ChatSkeleton from '$lib/chat/components/ui/ChatSkeleton.svelte';

  let { children } = $props();
  let root = $state<HTMLDivElement>();

  // Mobile browsers resize the visual viewport when the keyboard opens.
  function updateViewportHeight() {
    const h = window.visualViewport?.height ?? window.innerHeight;
    root?.style.setProperty('--vh', `${h * 0.01}px`);
  }

  onMount(() => {
    if (!auth.ready) auth.restore();

    // Validate + rotate the stored session token (a fresh token each load).
    auth.refresh();

    // Apply local appearance settings & sync with backend
    appearance.applyToDOM();
    appearance.loadFromServer();

    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
    };
  });
</script>

<svelte:window bind:innerWidth={ui.windowWidth} />

<svelte:head>
  <title>𝚞𝚗𝚋𝚕𝚘𝚌𝚔𝚎𝚍 𝚌𝚑𝚊𝚝</title>
  <link rel="icon" type="image/png" href={unread.any ? '/chat-favicon-notif.png' : '/chat-favicon.png'} />
</svelte:head>

<div class="chat-root" class:reduce-motion={appearance.reduceMotion} bind:this={root} use:swipeSidebar>
  {#if auth.ready}
    {@render children()}
  {:else}
    <ChatSkeleton />
  {/if}
</div>

<style>
  /* When reduce motion is on, neutralise every transition/animation in the app,
     including modals and context menus rendered as descendants of the root. */
  .chat-root.reduce-motion :global(*),
  .chat-root.reduce-motion :global(*::before),
  .chat-root.reduce-motion :global(*::after) {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
</style>