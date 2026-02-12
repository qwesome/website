<header class="page-header">
  <img src="/tlozoot.png" alt="TLOZ OOT" on:click={refreshPage}>
</header>

<iframe src="/tlozoot.html" title="tlozoot" allowfullscreen class="full-page" bind:this={iframe} tabindex="0"
  on:load={() => { iframe?.focus(); iframe?.contentWindow?.postMessage('focus-game', '*'); }}
  on:focus={() => iframe?.contentWindow?.postMessage('focus-game', '*')}
></iframe>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let iframe: HTMLIFrameElement;

  function refreshPage() {
    location.reload();
  }

  onMount(() => {
    if (iframe) iframe.focus();
    const onLoad = () => iframe?.focus();
    iframe?.addEventListener('load', onLoad);

    const onKey = (e: KeyboardEvent) => {
      iframe?.focus();
      iframe?.contentWindow?.postMessage('focus-game', '*');
    };
    window.addEventListener('keydown', onKey);

    return () => {
      iframe?.removeEventListener('load', onLoad);
      window.removeEventListener('keydown', onKey);
    };
  });

  onDestroy(() => {
    try {
      iframe?.contentWindow?.postMessage('blur-game', '*');
    } catch (e) {}
  });
</script>

<style>

:global(body) {
  background: url('/background.png') center center / cover no-repeat;
  position: relative;
  min-height: 100vh;
}
  .page-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 75px;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1rem;
    z-index: 10;
  }

  .page-header img {
    max-height: 100%;
    width: auto;
    object-fit: contain;
    cursor: pointer;
  }

  .full-page {
    position: fixed;
    top: 75px;
    left: 0;
    width: 100vw;
    height: calc(100vh - 75px);
    border: none;
  }

  @media (prefers-color-scheme: light) {
    .grid button {
      border: 2px solid rgb(30, 32, 37) ;
      background: linear-gradient(to bottom, #ed99fd, #e94fd4);
      color: #000000;
    }

    :global(body) {
      background: url('/background-inverted.png') center center / cover no-repeat;
    }
  }
</style>
