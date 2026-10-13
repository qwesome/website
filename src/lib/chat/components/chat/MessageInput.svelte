<script lang="ts">
  import { untrack } from 'svelte';
  import { MAX_MESSAGE_LENGTH } from '../../config';
  import { sendChatMessage } from '../../send';
  import { appearance } from '../../state/appearance.svelte';
  import { ui, type MenuItem } from '../../state/ui.svelte';
  import Icon from '../ui/Icon.svelte';
  import GifPicker from './GifPicker.svelte';
  import EmojiPicker from './EmojiPicker.svelte';
  import ReplyPreview from './ReplyPreview.svelte';

  let { channel, placeholder }: { channel: string; placeholder: string } = $props();

  let value = $state('');
  let textarea = $state<HTMLTextAreaElement>();
  let fileInput = $state<HTMLInputElement>();
  let showGifs = $state(false);
  let showEmoji = $state(false);
  let attachment = $state<string | null>(null);

  const shownPlaceholder = $derived.by(() => {
    const max = ui.windowWidth < 360 ? 14 : ui.windowWidth < 430 ? 18 : 24;
    return placeholder.length <= max ? placeholder : placeholder.slice(0, max - 1) + '…';
  });

  // Don't carry a pending reply across channels.
  $effect(() => {
    void channel;
    untrack(() => {
      ui.replyingTo = null;
      attachment = null;
    });
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
    if (!text && !attachment) return;
    sendChatMessage(channel, { text, image: attachment ?? undefined });
    value = '';
    attachment = null;
    if (textarea) textarea.style.height = 'auto';
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    if (appearance.enterToSend && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (!appearance.enterToSend && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  // Images pasted or picked are attached to the message, never sent instantly.
  function attachImage(file: File | null | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => (attachment = String(reader.result));
    reader.readAsDataURL(file);
  }

  function pickImage() {
    fileInput?.click();
  }

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    attachImage(input.files?.[0]);
    input.value = '';
  }

  function onpaste(e: ClipboardEvent) {
    for (const item of Array.from(e.clipboardData?.items ?? [])) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        attachImage(item.getAsFile());
        return;
      }
    }
  }

  // Start typing anywhere to focus the box; Escape closes popups.
  function onWindowKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (ui.replyingTo) ui.replyingTo = null;
      showGifs = false;
      showEmoji = false;
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

  function insertAt(text: string, start: number, end: number) {
    const el = textarea;
    if (!el) return;
    el.setRangeText(text, start, end, 'end');
    value = el.value;
    el.focus();
  }

  function toggleGifs() {
    showGifs = !showGifs;
    if (showGifs) showEmoji = false;
  }

  function toggleEmoji() {
    showEmoji = !showEmoji;
    if (showEmoji) showGifs = false;
  }

  function insertEmoji(char: string) {
    insertAt(char, textarea?.selectionStart ?? 0, textarea?.selectionEnd ?? 0);
  }

  // Rich text-editing menu for the message box (the native menu is suppressed).
  function onInputContext(e: MouseEvent) {
    e.preventDefault();
    const el = textarea;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    const selected = (el?.value ?? '').slice(start, end);
    const hasSel = start !== end;
    const hasText = (el?.value ?? '').length > 0;

    const items: MenuItem[] = [
      {
        label: 'Undo',
        icon: 'undo',
        action: () => {
          el?.focus();
          document.execCommand('undo');
        }
      },
      {
        label: 'Redo',
        icon: 'redo',
        action: () => {
          el?.focus();
          document.execCommand('redo');
        }
      },
      { separator: true },
      {
        label: 'Cut',
        icon: 'cut',
        disabled: !hasSel,
        action: () => {
          void navigator.clipboard?.writeText(selected).catch(() => {});
          insertAt('', start, end);
        }
      },
      {
        label: 'Copy',
        icon: 'copy',
        disabled: !hasSel,
        action: () => void navigator.clipboard?.writeText(selected).catch(() => {})
      },
      {
        label: 'Paste',
        icon: 'paste',
        action: async () => {
          try {
            const text = await navigator.clipboard.readText();
            insertAt(text, start, end);
          } catch {
            /* clipboard unavailable */
          }
        }
      },
      {
        label: 'Select all',
        icon: 'select-all',
        disabled: !hasText,
        action: () => textarea?.select()
      },
      { separator: true },
      {
        label: 'Clear message',
        icon: 'eraser',
        danger: true,
        disabled: !hasText,
        action: () => {
          value = '';
          textarea?.focus();
        }
      },
      { separator: true },
      {
        label: 'Insert GIF',
        icon: 'image',
        action: () => {
          showGifs = true;
          textarea?.focus();
        }
      },
      { label: 'Attach image', icon: 'image', action: pickImage }
    ];
    ui.openMenu(e.clientX, e.clientY, items);
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

  {#if showEmoji}
    <EmojiPicker onclose={() => (showEmoji = false)} onpick={insertEmoji} />
  {/if}

  {#if attachment}
    <div class="attach-preview">
      <img src={attachment} alt="attachment preview" />
      <button type="button" class="attach-remove" title="Remove attachment" onpointerdown={keepFocus} onclick={() => (attachment = null)}>
        <Icon name="x" size={14} />
      </button>
    </div>
  {/if}

  <div class="input-wrap">
    <span class="left">
      <button type="button" class="plus-btn" title="Attach an image" onpointerdown={keepFocus} onclick={pickImage}>
        <Icon name="plus" size={18} stroke={2.5} />
      </button>
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
      oncontextmenu={onInputContext}
    ></textarea>
    <input type="file" accept="image/*" bind:this={fileInput} onchange={onFileChange} hidden />

    <span class="right">
      <button type="button" class="gif-btn" class:on={showGifs} title="Send a gif" onpointerdown={keepFocus} onclick={toggleGifs}>
        <span class="gif-label">GIF</span>
      </button>
      <button type="button" class="emoji-btn" class:on={showEmoji} title="Add emoji" onpointerdown={keepFocus} onclick={toggleEmoji}>
        <Icon name="smile" size={18} />
      </button>
      <button type="button" class="send-btn" title="Send message" disabled={!value.trim() && !attachment} onclick={submit}>
        <Icon name="send" size={17} />
      </button>
    </span>
  </div>
</div>

<style>
  .input-bar { display: flex; flex-direction: column; padding: 15px 24px calc(20px + env(safe-area-inset-bottom, 12px)); position: relative; }
  .input-wrap { display: flex; background: var(--mantle); border: 1px solid var(--surface0); border-radius: var(--r-sm); align-items: center; transition: border-color 0.2s, box-shadow 0.2s; }
  .input-bar:focus-within .input-wrap { border-color: color-mix(in srgb, var(--accent) 55%, transparent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 12%, transparent); }
  .has-reply .input-wrap { border-radius: 0 0 var(--r-sm) var(--r-sm); }
  .input-bar:focus-within :global(.reply-preview) { border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
  .left { display: flex; flex-shrink: 0; padding-left: 8px; }
  .attach-preview { position: relative; align-self: flex-start; margin: 0 0 8px 8px; padding: 6px; background: var(--mantle); border: 1px solid var(--surface0); border-radius: var(--r-sm); display: inline-flex; }
  .attach-preview img { max-height: 96px; max-width: 200px; border-radius: var(--r-xs); display: block; }
  .attach-remove { all: unset; position: absolute; top: -8px; right: -8px; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface1); color: var(--text); border-radius: 50%; cursor: pointer; }
  .attach-remove:hover { background: var(--red); color: var(--on-accent); }
  .plus-btn { all: unset; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; color: var(--overlay1); cursor: pointer; border-radius: var(--r-xs); transition: color 0.2s, background 0.2s; flex-shrink: 0; }
  .plus-btn:hover { color: var(--accent); background: var(--surface0); }
  .right { display: flex; align-items: center; gap: 2px; padding-right: 8px; flex-shrink: 0; }
  .gif-btn { all: unset; height: 32px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; color: var(--overlay1); cursor: pointer; border-radius: var(--r-xs); transition: color 0.2s, background 0.2s; }
  .gif-btn:hover { color: var(--accent); background: var(--surface0); }
  .gif-btn.on { color: var(--accent); background: var(--surface0); }
  .gif-label { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; }
  .emoji-btn { all: unset; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: var(--overlay1); cursor: pointer; border-radius: var(--r-xs); transition: color 0.2s, background 0.2s; }
  .emoji-btn:hover { color: var(--accent); background: var(--surface0); }
  .emoji-btn.on { color: var(--accent); background: var(--surface0); }
  textarea { all: unset; flex: 1; min-width: 0; color: var(--text); font-size: 15px; padding: 12px 12px 12px 10px; resize: none; overflow-y: auto; overflow-wrap: break-word; word-break: break-word; white-space: pre-wrap; max-height: 150px; box-sizing: border-box; line-height: 1.5; user-select: text; cursor: text; }
  textarea::placeholder { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .send-btn { all: unset; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: var(--on-accent); border-radius: var(--r-xs); cursor: pointer; transition: filter 0.2s, opacity 0.2s; flex-shrink: 0; }
  .send-btn:hover { filter: brightness(1.08); }
  .send-btn:disabled { opacity: 0.35; cursor: default; filter: none; }
</style>