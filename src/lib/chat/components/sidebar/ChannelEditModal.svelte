<script lang="ts">
  import Icon from '../ui/Icon.svelte';

  let {
    open = $bindable(false),
    title,
    initial = '',
    onSubmit,
    onclose
  }: {
    open: boolean;
    title: string;
    initial?: string;
    onSubmit: (name: string) => Promise<void> | void;
    onclose?: () => void;
  } = $props();

  let name = $state('');
  let error = $state('');
  let busy = $state(false);

  $effect(() => {
    if (open) {
      name = initial;
      error = '';
    }
  });

  async function submit() {
    const v = name.trim();
    if (!v || busy) return;
    busy = true;
    error = '';
    try {
      await onSubmit(v);
      open = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'operation failed';
    } finally {
      busy = false;
    }
  }

  function close() {
    if (busy) return;
    open = false;
    onclose?.();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }

  function focus(input: HTMLInputElement) {
    input.focus();
  }
</script>

{#if open}
  <div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && close()}>
    <div class="body" role="dialog" tabindex="-1" onkeydown={onKeydown}>
      <header class="head">
        <span>{title}</span>
        <button type="button" class="x-btn" aria-label="Close" onclick={close}>
          <Icon name="x" size={16} />
        </button>
      </header>
      <form
        class="form"
        onsubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          bind:value={name}
          placeholder="e.g. general"
          use:focus
          spellcheck="false"
          maxlength="24"
        />
        {#if error}<p class="error">{error}</p>{/if}
        <button type="submit" class="submit" disabled={!name.trim() || busy}>
          {busy ? '...' : 'save'}
        </button>
      </form>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10001; }
  .body { width: 360px; max-width: 90vw; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 8px; color: var(--text); font-family: 'JetBrains Mono', monospace; overflow: hidden; }
  .head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--surface0); font-size: 13px; font-weight: 600; }
  .x-btn { all: unset; cursor: pointer; color: var(--overlay0); display: inline-flex; }
  .x-btn:hover { color: var(--text); }
  .form { display: flex; flex-direction: column; gap: 10px; padding: 16px; }
  input { background: var(--base); border: 1px solid var(--surface0); color: var(--text); padding: 10px 12px; border-radius: 4px; font-family: inherit; font-size: 14px; }
  input:focus { outline: none; border-color: var(--accent); }
  .error { color: var(--red); font-size: 11px; margin: 0; }
  .submit { all: unset; text-align: center; background: var(--accent); color: var(--on-accent); padding: 9px 0; border-radius: 4px; font-weight: 700; font-size: 13px; cursor: pointer; }
  .submit:disabled { background: var(--surface0); color: var(--subtext0); cursor: not-allowed; }
</style>