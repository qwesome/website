<script lang="ts">
import { goto } from '$app/navigation';
import { fetchServerMembers, kickMember, updateServer, deleteServer } from '../../api/servers';
import { servers } from '../../state/servers.svelte';
import { auth } from '../../state/auth.svelte';
import { ui } from '../../state/ui.svelte';
import { toast } from '../../state/toasts.svelte';
import type { Server } from '../../types';
import Icon from '../ui/Icon.svelte';
import Avatar from '../ui/Avatar.svelte';
import ConfirmButton from '../ui/ConfirmButton.svelte';
import InviteFriend from './InviteFriend.svelte';

let {
  server,
  open = $bindable(false)
}: { server: Server; open: boolean } = $props();

let members = $state<string[]>([]);
let error = $state('');
let busy = $state(false);
let copied = $state(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;
let nameInput = $state('');
let deleteConfirm = $state('');
let deleting = $state(false);

const me = $derived(auth.user ?? '');
const isPublic = $derived(Boolean(server.is_public));
const canDelete = $derived(server.owner === me);

  $effect(() => {
    if (open) {
      error = '';
      members = [];
      nameInput = server.name;
      deleteConfirm = '';
      loadMembers();
    }
  });

  async function renameServer() {
    const name = nameInput.trim();
    if (busy || !name || name === server.name) return;
    busy = true;
    error = '';
    try {
      const updated = await updateServer(server.id, { name });
      servers.applyUpdated(updated);
      toast('Server renamed', 'success');
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed to rename server';
      toast('Failed to rename server', 'error');
    } finally {
      busy = false;
    }
  }

  async function confirmDelete() {
    if (deleteConfirm.trim() !== 'delete this server' || deleting) return;
    deleting = true;
    error = '';
    try {
      await deleteServer(server.id);
      servers.removeServer(server.id);
      toast(`Deleted ${server.name}`);
      open = false;
      void goto('/chat?home=1');
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed to delete server';
      toast('Failed to delete server', 'error');
    } finally {
      deleting = false;
    }
  }

  async function loadMembers() {
    try {
      members = await fetchServerMembers(server.id);
    } catch (e) {
      console.error(e);
      error = 'failed to load members';
    }
  }

  async function setPublic(next: boolean) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      const updated = await updateServer(server.id, { is_public: next });
      servers.applyUpdated(updated);
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed to update server';
    } finally {
      busy = false;
    }
  }

  function changeIcon() {
    if (busy) return;
    ui.pickImage({
      title: 'change server icon',
      name: server.name,
      value: server.avatar,
      shape: 'circle',
      maxDim: 512,
      onpick: async (value) => {
        busy = true;
        error = '';
        try {
          const updated = await updateServer(server.id, { avatar: value });
          servers.applyUpdated(updated);
          toast('Server icon updated', 'success');
        } catch (e) {
          error = e instanceof Error ? e.message : 'failed to update icon';
        } finally {
          busy = false;
        }
      }
    });
  }

  async function removeIcon() {
    busy = true;
    error = '';
    try {
      const updated = await updateServer(server.id, { avatar: null });
      servers.applyUpdated(updated);
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed to remove icon';
    } finally {
      busy = false;
    }
  }

  async function kick(username: string) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      await kickMember(server.id, username);
      members = members.filter((u) => u !== username);
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed to kick member';
    } finally {
      busy = false;
    }
  }

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

  function initials(name: string) {
    return (
      name
        .split(/[\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('') || name.slice(0, 2).toUpperCase()
    );
  }

  function close() {
    open = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }
</script>

{#if open}
  <div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && close()}>
    <div class="body" role="dialog" tabindex="-1" onkeydown={onKeydown}>
      <header class="head">
        <span>server settings</span>
        <button type="button" class="x-btn" aria-label="Close" onclick={close}>
          <Icon name="x" size={16} />
        </button>
      </header>

      <div class="content">
        <div class="icon-row">
          {#if server.avatar}
            <img class="srv-ico" src={server.avatar} alt="" />
          {:else}
            <span class="srv-glyph">{initials(server.name)}</span>
          {/if}
          <div class="icon-actions">
            <button type="button" class="btn" disabled={busy} onclick={changeIcon}>change icon</button>
            {#if server.avatar}
              <button type="button" class="btn danger" disabled={busy} onclick={removeIcon}>remove icon</button>
            {/if}
          </div>
        </div>

        <div class="setting">
          <div class="setting-info">
            <span class="setting-label">server name</span>
            <span class="setting-note">shown in the sidebar and server list</span>
          </div>
        </div>
        <div class="name-row">
          <input
            type="text"
            bind:value={nameInput}
            maxlength="32"
            spellcheck="false"
            onkeydown={(e) => e.key === 'Enter' && renameServer()}
          />
          <button type="button" class="btn" disabled={busy || !nameInput.trim() || nameInput.trim() === server.name} onclick={renameServer}>
            save
          </button>
        </div>

        <div class="setting">
          <div class="setting-info">
            <span class="setting-label">visibility</span>
            <span class="setting-note">{isPublic ? 'listed publicly — anyone can find and join' : 'hidden from the public list — join by invite code only'}</span>
          </div>
          <button
            type="button"
            class="switch"
            class:on={isPublic}
            class:busy={busy}
            title="Toggle public visibility"
            aria-label="Toggle public visibility"
            onclick={() => setPublic(!isPublic)}
          >
            <span class="knob"></span>
          </button>
        </div>

        {#if server.code}
          <div class="invite">
            <span class="setting-label">invite code</span>
            <div class="invite-code">
              <span class="code">{server.code}</span>
              <button type="button" class="btn" onclick={copyCode}>{copied ? 'copied!' : 'copy'}</button>
            </div>
            <InviteFriend {server} />
          </div>
        {/if}

        <div class="members-head">
          <span class="setting-label">members ({members.length})</span>
          <button type="button" class="mini-btn" title="Refresh members" onclick={loadMembers}>
            <Icon name="refresh" size={13} />
          </button>
        </div>
        <div class="member-list">
          {#each members as username (username)}
            <div class="member-row">
              <Avatar name={username} size={26} />
              <span class="member-name" title={username}>{username}</span>
              {#if username !== server.owner && username !== me}
                <span class="kick">
                  <ConfirmButton
                    onconfirm={() => kick(username)}
                    title={`Kick ${username}`}
                    confirmTitle="Click again to confirm kick"
                    size={15}
                  >
                    <Icon name="trash" size={13} />
                  </ConfirmButton>
                </span>
              {:else if username === server.owner}
                <span class="owner-tag">owner</span>
              {/if}
            </div>
          {:else}
            <p class="empty">no members</p>
          {/each}
        </div>

        {#if canDelete}
          <div class="danger">
            <span class="setting-label danger-label">danger zone</span>
            <p class="danger-note">
              Deleting this server removes all of its channels and messages permanently. This can't be undone.
            </p>
            <div class="name-row">
              <input
                type="text"
                bind:value={deleteConfirm}
                placeholder='type "delete this server"'
                spellcheck="false"
                autocomplete="off"
              />
              <button
                type="button"
                class="btn danger"
                disabled={deleting || deleteConfirm.trim() !== 'delete this server'}
                onclick={confirmDelete}
              >
                {deleting ? '...' : 'delete'}
              </button>
            </div>
          </div>
        {/if}

        {#if error}<p class="error">{error}</p>{/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10001; }
  .body { width: 360px; max-width: 90vw; max-height: 85vh; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 8px; color: var(--text); font-family: 'JetBrains Mono', monospace; overflow: hidden; display: flex; flex-direction: column; }
  .head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--surface0); font-size: 13px; font-weight: 600; flex-shrink: 0; }
  .x-btn { all: unset; cursor: pointer; color: var(--overlay0); display: inline-flex; }
  .x-btn:hover { color: var(--text); }

  .content { display: flex; flex-direction: column; gap: 14px; padding: 16px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }

  .icon-row { display: flex; align-items: center; gap: 12px; }
  .srv-ico { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .srv-glyph { width: 48px; height: 48px; border-radius: 50%; background: var(--surface0); color: var(--accent); font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .icon-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .btn { all: unset; cursor: pointer; background: var(--surface0); color: var(--text); font-size: 11px; padding: 5px 10px; border-radius: 4px; }
  .btn:hover { background: var(--surface1); }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .btn.danger { color: var(--red); }
  .btn.danger:hover { background: color-mix(in srgb, var(--red) 10%, transparent); }

  .setting { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .setting-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .setting-label { font-size: 12px; color: var(--text); }
  .setting-note { font-size: 10px; color: var(--overlay0); line-height: 1.45; }
  .switch { all: unset; width: 38px; height: 22px; border-radius: 11px; background: var(--surface0); cursor: pointer; position: relative; flex-shrink: 0; transition: background 0.2s; }
  .switch.on { background: var(--accent); }
  .switch.busy { opacity: 0.6; }
  .knob { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--base); transition: left 0.2s; }
  .switch.on .knob { left: 19px; }

  .invite { display: flex; flex-direction: column; gap: 6px; }
  .invite-code { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--base); border: 1px solid var(--surface0); border-radius: 5px; padding: 8px 10px; }
  .code { font-size: 15px; font-weight: 800; letter-spacing: 0.15em; color: var(--accent); user-select: all; }

  .members-head { display: flex; align-items: center; justify-content: space-between; }
  .mini-btn { all: unset; color: var(--overlay0); cursor: pointer; display: inline-flex; }
  .mini-btn:hover { color: var(--text); }
  .member-list { display: flex; flex-direction: column; gap: 3px; }
  .member-row { display: flex; align-items: center; gap: 8px; padding: 4px 6px; background: var(--base); border: 1px solid var(--surface0); border-radius: 5px; }
  .member-row :global(.avatar) { border-radius: 50%; }
  .member-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
  .kick { display: inline-flex; opacity: 0; transition: opacity 0.2s; }
  .member-row:hover .kick, .kick:focus-within { opacity: 0.7; }
  .kick :global(.confirm-btn:hover) { color: var(--red); }
  .owner-tag { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--yellow); }
  .empty { margin: 0; color: var(--overlay0); font-size: 12px; }

  .name-row { display: flex; gap: 8px; }
  .name-row input { flex: 1; min-width: 0; background: var(--base); border: 1px solid var(--surface0); color: var(--text); font-family: inherit; font-size: 13px; padding: 8px 10px; border-radius: 5px; }
  .name-row input:focus { outline: none; border-color: var(--accent); }

  .danger { display: flex; flex-direction: column; gap: 8px; border: 1px solid color-mix(in srgb, var(--red) 40%, transparent); border-radius: 6px; padding: 12px; }
  .danger-label { color: var(--red); text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; }
  .danger-note { margin: 0; font-size: 11px; color: var(--overlay0); line-height: 1.5; }

  .error { color: var(--red); font-size: 11px; margin: 0; }
</style>