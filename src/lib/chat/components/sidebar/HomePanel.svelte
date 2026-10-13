<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '../../state/auth.svelte';
  import { presence } from '../../state/presence.svelte';
  import { conversations } from '../../state/conversations.svelte';
  import { friends } from '../../state/friends.svelte';
  import { ui } from '../../state/ui.svelte';
  import { dmId } from '../../utils/dm';
  import { adminHref, chatFromUrl, dmHref, friendsHref } from '../../utils/route';
  import DmItem from './DmItem.svelte';
  import SidebarFooter from './SidebarFooter.svelte';
  import UserRow from './UserRow.svelte';

  const me = $derived(auth.user ?? '');
  const current = $derived(chatFromUrl(page.url, me));
  const strangers = $derived(
    presence.others(me)
      .filter((u) => !conversations.list.some((c) => c.username === u))
      .filter((u) => !friends.isFriend(u))
      .filter((u) => !friends.hasRequestFrom(u) && !friends.hasOutgoingTo(u))
  );
  // Friends live in their own section, so drop them from the conversations list.
  const convos = $derived(conversations.list.filter((c) => !friends.isFriend(c.username)));
  const isActiveDm = (u: string) => current.type === 'dm' && current.name === u;
</script>

<div class="panel">
  <div class="panel-header">direct messages</div>

  <a
    class="nav-item friends"
    class:active={current.type === 'friends'}
    href={friendsHref()}
    onclick={() => (ui.sidebarOpen = false)}
  >
    <span class="hash"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
    friends
    {#if friends.pendingCount > 0}<span class="nav-badge">{friends.pendingCount > 8 ? '9+' : friends.pendingCount}</span>{/if}
  </a>

  {#if auth.adminMode}
    <a class="nav-item admin" class:active={current.type === 'admin'} href={adminHref()} onclick={() => (ui.sidebarOpen = false)}>
      <span class="hash">!</span> admin-panel
    </a>
  {/if}

  {#if friends.friends.length > 0}
    <div class="friends-head">
      <span class="friends-title">friends</span>
      <span class="friends-count">{friends.friends.length}</span>
    </div>
    {#each friends.friends as u (u)}
      <UserRow username={u} href={dmHref(u)} unreadId={dmId(me, u)} active={isActiveDm(u)} />
    {/each}
  {/if}

  {#if convos.length > 0}
    <div class="section-label">conversations</div>
    {#each convos as c (c.username)}
      <DmItem username={c.username} active={isActiveDm(c.username)} />
    {/each}
  {/if}

  {#if strangers.length > 0}
    <div class="section-label">online users</div>
    {#each strangers as u (u)}
      <UserRow username={u} href={dmHref(u)} unreadId={dmId(me, u)} />
    {/each}
  {/if}

  <SidebarFooter />
</div>

<style>
  .panel { width: 240px; background: var(--mantle); border-right: 1px solid var(--surface0); display: flex; flex-direction: column; height: 100%; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .panel-header { display: flex; align-items: center; height: 56px; padding: 0 20px; border-bottom: 1px solid var(--surface0); color: var(--text); font-size: 15px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .section-label { font-size: 10px; text-transform: uppercase; color: var(--surface2); padding: 16px 20px 8px; letter-spacing: 0.1em; white-space: nowrap; }

  .friends-head { display: flex; align-items: center; gap: 8px; padding: 16px 14px 4px 20px; }
  .friends-title { font-size: 10px; text-transform: uppercase; color: var(--surface2); letter-spacing: 0.1em; }
  .friends-count { font-size: 10px; font-weight: 800; color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); border-radius: var(--r-xs); padding: 1px 6px; }

  .nav-item { display: flex; align-items: center; gap: 10px; padding: 12px 20px; cursor: pointer; color: var(--overlay0); font-size: 14px; text-decoration: none; overflow: hidden; white-space: nowrap; }
  .nav-item:hover { background: var(--surface0); color: var(--text); }
  .nav-item.active { background: var(--surface0); color: var(--accent); border-left: 3px solid var(--accent); padding-left: 17px; }
  .nav-item.admin { color: var(--red); font-weight: 800; letter-spacing: 0.02em; }
  .nav-item.admin:hover { background: color-mix(in srgb, var(--red) 10%, transparent); }
  .nav-item.admin.active { border-left-color: var(--red); background: color-mix(in srgb, var(--red) 10%, transparent); padding-left: 17px; }

  .hash { font-weight: 800; opacity: 0.8; width: 14px; display: inline-flex; justify-content: center; flex-shrink: 0; }
  .nav-badge { margin-left: auto; min-width: 16px; height: 16px; padding: 0 5px; border-radius: 8px; background: var(--red); color: var(--crust); font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; }
</style>
