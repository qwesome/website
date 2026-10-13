<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '../../state/auth.svelte';
  import { presence } from '../../state/presence.svelte';
  import { unread } from '../../state/unread.svelte';
  import { conversations } from '../../state/conversations.svelte';
  import { ui } from '../../state/ui.svelte';
  import { dmId } from '../../utils/dm';
  import { chatFromUrl, channelHref, dmHref } from '../../utils/route';
  import DmItem from './DmItem.svelte';
  import SidebarFooter from './SidebarFooter.svelte';

  const me = $derived(auth.user ?? '');
  const current = $derived(chatFromUrl(page.url, me));
  const strangers = $derived(
    presence.others(me).filter((u) => !conversations.list.some((c) => c.username === u))
  );

  const style = $derived.by(() => {
    if (!ui.isMobile) return '';
    if (ui.dragDx !== null) {
      const w = ui.windowWidth;
      const offset = ui.sidebarOpen ? ui.dragDx : -w + ui.dragDx;
      return `transform: translateX(${Math.min(0, Math.max(-w, offset))}px); transition: none;`;
    }
    return `transform: translateX(${ui.sidebarOpen ? 0 : -100}%); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);`;
  });

  const close = () => (ui.sidebarOpen = false);
</script>

<aside class="sidebar" {style}>
  <div class="sidebar-header">unblocked chat</div>

  {#if auth.adminMode}
    <div class="section-label admin">Admin</div>
    <a class="nav-item admin" class:active={current.id === 'admin-panel'} href={channelHref('admin-panel')} onclick={close}>
      <span class="hash">!</span> admin-panel
    </a>
  {/if}

  <div class="section-label">channels</div>
  <a class="nav-item" class:active={current.id === 'global'} href={channelHref('global')} onclick={close}>
    <span class="hash">#</span> global
    {#if unread.has('global')}<span class="unread-dot"></span>{/if}
  </a>

  <div class="section-label">direct messages</div>
  {#each conversations.list as c (c.username)}
    <DmItem username={c.username} active={current.id === dmId(me, c.username)} />
  {/each}

  <div class="section-label">online users</div>
  {#each strangers as u (u)}
    <a class="nav-item dimmed" href={dmHref(u)} onclick={close}>
      <span class="dot {presence.statusOf(u)}"></span>{u}
    </a>
  {/each}

  <SidebarFooter />
</aside>

<style>
  .sidebar { width: 240px; flex-shrink: 0; background: var(--mantle); border-right: 1px solid var(--surface0); display: flex; flex-direction: column; height: 100%; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .sidebar-header { padding: 18px 20px; border-bottom: 1px solid var(--surface0); color: var(--mauve); font-size: 13px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .section-label { font-size: 10px; text-transform: uppercase; color: var(--surface2); padding: 16px 20px 8px; letter-spacing: 0.1em; white-space: nowrap; }
  .section-label.admin { color: var(--red); }

  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; cursor: pointer; color: var(--overlay0); font-size: 14px; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-item:hover { background: var(--surface0); color: var(--text); }
  .nav-item.active { background: var(--surface0); color: var(--mauve); border-left: 3px solid var(--mauve); padding-left: 17px; }
  .nav-item.dimmed { opacity: 0.5; font-size: 13px; }
  .nav-item.dimmed:hover { opacity: 1; }
  .nav-item.admin { color: var(--red); font-weight: 800; letter-spacing: 0.02em; }
  .nav-item.admin:hover { background: rgba(237, 135, 150, 0.1); }
  .nav-item.admin.active { border-left-color: var(--red); background: rgba(237, 135, 150, 0.1); }

  @media (max-width: 768px) {
    .sidebar { position: absolute; top: 0; left: 0; width: 100%; z-index: 50; }
  }
</style>
