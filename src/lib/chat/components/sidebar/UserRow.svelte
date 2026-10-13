<script lang="ts">
  import type { Snippet } from 'svelte';
  import { auth } from '../../state/auth.svelte';
  import { presence } from '../../state/presence.svelte';
  import { unread } from '../../state/unread.svelte';
  import { ui } from '../../state/ui.svelte';
  import type { Status } from '../../types';
  import Avatar from '../ui/Avatar.svelte';

  let {
    username,
    href,
    unreadId,
    active = false,
    children
  }: {
    username: string;
    href?: string;
    unreadId?: string;
    active?: boolean;
    children?: Snippet;
  } = $props();

  const me = $derived(auth.user ?? '');
  const status = $derived(presence.statusOf(username) as Status);
  const statusLabel = $derived(({ online: 'Online', away: 'Away', offline: 'Offline' } as Record<Status, string>)[status]);

  function onContextMenu(e: MouseEvent) {
    if (username === me) return;
    if ((window.getSelection()?.toString() ?? '').length > 0) return;
    e.preventDefault();
    ui.openContextMenu(e.clientX, e.clientY, username);
  }
</script>

<div class="row" role="group" class:active oncontextmenu={onContextMenu}>
  {#if href}
    <a class="link" href={href} onclick={() => (ui.sidebarOpen = false)}>
      <Avatar name={username} size={30} />
      <span class="name">{username}</span>
    </a>
  {:else}
    <span class="link static">
      <Avatar name={username} size={30} />
      <span class="name">{username}</span>
    </span>
  {/if}

  <span class="side">
    <span class="dot {status}" title={statusLabel}></span>
    {#if unreadId && unread.has(unreadId)}<span class="unread-dot"></span>{/if}
    {#if children}<span class="extra">{@render children()}</span>{/if}
  </span>
</div>

<style>
  .row { display: flex; align-items: center; color: var(--overlay0); font-size: 14px; position: relative; }
  .row:hover { background: var(--surface0); color: var(--text); }
  .row.active { background: var(--surface0); color: var(--mauve); border-left: 3px solid var(--mauve); }
  .link { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; padding: 8px 0 8px 20px; color: inherit; text-decoration: none; cursor: pointer; }
  .row.active .link { padding-left: 17px; }
  .link.static { cursor: default; }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .side { display: flex; align-items: center; gap: 6px; padding-right: 14px; flex-shrink: 0; }
  .row.active .side { padding-right: 11px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .dot.online { background: var(--green); }
  .dot.away { background: var(--yellow); }
  .dot.offline { background: var(--surface2); }
  .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); flex-shrink: 0; }
  .extra { display: inline-flex; align-items: center; gap: 4px; }
</style>