<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '$lib/chat/state/auth.svelte';
  import { chatFromUrl } from '$lib/chat/utils/route';
  import ChatHeader from '$lib/chat/components/chat/ChatHeader.svelte';
  import MessageList from '$lib/chat/components/chat/MessageList.svelte';
  import MessageInput from '$lib/chat/components/chat/MessageInput.svelte';

  const current = $derived(chatFromUrl(page.url, auth.user ?? ''));
  const title = $derived(current.type === 'dm' ? current.name : `#${current.id}`);
  const placeholder = $derived(current.type === 'dm' ? `message @${current.name}` : `message #${current.id}`);
</script>

<ChatHeader {title} />
<MessageList channel={current.id} />
<MessageInput channel={current.id} {placeholder} />
