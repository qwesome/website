<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '../../state/auth.svelte';
  import { presence } from '../../state/presence.svelte';
  import { unread } from '../../state/unread.svelte';
  import { conversations } from '../../state/conversations.svelte';
  import { ui } from '../../state/ui.svelte';
  import { dmId } from '../../utils/dm';
  import { adminHref, chatFromUrl, dmHref } from '../../utils/route';
  import DmItem from './DmItem.svelte';
  import SidebarFooter from './SidebarFooter.svelte';

  const me = $derived(auth.user ?? '');
  const current = $derived(chatFromUrl(page.url, me));
  const strangers = $derived(
    presence.others(me).filter((u) => !conversations.list.some((c) => c.username === u))
  );
</script>

<div class="panel">
  <div class="panel-header">direct messages</div>

  {#if auth.adminMode}
    <div class="section-label admin">Admin</div>
    <a class="nav-item admin" class:active={current.type === 'admin'} href={adminHref()} onclick={() => (ui.sidebarOpen = false)}>
      <span class="hash">!</span> admin-panel
    </a>
  {/if}

  <div class="section-label">conversations</div>
  {#each conversations.list as c (c.username)}
    <DmItem username={c.username} active={current.type === 'dm' && current.name === c.username} />
  {/each}

  {#if strangers.length > 0}
    <div class="section-label">online users</div>
    {#each strangers as u (u)}
      <a class="nav-item dimmed" href={dmHref(u)} onclick={() => (ui.sidebarOpen = false)}>
        <span class="dot {presence.statusOf(u)}"></span>{u}
        {#if unread.has(dmId(me, u))}<span class="unread-dot"></span>{/if}
      </a>
    {/each}
  {/if}

  <SidebarFooter />
</div>

<style>
  .panel { width: 240px; background: var(--mantle); border-right: 1px solid var(--surface0); display: flex; flex-direction: column; height: 100%; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .panel-header { padding: 22px 20px; border-bottom: 1px solid var(--surface0); color: var(--text); font-size: 14px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .section-label { font-size: 10px; text-transform: uppercase; color: var(--surface2); padding: 16px 20px 8px; letter-spacing: 0.1em; white-space: nowrap; }
  .section-label.admin { color: var(--red); }

  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; cursor: pointer; color: var(--overlay0); font-size: 14px; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-item:hover { background: var(--surface0); color: var(--text); }
  .nav-item.active { background: var(--surface0); color: var(--mauve); border-left: 3px solid var(--mauve); padding-left: 17px; }
  .nav-item.dimmed { opacity: 0.5; font-size: 13px; }
  .nav-item.dimmed:hover { opacity: 1; }
  .nav-item.admin { color: var(--red); font-weight: 800; letter-spacing: 0.02em; }
  .nav-item.admin:hover { background: rgba(237, 135, 150, 0.1); }
  .nav-item.admin.active { border-left-color: var(--red); background: rgba(237, 135, 150, 0.1); position: relative; padding-left: 17px; }

  .hash { font-weight: 800; opacity: 0.8; width: 14px; text-align: center; flex-shrink: 0; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .dot.online { background: var(--green); }
  .dot.away { background: var(--yellow); }
  .dot.offline { background: var(--surface2); }
  .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); flex-shrink: 0; }
</style>