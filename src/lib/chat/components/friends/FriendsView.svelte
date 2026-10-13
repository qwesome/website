<script lang="ts">
  import { auth } from '../../state/auth.svelte';
  import { friends } from '../../state/friends.svelte';
  import { presence } from '../../state/presence.svelte';
  import { requestFriend, removeFriend, respondFriend, searchUsers } from '../../api/friends';
  import { toast } from '../../state/toasts.svelte';
  import { dmHref } from '../../utils/route';
  import { dmId } from '../../utils/dm';
  import UserRow from '../sidebar/UserRow.svelte';
  import Icon from '../ui/Icon.svelte';

  const me = $derived(auth.user ?? '');
  const onlineFriends = $derived(friends.friends.filter((u) => presence.statusOf(u) !== 'offline'));
  const offlineFriends = $derived(friends.friends.filter((u) => presence.statusOf(u) === 'offline'));

  let addName = $state('');
  let busy = $state(false);
  let suggestions = $state<string[]>([]);
  let showSuggest = $state(false);
  let sugTimer: ReturnType<typeof setTimeout> | undefined;
  let blurTimer: ReturnType<typeof setTimeout> | undefined;

  const known = $derived(new Set([...friends.friends, ...friends.incoming, ...friends.outgoing]));

  function onInput() {
    clearTimeout(sugTimer);
    const q = addName.trim();
    if (!q) {
      suggestions = [];
      showSuggest = false;
      return;
    }
    sugTimer = setTimeout(async () => {
      try {
        const res = await searchUsers(q);
        if (addName.trim() !== q) return;
        suggestions = res.filter((u) => !known.has(u) && u !== me).slice(0, 6);
        showSuggest = true;
      } catch {
        suggestions = [];
      }
    }, 120);
  }

  function choose(name: string) {
    clearTimeout(blurTimer);
    addName = name;
    showSuggest = false;
    add();
  }

  async function add() {
    const name = addName.trim();
    if (!name || busy) return;
    busy = true;
    try {
      const res = await requestFriend(name);
      if (res.status === 'accepted') toast(`${res.friend} is now your friend`, 'success');
      else toast(`Friend request sent to ${res.target}`, 'success');
      addName = '';
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to send request', 'error');
    } finally {
      busy = false;
      await friends.load();
    }
  }

  async function accept(u: string) {
    try {
      await respondFriend(u, true);
      toast(`You are now friends with ${u}`, 'success');
    } catch (e) {
      toast('Failed to accept request', 'error');
    } finally {
      await friends.load();
    }
  }

  async function decline(u: string) {
    try {
      await respondFriend(u, false);
      toast(`Declined request from ${u}`);
    } catch (e) {
      toast('Failed to decline request', 'error');
    } finally {
      await friends.load();
    }
  }

  async function cancel(u: string) {
    try {
      await removeFriend(u);
      toast(`Cancelled request to ${u}`);
    } catch (e) {
      toast('Failed to cancel request', 'error');
    } finally {
      await friends.load();
    }
  }
</script>

<div class="friends-view">
  <header class="head">
    <span class="title">friends</span>
    <span class="count">{friends.friends.length}</span>
  </header>

  <div class="scroll">
    <div class="add-wrap">
      <form
        class="add"
        onsubmit={(e) => {
          e.preventDefault();
          showSuggest = false;
          add();
        }}
      >
        <input
          type="text"
          bind:value={addName}
          oninput={onInput}
          onfocus={() => suggestions.length && (showSuggest = true)}
          onblur={() => (blurTimer = setTimeout(() => (showSuggest = false), 150))}
          placeholder="add a friend by username"
          spellcheck="false"
          maxlength="32"
          autocomplete="off"
          enterkeyhint="send"
        />
        <button type="submit" disabled={!addName.trim() || busy}>{busy ? '...' : 'send request'}</button>
      </form>
      {#if showSuggest && suggestions.length > 0}
        <ul class="suggest">
          {#each suggestions as s (s)}
            <li>
              <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => choose(s)}>
                <Icon name="user" size={14} />
                <span>{s}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    {#if friends.incoming.length > 0}
      <div class="group-label pending">incoming — {friends.incoming.length}</div>
      {#each friends.incoming as u (u)}
        <UserRow username={u} unreadId={dmId(me, u)}>
          {#snippet children()}
            <button type="button" class="act accept" title="Accept" onclick={() => accept(u)}>
              <Icon name="check" size={18} stroke={2.6} />
            </button>
            <button type="button" class="act decline" title="Decline" onclick={() => decline(u)}>
              <Icon name="x" size={18} stroke={2.6} />
            </button>
          {/snippet}
        </UserRow>
      {/each}
    {/if}

    {#if friends.outgoing.length > 0}
      <div class="group-label">sent — {friends.outgoing.length}</div>
      {#each friends.outgoing as u (u)}
        <UserRow username={u}>
          {#snippet children()}
            <button type="button" class="act decline" title="Cancel request" onclick={() => cancel(u)}>
              <Icon name="x" size={18} stroke={2.6} />
            </button>
          {/snippet}
        </UserRow>
      {/each}
    {/if}

    {#if onlineFriends.length > 0}
      <div class="group-label">online — {onlineFriends.length}</div>
      {#each onlineFriends as u (u)}
        <UserRow username={u} href={dmHref(u)} unreadId={dmId(me, u)} />
      {/each}
    {/if}

    {#if offlineFriends.length > 0}
      <div class="group-label">offline — {offlineFriends.length}</div>
      {#each offlineFriends as u (u)}
        <UserRow username={u} href={dmHref(u)} unreadId={dmId(me, u)} />
      {/each}
    {/if}

    {#if friends.loaded && friends.friends.length === 0 && friends.incoming.length === 0 && friends.outgoing.length === 0}
      <p class="empty">no friends yet — add someone above.</p>
    {/if}
  </div>
</div>

<style>
  .friends-view { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--base); }
  .head { display: flex; align-items: center; gap: 8px; padding: 22px 24px; border-bottom: 1px solid var(--surface0); color: var(--text); font-size: 14px; font-weight: bold; }
  .count { font-size: 11px; font-weight: 800; color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); border-radius: var(--r-xs); padding: 1px 7px; }
  .scroll { flex: 1; overflow-y: auto; padding: 12px 12px 24px; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .add-wrap { position: relative; padding: 0 8px; }
  .add { display: flex; gap: 8px; padding: 4px 0 8px; }
  .add input { flex: 1; min-width: 0; background: var(--mantle); border: 1px solid var(--surface0); color: var(--text); font-family: inherit; font-size: 13px; padding: 10px 12px; border-radius: var(--r-sm, 6px); }
  .add input:focus { outline: none; border-color: var(--green); }
  .add button { all: unset; cursor: pointer; background: var(--green); color: var(--crust); font-size: 12px; font-weight: 700; padding: 0 14px; border-radius: var(--r-sm, 6px); flex-shrink: 0; }
  .add button:hover { filter: brightness(1.08); }
  .add button:disabled { background: var(--surface0); color: var(--subtext0); cursor: not-allowed; }
  .suggest { position: absolute; left: 8px; right: 8px; top: calc(100% - 8px); margin: 0; padding: 4px; list-style: none; background: var(--mantle); border: 1px solid var(--surface0); border-radius: var(--r-sm, 6px); box-shadow: var(--shadow-menu); z-index: 30; max-height: 240px; overflow-y: auto; }
  .suggest button { all: unset; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: var(--r-xs); cursor: pointer; color: var(--text); font-size: 13px; }
  .suggest button:hover { background: var(--surface0); }
  .suggest button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .group-label { font-size: 10px; text-transform: uppercase; color: var(--surface2); letter-spacing: 0.1em; padding: 16px 12px 6px; }
  .group-label.pending { color: var(--yellow); }
  .act { all: unset; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; background: var(--surface0); color: var(--overlay1); border: 1px solid var(--surface1); transition: transform 0.12s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
  .act:hover { transform: scale(1.09); }
  .act:active { transform: scale(0.96); }
  .act.accept { color: var(--green); }
  .act.accept:hover { background: var(--green); color: var(--crust); box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 22%, transparent); }
  .act.decline { color: var(--red); }
  .act.decline:hover { background: var(--red); color: var(--on-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--red) 20%, transparent); }
  .empty { color: var(--overlay0); font-size: 13px; padding: 16px 12px; }
</style>
