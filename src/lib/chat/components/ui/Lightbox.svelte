<script lang="ts">
  import { ui } from '../../state/ui.svelte';
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (ui.lightboxSrc = null)} />

{#if ui.lightboxSrc}
  <button type="button" class="lightbox" aria-label="Close image" onclick={() => (ui.lightboxSrc = null)}>
    <img src={ui.lightboxSrc} alt="full size" />
  </button>
{/if}

<style>
  .lightbox { all: unset; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center; z-index: 1000; cursor: zoom-out; }
  img { width: 800px; height: 800px; max-width: 95vw; max-height: 85vh; object-fit: contain; border-radius: 8px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8); }
</style>
