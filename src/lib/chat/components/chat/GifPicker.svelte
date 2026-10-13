<script lang="ts">
  import { onMount } from 'svelte';
  import { clickOutside } from '../../actions/clickOutside';
  import { focusOnMount } from '../../actions/focusOnMount';
  import { searchGifs } from '../../api/giphy';
  import type { Gif } from '../../types';

  let { onpick, onclose }: { onpick: (url: string) => void; onclose: () => void } = $props();

  let query = $state('');
  let results = $state<Gif[]>([]);
  let loading = $state(false);
  let error = $state('');
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function search(q: string) {
    loading = true;
    error = '';
    try {
      const found = await searchGifs(q);
      results = found;
      if (found.length === 0) error = 'no gifs found';
    } catch (e) {
      results = [];
      error = e instanceof Error ? e.message : 'giphy unavailable';
    } finally {
      loading = false;
    }
  }

  function oninput() {
    clearTimeout(timer);
    timer = setTimeout(() => search(query.trim() || 'trending'), 500);
  }

  onMount(() => {
    search('trending');
    return () => clearTimeout(timer);
  });
</script>

<div class="gif-picker" use:clickOutside={{ onoutside: onclose, ignore: '.gif-btn' }}>
  <div class="gif-header">
    <input type="text" placeholder="Search Giphy..." bind:value={query} {oninput} use:focusOnMount />
  </div>
  <div class="gif-grid">
    {#if results.length > 0}
      <div class="gif-masonry">
        {#each results as gif (gif.id)}
          <button type="button" class="gif" onclick={() => onpick(gif.images.fixed_height.url)}>
            <img src={gif.images.fixed_height_small.url} alt={gif.title} />
          </button>
        {/each}
      </div>
    {:else if loading}
      <p class="gif-status">loading…</p>
    {:else if error}
      <p class="gif-status error">{error}</p>
    {/if}
  </div>
</div>

<style>
  .gif-picker { position: absolute; bottom: calc(100% - 10px); right: 24px; width: min(320px, calc(100% - 48px)); height: 350px; background: var(--mantle); border: 1px solid var(--surface0); border-radius: var(--r-sm); margin-bottom: 10px; display: flex; flex-direction: column; box-shadow: var(--shadow-menu); z-index: 100; overflow: hidden; }
  .gif-header { display: flex; padding: 10px; background: var(--crust); border-bottom: 1px solid var(--surface0); }
  .gif-header input { all: unset; flex: 1; background: var(--mantle); color: var(--text); padding: 6px 10px; border-radius: 4px; font-size: 13px; border: 1px solid var(--surface0); user-select: text; cursor: text; }
  .gif-header input:focus { border-color: var(--accent); }
  .gif-grid { flex: 1; overflow-y: auto; padding: 4px; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .gif-masonry { column-count: 2; column-gap: 4px; width: 100%; }
  .gif { all: unset; display: block; width: 100%; cursor: pointer; break-inside: avoid; margin-bottom: 4px; }
  .gif img { width: 100%; height: auto; border-radius: 4px; display: block; transition: opacity 0.2s; }
  .gif:hover img { opacity: 0.7; }
  .gif-status { margin: 0; padding: 16px 8px; text-align: center; color: var(--overlay0); font-size: 12px; }
  .gif-status.error { color: var(--red); }
</style>
