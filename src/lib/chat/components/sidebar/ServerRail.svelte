<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '../../state/auth.svelte';
  import { servers } from '../../state/servers.svelte';
  import { unread } from '../../state/unread.svelte';
  import { chatFromUrl, channelHref, homeHref } from '../../utils/route';
  import { clickOutside } from '../../actions/clickOutside';
  import Icon from '../ui/Icon.svelte';

  let { oncreate }: { oncreate: (tab: 'create' | 'join') => void } = $props();
  const me = $derived(auth.user ?? '');
  const current = $derived(chatFromUrl(page.url, me));

  let menuOpen = $state(false);

  const homeActive = $derived(current.type === 'home' || current.type === 'dm' || current.type === 'admin');
  const homeUnreadCount = $derived(
    Object.entries(unread.map).reduce(
      (n, [ch, v]) => n + (v && (ch.startsWith('dm:') || ch === 'admin-panel') ? 1 : 0),
      0
    )
  );
  const badgeLabel = $derived(homeUnreadCount > 99 ? '99+' : String(homeUnreadCount));

  function serverUnread(serverId: number) {
    const srv = servers.serverOf(serverId);
    return srv?.channels.some((c) => unread.has(String(c.id))) ?? false;
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
  <a class="rail-btn home" class:active={homeActive} href={homeHref()} title="Direct messages">
    <Icon name="home" size={22} />
    {#if homeUnreadCount > 0}<span class="count-badge">{badgeLabel}</span>{/if}
  </a>

  <div class="rail-divider"></div>

  {#each servers.visible as srv (srv.id)}
    <a
      class="rail-btn"
      class:active={current.type === 'server' && current.serverId === srv.id}
      href={serverHref(srv.id)}
      title={srv.name}
    >
      {#if srv.avatar}
        <img class="srv-img" src={srv.avatar} alt={srv.name} />
      {:else}
        <span class="srv-glyph">{initials(srv.name)}</span>
      {/if}
      {#if serverUnread(srv.id)}<span class="unread-pill"></span>{/if}
    </a>
  {/each}

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
    overflow-y: auto;
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
    transition: border-radius 0.15s, background 0.15s, color 0.15s;
    flex-shrink: 0;
    box-sizing: border-box;
  }
  .rail-btn:hover {
    border-radius: 12px;
    color: var(--text);
  }
  .rail-btn.active {
    border-radius: 12px;
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
    border-radius: 12px;
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
    border-radius: 8px;
    padding: 5px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }
  .menu-item {
    all: unset;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 5px;
    color: var(--subtext0);
    font-size: 13px;
    cursor: pointer;
  }
  .menu-item:hover {
    background: var(--surface0);
    color: var(--text);
  }
  .rail-btn.home {
    background: var(--green);
    color: var(--crust);
  }
  .rail-btn.home.active {
    background: var(--accent);
    color: var(--on-accent);
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
  .unread-pill {
    position: absolute;
    top: 0;
    left: -8px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--red);
  }
  .count-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 9px;
    background: var(--red);
    color: var(--crust);
    font-size: 9px;
    font-weight: 800;
    line-height: 16px;
    text-align: center;
    box-sizing: border-box;
  }
  .rail-divider {
    width: 28px;
    height: 2px;
    border-radius: 1px;
    background: var(--surface1);
    margin: 2px 0;
  }
</style>