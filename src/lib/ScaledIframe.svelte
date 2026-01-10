<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let src: string = '';
  export let aspectWidth: number = 16;
  export let aspectHeight: number = 9;
  export let baseline: number = 100; // baseline px per aspect unit (16x9 -> 1600x900 when baseline=100)

  let container: HTMLElement | null = null;
  let scale = 1;

  const contentWidth = () => aspectWidth * baseline;
  const contentHeight = () => aspectHeight * baseline;

  let ro: ResizeObserver | null = null;

  function update() {
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const deviceScale = (typeof window !== 'undefined') ? (window.devicePixelRatio || 1) : 1;
    const ratioScale = Math.min(cw / contentWidth(), ch / contentHeight());
    // divide by devicePixelRatio to compensate for zoom (best-effort)
    scale = ratioScale / deviceScale;
  }

  onMount(() => {
    update();
    if (container) {
      ro = new ResizeObserver(update);
      ro.observe(container);
    }
    window.addEventListener('resize', update);

    const interval = setInterval(() => {
      // devicePixelRatio can change when user zooms; poll occasionally as a fallback
      update();
    }, 250);

    return () => {
      if (ro && container) ro.unobserve(container);
      window.removeEventListener('resize', update);
      clearInterval(interval);
    };
  });

  onDestroy(() => {
    if (ro && container) ro.disconnect();
  });
</script>

<style>
  :global(.scaled-iframe-wrapper) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .scaled-content {
    transform-origin: center center;
    will-change: transform;
    /* the intrinsic size the iframe is scaled from */
    display: block;
  }

  .scaled-content iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: transparent;
  }
</style>

<div bind:this={container} class="scaled-iframe-wrapper">
  <div
    class="scaled-content"
    style="width: {contentWidth()}px; height: {contentHeight()}px; transform: scale({scale});"
  >
    <iframe src={src} allowfullscreen></iframe>
  </div>
</div>
