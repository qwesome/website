<script lang="ts">
  import { goto } from '$app/navigation';
  import { createServer, joinServer } from '../../api/servers';
  import { servers } from '../../state/servers.svelte';
  import { refreshServers } from '../../socket';
  import { channelHref, homeHref } from '../../utils/route';
  import Icon from '../ui/Icon.svelte';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let tab = $state<'create' | 'join'>('create');
  let name = $state('');
  let iconInput = $state<HTMLInputElement>();
  let iconData = $state<string | null>(null);
  let joinKey = $state('');
  let error = $state('');
  let busy = $state(false);

  $effect(() => {
    if (open) {
      tab = 'create';
      name = '';
      iconData = null;
      joinKey = '';
      error = '';
    }
  });

  async function onIcon(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 1_000_000) {
      error = 'icon too large (max 1MB)';
      return;
    }
    error = '';
    const reader = new FileReader();
    reader.onload = () => (iconData = String(reader.result));
    reader.readAsDataURL(file);
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
          <button type="button" class="icon-row" onclick={() => iconInput?.click()}>
            {#if iconData}
              <img class="preview" src={iconData} alt="server icon" />
              <span class="icon-label">replace icon</span>
            {:else}
              <Icon name="image" size={20} />
              <span class="icon-label">add an icon (optional)</span>
            {/if}
          </button>
          <input type="file" accept="image/*" bind:this={iconInput} hidden onchange={(e) => onIcon((e.currentTarget as HTMLInputElement).files?.[0])} />
        {:else}
          <input type="text" bind:value={joinKey} placeholder="server id or invite code" spellcheck="false" maxlength="12" use:focus />
        {/if}

        {#if error}<p class="error">{error}</p>{/if}
        <button type="submit" class="submit" disabled={busy}>{busy ? '...' : tab === 'create' ? 'create' : 'join'}</button>
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
  .submit { all: unset; text-align: center; background: var(--accent); color: var(--on-accent); padding: 9px 0; border-radius: 4px; font-weight: 700; font-size: 13px; cursor: pointer; }
  .submit:disabled { background: var(--surface0); color: var(--subtext0); cursor: not-allowed; }
</style>