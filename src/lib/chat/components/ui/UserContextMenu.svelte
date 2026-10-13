<script lang="ts">
  import { ui } from '../../state/ui.svelte';
  import { clickOutside } from '../../actions/clickOutside';
  import Icon from './Icon.svelte';

  const menu = $derived(ui.menu);

  const left = $derived(menu ? Math.min(menu.x, Math.max(8, window.innerWidth - 220)) : 0);
  const top = $derived(menu ? Math.min(menu.y, Math.max(8, window.innerHeight - 360)) : 0);

  function close() {
    ui.closeMenu();
  }

  function pick(item: NonNullable<typeof menu>['items'][number]) {
    if (item.disabled) return;
    close();
    item.action?.();
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

{#if menu}
  <div
    class="menu"
    style="left: {left}px; top: {top}px"
    role="menu"
    use:clickOutside={{ onoutside: close }}
  >
    {#each menu.items as item, i (i)}
      {#if item.separator}
        <div class="sep"></div>
      {:else}
        <button
          type="button"
          class="item"
          class:danger={item.danger}
          disabled={item.disabled}
          onclick={() => pick(item)}
        >
          <span class="ic"><Icon name={item.icon ?? 'menu'} size={14} /></span>
          <span class="label">{item.label}</span>
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .menu {
    position: fixed;
    z-index: 20000;
    min-width: 190px;
    max-width: 260px;
    background: var(--mantle);
    border: 1px solid var(--surface1);
    border-radius: var(--r-sm);
    padding: 5px;
    box-shadow: var(--shadow-menu);
    display: flex;
    flex-direction: column;
    animation: menu-in 0.12s ease-out;
  }
  @keyframes menu-in {
    from { opacity: 0; transform: translateY(-4px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .item {
    all: unset;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 9px;
    border-radius: var(--r-sm, 5px);
    color: var(--subtext0);
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.12s, color 0.12s, padding-left 0.12s;
  }
  .item:hover:not(:disabled) {
    background: var(--surface0);
    color: var(--text);
    padding-left: 12px;
  }
  .item:disabled { opacity: 0.4; cursor: default; }
  .ic { display: inline-flex; width: 16px; justify-content: center; opacity: 0.85; flex-shrink: 0; }
  .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item.danger { color: var(--red); }
  .item.danger:hover:not(:disabled) { background: color-mix(in srgb, var(--red) 12%, transparent); }
  .sep { height: 1px; background: var(--surface0); margin: 4px 6px; }
</style>
