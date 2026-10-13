<script lang="ts">
  import type { Snippet } from 'svelte';
  import { presence } from '../../state/presence.svelte';
  import { unread } from '../../state/unread.svelte';
  import { ui } from '../../state/ui.svelte';
  import type { Status } from '../../types';
  import { userMenu } from '../../utils/menus';
  import Avatar from '../ui/Avatar.svelte';
  import UnreadBadge from '../ui/UnreadBadge.svelte';

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

  const status = $derived(presence.statusOf(username) as Status);
  const statusLabel = $derived(({ online: 'Online', away: 'Away', offline: 'Offline' } as Record<Status, string>)[status]);
  const custom = $derived(presence.customOf(username));

  function onContextMenu(e: MouseEvent) {
    if ((window.getSelection()?.toString() ?? '').length > 0) return;
    e.preventDefault();
    ui.openMenu(e.clientX, e.clientY, userMenu(username));
  }
</script>

<div class="row" role="group" class:active oncontextmenu={onContextMenu}>
  {#if href}
    <a class="link" href={href} onclick={() => (ui.sidebarOpen = false)}>
      <span class="pfp">
        <Avatar name={username} size={36} />
        <span class="dot {status}" title={statusLabel}></span>
      </span>
      <span class="who">
        <span class="name">{username}</span>
        {#if custom && (custom.emoji || custom.text)}
          <span class="sub" title={[custom.emoji, custom.text].filter(Boolean).join(' ')}>
            {#if custom.emoji}<span>{custom.emoji}</span>{/if}
            {#if custom.text}<span class="sub-text">{custom.text}</span>{/if}
          </span>
        {/if}
      </span>
    </a>
  {:else}
    <span class="link static">
      <span class="pfp">
        <Avatar name={username} size={36} />
        <span class="dot {status}" title={statusLabel}></span>
      </span>
      <span class="who">
        <span class="name">{username}</span>
        {#if custom && (custom.emoji || custom.text)}
          <span class="sub" title={[custom.emoji, custom.text].filter(Boolean).join(' ')}>
            {#if custom.emoji}<span>{custom.emoji}</span>{/if}
            {#if custom.text}<span class="sub-text">{custom.text}</span>{/if}
          </span>
        {/if}
      </span>
    </span>
  {/if}

  <span class="side">
    <UnreadBadge count={unreadId ? unread.count(unreadId) : 0} />
    {#if children}<span class="extra">{@render children()}</span>{/if}
  </span>
</div>

<style>
  .row { display: flex; align-items: center; color: var(--overlay0); font-size: 14px; position: relative; }
  .row:hover { background: var(--surface0); color: var(--text); }
  .row.active { background: var(--surface0); color: var(--accent); border-left: 3px solid var(--accent); }
  .link { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; padding: 8px 0 8px 20px; color: inherit; text-decoration: none; cursor: pointer; }
  .row.active .link { padding-left: 17px; }
  .link.static { cursor: default; }
  .pfp { position: relative; width: 36px; height: 36px; flex-shrink: 0; line-height: 0; }
  .pfp :global(.avatar) { border-radius: 50%; }
  .dot { position: absolute; top: -1px; right: -1px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--mantle); box-sizing: content-box; }
  .dot.online { background: var(--green); }
  .dot.away { background: var(--yellow); }
  .dot.offline { background: var(--surface2); }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .who .name { flex: none; }
  .sub { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--overlay0); min-width: 0; }
  .sub-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .side { display: flex; align-items: center; gap: 6px; padding-right: 14px; flex-shrink: 0; }
  .row.active .side { padding-right: 11px; }
  .extra { display: inline-flex; align-items: center; gap: 4px; }
</style>