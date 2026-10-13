<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  // "Click once to arm, click again within `timeout` ms to confirm."
  let {
    onconfirm,
    title,
    confirmTitle = 'Click again to confirm',
    timeout = 3000,
    size = 16,
    children
  }: {
    onconfirm: () => void;
    title: string;
    confirmTitle?: string;
    timeout?: number;
    size?: number;
    children: Snippet;
  } = $props();

  let armed = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function click(e: MouseEvent) {
    e.stopPropagation();
    if (armed) {
      clearTimeout(timer);
      armed = false;
      onconfirm();
    } else {
      armed = true;
      timer = setTimeout(() => (armed = false), timeout);
    }
  }

  onDestroy(() => clearTimeout(timer));
</script>

<button type="button" class="confirm-btn" class:armed title={armed ? confirmTitle : title} onclick={click}>
  {#if armed}
    <Icon name="check" {size} stroke={3} />
  {:else}
    {@render children()}
  {/if}
</button>

<style>
  .confirm-btn { all: unset; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); transition: color 0.2s; }
  .confirm-btn:hover { color: var(--red); }
  .armed { color: var(--red); animation: pulse-red 0.8s infinite; }
  @keyframes pulse-red {
    0% { filter: drop-shadow(0 0 0 rgba(237, 135, 150, 0)); }
    50% { filter: drop-shadow(0 0 4px rgba(237, 135, 150, 0.8)); }
    100% { filter: drop-shadow(0 0 0 rgba(237, 135, 150, 0)); }
  }
</style>
