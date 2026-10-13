<script lang="ts">
  import ConfirmButton from '../ui/ConfirmButton.svelte';
  import Icon from '../ui/Icon.svelte';

  let {
    canModify,
    canEdit,
    onreply,
    onedit,
    ondelete
  }: {
    canModify: boolean;
    canEdit: boolean;
    onreply: () => void;
    onedit: () => void;
    ondelete: () => void;
  } = $props();
</script>

<div class="actions">
  <button type="button" class="act" title="Reply" onclick={onreply}><Icon name="reply" /></button>
  {#if canModify}
    {#if canEdit}
      <button type="button" class="act" title="Edit" onclick={onedit}><Icon name="edit" /></button>
    {/if}
    <ConfirmButton onconfirm={ondelete} title="Delete" confirmTitle="Click again to confirm">
      <Icon name="trash" />
    </ConfirmButton>
  {/if}
</div>

<style>
  .actions { display: inline-flex; align-items: center; gap: 10px; margin-left: 10px; opacity: 0; transition: opacity 0.2s; }
  :global(.msg:hover) .actions, .actions:focus-within { opacity: 1; }
  .act { all: unset; display: inline-flex; cursor: pointer; color: var(--text); transition: color 0.2s; }
  .act:hover { color: var(--mauve); }
  @media (max-width: 768px) {
    .actions { opacity: 1; }
  }
</style>
