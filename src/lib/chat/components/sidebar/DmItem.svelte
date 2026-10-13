<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '../../state/auth.svelte';
  import { unread } from '../../state/unread.svelte';
  import { conversations } from '../../state/conversations.svelte';
  import { servers } from '../../state/servers.svelte';
  import { ui } from '../../state/ui.svelte';
  import { hideConversation } from '../../api/conversations';
  import { dmId } from '../../utils/dm';
  import { channelHref, dmHref, homeHref } from '../../utils/route';
  import ConfirmButton from '../ui/ConfirmButton.svelte';
  import Icon from '../ui/Icon.svelte';
  import UserRow from './UserRow.svelte';

  let { username, active }: { username: string; active: boolean } = $props();

  const id = $derived(dmId(auth.user ?? '', username));

  async function hide() {
    if (!auth.user) return;
    try {
      await hideConversation(id);
      await conversations.load();
      if (active) {
        const def = servers.defaultChannel();
        goto(def ? channelHref(def.server.id, def.channel.id) : homeHref());
      }
    } catch (e) {
      console.error(e);
    }
  }
</script>

<UserRow {username} href={dmHref(username)} {active} unreadId={id}>
  {#snippet children()}
    <span class="hide">
      <ConfirmButton onconfirm={hide} title="Hide conversation" confirmTitle="Click to confirm hide" size={14}>
        <Icon name="x" size={14} />
      </ConfirmButton>
    </span>
  {/snippet}
</UserRow>

<style>
  .hide { display: inline-flex; opacity: 0; transition: opacity 0.2s; }
  :global(.row:hover) .hide, .hide:focus-within { opacity: 0.7; }
  @media (max-width: 768px) {
    .hide { opacity: 0.8; }
  }
</style>