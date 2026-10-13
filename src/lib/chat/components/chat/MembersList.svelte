<script lang="ts">
  import { fetchServerMembers } from '../../api/servers';
  import { avatars } from '../../state/avatars.svelte';
  import { presence } from '../../state/presence.svelte';
  import { servers } from '../../state/servers.svelte';
  import { ui } from '../../state/ui.svelte';
  import { auth } from '../../state/auth.svelte';
  import type { Status } from '../../types';
  import Avatar from '../ui/Avatar.svelte';

  let { serverId }: { serverId: number } = $props();

  const me = $derived(auth.user ?? '');
  let members = $state<string[]>([]);
  let loaded = $state(false);

  const online = $derived(
    members
      .filter((u) => presence.statusOf(u) !== 'offline')
      .sort((a, b) => a.localeCompare(b))
  );
  const offline = $derived(
    members
      .filter((u) => presence.statusOf(u) === 'offline')
      .sort((a, b) => a.localeCompare(b))
  );

  // Refetch when the server changes or membership changes (kicks, joins).
  $effect(() => {
    void serverId;
    void servers.memberVersion;
    load(serverId);
  });

  async function load(id: number) {
    try {
      const list = await fetchServerMembers(id);
      members = list;
      avatars.ensureAll(list);
    } catch (e) {
      console.error(e);
    } finally {
      loaded = true;
    }
  }

  function statusLabel(status: Status) {
    return ({ online: 'Online', away: 'Away', offline: 'Offline' } as Record<Status, string>)[status];
  }

  function openProfile(user: string) {
    if (user !== me) ui.showProfile(user);
  }

  function onContextMenu(e: MouseEvent, user: string) {
    if (user === me) return;
    if ((window.getSelection()?.toString() ?? '').length > 0) return;
    e.preventDefault();
    ui.openContextMenu(e.clientX, e.clientY, user);
  }
</script>

<aside class="members">
  <div class="members-head">members{loaded ? ` — ${members.length}` : ''}</div>
  <div class="members-scroll">
    {#if online.length > 0}
      <div class="group-label">online — {online.length}</div>
      {#each online as u (u)}
        <button type="button" class="member" onclick={() => openProfile(u)} oncontextmenu={(e) => onContextMenu(e, u)}>
          <span class="pfp">
            <Avatar name={u} size={30} />
            <span class="dot {presence.statusOf(u)}" title={statusLabel(presence.statusOf(u))}></span>
          </span>
          <span class="name" class:me={u === me}>{u}</span>
        </button>
      {/each}
    {/if}

    {#if offline.length > 0}
      <div class="group-label">offline — {offline.length}</div>
      {#each offline as u (u)}
        <button type="button" class="member offline" onclick={() => openProfile(u)} oncontextmenu={(e) => onContextMenu(e, u)}>
          <span class="pfp">
            <Avatar name={u} size={30} />
            <span class="dot offline"></span>
          </span>
          <span class="name" class:me={u === me}>{u}</span>
        </button>
      {/each}
    {/if}

    {#if loaded && members.length === 0}
      <p class="empty">no members</p>
    {/if}
  </div>
</aside>

<style>
  .members { width: 220px; flex-shrink: 0; background: var(--mantle); border-left: 1px solid var(--surface0); display: flex; flex-direction: column; min-height: 0; }
  .members-head { padding: 16px 16px 12px; border-bottom: 1px solid var(--surface0); color: var(--text); font-size: 12px; font-weight: bold; letter-spacing: 0.02em; flex-shrink: 0; }
  .members-scroll { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; padding: 8px 8px 16px; }
  .group-label { font-size: 10px; text-transform: uppercase; color: var(--surface2); letter-spacing: 0.1em; padding: 12px 8px 6px; }
  .member { all: unset; display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; padding: 6px 8px; border-radius: 5px; cursor: pointer; color: var(--subtext0); }
  .member:hover { background: var(--surface0); color: var(--text); }
  .member.offline { opacity: 0.5; }
  .pfp { position: relative; width: 30px; height: 30px; flex-shrink: 0; line-height: 0; }
  .pfp :global(.avatar) { border-radius: 50%; }
  .dot { position: absolute; top: -1px; right: -1px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--mantle); box-sizing: content-box; }
  .dot.online { background: var(--green); }
  .dot.away { background: var(--yellow); }
  .dot.offline { background: var(--surface2); }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
  .name.me { color: var(--mauve); font-weight: 700; }
  .empty { color: var(--overlay0); font-size: 12px; padding: 8px; margin: 0; }
  @media (max-width: 768px) {
    .members { display: none; }
  }
</style>
