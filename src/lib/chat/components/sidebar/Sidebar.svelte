<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '../../state/auth.svelte';
  import { servers } from '../../state/servers.svelte';
  import { ui } from '../../state/ui.svelte';
  import { chatFromUrl } from '../../utils/route';
  import ServerRail from './ServerRail.svelte';
  import ServerPanel from './ServerPanel.svelte';
  import HomePanel from './HomePanel.svelte';
  import CreateServerModal from './CreateServerModal.svelte';

  const me = $derived(auth.user ?? '');
  const current = $derived(chatFromUrl(page.url, me));
  const activeServer = $derived(
    current.type === 'server' ? servers.serverOf(current.serverId) : undefined
  );

  let createOpen = $state(false);

  const style = $derived.by(() => {
    if (!ui.isMobile) return '';
    if (ui.dragDx !== null) {
      const w = ui.windowWidth;
      const offset = ui.sidebarOpen ? ui.dragDx : -w + ui.dragDx;
      return `transform: translateX(${Math.min(0, Math.max(-w, offset))}px); transition: none;`;
    }
    return `transform: translateX(${ui.sidebarOpen ? 0 : -100}%); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);`;
  });
</script>

<aside class="sidebar" {style} class:open={ui.sidebarOpen}>
  <ServerRail oncreate={() => (createOpen = true)} />
  {#if activeServer}
    <ServerPanel server={activeServer} />
  {:else}
    <HomePanel />
  {/if}
</aside>

<CreateServerModal bind:open={createOpen} />

<style>
  .sidebar { display: flex; height: 100%; flex-shrink: 0; }
  @media (max-width: 768px) {
    .sidebar { position: absolute; top: 0; left: 0; width: 100%; z-index: 50; }
  }
</style>