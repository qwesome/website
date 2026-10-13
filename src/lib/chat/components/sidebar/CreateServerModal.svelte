<script lang="ts">
  import { goto } from '$app/navigation';
  import { createServer, fetchPublicServers, joinServer } from '../../api/servers';
  import { servers } from '../../state/servers.svelte';
  import { ui } from '../../state/ui.svelte';
  import { refreshServers } from '../../socket';
  import { channelHref, homeHref } from '../../utils/route';
  import type { PublicServer } from '../../types';
  import Icon from '../ui/Icon.svelte';

  let {
    open = $bindable(false),
    initialTab = 'create'
  }: { open: boolean; initialTab?: 'create' | 'join' } = $props();

  let tab = $state<'create' | 'join'>('create');
  let name = $state('');
  let iconData = $state<string | null>(null);
  let joinKey = $state('');
  let error = $state('');
  let busy = $state(false);
  let publicServers = $state<PublicServer[]>([]);

  $effect(() => {
    if (open) {
      tab = initialTab;
      name = '';
      iconData = null;
      joinKey = '';
      error = '';
      publicServers = [];
      loadPublic();
    }
  });

  async function loadPublic() {
    try {
      publicServers = await fetchPublicServers();
    } catch (e) {
      console.error(e);
    }
  }

  function refreshPublic() {
    loadPublic();
  }

  function pickIcon() {
    ui.pickImage({
      title: 'server icon',
      name: name.trim() || 'server',
      value: iconData,
      shape: 'circle',
      maxDim: 512,
      onpick: (value) => {
        iconData = value;
      }
    });
  }

  async function join(key: string | number) {
    busy = true;
    error = '';
    try {
      const server = await joinServer(key);
      done(server);
    } catch (e) {
      error = e instanceof Error ? e.message : 'failed to join server';
    } finally {
      busy = false;
    }
  }

  async function submit() {
    if (busy) return;
    if (tab === 'create') {
      const v = name.trim();
      if (!v || v.length > 40) {
        error = 'name must be 1-40 characters';
        return;
      }
      busy = true;
      error = '';
      try {
        const server = await createServer(v, iconData);
        done(server);
      } catch (e) {
        error = e instanceof Error ? e.message : 'failed to create server';
      } finally {
        busy = false;
      }
    } else {
      const key = joinKey.trim();
      if (!key) {
        error = 'enter the invite code or server id';
        return;
      }
      await join(key);
    }
  }

  function done(server: Awaited<ReturnType<typeof createServer>>) {
    servers.upsert(server);
    refreshServers();
    open = false;
    const ch = server.channels[0];
    goto(ch ? channelHref(server.id, ch.id) : homeHref());
  }

  function close() {
    if (busy) return;
    open = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }

  function focus(input: HTMLInputElement) {
    input.focus();
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
</script>

{#if open}
  <div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && close()}>
    <div class="body" role="dialog" tabindex="-1" onkeydown={onKeydown}>
      <header class="head">
        <span>servers</span>
        <button type="button" class="x-btn" aria-label="Close" onclick={close}>
          <Icon name="x" size={16} />
        </button>
      </header>

      <div class="tabs">
        <button type="button" class="tab" class:active={tab === 'create'} onclick={() => (tab = 'create')}>create</button>
        <button type="button" class="tab" class:active={tab === 'join'} onclick={() => (tab = 'join')}>join</button>
      </div>

      <form
        class="form"
        onsubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {#if tab === 'create'}
          <input type="text" bind:value={name} placeholder="server name" spellcheck="false" maxlength="40" use:focus />
          <button type="button" class="icon-row" onclick={pickIcon}>
            {#if iconData}
              <img class="preview" src={iconData} alt="server icon" />
              <span class="icon-label">replace icon</span>
            {:else}
              <Icon name="image" size={20} />
              <span class="icon-label">add an icon (optional)</span>
            {/if}
          </button>
        {:else}
          <div class="pub-wrap">
            <div class="pub-head">
              <span class="pub-title">public servers</span>
              <button type="button" class="pub-refresh" title="Refresh" onclick={refreshPublic}>
                <Icon name="refresh" size={13} />
              </button>
            </div>
            {#if publicServers.length > 0}
              <div class="pub-list">
                {#each publicServers as s (s.id)}
                  <div class="pub-row">
                    {#if s.avatar}
                      <img class="pub-ico" src={s.avatar} alt="" />
                    {:else}
                      <span class="pub-glyph">{initials(s.name)}</span>
                    {/if}
                    <span class="pub-name" title={s.name}>{s.name}</span>
                    <span class="pub-count" title="members">{s.member_count}</span>
                    <button type="button" class="pub-join" disabled={busy} onclick={() => join(s.id)}>join</button>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="pub-empty">no public servers yet</p>
            {/if}
            <div class="pub-manual">
              <p class="pub-hint">have an invite code or server id?</p>
              <input type="text" bind:value={joinKey} placeholder="code or id" spellcheck="false" maxlength="12" use:focus />
              <button type="submit" class="join-submit" disabled={!joinKey.trim() || busy}>{busy ? '...' : 'join'}</button>
            </div>
          </div>
        {/if}

        {#if error}<p class="error">{error}</p>{/if}
        {#if tab === 'create'}
          <button type="submit" class="submit" disabled={busy}>{busy ? '...' : 'create'}</button>
        {/if}
      </form>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10001; }
  .body { width: 380px; max-width: 90vw; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 8px; color: var(--text); font-family: 'JetBrains Mono', monospace; overflow: hidden; }
  .head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--surface0); font-size: 13px; font-weight: 600; }
  .x-btn { all: unset; cursor: pointer; color: var(--overlay0); display: inline-flex; }
  .x-btn:hover { color: var(--text); }
  .tabs { display: flex; gap: 6px; padding: 12px 16px 0; }
  .tab { all: unset; flex: 1; text-align: center; padding: 7px 0; border-radius: 4px; color: var(--subtext0); font-size: 12px; cursor: pointer; }
  .tab.active { background: var(--surface0); color: var(--text); }
  .form { display: flex; flex-direction: column; gap: 10px; padding: 16px; }
  input { background: var(--base); border: 1px solid var(--surface0); color: var(--text); padding: 10px 12px; border-radius: 4px; font-family: inherit; font-size: 14px; }
  input:focus { outline: none; border-color: var(--accent); }
  .icon-row { all: unset; display: flex; align-items: center; gap: 10px; color: var(--overlay0); cursor: pointer; padding: 8px; border: 1px dashed var(--surface1); border-radius: 4px; }
  .icon-row:hover { color: var(--text); border-color: var(--accent); }
  .preview { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
  .icon-label { font-size: 12px; }
  .error { color: var(--red); font-size: 11px; margin: 0; }
  .pub-wrap { display: flex; flex-direction: column; gap: 10px; }
  .pub-head { display: flex; align-items: center; justify-content: space-between; }
  .pub-title { font-size: 10px; text-transform: uppercase; color: var(--surface2); letter-spacing: 0.1em; }
  .pub-refresh { all: unset; color: var(--overlay0); cursor: pointer; display: inline-flex; }
  .pub-refresh:hover { color: var(--text); }
  .pub-list { display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .pub-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--base); border: 1px solid var(--surface0); border-radius: 5px; }
  .pub-ico { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .pub-glyph { width: 26px; height: 26px; border-radius: 50%; background: var(--surface0); color: var(--accent); font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pub-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
  .pub-count { color: var(--surface2); font-size: 11px; flex-shrink: 0; }
  .pub-join { all: unset; cursor: pointer; background: var(--accent); color: var(--on-accent); font-size: 11px; padding: 4px 10px; border-radius: 4px; font-weight: 700; flex-shrink: 0; }
  .pub-join:disabled { background: var(--surface0); color: var(--subtext0); cursor: not-allowed; }
  .pub-empty { margin: 0; color: var(--overlay0); font-size: 12px; }
  .pub-manual { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--surface0); padding-top: 10px; }
  .pub-hint { margin: 0; font-size: 11px; color: var(--overlay0); }
  .join-submit { all: unset; text-align: center; background: var(--accent); color: var(--on-accent); padding: 8px 0; border-radius: 4px; font-weight: 700; font-size: 12px; cursor: pointer; }
  .join-submit:disabled { background: var(--surface0); color: var(--subtext0); cursor: not-allowed; }
  .submit { all: unset; text-align: center; background: var(--accent); color: var(--on-accent); padding: 9px 0; border-radius: 4px; font-weight: 700; font-size: 13px; cursor: pointer; }
  .submit:disabled { background: var(--surface0); color: var(--subtext0); cursor: not-allowed; }
</style>