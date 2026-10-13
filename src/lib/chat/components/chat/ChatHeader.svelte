<script lang="ts">
  import { auth } from '../../state/auth.svelte';
  import { ui } from '../../state/ui.svelte';
  import Icon from '../ui/Icon.svelte';

  let { title }: { title: string } = $props();
</script>

<header class="chat-header">
  {#if ui.isMobile}
    <button type="button" class="menu" aria-label="Open menu" onclick={() => (ui.sidebarOpen = true)}>
      <Icon name="menu" size={24} />
    </button>
  {/if}
  <span class="title">{title}</span>
  {#if auth.isAdmin}
    <label class="admin-toggle">
      <input type="checkbox" bind:checked={auth.adminMode} />
      <span class="toggle-text">{auth.adminMode ? 'ADMIN ACTIVE' : 'ADMIN MODE'}</span>
    </label>
  {/if}
</header>

<style>
  .chat-header { display: flex; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--surface0); color: var(--text); font-size: 15px; font-weight: bold; }
  .menu { all: unset; cursor: pointer; margin-right: 12px; color: var(--mauve); display: inline-flex; }
  .title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .admin-toggle { margin-left: auto; display: flex; align-items: center; gap: 8px; background: var(--surface0); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--surface1); cursor: pointer; flex-shrink: 0; }
  .toggle-text { font-size: 10px; letter-spacing: 0.05em; color: var(--overlay1); }
  .admin-toggle input:checked ~ .toggle-text { color: var(--red); }
</style>
