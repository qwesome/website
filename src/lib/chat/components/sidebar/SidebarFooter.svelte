<script lang="ts">
  import { disconnect } from '../../socket';
  import { auth } from '../../state/auth.svelte';
  import { presence } from '../../state/presence.svelte';
  import Avatar from '../ui/Avatar.svelte';
  import Icon from '../ui/Icon.svelte';
  import SettingsModal from '../settings/SettingsModal.svelte';
  import StatusMenu from './StatusMenu.svelte';

  let settingsOpen = $state(false);
  let statusOpen = $state(false);

  const myStatus = $derived(presence.customOf(auth.user ?? ''));

  function logout() {
    disconnect();
    auth.clear();
    location.reload();
  }
</script>

<footer class="footer">
  <div class="avatar-wrap">
    <Avatar name={auth.user ?? '?'} />
  </div>

  <div class="info">
    <span class="name">{auth.user}</span>
    {#if myStatus}
      <span class="status-line" title={[myStatus.emoji, myStatus.text].filter(Boolean).join(' ')}>
        {#if myStatus.emoji}<span class="status-emoji">{myStatus.emoji}</span>{/if}
        {#if myStatus.text}<span class="status-text">{myStatus.text}</span>{/if}
      </span>
    {/if}
  </div>

  <div class="status-wrap">
    <button
      type="button"
      class="icon-btn"
      class:active={statusOpen || !!myStatus}
      onclick={() => (statusOpen = !statusOpen)}
      title="Set a status"
    >
      <Icon name="message" size={20} />
    </button>
    <StatusMenu bind:open={statusOpen} />
  </div>

  <button type="button" class="icon-btn" onclick={() => (settingsOpen = true)} title="Settings">
    <Icon name="gear" size={20} />
  </button>

  <button type="button" class="logout" onclick={logout} title="Sign out">
    <Icon name="logout" size={20} />
  </button>
</footer>

<SettingsModal bind:open={settingsOpen} />

<style>
  .footer { margin-top: auto; position: sticky; bottom: 0; background: var(--mantle); border-top: 1px solid var(--surface0); padding: 12px 16px; display: flex; align-items: center; gap: 10px; z-index: 10; }
  .avatar-wrap { flex-shrink: 0; width: 36px; height: 36px; }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .name { color: var(--text); font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .status-line { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--overlay0); min-width: 0; }
  .status-emoji { flex-shrink: 0; }
  .status-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .status-wrap { position: relative; flex-shrink: 0; display: inline-flex; }
  .icon-btn, .logout { all: unset; cursor: pointer; color: var(--overlay0); flex-shrink: 0; display: inline-flex; }
  .icon-btn { position: relative; }
  .icon-btn:hover { color: var(--text); }
  .icon-btn.active { color: var(--accent); }
  .logout:hover { color: var(--red); }
</style>
