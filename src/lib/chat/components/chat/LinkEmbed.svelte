<script lang="ts">
  import { embeds } from '../../state/embeds.svelte';
  import { isImageUrl } from '../../utils/urls';
  import ZoomImage from '../ui/ZoomImage.svelte';

  let { url }: { url: string } = $props();
  const image = $derived(isImageUrl(url));
  const meta = $derived(embeds.get(url));

  $effect(() => {
    if (!isImageUrl(url)) embeds.ensure(url);
  });
</script>

{#if image}
  <div class="image-embed"><ZoomImage src={url} alt="inline embed" /></div>
{:else if meta && !meta.error}
  <a class="embed-card" href={url} target="_blank" rel="noopener noreferrer">
    {#if meta.image}<img class="embed-image" src={meta.image} alt="embed" />{/if}
    <div class="embed-info">
      <div class="embed-site">{meta.hostname}</div>
      <div class="embed-title">{meta.title}</div>
      {#if meta.description}<div class="embed-desc">{meta.description}</div>{/if}
    </div>
  </a>
{/if}

<style>
  .image-embed { margin-top: 8px; }
  .embed-card { display: flex; flex-direction: column; margin-top: 8px; border-left: 4px solid var(--surface2); background: var(--crust); border-radius: 4px; overflow: hidden; max-width: 400px; text-decoration: none; color: inherit; transition: border-color 0.2s; }
  .embed-card:hover { border-color: var(--accent); }
  .embed-image { width: 100%; max-height: 200px; object-fit: cover; display: block; }
  .embed-info { padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
  .embed-site { font-size: 11px; color: var(--accent); font-weight: bold; text-transform: uppercase; }
  .embed-title { font-size: 14px; color: var(--blue); font-weight: bold; }
  .embed-desc { font-size: 12px; color: var(--subtext0); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }
</style>
