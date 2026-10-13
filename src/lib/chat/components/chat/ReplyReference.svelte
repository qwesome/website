<script lang="ts">
  import { truncate } from '../../utils/format';
  import type { Message } from '../../types';

  let { parent }: { parent: Message } = $props();
</script>

<div class="reply-reference">
  <span class="author">@{parent.author}</span>
  <span class="text">{parent.image && !parent.text ? '📷 Image' : truncate(parent.text, 40)}</span>
</div>

<style>
  .reply-reference { display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.05); border-left: 2px solid var(--mauve); padding: 4px 10px; margin-bottom: 4px; border-radius: 4px; font-size: 12px; max-width: fit-content; color: var(--overlay1); }
  .author { color: var(--mauve); font-weight: bold; }
</style>
