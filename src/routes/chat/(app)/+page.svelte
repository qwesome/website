<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '$lib/chat/state/auth.svelte';
  import { servers } from '$lib/chat/state/servers.svelte';
  import { chatFromUrl } from '$lib/chat/utils/route';
  import ChatHeader from '$lib/chat/components/chat/ChatHeader.svelte';
  import MessageList from '$lib/chat/components/chat/MessageList.svelte';
  import MessageInput from '$lib/chat/components/chat/MessageInput.svelte';
  import MembersList from '$lib/chat/components/chat/MembersList.svelte';

  const current = $derived(chatFromUrl(page.url, auth.user ?? ''));

  const title = $derived.by(() => {
    switch (current.type) {
      case 'server': {
        const found = servers.channelOf(Number(current.id));
        return found ? `#${found.channel.name}` : '#…';
      }
      case 'dm':
        return `@${current.name}`;
      case 'admin':
        return '!admin-panel';
      default:
        return '';
    }
  });

  const placeholder = $derived.by(() => {
    if (current.type === 'dm') return `message @${current.name}`;
    if (current.type === 'server') return `message #${title.slice(1)}`;
    if (current.type === 'admin') return 'type a command';
    return '';
  });
</script>

{#if current.type === 'home'}
  <div class="home">
    <div class="home-card">
      <h1>unblocked chat</h1>
      <p>Pick a channel on the left, or create or join a server using the + button.</p>
    </div>
  </div>
{:else}
  <div class="viewport">
    <div class="main">
      <ChatHeader {title} />
      <MessageList channel={current.id} />
      <MessageInput channel={current.id} {placeholder} />
    </div>
    {#if current.type === 'server'}
      <MembersList serverId={current.serverId} />
    {/if}
  </div>
{/if}

<style>
  .viewport { flex: 1; display: flex; min-height: 0; min-width: 0; }
  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .home { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; overflow-y: auto; }
  .home-card { max-width: 420px; text-align: center; color: var(--overlay0); }
  .home-card h1 { margin: 0 0 10px; color: var(--text); font-size: 20px; }
  .home-card p { margin: 0; font-size: 13px; line-height: 1.6; }
</style>