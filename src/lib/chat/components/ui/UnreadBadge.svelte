<script lang="ts">
  let { count, variant = 'inline' }: { count: number; variant?: 'inline' | 'overlay' } = $props();
  const label = $derived(count > 8 ? '9+' : String(count));
</script>

{#if count > 0}
  {#if count === 1}
    <span class="badge dot {variant}"></span>
  {:else}
    <span class="badge count {variant}">{label}</span>
  {/if}
{/if}

<style>
  .badge {
    background: var(--red);
    color: var(--crust);
    font-size: 10px;
    font-weight: 800;
    line-height: 1;
    flex-shrink: 0;
  }

  /* Inline: sits in a sidebar row / nav item, pushed to the right. */
  .dot.inline {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-left: auto;
  }
  .count.inline {
    min-width: 16px;
    height: 16px;
    padding: 0 5px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    box-sizing: border-box;
  }

  /* Overlay: pinned to the corner of a round icon (server rail). The ring uses
     the container colour so it reads like a presence badge; the parent must not
     clip it. */
  .badge.overlay {
    position: absolute;
    z-index: 2;
    box-sizing: content-box;
  }
  .dot.overlay {
    top: -1px;
    right: -1px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid var(--badge-ring, var(--crust));
  }
  .count.overlay {
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 18px;
    padding: 0 5px;
    border-radius: 10px;
    border: 2px solid var(--badge-ring, var(--crust));
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
