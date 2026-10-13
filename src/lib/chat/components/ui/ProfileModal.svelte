<script lang="ts">
  import { goto } from '$app/navigation';
  import { requestFriend, respondFriend, removeFriend } from '../../api/friends';
  import { auth } from '../../state/auth.svelte';
  import { friends } from '../../state/friends.svelte';
  import { presence } from '../../state/presence.svelte';
  import { ui } from '../../state/ui.svelte';
  import { dmHref } from '../../utils/route';
  import type { Status } from '../../types';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  const me = $derived(auth.user ?? '');
  const user = $derived(ui.profileUser);

  const isMe = $derived(user ? user === me : false);
  const status = $derived((user ? presence.statusOf(user) : 'offline') as Status);
  const isFriend = $derived(user ? friends.isFriend(user) : false);
  const isOutgoing = $derived(user ? friends.hasOutgoingTo(user) : false);
  const isIncoming = $derived(user ? friends.hasRequestFrom(user) : false);

  const statusLabel = $derived(({ online: 'Online', away: 'Away', offline: 'Offline' } as Record<Status, string>)[status]);

  async function run(fn: () => Promise<unknown>) {
    const name = user;
    if (!name) return;
    try {
      await fn();
    } catch (e) {
      console.error(e);
    }
  }

  function message() {
    const name = user;
    close();
    if (name) goto(dmHref(name));
  }

  function close() {
    ui.profileUser = null;
  }
</script>

{#if user}
  <div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && close()}>
    <div class="body" role="dialog" aria-label={`${user}'s profile`}>
      <div class="hero">
        <div class="pfp">
          <Avatar name={user} size={72} />
          <span class="dot {status}" title={statusLabel}></span>
        </div>
      </div>

      <div class="content">
        <h2 class="name" title={user}>{user}</h2>
        <p class="status"><span class="dot-inline {status}"></span>{statusLabel}</p>

        <div class="actions">
          {#if isMe}
            <p class="self">this is you</p>
          {:else}
            <button type="button" class="btn" onclick={message}>message</button>
            {#if isFriend}
              <button type="button" class="btn danger" onclick={() => run(() => removeFriend(user))}>unfriend</button>
            {:else if isOutgoing}
              <button type="button" class="btn" onclick={() => run(() => removeFriend(user))}>cancel request</button>
            {:else if isIncoming}
              <button type="button" class="btn primary" onclick={() => run(() => respondFriend(user, true))}>accept</button>
              <button type="button" class="btn" onclick={() => run(() => respondFriend(user, false))}>decline</button>
            {:else}
              <button type="button" class="btn primary" onclick={() => run(() => requestFriend(user))}>add friend</button>
            {/if}
          {/if}
        </div>

        <div class="footer">
          <button type="button" class="copy" onclick={() => navigator.clipboard?.writeText(user).catch(() => {})}>
            <Icon name="link" size={13} /> copy username
          </button>
        </div>
      </div>

      <button type="button" class="x" aria-label="Close" onclick={close}>
        <Icon name="x" size={16} />
      </button>
    </div>
  </div>
{/if}

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 15000; }
  .body { position: relative; width: 300px; max-width: 90vw; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 10px; color: var(--text); text-align: center; overflow: hidden; font-family: 'JetBrains Mono', monospace; }
  .hero { padding: 28px 0 18px; background: var(--crust); border-bottom: 1px solid var(--surface0); }
  .pfp { position: relative; display: inline-flex; }
  .pfp :global(.avatar) { border-radius: 50%; }
  .pfp :global(img) { border-radius: 50%; border: 3px solid var(--mantle); }
  .dot { position: absolute; bottom: 2px; right: 2px; width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--mantle); }
  .dot.online { background: var(--green); }
  .dot.away { background: var(--yellow); }
  .dot.offline { background: var(--surface2); }
  .content { padding: 18px 20px 16px; }
  .name { margin: 0; font-size: 18px; overflow-wrap: anywhere; user-select: text; }
  .status { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 8px 0 0; color: var(--subtext0); font-size: 13px; }
  .dot-inline { width: 8px; height: 8px; border-radius: 50%; }
  .dot-inline.online { background: var(--green); }
  .dot-inline.away { background: var(--yellow); }
  .dot-inline.offline { background: var(--surface2); }
  .actions { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
  .btn { all: unset; background: var(--surface0); color: var(--text); padding: 8px 14px; border-radius: 5px; font-size: 13px; cursor: pointer; }
  .btn:hover { background: var(--surface1); }
  .btn.primary { background: var(--accent); color: var(--on-accent); font-weight: 700; }
  .btn.primary:hover { filter: brightness(1.1); }
  .btn.danger { color: var(--red); }
  .btn.danger:hover { background: rgba(237, 135, 150, 0.1); }
  .self { margin: 0; color: var(--overlay0); font-size: 12px; }
  .footer { margin-top: 16px; border-top: 1px solid var(--surface0); padding-top: 12px; }
  .copy { all: unset; display: inline-flex; align-items: center; gap: 6px; color: var(--overlay0); font-size: 12px; cursor: pointer; }
  .copy:hover { color: var(--text); }
  .x { all: unset; position: absolute; top: 10px; right: 12px; color: var(--overlay0); cursor: pointer; display: inline-flex; }
  .x:hover { color: var(--text); }
</style>