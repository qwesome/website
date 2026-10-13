<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '../../state/auth.svelte';
  import { presence } from '../../state/presence.svelte';
  import { unread } from '../../state/unread.svelte';
  import { conversations } from '../../state/conversations.svelte';
  import { ui } from '../../state/ui.svelte';
  import { hideConversation } from '../../api/conversations';
  import { dmId } from '../../utils/dm';
  import { channelHref, dmHref } from '../../utils/route';
  import ConfirmButton from '../ui/ConfirmButton.svelte';
  import Icon from '../ui/Icon.svelte';

  let { username, active }: { username: string; active: boolean } = $props();

  const id = $derived(dmId(auth.user ?? '', username));

  async function hide() {
    if (!auth.user) return;
    try {
      await hideConversation(auth.user, id);
      await conversations.load();
      if (active) goto(channelHref('global'));
    } catch (e) {
      console.error(e);
    }
  }
</script>

<div class="dm-item" class:active>
  <a class="dm-link" href={dmHref(username)} onclick={() => (ui.sidebarOpen = false)}>
    <span class="dot {presence.statusOf(username)}"></span>
    <span class="dm-name">{username}</span>
    {#if unread.has(id)}<span class="unread-dot"></span>{/if}
  </a>
  <span class="hide">
    <ConfirmButton onconfirm={hide} title="Hide conversation" confirmTitle="Click to confirm hide" size={14}>
      <Icon name="x" size={14} />
    </ConfirmButton>
  </span>
</div>

<style>
  .dm-item { display: flex; align-items: center; color: var(--overlay0); font-size: 14px; }
  .dm-item:hover { background: var(--surface0); color: var(--text); }
  .dm-item.active { background: var(--surface0); color: var(--mauve); border-left: 3px solid var(--mauve); }
  .dm-link { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; padding: 10px 0 10px 20px; color: inherit; text-decoration: none; }
  .dm-item.active .dm-link { padding-left: 17px; }
  .dm-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hide { padding: 4px 16px 4px 8px; opacity: 0; transition: opacity 0.2s; }
  .dm-item:hover .hide, .hide:focus-within { opacity: 0.7; }
  @media (max-width: 768px) {
    .hide { opacity: 0.8; padding: 8px 16px 8px 8px; }
  }
</style>
