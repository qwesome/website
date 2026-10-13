<script lang="ts">
  import { goto } from '$app/navigation';
  import { requestFriend, respondFriend, removeFriend } from '../../api/friends';
  import { kickMember } from '../../api/servers';
  import { auth } from '../../state/auth.svelte';
  import { friends } from '../../state/friends.svelte';
  import { servers } from '../../state/servers.svelte';
  import { ui } from '../../state/ui.svelte';
  import { dmHref } from '../../utils/route';
  import { clickOutside } from '../../actions/clickOutside';
  import Icon from './Icon.svelte';

  const me = $derived(auth.user ?? '');
  const target = $derived(ui.contextMenu);

  const isMe = $derived(target ? target.user === me : false);
  const isFriend = $derived(target ? friends.isFriend(target.user) : false);
  const isOutgoing = $derived(target ? friends.hasOutgoingTo(target.user) : false);
  const isIncoming = $derived(target ? friends.hasRequestFrom(target.user) : false);

  const left = $derived(target ? Math.min(target.x, Math.max(8, window.innerWidth - 190)) : 0);
  const top = $derived(target ? Math.min(target.y, Math.max(8, window.innerHeight - 200)) : 0);

  // In a server we own, allow kicking the context-menu user.
  const kickServer = $derived.by(() => {
    if (!target) return null;
    const id = Number(ui.activeChannel);
    if (!Number.isInteger(id) || id <= 0) return null;
    const cur = servers.channelOf(id);
    if (!cur || cur.server.owner !== me) return null;
    if (target.user === me || target.user === cur.server.owner) return null;
    return cur.server;
  });

  async function run(fn: () => Promise<unknown>) {
    const user = target?.user;
    close();
    if (!user) return;
    try {
      await fn();
    } catch (e) {
      console.error(e);
    }
  }

  function close() {
    ui.closeContextMenu();
  }

  function copyUsername(name: string) {
    navigator.clipboard?.writeText(name).catch(() => {});
    close();
  }

  function message(user: string) {
    close();
    goto(dmHref(user));
  }
</script>

{#if target}
  <div
    class="menu"
    style="left: {left}px; top: {top}px"
    role="menu"
    use:clickOutside={{ onoutside: close }}
  >
    <button type="button" class="item" onclick={() => ui.showProfile(target.user)}>
      <Icon name="user" size={14} /> View profile
    </button>
    {#if !isMe}
      <button type="button" class="item" onclick={() => message(target.user)}>Send message</button>
    {/if}
    <button type="button" class="item" onclick={() => copyUsername(target.user)}>Copy username</button>

    {#if !isMe}
      <div class="sep"></div>
      {#if isFriend}
        <button type="button" class="item danger" onclick={() => run(() => removeFriend(target.user))}>
          Remove friend
        </button>
      {:else if isOutgoing}
        <button type="button" class="item" onclick={() => run(() => removeFriend(target.user))}>
          Cancel friend request
        </button>
      {:else if isIncoming}
        <button type="button" class="item" onclick={() => run(() => respondFriend(target.user, true))}>
          Accept friend request
        </button>
      {:else}
        <button type="button" class="item" onclick={() => run(() => requestFriend(target.user))}>
          Add friend
        </button>
      {/if}
    {/if}
  </div>
{/if}

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<style>
  .menu { position: fixed; z-index: 20000; min-width: 180px; background: var(--mantle); border: 1px solid var(--surface1); border-radius: 8px; padding: 5px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; }
  .item { all: unset; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 5px; color: var(--subtext0); font-size: 13px; cursor: pointer; font-family: 'JetBrains Mono', monospace; }
  .item:hover { background: var(--surface0); color: var(--text); }
  .item.danger { color: var(--red); }
  .item.danger:hover { background: rgba(237, 135, 150, 0.1); }
  .sep { height: 1px; background: var(--surface0); margin: 4px 6px; }
</style>