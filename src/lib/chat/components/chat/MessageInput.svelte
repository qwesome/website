<script lang="ts">
  import { untrack } from 'svelte';
  import { MAX_MESSAGE_LENGTH } from '../../config';
  import { sendChatMessage } from '../../send';
  import { ui } from '../../state/ui.svelte';
  import Icon from '../ui/Icon.svelte';
  import GifPicker from './GifPicker.svelte';
  import ReplyPreview from './ReplyPreview.svelte';

  let { channel, placeholder }: { channel: string; placeholder: string } = $props();

  let value = $state('');
  let textarea = $state<HTMLTextAreaElement>();
  let fileInput = $state<HTMLInputElement>();
  let showGifs = $state(false);

  const shownPlaceholder = $derived.by(() => {
    const max = ui.windowWidth < 360 ? 14 : ui.windowWidth < 430 ? 18 : 24;
    return placeholder.length <= max ? placeholder : placeholder.slice(0, max - 1) + '…';
  });

  // Don't carry a pending reply across channels.
  $effect(() => {
    void channel;
    untrack(() => (ui.replyingTo = null));
  });

  // Replying focuses the input.
  $effect(() => {
    if (ui.replyingTo) textarea?.focus();
  });

  function autoResize() {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  }

  function submit() {
    const text = value.trim();
    if (!text) return;
    sendChatMessage(channel, { text });
    value = '';
    if (textarea) textarea.style.height = 'auto';
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function sendImage(file: File | null | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => sendChatMessage(channel, { image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    sendImage(input.files?.[0]);
    input.value = '';
  }

  function onpaste(e: ClipboardEvent) {
    for (const item of Array.from(e.clipboardData?.items ?? [])) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        sendImage(item.getAsFile());
        return;
      }
    }
  }

  // Start typing anywhere to focus the box; Escape closes popups.
  function onWindowKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (ui.replyingTo) ui.replyingTo = null;
      showGifs = false;
      return;
    }
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1) textarea?.focus();
  }

  // Keep the mobile keyboard open when tapping the toolbar buttons.
  function keepFocus(e: PointerEvent) {
    if (document.activeElement === textarea) e.preventDefault();
  }
</script>

<svelte:window onkeydown={onWindowKey} />

<div class="input-bar" class:has-reply={ui.replyingTo}>
  <ReplyPreview />

  {#if showGifs}
    <GifPicker
      onclose={() => (showGifs = false)}
      onpick={(url) => {
        sendChatMessage(channel, { image: url });
        showGifs = false;
      }}
    />
  {/if}

  <div class="input-wrap">
    <textarea
      bind:this={textarea}
      bind:value
      rows="1"
      maxlength={MAX_MESSAGE_LENGTH}
      placeholder={shownPlaceholder}
      {onkeydown}
      oninput={autoResize}
      {onpaste}
    ></textarea>
    <input type="file" accept="image/*" bind:this={fileInput} onchange={onFileChange} hidden />
    <button type="button" class="upload-btn gif-toggle-btn gif-label" title="send a gif" onpointerdown={keepFocus} onclick={() => (showGifs = !showGifs)}>GIF</button>
    <button type="button" class="upload-btn last" title="upload image" onpointerdown={keepFocus} onclick={() => fileInput?.click()}>
      <Icon name="image" size={20} />
    </button>
  </div>
</div>

<style>
  .input-bar { display: flex; flex-direction: column; padding: 15px 24px calc(20px + env(safe-area-inset-bottom, 12px)); position: relative; }
  .input-wrap { display: flex; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 8px; align-items: center; transition: border-color 0.2s; }
  .has-reply .input-wrap { border-radius: 0 0 8px 8px; }
  .input-bar:focus-within .input-wrap, .input-bar:focus-within :global(.reply-preview) { border-color: var(--mauve); }
  textarea { all: unset; flex: 1; min-width: 0; color: var(--text); font-size: 15px; padding: 12px 18px; resize: none; overflow-y: auto; overflow-wrap: break-word; word-break: break-word; white-space: pre-wrap; max-height: 150px; box-sizing: border-box; line-height: 1.5; user-select: text; cursor: text; }
  textarea::placeholder { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .upload-btn { all: unset; border: 2px solid var(--surface0); color: var(--overlay0); padding: 0 16px; cursor: pointer; height: 50px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; align-self: stretch; box-sizing: border-box; transition: color 0.25s ease, border-color 0.25s ease; }
  .upload-btn.last { border-radius: 0 8px 8px 0; }
  .upload-btn:hover { color: var(--mauve); }
  .gif-label { font-weight: 800; font-size: 13px; }
</style>
