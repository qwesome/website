<script lang="ts">
  import { setAvatar } from '../../api/avatars';
  import { disconnect } from '../../socket';
  import { auth } from '../../state/auth.svelte';
  import { avatars } from '../../state/avatars.svelte';
  import Avatar from '../ui/Avatar.svelte';
  import Icon from '../ui/Icon.svelte';
  import SettingsModal from '../settings/SettingsModal.svelte';

  let fileInput = $state<HTMLInputElement>();
  let error = $state('');
  let settingsOpen = $state(false);

  const hasAvatar = $derived(!!(auth.user && avatars.get(auth.user)));

  async function save(avatar: string | null) {
    if (!auth.user) return;
    error = '';
    try {
      await setAvatar(avatar);
      avatars.set(auth.user, avatar);
    } catch (e) {
      error = e instanceof Error ? e.message : 'upload failed';
    }
  }

  function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 1_500_000) {
      error = 'image too large (max 1.5MB)';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => save(String(reader.result));
    reader.readAsDataURL(file);
  }

  function logout() {
    disconnect();
    auth.clear();
    location.reload();
  }
</script>

<footer class="footer">
  <div class="avatar-wrap">
    <button type="button" class="avatar-btn" onclick={() => fileInput?.click()} title="Change profile picture">
      <Avatar name={auth.user ?? '?'} />
      <span class="overlay">+</span>
    </button>
    {#if hasAvatar}
      <button type="button" class="avatar-clear" onclick={() => save(null)} title="Remove profile picture">x</button>
    {/if}
  </div>
  <input type="file" accept="image/*" bind:this={fileInput} onchange={onFile} hidden />

  <div class="info">
    <span class="name">{auth.user}</span>
    {#if error}<span class="error">{error}</span>{/if}
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
  .avatar-wrap { position: relative; flex-shrink: 0; width: 36px; height: 36px; }
  .avatar-btn { all: unset; position: relative; display: block; width: 36px; height: 36px; border-radius: 6px; cursor: pointer; overflow: hidden; border: 1px solid transparent; box-sizing: border-box; }
  .avatar-btn:hover { border-color: var(--accent); }
  .overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.55); color: var(--text); font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
  .avatar-btn:hover .overlay { opacity: 1; }
  .avatar-clear { all: unset; position: absolute; top: -8px; right: -10px; color: var(--accent); font-size: 11px; line-height: 1; cursor: pointer; z-index: 1; }
  .avatar-clear:hover { color: var(--red); }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .name { color: var(--text); font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .error { color: var(--red); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .icon-btn, .logout { all: unset; cursor: pointer; color: var(--overlay0); flex-shrink: 0; display: inline-flex; }
  .icon-btn:hover { color: var(--text); }
  .logout:hover { color: var(--red); }
</style>