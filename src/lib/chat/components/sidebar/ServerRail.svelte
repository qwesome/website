<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { scale } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { leaveServer } from '../../api/servers';
  import { auth } from '../../state/auth.svelte';
  import { servers } from '../../state/servers.svelte';
  import { unread } from '../../state/unread.svelte';
  import { avatars } from '../../state/avatars.svelte';
  import { appearance } from '../../state/appearance.svelte';
  import { ui, type MenuItem } from '../../state/ui.svelte';
  import { toast } from '../../state/toasts.svelte';
  import { channelHref, chatFromUrl, dmHref, homeHref } from '../../utils/route';
  import { clickOutside } from '../../actions/clickOutside';
  import Icon from '../ui/Icon.svelte';
  import Avatar from '../ui/Avatar.svelte';
  import UnreadBadge from '../ui/UnreadBadge.svelte';
  import type { Server } from '../../types';

  let { oncreate }: { oncreate: (tab: 'create' | 'join') => void } = $props();
  const me = $derived(auth.user ?? '');
  const current = $derived(chatFromUrl(page.url, me));

  let menuOpen = $state(false);

  const homeActive = $derived(current.type === 'home' || current.type === 'dm' || current.type === 'admin' || current.type === 'friends');

  // Unread DMs surface as rail avatars (below Home) while you're away from the
  // DM view, so their pings follow the conversation instead of the Home button.
  const dmUnread = $derived(
    Object.entries(unread.map)
      .filter(([ch, n]) => ch.startsWith('dm:') && n > 0)
      .map(([ch, n]) => {
        const users = ch.split(':').slice(1);
        const other = users.find((u) => u !== me) ?? users[0];
        return { id: ch, username: other, count: n };
      })
      .filter((d) => d.username && d.username !== me)
  );
  const showDms = $derived(current.type !== 'home' && dmUnread.length > 0);

  $effect(() => {
    if (showDms) dmUnread.forEach((d) => avatars.ensure(d.username));
  });

  function serverUnread(serverId: number) {
    const srv = servers.serverOf(serverId);
    if (!srv) return 0;
    return unread.totalFor(srv.channels.map((c) => String(c.id)));
  }

  function copyText(text: string, msg: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast(msg, 'success'),
      () => toast('Copy failed', 'error')
    );
  }

  function onServerContext(e: MouseEvent, srv: Server) {
    e.preventDefault();
    const count = serverUnread(srv.id);
    const items: MenuItem[] = [
      { label: 'Open server', icon: 'home', action: () => void goto(serverHref(srv.id)) },
      { label: 'Copy server name', icon: 'copy', action: () => copyText(srv.name, 'Server name copied') }
    ];
    if (srv.code) {
      items.push({ label: 'Copy invite code', icon: 'link', action: () => copyText(srv.code!, 'Invite code copied') });
    }
    items.push({ separator: true });
    items.push({
      label: 'Mark as read',
      icon: 'check',
      disabled: count === 0,
      action: () => {
        srv.channels.forEach((c) => unread.clear(String(c.id)));
        toast('Marked as read');
      }
    });
    if (srv.owner !== me) {
      items.push({ separator: true });
      items.push({
        label: 'Leave Server',
        icon: 'logout',
        danger: true,
        action: () => void leave(srv)
      });
    }
    ui.openMenu(e.clientX, e.clientY, items);
  }

  async function leave(srv: Server) {
    if (!window.confirm(`Leave ${srv.name}?`)) return;
    try {
      await leaveServer(srv.id);
      const channels = servers.removeServer(srv.id);
      if (channels.includes(ui.activeChannel ?? '')) {
        const def = servers.defaultChannel();
        void goto(def ? channelHref(def.server.id, def.channel.id) : homeHref());
      }
      toast(`Left ${srv.name}`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to leave server', 'error');
    }
  }

  function serverHref(serverId: number) {
    const srv = servers.serverOf(serverId);
    const ch = srv?.channels[0];
    return ch ? channelHref(serverId, ch.id) : homeHref();
  }

  function initials(name: string) {
    return name
      .split(/[\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || name.slice(0, 2).toUpperCase();
  }

  function pick(tab: 'create' | 'join') {
    menuOpen = false;
    oncreate(tab);
  }
</script>

<nav class="rail">
  <div class="rail-scroll">
    <a class="rail-btn home" class:active={homeActive} href={homeHref()} title="Direct messages">
      <Icon name="home" size={22} />
    </a>

    {#if showDms}
      <div class="dm-strip">
        {#each dmUnread as dm (dm.id)}
          <a
            class="rail-btn dm"
            class:active={current.type === 'dm' && current.id === dm.id}
            href={dmHref(dm.username)}
            title={`DM · ${dm.username}`}
            animate:flip={{ duration: appearance.reduceMotion ? 0 : 200 }}
            transition:scale={{ duration: appearance.reduceMotion ? 0 : 160, start: 0.6 }}
          >
            <Avatar name={dm.username} size={44} />
            <UnreadBadge count={dm.count} variant="overlay" />
          </a>
        {/each}
      </div>
    {/if}

    <div class="rail-divider"></div>

    {#each servers.list as srv (srv.id)}
      <a
        class="rail-btn"
        class:active={current.type === 'server' && current.serverId === srv.id}
        href={serverHref(srv.id)}
        title={srv.name}
        oncontextmenu={(e) => onServerContext(e, srv)}
      >
        {#if srv.avatar}
          <img class="srv-img" src={srv.avatar} alt={srv.name} />
        {:else}
          <span class="srv-glyph">{initials(srv.name)}</span>
        {/if}
        <UnreadBadge count={serverUnread(srv.id)} variant="overlay" />
      </a>
    {/each}
  </div>

  <button type="button" class="rail-btn add" class:on={menuOpen} title="Create or join a server" onclick={() => (menuOpen = !menuOpen)}>
    <Icon name="plus" size={20} />
  </button>

  {#if menuOpen}
    <div class="add-menu" role="menu" use:clickOutside={{ onoutside: () => (menuOpen = false) }}>
      <button type="button" class="menu-item" onclick={() => pick('create')}>
        <Icon name="plus" size={15} /> create server
      </button>
      <button type="button" class="menu-item" onclick={() => pick('join')}>
        <Icon name="link" size={15} /> join server
      </button>
    </div>
  {/if}
</nav>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)} />

<style>
  .rail {
    width: 68px;
    position: relative;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    background: var(--crust);
    border-right: 1px solid var(--surface0);
    overflow: visible;
  }

  .rail-scroll {
    flex: 1;
    width: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    /* Padding keeps overlay badges from being clipped by the scroll box. */
    padding: 6px 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: var(--surface2) transparent;
  }

  .rail-btn {
    all: unset;
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--surface0);
    color: var(--overlay1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-radius var(--dur) var(--ease), background var(--dur) var(--ease), color var(--dur) var(--ease);
    flex-shrink: 0;
    box-sizing: border-box;
  }
  .rail-btn:hover {
    border-radius: var(--r);
    color: var(--text);
  }
  .rail-btn.active {
    border-radius: var(--r);
    background: var(--accent);
    color: var(--on-accent);
  }
  .rail-btn.add {
    border: 1px dashed var(--surface2);
    background: transparent;
  }
  .rail-btn.add:hover {
    background: var(--surface0);
    border-style: solid;
  }
  .rail-btn.add.on {
    background: var(--surface0);
    border-style: solid;
    border-radius: var(--r);
    color: var(--text);
  }
  .add-menu {
    position: absolute;
    left: 60px;
    bottom: 12px;
    z-index: 200;
    min-width: 160px;
    background: var(--mantle);
    border: 1px solid var(--surface1);
    border-radius: var(--r-sm);
    padding: 5px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-menu);
  }
  .menu-item {
    all: unset;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--r-xs);
    color: var(--subtext0);
    font-size: 13px;
    cursor: pointer;
  }
  .menu-item:hover {
    background: var(--surface0);
    color: var(--text);
  }
  .rail-btn.home {
    background: var(--surface1);
    color: var(--overlay1);
  }
  .rail-btn.home.active {
    background: var(--accent);
    color: var(--on-accent);
  }
  .dm-strip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
  }
  .rail-btn.dm {
    background: transparent;
  }
  .rail-btn.dm:hover,
  .rail-btn.dm.active {
    border-radius: 50%;
  }
  .rail-btn.dm.active {
    box-shadow: 0 0 0 2px var(--accent);
  }
  .rail-btn.dm :global(.avatar) {
    border-radius: 50%;
  }
  .srv-glyph {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.02em;
    text-align: center;
    line-height: 1.1;
    padding: 4px;
    overflow: hidden;
  }
  .srv-img {
    width: 100%;
    height: 100%;
    border-radius: inherit;
    object-fit: cover;
  }
  .rail-divider {
    width: 28px;
    height: 2px;
    border-radius: 1px;
    background: var(--surface1);
    margin: 2px 0;
    flex-shrink: 0;
  }
</style>
