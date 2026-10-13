<script lang="ts">
  import { onMount } from 'svelte';
  import { clickOutside } from '../../actions/clickOutside';
  import { focusOnMount } from '../../actions/focusOnMount';
  import { searchGifs } from '../../api/giphy';
  import type { Gif } from '../../types';

  let { onpick, onclose }: { onpick: (url: string) => void; onclose: () => void } = $props();

  let query = $state('');
  let results = $state<Gif[]>([]);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function search(q: string) {
    try {
      results = await searchGifs(q);
    } catch (e) {
      console.error('Giphy fetch failed', e);
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

<div class="gif-picker" use:clickOutside={{ onoutside: onclose, ignore: '.gif-toggle-btn' }}>
  <div class="gif-header">
    <input type="text" placeholder="Search Giphy..." bind:value={query} {oninput} use:focusOnMount />
  </div>
  <div class="gif-grid">
    <div class="gif-masonry">
      {#each results as gif (gif.id)}
        <button type="button" class="gif" onclick={() => onpick(gif.images.fixed_height.url)}>
          <img src={gif.images.fixed_height_small.url} alt={gif.title} />
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .gif-picker { position: absolute; bottom: calc(100% - 10px); right: 24px; width: min(320px, calc(100% - 48px)); height: 350px; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 8px; margin-bottom: 10px; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); z-index: 100; overflow: hidden; }
  .gif-header { display: flex; padding: 10px; background: var(--crust); border-bottom: 1px solid var(--surface0); }
  .gif-header input { all: unset; flex: 1; background: var(--mantle); color: var(--text); padding: 6px 10px; border-radius: 4px; font-size: 13px; border: 1px solid var(--surface0); user-select: text; cursor: text; }
  .gif-header input:focus { border-color: var(--mauve); }
  .gif-grid { flex: 1; overflow-y: auto; padding: 4px; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .gif-masonry { column-count: 2; column-gap: 4px; width: 100%; }
  .gif { all: unset; display: block; width: 100%; cursor: pointer; break-inside: avoid; margin-bottom: 4px; }
  .gif img { width: 100%; height: auto; border-radius: 4px; display: block; transition: opacity 0.2s; }
  .gif:hover img { opacity: 0.7; }
</style>
