<script lang="ts">
  import { auth } from '../../state/auth.svelte';
  import { presence } from '../../state/presence.svelte';
  import { setStatusLine } from '../../api/status';
  import { toast } from '../../state/toasts.svelte';
  import EmojiPicker from '../chat/EmojiPicker.svelte';
  import Icon from '../ui/Icon.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  const me = $derived(auth.user ?? '');

  const DURATIONS = [
    { label: "don't clear", value: '0' },
    { label: '30 minutes', value: '1800000' },
    { label: '1 hour', value: '3600000' },
    { label: '4 hours', value: '14400000' },
    { label: 'today', value: 'today' }
  ];

  let emoji = $state('');
  let text = $state('');
  let duration = $state('0');

  $effect(() => {
    if (!open) return;
    const cs = presence.customOf(me);
    emoji = cs?.emoji ?? '';
    text = cs?.text ?? '';
    duration = '0';
  });

  function computeExpires(v: string): number | null {
    if (v === 'today') {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return end.getTime();
    }
    const ms = Number(v);
    return ms > 0 ? Date.now() + ms : null;
  }

  function close() {
    open = false;
  }

  async function save() {
    const t = text.trim();
    if (!emoji && !t) {
      await clear();
      return;
    }
    const expires = computeExpires(duration);
    try {
      await setStatusLine({ emoji, text: t, expires });
      presence.setCustom(me, { emoji, text: t, expires });
      toast('Status updated', 'success');
      close();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to set status', 'error');
    }
  }

  async function clear() {
    try {
      await setStatusLine({ emoji: '', text: '', expires: null });
      presence.setCustom(me, null);
      close();
    } catch {
      toast('Failed to clear status', 'error');
    }
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && open && close()} />

{#if open}
  <div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && close()}>
    <div class="popup" role="dialog" aria-label="Set a status">
      <header class="head">
        <span>set a status</span>
        <button type="button" class="x" aria-label="Close" onclick={close}>
          <Icon name="x" size={16} />
        </button>
      </header>

      <div class="top">
        <div class="preview">
          <span class="preview-emoji" class:empty={!emoji}>{emoji || '💬'}</span>
          <input
            class="text"
            bind:value={text}
            placeholder="What's happening?"
            maxlength="128"
            spellcheck="false"
            autocomplete="off"
          />
        </div>

        <div class="durations">
          {#each DURATIONS as d (d.value)}
            <button type="button" class="dur" class:sel={duration === d.value} onclick={() => (duration = d.value)}>
              {d.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="emoji-wrap">
        <EmojiPicker
          inline
          closeOnPick={false}
          onpick={(c) => (emoji = emoji === c ? '' : c)}
          onclose={() => {}}
        />
      </div>

      <footer class="foot">
        <button type="button" class="ghost" onclick={clear}>clear status</button>
        <button type="button" class="primary" onclick={save}>save</button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 15500; padding: 20px; }
  .popup { width: min(540px, 100%); height: min(640px, 100%); background: var(--mantle); border: 1px solid var(--surface0); border-radius: var(--r); color: var(--text); font-family: 'JetBrains Mono', monospace; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-menu); }
  .head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--surface0); font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text); flex-shrink: 0; }
  .x { all: unset; cursor: pointer; color: var(--overlay0); display: inline-flex; }
  .x:hover { color: var(--text); }
  .top { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; }
  .preview { display: flex; align-items: center; gap: 10px; background: var(--base); border: 1px solid var(--surface0); border-radius: var(--r-sm); padding: 8px 12px; }
  .preview:focus-within { border-color: var(--accent); }
  .preview-emoji { font-size: 22px; line-height: 1; flex-shrink: 0; }
  .preview-emoji.empty { opacity: 0.4; }
  .text { all: unset; flex: 1; min-width: 0; color: var(--text); font-family: inherit; font-size: 14px; user-select: text; cursor: text; }
  .durations { display: flex; flex-wrap: wrap; gap: 6px; }
  .dur { all: unset; cursor: pointer; font-size: 12px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--surface0); color: var(--subtext0); }
  .dur:hover { border-color: var(--accent); color: var(--text); }
  .dur.sel { background: var(--accent); color: var(--on-accent); border-color: var(--accent); font-weight: 700; }
  .emoji-wrap { flex: 1; min-height: 0; border-top: 1px solid var(--surface0); }
  .foot { display: flex; justify-content: space-between; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--surface0); flex-shrink: 0; }
  .ghost, .primary { all: unset; cursor: pointer; font-size: 13px; font-weight: 700; padding: 9px 18px; border-radius: var(--r-sm); }
  .ghost { color: var(--overlay1); }
  .ghost:hover { background: var(--surface0); color: var(--red); }
  .primary { background: var(--accent); color: var(--on-accent); }
  .primary:hover { filter: brightness(1.08); }
</style>
