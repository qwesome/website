<script lang="ts">
  import { avatars } from '../../state/avatars.svelte';

  let { name, size = 36 }: { name: string; size?: number } = $props();
  const src = $derived(avatars.get(name));

  $effect(() => {
    avatars.ensure(name);
  });
</script>

<div class="avatar" style:width="{size}px" style:height="{size}px">
  {#if src}
    <img {src} alt={name} />
  {:else}
    {name[0]?.toUpperCase() ?? '?'}
  {/if}
</div>

<style>
  .avatar { border-radius: 6px; background: var(--surface0); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: var(--mauve); flex-shrink: 0; overflow: hidden; }
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>
