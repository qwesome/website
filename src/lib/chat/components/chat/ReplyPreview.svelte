<script lang="ts">
  import { ui } from '../../state/ui.svelte';
  import { truncate } from '../../utils/format';
  import Icon from '../ui/Icon.svelte';

  const target = $derived(ui.replyingTo);
</script>

{#if target}
  <div class="reply-preview">
    <div class="info">
      <span class="label">replying to <strong>{target.author}</strong></span>
      <div class="text">{target.image && !target.text ? '📷 Image' : truncate(target.text, 80)}</div>
    </div>
    <button type="button" class="cancel" aria-label="Cancel reply" onclick={() => (ui.replyingTo = null)}>
      <Icon name="x" />
    </button>
  </div>
{/if}

<style>
  .reply-preview { background: var(--crust); border: 1px solid var(--surface0); border-bottom: none; border-radius: 8px 8px 0 0; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; transition: border-color 0.2s; }
  .info { min-width: 0; }
  .label { font-size: 11px; color: var(--mauve); display: block; }
  .text { font-size: 13px; color: var(--subtext0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cancel { all: unset; cursor: pointer; color: var(--red); padding: 4px; display: inline-flex; }
</style>
