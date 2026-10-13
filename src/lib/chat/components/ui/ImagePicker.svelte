<script lang="ts">
  import { ui } from '../../state/ui.svelte';
  import { searchGifs } from '../../api/giphy';
  import type { Gif } from '../../types';
  import Icon from './Icon.svelte';

  const req = $derived(ui.imagePicker);

  let tab = $state<'upload' | 'gif'>('upload');
  let query = $state('');
  let results = $state<Gif[]>([]);
  let loading = $state(false);
  let error = $state('');
  let pending = $state<string | null>(null);
  let isGif = $state(false);
  let busy = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fileInput = $state<HTMLInputElement>();

  const VIEW = 240;
  const aspect = $derived(req?.aspect && req.aspect > 0 ? req.aspect : 1);
  const cropH = $derived(Math.round(VIEW / aspect));
  let cropSrc = $state<string | null>(null);
  let cropImg = $state.raw<HTMLImageElement | null>(null);
  let zoom = $state(1);
  let offX = $state(0);
  let offY = $state(0);
  let dragging = false;
  let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };

  const baseScale = $derived(cropImg ? Math.max(VIEW / cropImg.naturalWidth, cropH / cropImg.naturalHeight) : 1);
  const scale = $derived(baseScale * zoom);
  const dispW = $derived(cropImg ? cropImg.naturalWidth * scale : 0);
  const dispH = $derived(cropImg ? cropImg.naturalHeight * scale : 0);

  function clampOff() {
    const maxX = Math.max(0, (dispW - VIEW) / 2);
    const maxY = Math.max(0, (dispH - cropH) / 2);
    offX = Math.min(maxX, Math.max(-maxX, offX));
    offY = Math.min(maxY, Math.max(-maxY, offY));
  }

  function startCrop(src: string, img: HTMLImageElement) {
    cropSrc = src;
    cropImg = img;
    zoom = 1;
    offX = 0;
    offY = 0;
  }

  function cancelCrop() {
    cropSrc = null;
    cropImg = null;
    zoom = 1;
    offX = 0;
    offY = 0;
  }

  function onCropDown(e: PointerEvent) {
    if (!cropImg) return;
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY, ox: offX, oy: offY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onCropMove(e: PointerEvent) {
    if (!dragging) return;
    offX = dragStart.ox + (e.clientX - dragStart.x);
    offY = dragStart.oy + (e.clientY - dragStart.y);
    clampOff();
  }

  function onCropUp(e: PointerEvent) {
    dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  /** Renders the visible square of the crop viewport to a PNG (keeps transparency). */
  function applyCrop() {
    if (!cropImg || !req) return;
    const outW = req.maxDim ?? 512;
    const outH = Math.max(1, Math.round(outW / aspect));
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const tlX = VIEW / 2 - dispW / 2 + offX;
    const tlY = cropH / 2 - dispH / 2 + offY;
    const srcW = VIEW / scale;
    const srcH = cropH / scale;
    const srcX = -tlX / scale;
    const srcY = -tlY / scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cropImg, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
    let url: string;
    try {
      url = canvas.toDataURL('image/png');
    } catch {
      error = 'this image can’t be edited — try uploading it instead';
      return;
    }
    if (url.length > 1_400_000) {
      error = 'image is too large — try a smaller one';
      return;
    }
    pending = url;
    isGif = false;
    error = '';
    cancelCrop();
  }

  // Reset to a clean slate whenever the picker opens.
  $effect(() => {
    if (req) {
      tab = 'upload';
      query = '';
      results = [];
      error = '';
      pending = null;
      isGif = false;
      busy = false;
      cancelCrop();
      load('trending');
    }
  });

  async function load(q: string) {
    loading = true;
    error = '';
    try {
      const found = await searchGifs(q);
      results = found;
      if (found.length === 0) error = 'no gifs found';
    } catch (e) {
      results = [];
      error = e instanceof Error ? e.message : 'giphy unavailable';
    } finally {
      loading = false;
    }
  }

  function oninput() {
    clearTimeout(timer);
    timer = setTimeout(() => load(query.trim() || 'trending'), 500);
  }

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('decode failed'));
      img.src = src;
    });
  }

  /** Loads the selected GIF's first frame into the cropper (output becomes a static image). */
  async function cropGif() {
    if (!pending || busy) return;
    error = '';
    busy = true;
    try {
      const img = await loadImage(pending, true);
      startCrop(pending, img);
    } catch {
      error = 'could not load that gif for cropping';
    } finally {
      busy = false;
    }
  }

  /** Reads a file into a data URL, downscaling large images so they stay small. */
  async function toDataUrl(file: File, maxDim: number): Promise<string> {
    // Small GIFs pass through untouched so any animation survives.
    if (file.type === 'image/gif' && file.size <= 900_000) return readFile(file);
    const raw = await readFile(file);
    const img = await loadImage(raw);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, w, h);
    // PNG keeps transparency (logos/icons); everything else becomes a compact jpeg.
    return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
  }

  async function onFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      error = 'please choose an image file';
      return;
    }
    error = '';
    busy = true;
    try {
      // Animated GIFs can't be meaningfully cropped, so they pass straight through.
      if (file.type === 'image/gif') {
        const dataUrl = await toDataUrl(file, req?.maxDim ?? 512);
        if (dataUrl.length > 1_400_000) {
          error = 'image is too large — try a smaller one';
          return;
        }
        pending = dataUrl;
        isGif = true;
        return;
      }
      // Static images open the cropper (output is rendered as PNG on apply).
      const raw = await readFile(file);
      const img = await loadImage(raw);
      startCrop(raw, img);
    } catch {
      error = 'could not read that image';
    } finally {
      busy = false;
    }
  }

  function pickGif(gif: Gif) {
    pending = gif.images.fixed_height.url;
    isGif = true;
    error = '';
  }

  function save() {
    if (!pending || !req || busy) return;
    req.onpick(pending);
    ui.closeImagePicker();
  }

  function close() {
    ui.closeImagePicker();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }

  const preview = $derived(pending ?? req?.value ?? null);
  const shape = $derived(req?.shape ?? 'circle');
</script>

<svelte:window onkeydown={onKeydown} />

{#if req}
  <div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && close()}>
    <div class="body" role="dialog" aria-label={req.title} tabindex="-1">
      <header class="head">
        <span>{req.title}</span>
        <button type="button" class="x-btn" aria-label="Close" onclick={close}>
          <Icon name="x" size={16} />
        </button>
      </header>

      <div class="tabs">
        <button type="button" class="tab" class:active={tab === 'upload'} onclick={() => (tab = 'upload')}>
          <Icon name="upload" size={14} /> upload
        </button>
        <button type="button" class="tab" class:active={tab === 'gif'} onclick={() => (tab = 'gif')}>
          <Icon name="search" size={14} /> find a gif
        </button>
      </div>

      <div class="stage">
        {#if cropImg}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="crop-view {shape}"
            style="width:{VIEW}px;height:{cropH}px"
            onpointerdown={onCropDown}
            onpointermove={onCropMove}
            onpointerup={onCropUp}
            onpointercancel={onCropUp}
          >
            <img
              src={cropSrc}
              alt=""
              draggable="false"
              style="width:{dispW}px;height:{dispH}px;left:{VIEW / 2 - dispW / 2 + offX}px;top:{cropH / 2 - dispH / 2 + offY}px;"
            />
          </div>
          <div class="zoom-row">
            <span class="zoom-label">zoom</span>
            <input
              class="zoom-slider"
              type="range"
              min="1"
              max="3"
              step="0.01"
              bind:value={zoom}
              oninput={clampOff}
              aria-label="Zoom"
            />
          </div>
          <span class="hint">drag to reposition · zoom to fit</span>
        {:else}
          <div class="preview {shape}" class:empty={!preview} class:wide={aspect > 1 && shape !== 'circle'}>
            {#if preview}
              <img src={preview} alt="" />
            {:else}
              <span class="glyph">{req.name?.[0]?.toUpperCase() ?? '?'}</span>
            {/if}
          </div>
          {#if pending}
            <span class="hint">looking good — hit save to apply</span>
            {#if isGif}
              <button type="button" class="crop-link" disabled={busy} onclick={cropGif}>
                <Icon name="image" size={13} /> crop / zoom
              </button>
            {/if}
          {:else}
            <span class="hint">choose a file below or search Giphy</span>
          {/if}
        {/if}
      </div>

      {#if cropImg}
        <div class="pane">
          <span class="hint center">adjust the crop above, then hit apply</span>
        </div>
      {:else if tab === 'upload'}
        <div class="pane upload-pane">
          <input
            type="file"
            accept="image/*"
            hidden
            bind:this={fileInput}
            onchange={(e) => onFile((e.currentTarget as HTMLInputElement).files?.[0])}
          />
          <button type="button" class="drop" disabled={busy} onclick={() => fileInput?.click()}>
            <Icon name="upload" size={22} />
            <span>{busy ? 'processing…' : 'choose an image from your device'}</span>
            <span class="drop-note">png, jpg, gif or webp — resized automatically</span>
          </button>
        </div>
      {:else}
        <div class="pane gif-pane">
          <div class="gif-search">
            <Icon name="search" size={14} />
            <input
              type="text"
              placeholder="Search Giphy…"
              bind:value={query}
              {oninput}
              spellcheck="false"
              autocomplete="off"
            />
          </div>
          <div class="gif-grid">
            {#if results.length > 0}
              <div class="gif-masonry">
                {#each results as gif (gif.id)}
                  <button
                    type="button"
                    class="gif"
                    class:selected={pending === gif.images.fixed_height.url}
                    onclick={() => pickGif(gif)}
                  >
                    <img src={gif.images.fixed_height_small.url} alt={gif.title} />
                  </button>
                {/each}
              </div>
            {:else if loading}
              <p class="gif-status">loading…</p>
            {:else if error}
              <p class="gif-status error">{error}</p>
            {/if}
          </div>
        </div>
      {/if}

      {#if error && tab === 'upload'}<p class="error">{error}</p>{/if}

      <footer class="foot">
        <button type="button" class="btn ghost" onclick={close}>cancel</button>
        {#if cropImg}
          <button type="button" class="btn ghost" onclick={cancelCrop}>reset</button>
          <button type="button" class="btn primary" onclick={applyCrop}>apply</button>
        {:else}
          <button type="button" class="btn primary" disabled={!pending || busy} onclick={save}>save</button>
        {/if}
      </footer>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.65); display: flex; align-items: center; justify-content: center; z-index: 16000; }
  .body { width: 400px; max-width: 92vw; height: 520px; max-height: 90vh; background: var(--mantle); border: 1px solid var(--surface0); border-radius: var(--r); color: var(--text); font-family: 'JetBrains Mono', monospace; display: flex; flex-direction: column; overflow: hidden; }
  .head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--surface0); font-size: 13px; font-weight: 600; flex-shrink: 0; }
  .x-btn { all: unset; cursor: pointer; color: var(--overlay0); display: inline-flex; }
  .x-btn:hover { color: var(--text); }

  .tabs { display: flex; gap: 6px; padding: 12px 16px 0; flex-shrink: 0; }
  .tab { all: unset; flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 0; border-radius: var(--r-xs); color: var(--subtext0); font-size: 12px; cursor: pointer; }
  .tab:hover { background: var(--surface0); color: var(--text); }
  .tab.active { background: var(--surface0); color: var(--text); }

  .stage { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px 16px 10px; flex-shrink: 0; }
  .preview { width: 96px; height: 96px; background: var(--surface1); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
  .preview.circle { border-radius: 50%; }
  .preview.square { border-radius: var(--r-sm); }
  .preview.wide { width: 192px; height: 64px; }
  .preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .glyph { font-size: 34px; font-weight: 800; color: var(--accent); }
  .hint { font-size: 11px; color: var(--overlay0); }
  .crop-link {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--accent);
    cursor: pointer;
  }
  .crop-link:hover { text-decoration: underline; }
  .crop-link[disabled] { opacity: 0.5; cursor: default; }

  .crop-view { position: relative; overflow: hidden; background: var(--base); cursor: grab; touch-action: none; flex-shrink: 0; border: 1px solid var(--surface1); }
  .crop-view:active { cursor: grabbing; }
  .crop-view.circle { border-radius: 50%; }
  .crop-view.square { border-radius: var(--r-sm); }
  .crop-view img { position: absolute; max-width: none; user-select: none; pointer-events: none; }
  .zoom-row { display: flex; align-items: center; gap: 8px; width: 240px; max-width: 100%; }
  .zoom-label { font-size: 10px; color: var(--overlay0); }
  .zoom-slider { flex: 1; accent-color: var(--accent); }
  .hint.center { margin: auto; text-align: center; }

  .pane { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 0 16px; }
  .drop { all: unset; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1px dashed var(--surface1); border-radius: var(--r-sm); color: var(--overlay0); cursor: pointer; text-align: center; padding: 16px; }
  .drop:hover { color: var(--text); border-color: var(--accent); background: var(--hoverTint); }
  .drop:disabled { cursor: default; opacity: 0.6; }
  .drop span:first-of-type { font-size: 12px; color: var(--subtext0); }
  .drop-note { font-size: 10px; }

  .gif-pane { gap: 8px; padding-bottom: 4px; }
  .gif-search { display: flex; align-items: center; gap: 8px; background: var(--base); border: 1px solid var(--surface0); border-radius: var(--r-sm); padding: 8px 10px; color: var(--overlay0); flex-shrink: 0; }
  .gif-search:focus-within { border-color: var(--accent); }
  .gif-search input { all: unset; flex: 1; color: var(--text); font-family: inherit; font-size: 13px; cursor: text; }
  .gif-grid { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .gif-masonry { column-count: 2; column-gap: 6px; }
  .gif { all: unset; display: block; width: 100%; cursor: pointer; break-inside: avoid; margin-bottom: 6px; border-radius: var(--r-xs); overflow: hidden; outline: 2px solid transparent; }
  .gif img { width: 100%; height: auto; display: block; transition: opacity 0.2s; }
  .gif:hover img { opacity: 0.75; }
  .gif.selected { outline-color: var(--accent); }
  .gif-status { margin: 0; padding: 16px 8px; text-align: center; color: var(--overlay0); font-size: 12px; }
  .gif-status.error { color: var(--red); }

  .error { color: var(--red); font-size: 11px; margin: 6px 16px 0; flex-shrink: 0; }

  .foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--surface0); flex-shrink: 0; }
  .btn { all: unset; cursor: pointer; padding: 8px 16px; border-radius: var(--r-sm); font-size: 12px; font-weight: 600; }
  .btn.ghost { background: var(--surface0); color: var(--text); }
  .btn.ghost:hover { background: var(--surface1); }
  .btn.primary { background: var(--accent); color: var(--on-accent); }
  .btn.primary:hover { filter: brightness(1.08); }
  .btn.primary:disabled { background: var(--surface0); color: var(--subtext0); cursor: not-allowed; }
</style>
