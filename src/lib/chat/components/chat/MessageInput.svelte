<script lang="ts">
  import { untrack } from 'svelte';
  import { MAX_MESSAGE_LENGTH } from '../../config';
  import { sendChatMessage } from '../../send';
  import { ui } from '../../state/ui.svelte';
  import { clickOutside } from '../../actions/clickOutside';
  import Icon from '../ui/Icon.svelte';
  import GifPicker from './GifPicker.svelte';
  import ReplyPreview from './ReplyPreview.svelte';

  let { channel, placeholder }: { channel: string; placeholder: string } = $props();

  let value = $state('');
  let textarea = $state<HTMLTextAreaElement>();
  let fileInput = $state<HTMLInputElement>();
  let showGifs = $state(false);
  let attachOpen = $state(false);

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

  function pickImage() {
    attachOpen = false;
    fileInput?.click();
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
      attachOpen = false;
      return;
    }
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1) textarea?.focus();
  }

  // Keep the mobile keyboard open when tapping buttons.
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
    <span class="left">
      <button type="button" class="plus-btn" class:on={attachOpen} title="Attach" onpointerdown={keepFocus} onclick={() => (attachOpen = !attachOpen)}>
        <Icon name="plus" size={18} stroke={2.5} />
      </button>
      {#if attachOpen}
        <div class="attach-menu" use:clickOutside={{ onoutside: () => (attachOpen = false), ignore: '.plus-btn' }}>
          <button type="button" class="attach-item" onpointerdown={keepFocus} onclick={pickImage}>
            <Icon name="image" size={16} /> upload image
          </button>
          <button
            type="button"
            class="attach-item"
            onpointerdown={keepFocus}
            onclick={() => {
              attachOpen = false;
              showGifs = true;
            }}
          >
            <Icon name="send" size={16} /> send a gif
          </button>
        </div>
      {/if}
    </span>

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

    <button type="button" class="send-btn" title="Send message" disabled={!value.trim()} onclick={submit}>
      <Icon name="send" size={17} />
    </button>
  </div>
</div>

<style>
  .input-bar { display: flex; flex-direction: column; padding: 15px 24px calc(20px + env(safe-area-inset-bottom, 12px)); position: relative; }
  .input-wrap { display: flex; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 8px; align-items: center; transition: border-color 0.2s, box-shadow 0.2s; }
  .input-bar:focus-within .input-wrap { border-color: rgba(179, 135, 252, 0.55); box-shadow: 0 0 0 2px rgba(179, 135, 252, 0.12); }
  .has-reply .input-wrap { border-radius: 0 0 8px 8px; }
  .input-bar:focus-within :global(.reply-preview) { border-color: rgba(179, 135, 252, 0.55); }
  .left { position: relative; display: flex; flex-shrink: 0; padding-left: 8px; }
  .plus-btn { all: unset; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; color: var(--overlay1); cursor: pointer; border-radius: 6px; transition: color 0.2s, background 0.2s; flex-shrink: 0; }
  .plus-btn:hover { color: var(--mauve); background: var(--surface0); }
  .plus-btn.on { color: var(--mauve); background: var(--surface0); }
  .attach-menu { position: absolute; left: 0; bottom: calc(100% + 8px); width: 160px; background: var(--mantle); border: 1px solid var(--surface1); border-radius: 8px; padding: 5px; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); z-index: 100; }
  .attach-item { all: unset; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 5px; color: var(--subtext0); font-size: 13px; cursor: pointer; }
  .attach-item:hover { background: var(--surface0); color: var(--text); }
  textarea { all: unset; flex: 1; min-width: 0; color: var(--text); font-size: 15px; padding: 12px 12px 12px 10px; resize: none; overflow-y: auto; overflow-wrap: break-word; word-break: break-word; white-space: pre-wrap; max-height: 150px; box-sizing: border-box; line-height: 1.5; user-select: text; cursor: text; }
  textarea::placeholder { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .send-btn { all: unset; width: 36px; height: 36px; margin-right: 8px; display: inline-flex; align-items: center; justify-content: center; background: var(--mauve); color: var(--crust); border-radius: 6px; cursor: pointer; transition: filter 0.2s, opacity 0.2s; flex-shrink: 0; }
  .send-btn:hover { filter: brightness(1.08); }
  .send-btn:disabled { opacity: 0.35; cursor: default; filter: none; }
</style>