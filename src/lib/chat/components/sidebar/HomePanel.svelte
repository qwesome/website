<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '../../state/auth.svelte';
  import { presence } from '../../state/presence.svelte';
  import { conversations } from '../../state/conversations.svelte';
  import { friends } from '../../state/friends.svelte';
  import { ui } from '../../state/ui.svelte';
  import { removeFriend, requestFriend, respondFriend } from '../../api/friends';
  import { dmId } from '../../utils/dm';
  import { adminHref, chatFromUrl, dmHref } from '../../utils/route';
  import DmItem from './DmItem.svelte';
  import SidebarFooter from './SidebarFooter.svelte';
  import UserRow from './UserRow.svelte';
  import Icon from '../ui/Icon.svelte';
  import ConfirmButton from '../ui/ConfirmButton.svelte';

  const me = $derived(auth.user ?? '');
  const current = $derived(chatFromUrl(page.url, me));
  const strangers = $derived(
    presence.others(me)
      .filter((u) => !conversations.list.some((c) => c.username === u))
      .filter((u) => !friends.isFriend(u))
      .filter((u) => !friends.hasRequestFrom(u) && !friends.hasOutgoingTo(u))
  );
  // Friends live in their own section, so drop them from the conversations list.
  const convos = $derived(conversations.list.filter((c) => !friends.isFriend(c.username)));
  const isActiveDm = (u: string) => current.type === 'dm' && current.name === u;

  let addingFriend = $state(false);
  let friendName = $state('');
  let friendMsg = $state('');
  let busy = $state(false);

  async function answer(username: string, accept: boolean) {
    try {
      await respondFriend(username, accept);
      await friends.load();
    } catch (e) {
      console.error(e);
    }
  }

  async function cancelRequest(username: string) {
    try {
      await removeFriend(username);
      await friends.load();
    } catch (e) {
      console.error(e);
    }
  }

  // Add by exact username — works whether or not they're online.
  async function addFriend() {
    const name = friendName.trim();
    if (!name || busy) return;
    busy = true;
    friendMsg = '';
    try {
      const res = await requestFriend(name);
      friendMsg = res.status === 'accepted' ? `${res.friend} is now your friend` : `request sent to ${res.target}`;
      friendName = '';
    } catch (e) {
      friendMsg = e instanceof Error ? e.message : 'failed to add friend';
    } finally {
      busy = false;
      await friends.load();
    }
  }

  function toggleAdd() {
    addingFriend = !addingFriend;
    friendMsg = '';
  }
</script>

<div class="panel">
  <div class="panel-header">direct messages</div>

  {#if auth.adminMode}
    <div class="section-label admin">Admin</div>
    <a class="nav-item admin" class:active={current.type === 'admin'} href={adminHref()} onclick={() => (ui.sidebarOpen = false)}>
      <span class="hash">!</span> admin-panel
    </a>
  {/if}

  <div class="friends-head">
    <span class="friends-title">friends</span>
    <span class="friends-count">{friends.friends.length}</span>
    <span class="friends-spacer"></span>
    <button type="button" class="add-friend-btn" class:on={addingFriend} title="Add a friend by username" onclick={toggleAdd}>
      <Icon name="plus" size={14} stroke={2.5} />
    </button>
  </div>

  {#if addingFriend}
    <div class="add-friend">
      <form
        onsubmit={(e) => {
          e.preventDefault();
          addFriend();
        }}
      >
        <input type="text" bind:value={friendName} placeholder="add by username" spellcheck="false" maxlength="32" enterkeyhint="send" />
        <button type="submit" class="add-go" disabled={!friendName.trim() || busy}>{busy ? '...' : 'add'}</button>
      </form>
      {#if friendMsg}<p class="friend-msg">{friendMsg}</p>{/if}
    </div>
  {/if}

  {#if friends.incoming.length > 0}
    <div class="section-label pending">pending ({friends.incoming.length})</div>
    {#each friends.incoming as u (u)}
      <UserRow username={u} unreadId={dmId(me, u)}>
        {#snippet children()}
          <button type="button" class="req accept" title="Accept friend request" onclick={() => answer(u, true)}>
            <Icon name="check" size={14} stroke={2.5} />
          </button>
          <button type="button" class="req decline" title="Decline" onclick={() => answer(u, false)}>
            <Icon name="x" size={14} stroke={2.5} />
          </button>
        {/snippet}
      </UserRow>
    {/each}
  {/if}

  {#if friends.outgoing.length > 0}
    <div class="section-label">sent</div>
    {#each friends.outgoing as u (u)}
      <UserRow username={u}>
        {#snippet children()}
          <span class="cancel">
            <ConfirmButton onconfirm={() => cancelRequest(u)} title="Cancel request" confirmTitle="Click to confirm cancel" size={14}>
              <Icon name="x" size={14} />
            </ConfirmButton>
          </span>
        {/snippet}
      </UserRow>
    {/each}
  {/if}

  {#if friends.friends.length > 0}
    <div class="section-label">friends</div>
    {#each friends.friends as u (u)}
      <UserRow username={u} href={dmHref(u)} unreadId={dmId(me, u)} active={isActiveDm(u)} />
    {/each}
  {/if}

  {#if convos.length > 0}
    <div class="section-label">conversations</div>
    {#each convos as c (c.username)}
      <DmItem username={c.username} active={isActiveDm(c.username)} />
    {/each}
  {/if}

  {#if strangers.length > 0}
    <div class="section-label">online users</div>
    {#each strangers as u (u)}
      <UserRow username={u} href={dmHref(u)} unreadId={dmId(me, u)} />
    {/each}
  {/if}

  <SidebarFooter />
</div>

<style>
  .panel { width: 240px; background: var(--mantle); border-right: 1px solid var(--surface0); display: flex; flex-direction: column; height: 100%; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .panel-header { padding: 22px 20px; border-bottom: 1px solid var(--surface0); color: var(--text); font-size: 14px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .section-label { font-size: 10px; text-transform: uppercase; color: var(--surface2); padding: 16px 20px 8px; letter-spacing: 0.1em; white-space: nowrap; }
  .section-label.admin { color: var(--red); }
  .section-label.pending { color: var(--yellow); }

  .friends-head { display: flex; align-items: center; gap: 8px; padding: 14px 14px 0 20px; }
  .friends-title { font-size: 10px; text-transform: uppercase; color: var(--surface2); letter-spacing: 0.1em; }
  .friends-count { font-size: 10px; font-weight: 800; color: var(--mauve); background: rgba(179, 135, 252, 0.12); border-radius: 6px; padding: 1px 6px; }
  .friends-spacer { flex: 1; }
  .add-friend-btn { all: unset; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; color: var(--overlay0); cursor: pointer; border-radius: 5px; }
  .add-friend-btn:hover { background: var(--surface0); color: var(--green); }
  .add-friend-btn.on { background: var(--surface0); color: var(--green); }

  .add-friend { padding: 8px 14px 4px 20px; }
  .add-friend form { display: flex; gap: 6px; }
  .add-friend input { flex: 1; min-width: 0; background: var(--base); border: 1px solid var(--surface0); color: var(--text); font-family: inherit; font-size: 12px; padding: 7px 9px; border-radius: 4px; }
  .add-friend input:focus { outline: none; border-color: var(--green); }
  .add-go { all: unset; cursor: pointer; background: var(--green); color: var(--crust); font-size: 11px; font-weight: 700; padding: 0 10px; border-radius: 4px; flex-shrink: 0; }
  .add-go:disabled { background: var(--surface0); color: var(--subtext0); cursor: not-allowed; }
  .friend-msg { margin: 6px 0 0; font-size: 11px; color: var(--subtext0); overflow-wrap: break-word; }

  .cancel { display: inline-flex; opacity: 0; transition: opacity 0.2s; }
  :global(.row:hover) .cancel, .cancel:focus-within { opacity: 1; }

  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; cursor: pointer; color: var(--overlay0); font-size: 14px; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-item:hover { background: var(--surface0); color: var(--text); }
  .nav-item.active { background: var(--surface0); color: var(--mauve); border-left: 3px solid var(--mauve); padding-left: 17px; }
  .nav-item.admin { color: var(--red); font-weight: 800; letter-spacing: 0.02em; }
  .nav-item.admin:hover { background: rgba(237, 135, 150, 0.1); }
  .nav-item.admin.active { border-left-color: var(--red); background: rgba(237, 135, 150, 0.1); position: relative; padding-left: 17px; }

  .hash { font-weight: 800; opacity: 0.8; width: 14px; text-align: center; flex-shrink: 0; }
  .req { all: unset; display: inline-flex; cursor: pointer; }
  .req.accept { color: var(--green); }
  .req.accept:hover { filter: brightness(1.2); }
  .req.decline { color: var(--overlay0); }
  .req.decline:hover { color: var(--red); }
</style>