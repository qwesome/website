<script lang="ts">
  import { auth } from '../../state/auth.svelte';
  import { friends } from '../../state/friends.svelte';
  import { sendChatMessage } from '../../send';
  import { dmId } from '../../utils/dm';
  import type { Server } from '../../types';
  import Avatar from '../ui/Avatar.svelte';
  import Icon from '../ui/Icon.svelte';

  let { server }: { server: Server } = $props();

  const me = $derived(auth.user ?? '');
  let picking = $state(false);
  let note = $state('');
  let sentTo = $state<string[]>([]);

  $effect(() => {
    friends.load();
  });

  function toggle() {
    picking = !picking;
    note = '';
  }

  function invite(friend: string) {
    if (!me || !server.code || sentTo.includes(friend)) return;
    sendChatMessage(dmId(me, friend), {
      text: `Join my server "${server.name}" — invite code: ${server.code}`
    });
    sentTo = [...sentTo, friend];
    note = `invited ${friend}`;
  }
</script>

<div class="invite-friend">
  <button type="button" class="friend-btn" class:on={picking} onclick={toggle}>
    <Icon name="plus" size={13} /> invite a friend
  </button>

  {#if picking}
    <div class="friend-list">
      {#if friends.friends.length === 0}
        <p class="friend-empty">no friends yet</p>
      {:else}
        {#each friends.friends as f (f)}
          <button type="button" class="friend-row" disabled={sentTo.includes(f)} onclick={() => invite(f)}>
            <Avatar name={f} size={22} />
            <span class="friend-name">{f}</span>
            <span class="friend-go">{sentTo.includes(f) ? 'invited' : 'invite'}</span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}

  {#if note}<p class="friend-note">{note}</p>{/if}
</div>

<style>
  .invite-friend { display: flex; flex-direction: column; gap: 6px; }
  .friend-btn { all: unset; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; background: var(--surface0); color: var(--text); font-size: 11px; padding: 6px 10px; border-radius: 4px; }
  .friend-btn:hover { background: var(--surface1); }
  .friend-btn.on { background: var(--surface1); }
  .friend-list { display: flex; flex-direction: column; gap: 3px; max-height: 170px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .friend-row { all: unset; display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 5px; cursor: pointer; color: var(--subtext0); }
  .friend-row:hover { background: var(--surface0); color: var(--text); }
  .friend-row:disabled { opacity: 0.55; cursor: default; }
  .friend-row :global(.avatar) { border-radius: 50%; }
  .friend-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
  .friend-go { flex-shrink: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent); }
  .friend-empty { margin: 0; font-size: 11px; color: var(--overlay0); }
  .friend-note { margin: 0; font-size: 11px; color: var(--green); }
</style>
