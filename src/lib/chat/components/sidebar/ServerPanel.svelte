<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '../../state/auth.svelte';
  import { servers } from '../../state/servers.svelte';
  import { unread } from '../../state/unread.svelte';
  import { ui } from '../../state/ui.svelte';
  import type { MenuItem } from '../../state/ui.svelte';
  import { channelHref, chatFromUrl } from '../../utils/route';
  import { createChannel, deleteChannel, renameChannel } from '../../api/servers';
  import { toast } from '../../state/toasts.svelte';
  import type { Server, ServerChannel } from '../../types';
  import Icon from '../ui/Icon.svelte';
  import ConfirmButton from '../ui/ConfirmButton.svelte';
  import UnreadBadge from '../ui/UnreadBadge.svelte';
  import ChannelEditModal from './ChannelEditModal.svelte';
  import ServerSettingsModal from './ServerSettingsModal.svelte';
  import SidebarFooter from './SidebarFooter.svelte';
  import InviteFriend from './InviteFriend.svelte';

  let { server }: { server: Server } = $props();

  const me = $derived(auth.user ?? '');
  const current = $derived(chatFromUrl(page.url, me));
  const isOwner = $derived(server.owner === me);

  let createOpen = $state(false);
  let renameTarget = $state<ServerChannel | null>(null);
  let renameOpen = $state(false);
  let inviteOpen = $state(false);
  let settingsOpen = $state(false);
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  async function copyCode() {
    if (!server.code) return;
    try {
      await navigator.clipboard.writeText(server.code);
    } catch {
      /* clipboard unavailable */
    }
    copied = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied = false), 1600);
  }

  async function handleCreate(name: string) {
    await createChannel(server.id, name);
  }

  async function handleRename(name: string) {
    if (!renameTarget) return;
    await renameChannel(server.id, renameTarget.id, name);
    renameTarget = null;
  }

  async function handleDelete(channel: ServerChannel) {
    try {
      await deleteChannel(server.id, channel.id);
      servers.applyChannelDeleted(server.id, channel.id);
      toast(`Deleted #${channel.name}`);
    } catch (e) {
      console.error(e);
      toast('Failed to delete channel', 'error');
    }
  }

  function copyText(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast(label, 'success'),
      () => toast('Copy failed', 'error')
    );
  }

  function onChannelContext(e: MouseEvent, ch: ServerChannel) {
    e.preventDefault();
    const items: MenuItem[] = [
      { label: 'Copy channel name', icon: 'copy', action: () => copyText(`#${ch.name}`, 'Channel name copied') },
      { label: 'Copy channel link', icon: 'link', action: () => copyText(channelHref(server.id, ch.id), 'Channel link copied') }
    ];
    if (isOwner) {
      items.push({ separator: true });
      items.push({ label: 'Rename channel', icon: 'edit', action: () => (renameTarget = ch, renameOpen = true) });
      items.push({ label: 'Delete channel', icon: 'trash', danger: true, action: () => handleDelete(ch) });
    }
    ui.openMenu(e.clientX, e.clientY, items);
  }
</script>

<div class="panel">
  <div class="panel-header">
    <span class="srv-name">{server.name}</span>
    <span class="head-actions">
      {#if server.code}
        <button type="button" class="icon-btn" title="Invite" class:on={inviteOpen} onclick={() => (inviteOpen = !inviteOpen)}>
          <Icon name="link" size={16} />
        </button>
      {/if}
      {#if isOwner}
        <button type="button" class="icon-btn" title="Server settings" onclick={() => (settingsOpen = true)}>
          <Icon name="gear" size={16} />
        </button>
        <button type="button" class="icon-btn" title="Create channel" onclick={() => (createOpen = true)}>
          <Icon name="plus" size={18} />
        </button>
      {/if}
    </span>
  </div>

  {#if inviteOpen && server.code}
    <div class="invite" role="menu">
      <p class="invite-hint">share this invite code — anyone can join with it</p>
      <div class="invite-code">
        <span class="code">{server.code}</span>
        <button type="button" class="copy-btn" title="Copy invite code" onclick={copyCode}>
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>
      <InviteFriend {server} />
    </div>
  {/if}

  <div class="section-label">channels</div>

  {#each server.channels as ch (ch.id)}
    <div class="row" class:active={current.type === 'server' && current.id === String(ch.id)}>
      <a
        class="ch-link"
        href={channelHref(server.id, ch.id)}
        onclick={() => (ui.sidebarOpen = false)}
        oncontextmenu={(e) => onChannelContext(e, ch)}
        title={`#${ch.name}`}
      >
        <Icon name="hash" size={14} />
        <span class="ch-name">{ch.name}</span>
        <UnreadBadge count={unread.count(String(ch.id))} />
      </a>
      {#if isOwner}
        <span class="row-actions">
          <button type="button" class="mini" title="Rename channel" onclick={() => (renameTarget = ch, renameOpen = true)}>
            <Icon name="edit" size={13} />
          </button>
          <ConfirmButton
            onconfirm={() => handleDelete(ch)}
            title="Delete channel"
            confirmTitle="Click to confirm delete"
            size={16}
          >
            <Icon name="trash" size={13} />
          </ConfirmButton>
        </span>
      {/if}
    </div>
  {/each}

  {#if server.channels.length === 0}
    <div class="empty">no channels yet</div>
  {/if}

  <SidebarFooter />
</div>

<ChannelEditModal bind:open={createOpen} title="create channel" onSubmit={handleCreate} />
{#if renameTarget}
  <ChannelEditModal
    bind:open={renameOpen}
    title="rename channel"
    initial={renameTarget.name}
    onSubmit={handleRename}
    onclose={() => (renameTarget = null)}
  />
{/if}
<ServerSettingsModal {server} bind:open={settingsOpen} />

<style>
  .panel { width: 240px; flex-shrink: 0; background: var(--mantle); border-right: 1px solid var(--surface0); display: flex; flex-direction: column; height: 100%; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .panel-header { display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 12px 0 20px; border-bottom: 1px solid var(--surface0); color: var(--text); font-size: 15px; font-weight: bold; }
  .srv-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .head-actions { display: flex; align-items: center; gap: 6px; padding-left: 8px; flex-shrink: 0; }
  .icon-btn { all: unset; color: var(--overlay0); cursor: pointer; display: inline-flex; flex-shrink: 0; }
  .icon-btn:hover { color: var(--text); }
  .icon-btn.on { color: var(--accent); }
  .invite { margin: 10px 12px 0; padding: 10px 12px; background: var(--crust); border: 1px solid var(--surface1); border-radius: 6px; display: flex; flex-direction: column; gap: 8px; }
  .invite-hint { margin: 0; font-size: 11px; color: var(--overlay0); line-height: 1.45; }
  .invite-code { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .code { font-size: 15px; font-weight: 800; letter-spacing: 0.15em; color: var(--accent); user-select: all; }
  .copy-btn { all: unset; cursor: pointer; font-size: 11px; color: var(--subtext0); background: var(--surface0); padding: 5px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }
  .copy-btn:hover { color: var(--text); }
  .section-label { font-size: 10px; text-transform: uppercase; color: var(--surface2); padding: 16px 20px 8px; letter-spacing: 0.1em; white-space: nowrap; flex-shrink: 0; }

  .row { display: flex; align-items: center; color: var(--overlay0); }
  .row:hover { background: var(--surface0); color: var(--text); }
  .row.active { background: var(--surface0); color: var(--accent); border-left: 3px solid var(--accent); }
  .ch-link { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; padding: 9px 0 9px 20px; color: inherit; text-decoration: none; }
  .row.active .ch-link { padding-left: 17px; }
  .ch-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-actions { display: flex; align-items: center; gap: 2px; padding: 6px 12px 6px 4px; opacity: 0; transition: opacity 0.15s; }
  .row:hover .row-actions, .row-actions:focus-within { opacity: 0.8; }
  .mini { all: unset; cursor: pointer; color: var(--overlay0); display: inline-flex; }
  .mini:hover { color: var(--text); }
  .empty { padding: 10px 20px; color: var(--surface2); font-size: 12px; }
</style>