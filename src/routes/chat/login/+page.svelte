<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/chat/state/auth.svelte';
  import AuthForm from '$lib/chat/components/auth/AuthForm.svelte';
  import ChatSkeleton from '$lib/chat/components/ui/ChatSkeleton.svelte';

  // Covers both "already signed in" and "just signed in".
  $effect(() => {
    if (auth.user) goto('/chat', { replaceState: true });
  });
</script>

{#if auth.user}
  <ChatSkeleton />
{:else}
  <AuthForm />
{/if}