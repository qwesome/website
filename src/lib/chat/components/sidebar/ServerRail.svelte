<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '../../state/auth.svelte';
  import { servers } from '../../state/servers.svelte';
  import { unread } from '../../state/unread.svelte';
  import { chatFromUrl, channelHref, homeHref } from '../../utils/route';
  import Icon from '../ui/Icon.svelte';

  let { oncreate }: { oncreate: () => void } = $props();
  const me = $derived(auth.user ?? '');
  const current = $derived(chatFromUrl(page.url, me));

  const homeActive = $derived(current.type === 'home' || current.type === 'dm' || current.type === 'admin');
  const homeUnread = $derived(
    Object.entries(unread.map).some(([ch, v]) => v && (ch.startsWith('dm:') || ch === 'admin-panel'))
  );

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
</script>

<nav class="rail">
  <a class="rail-btn home" class:active={homeActive} href={homeHref()} title="Direct messages">
    <Icon name="home" size={22} />
    {#if homeUnread}<span class="unread-pill"></span>{/if}
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

  <button type="button" class="rail-btn add" title="Create or join a server" onclick={oncreate}>
    <Icon name="plus" size={20} />
  </button>
</nav>

<style>
  .rail {
    width: 68px;
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
  .rail-divider {
    width: 28px;
    height: 2px;
    border-radius: 1px;
    background: var(--surface1);
    margin: 2px 0;
  }
</style>