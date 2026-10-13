<script lang="ts">
  import { ui } from '../../state/ui.svelte';
  let { src, alt = 'image' }: { src: string; alt?: string } = $props();
</script>

<button type="button" class="zoom" onclick={() => (ui.lightboxSrc = src)}>
  <img {src} {alt} />
</button>

<style>
  .zoom { all: unset; display: block; cursor: pointer; max-width: fit-content; }
  img { max-width: 320px; max-height: 240px; border-radius: 6px; display: block; border: 1px solid var(--surface0); }
  .zoom:hover img { border-color: var(--accent); }
</style>
