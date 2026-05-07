<svelte:head>
<link rel="stylesheet" href="/7.css">
  <link rel="icon" type="image/png" href="/favicon.png" />
</svelte:head>

<script>
  import { onMount, afterUpdate, tick } from 'svelte';
  
  // --- Window state ---
  let windows = {
    main:    { x: null, y: null, w: 500,  h: 400,  zIndex: 1, open: true  },
    eagler:  { x: null, y: null, w: 300,  h: 280,  zIndex: 1, open: false },
    tetris:  { x: null, y: null, w: 520,  h: 580,  zIndex: 1, open: false },
    bb:      { x: null, y: null, w: 520,  h: 580,  zIndex: 1, open: false },
    piano:   { x: null, y: null, w: 660,  h: 520,  zIndex: 1, open: false },
    songs:   { x: null, y: null, w: 500,  h: 400,  zIndex: 1, open: false },
    yt:   { x: null, y: null, w: 1000,  h: 700,  zIndex: 1, open: false },
    retro:   { x: null, y: null, w: 340,  h: 500,  zIndex: 1, open: false },
  };
  
  const minW = 240;
  const minH = { main: 150, eagler: 150, tetris: 275, bb: 275, piano: 275, songs: 275, retro: 150 };
  
  let dragging = null;
  let resizing = null;
  let resizeDir = '';
  let dragStart = {};
  let zCounter = 10;
  
  // Blocks iframes from swallowing mouse events during drag/resize
  $: active = !!(dragging || resizing);
  
  // Determine the active window (highest z-index)
  $: activeWindow = Object.keys(windows).reduce((a, b) => windows[a].zIndex > windows[b].zIndex ? a : b);
  
  const eaglerVersions = ['1.12.2', 'Pixel Client 1.12.2', '1.8.8', 'Pixel Client 1.8.8', '1.5.2', 'b1.7.3', 'a1.2.6'];
  const iframeWindows = ['tetris', 'bb', 'piano', 'songs'];

  onMount(async () => {
    // Center main window
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = windows.main;
    w.x = Math.max(0, (vw - w.w) / 2);
    w.y = Math.max(0, (vh - w.h) / 2);
    windows = { ...windows };

    // When an iframe gains focus, bring its window to front.
    document.addEventListener('focusin', (e) => {
      if (e.target && e.target.tagName === 'IFRAME') {
        const windowDiv = e.target.closest('.window');
        if (windowDiv && windowDiv.dataset.id) {
          bringToFront(windowDiv.dataset.id);
        }
      }
    });

    // When clicking inside an iframe, bring its window to front.
    window.addEventListener('message', (e) => {
      if (e.data === 'bringToFront') {
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
          if (iframe.contentWindow === e.source) {
            const windowDiv = iframe.closest('.window');
            if (windowDiv && windowDiv.dataset.id) {
              bringToFront(windowDiv.dataset.id);
            }
            break;
          }
        }
      }
    });

    // Periodically focus the iframe of the active window if it has one
    setInterval(() => {
      if (iframeWindows.includes(activeWindow) && windows[activeWindow].open) {
        const iframe = document.querySelector(`[data-id="${activeWindow}"] iframe`);
        if (iframe && document.activeElement !== iframe) {
          iframe.contentWindow.focus();
        }
      }
    }, 100);
  });

  // --- Window Management ---
  function bringToFront(id) {
    windows[id].zIndex = ++zCounter;
    windows = { ...windows };
  }

  async function openWindow(id, e) {
    if (e) e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = windows[id];
    w.x = Math.max(0, (vw - w.w) / 2);
    w.y = Math.max(0, (vh - w.h) / 2);
    w.open = true;
    windows = { ...windows };

    bringToFront(id);
  }

  function closeWindow(id) {
    windows[id].open = false;
    windows = { ...windows };
  }

  // --- Iframe scaling ---
  let tetrisBodyEl;
  let bbBodyEl;
  let pianoBodyEl;
  const tetrisNatW = 400, tetrisNatH = 440;
  const bbNatW = 340,     bbNatH = 548;
  const pianoNatW = 900,  pianoNatH = 400;

  function scaleIframe(el, natW, natH) {
    if (!el) return;
    const iframe = el.querySelector('iframe');
    if (!iframe) return;
    const scale = Math.min(el.clientWidth / natW, el.clientHeight / natH);
    iframe.style.width = `${natW}px`;
    iframe.style.height = `${natH}px`;
    iframe.style.transform = `scale(${scale})`;
    iframe.style.transformOrigin = 'top left';
    iframe.style.marginLeft = `${(el.clientWidth  - natW * scale) / 2}px`;
    iframe.style.marginTop  = `${(el.clientHeight - natH * scale) / 2}px`;
  }

  afterUpdate(() => {
    scaleIframe(tetrisBodyEl, tetrisNatW, tetrisNatH);
    scaleIframe(bbBodyEl,     bbNatW,     bbNatH);
    scaleIframe(pianoBodyEl,  pianoNatW,  pianoNatH);
  });

  // --- Drag ---
  function startDrag(e, id) {
    if (e.target.closest('.title-bar-controls')) return;
    dragging = id;
    bringToFront(id);
    dragStart = { mx: e.clientX, my: e.clientY, wx: windows[id].x, wy: windows[id].y };
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag, { capture: true });
  }

  function onDrag(e) {
    if (!dragging) return;
    windows[dragging].x = dragStart.wx + (e.clientX - dragStart.mx);
    windows[dragging].y = dragStart.wy + (e.clientY - dragStart.my);
    windows = { ...windows };
  }

  function stopDrag() {
    dragging = null;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', stopDrag, { capture: true });
  }

  // --- Resize ---
  function startResize(e, id, dir) {
    e.preventDefault();
    e.stopPropagation();
    resizing = id;
    resizeDir = dir;
    bringToFront(id);
    const w = windows[id];
    dragStart = { mx: e.clientX, my: e.clientY, wx: w.x, wy: w.y, ww: w.w, wh: w.h };
    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', stopResize, { capture: true });
  }

  function onResize(e) {
    if (!resizing) return;
    const dx = e.clientX - dragStart.mx;
    const dy = e.clientY - dragStart.my;
    const mh = minH[resizing] ?? 150;
    const w = { ...windows[resizing] };
    if (resizeDir.includes('e')) w.w = Math.max(minW, dragStart.ww + dx);
    if (resizeDir.includes('s')) w.h = Math.max(mh,   dragStart.wh + dy);
    if (resizeDir.includes('w')) {
      const newW = Math.max(minW, dragStart.ww - dx);
      w.x = dragStart.wx + (dragStart.ww - newW);
      w.w = newW;
    }
    if (resizeDir.includes('n')) {
      const newH = Math.max(mh, dragStart.wh - dy);
      w.y = dragStart.wy + (dragStart.wh - newH);
      w.h = newH;
    }
    windows[resizing] = w;
    windows = { ...windows };
  }

  function stopResize() {
    resizing = null;
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', stopResize, { capture: true });
  }

  function closeTab() { window.close(); }
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }
</script>

{#if active}
  <div class="iframe-block"></div>
{/if}

{#if windows.main.x !== null}
<div
  class="window"
  class:active={activeWindow === 'main'}
  style="left:{windows.main.x}px; top:{windows.main.y}px; width:{windows.main.w}px; height:{windows.main.h}px; z-index:{windows.main.zIndex};"
  on:mousedown={() => bringToFront('main')}
  data-id="main"
>
  <div class="resize n"  on:mousedown={e => startResize(e, 'main', 'n')}></div>
  <div class="resize s"  on:mousedown={e => startResize(e, 'main', 's')}></div>
  <div class="resize e"  on:mousedown={e => startResize(e, 'main', 'e')}></div>
  <div class="resize w"  on:mousedown={e => startResize(e, 'main', 'w')}></div>
  <div class="resize nw" on:mousedown={e => startResize(e, 'main', 'nw')}></div>
  <div class="resize ne" on:mousedown={e => startResize(e, 'main', 'ne')}></div>
  <div class="resize sw" on:mousedown={e => startResize(e, 'main', 'sw')}></div>
  <div class="resize se" on:mousedown={e => startResize(e, 'main', 'se')}></div>
  
  <div class="title-bar" on:mousedown={e => startDrag(e, 'main')}>
    <div class="title-bar-text">Orson's Project Hub</div>
    <div class="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize" on:click={toggleFullscreen}></button>
      <button aria-label="Close" on:click={closeTab}></button>
    </div>
  </div>
  <div class="window-body has-scrollbar">
    <div class="button-grid">
      <button on:click={e => openWindow('eagler', e)}>Eaglercraft</button>
      <a href="https://notflix.studiobean.com" target="_blank" rel="noopener noreferrer"><button>Notflix</button></a>
      <button on:click={e => openWindow('tetris', e)}>Tetris</button>
      <button on:click={e => openWindow('bb', e)}>Block Blast</button>
      <button on:click={e => openWindow('piano', e)}>Piano</button>
      <button on:click={e => openWindow('songs', e)}>Piano Songs</button>
      <a href="/cheats" target="_blank" rel="noopener noreferrer"><button>Exam Feature Tester</button></a>
      <button on:click={e => openWindow('yt', e)}>Youtube 2009</button>
      <button on:click={e => openWindow('retro', e)}>Retro Games</button>
      <a href="/chat" target="_blank" rel="noopener noreferrer"><button>Chatroom</button></a>
      <a href="/unblocked" target="_blank" rel="noopener noreferrer"><button>Unblocked Games</button></a>
    </div>
  </div>
</div>
{/if}

{#if windows.eagler.open && windows.eagler.x !== null}
<div
  class="window"
  class:active={activeWindow === 'eagler'}
  style="left:{windows.eagler.x}px; top:{windows.eagler.y}px; width:{windows.eagler.w}px; height:{windows.eagler.h}px; z-index:{windows.eagler.zIndex};"
  on:mousedown={() => bringToFront('eagler')}
  data-id="eagler"
>
  <div class="resize n"  on:mousedown={e => startResize(e, 'eagler', 'n')}></div>
  <div class="resize s"  on:mousedown={e => startResize(e, 'eagler', 's')}></div>
  <div class="resize e"  on:mousedown={e => startResize(e, 'eagler', 'e')}></div>
  <div class="resize w"  on:mousedown={e => startResize(e, 'eagler', 'w')}></div>
  <div class="resize nw" on:mousedown={e => startResize(e, 'eagler', 'nw')}></div>
  <div class="resize ne" on:mousedown={e => startResize(e, 'eagler', 'ne')}></div>
  <div class="resize sw" on:mousedown={e => startResize(e, 'eagler', 'sw')}></div>
  <div class="resize se" on:mousedown={e => startResize(e, 'eagler', 'se')}></div>
  
  <div class="title-bar" on:mousedown={e => startDrag(e, 'eagler')}>
    <div class="title-bar-text">Eaglercraft</div>
    <div class="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize"></button>
      <button aria-label="Close" on:click={() => closeWindow('eagler')}></button>
    </div>
  </div>
  <div class="window-body has-scrollbar">
    <div class="button-grid">
      {#each eaglerVersions as version}
        {#if version.startsWith('Pixel Client')}
          <a href="/PixelClient_{version.replace('Pixel Client ', '')}.html" target="_blank" rel="noopener noreferrer">
            <button>{version}</button>
          </a>
        {:else}
          <a href="/Eaglercraft_{version}.html" target="_blank" rel="noopener noreferrer">
            <button>{version}</button>
          </a>
        {/if}
      {/each}
    </div>
  </div>
</div>
{/if}

{#if windows.tetris.open && windows.tetris.x !== null}
<div
  class="window"
  class:active={activeWindow === 'tetris'}
  style="left:{windows.tetris.x}px; top:{windows.tetris.y}px; width:{windows.tetris.w}px; height:{windows.tetris.h}px; z-index:{windows.tetris.zIndex};"
  on:mousedown={() => bringToFront('tetris')}
  data-id="tetris"
>
  <div class="resize n"  on:mousedown={e => startResize(e, 'tetris', 'n')}></div>
  <div class="resize s"  on:mousedown={e => startResize(e, 'tetris', 's')}></div>
  <div class="resize e"  on:mousedown={e => startResize(e, 'tetris', 'e')}></div>
  <div class="resize w"  on:mousedown={e => startResize(e, 'tetris', 'w')}></div>
  <div class="resize nw" on:mousedown={e => startResize(e, 'tetris', 'nw')}></div>
  <div class="resize ne" on:mousedown={e => startResize(e, 'tetris', 'ne')}></div>
  <div class="resize sw" on:mousedown={e => startResize(e, 'tetris', 'sw')}></div>
  <div class="resize se" on:mousedown={e => startResize(e, 'tetris', 'se')}></div>
  
  <div class="title-bar" on:mousedown={e => startDrag(e, 'tetris')}>
    <div class="title-bar-text">Tetris</div>
    <div class="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize" on:click={() => window.open('/tetris.html', '_blank')}></button>
      <button aria-label="Close" on:click={() => closeWindow('tetris')}></button>
    </div>
  </div>
  <div class="window-body has-scrollbar" style="padding:0; overflow:hidden; background:#1a1b1c;" bind:this={tetrisBodyEl}>
    <iframe
      src="/tetris.html"
      title="Tetris"
      style="border:none; display:block;"
      on:load={() => scaleIframe(tetrisBodyEl, tetrisNatW, tetrisNatH)}
    ></iframe>
  </div>
</div>
{/if}

{#if windows.bb.open && windows.bb.x !== null}
<div
  class="window"
  class:active={activeWindow === 'bb'}
  style="left:{windows.bb.x}px; top:{windows.bb.y}px; width:{windows.bb.w}px; height:{windows.bb.h}px; z-index:{windows.bb.zIndex};"
  on:mousedown={() => bringToFront('bb')}
  data-id="bb"
>
  <div class="resize n"  on:mousedown={e => startResize(e, 'bb', 'n')}></div>
  <div class="resize s"  on:mousedown={e => startResize(e, 'bb', 's')}></div>
  <div class="resize e"  on:mousedown={e => startResize(e, 'bb', 'e')}></div>
  <div class="resize w"  on:mousedown={e => startResize(e, 'bb', 'w')}></div>
  <div class="resize nw" on:mousedown={e => startResize(e, 'bb', 'nw')}></div>
  <div class="resize ne" on:mousedown={e => startResize(e, 'bb', 'ne')}></div>
  <div class="resize sw" on:mousedown={e => startResize(e, 'bb', 'sw')}></div>
  <div class="resize se" on:mousedown={e => startResize(e, 'bb', 'se')}></div>
  
  <div class="title-bar" on:mousedown={e => startDrag(e, 'bb')}>
    <div class="title-bar-text">Block Blast</div>
    <div class="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize" on:click={() => window.open('/bb.html', '_blank')}></button>
      <button aria-label="Close" on:click={() => closeWindow('bb')}></button>
    </div>
  </div>
  <div class="window-body has-scrollbar" style="padding:0; overflow:hidden; background:#1a1b1c;" bind:this={bbBodyEl}>
    <iframe
      src="/bb.html"
      title="Block Blast"
      style="border:none; display:block;"
      on:load={() => scaleIframe(bbBodyEl, bbNatW, bbNatH)}
    ></iframe>
  </div>
</div>
{/if}

{#if windows.piano.open && windows.piano.x !== null}
<div
  class="window"
  class:active={activeWindow === 'piano'}
  style="left:{windows.piano.x}px; top:{windows.piano.y}px; width:{windows.piano.w}px; height:{windows.piano.h}px; z-index:{windows.piano.zIndex};"
  on:mousedown={() => bringToFront('piano')}
  data-id="piano"
>
  <div class="resize n"  on:mousedown={e => startResize(e, 'piano', 'n')}></div>
  <div class="resize s"  on:mousedown={e => startResize(e, 'piano', 's')}></div>
  <div class="resize e"  on:mousedown={e => startResize(e, 'piano', 'e')}></div>
  <div class="resize w"  on:mousedown={e => startResize(e, 'piano', 'w')}></div>
  <div class="resize nw" on:mousedown={e => startResize(e, 'piano', 'nw')}></div>
  <div class="resize ne" on:mousedown={e => startResize(e, 'piano', 'ne')}></div>
  <div class="resize sw" on:mousedown={e => startResize(e, 'piano', 'sw')}></div>
  <div class="resize se" on:mousedown={e => startResize(e, 'piano', 'se')}></div>
  
  <div class="title-bar" on:mousedown={e => startDrag(e, 'piano')}>
    <div class="title-bar-text">Piano</div>
    <div class="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize" on:click={() => window.open('/piano.html', '_blank')}></button>
      <button aria-label="Close" on:click={() => closeWindow('piano')}></button>
    </div>
  </div>
  <div class="window-body has-scrollbar" style="padding:0; overflow:hidden; background:#1a1b1c;" bind:this={pianoBodyEl}>
    <iframe
      src="/piano.html"
      title="Piano"
      style="border:none; display:block;"
      on:load={() => scaleIframe(pianoBodyEl, pianoNatW, pianoNatH)}
    ></iframe>
  </div>
</div>
{/if}

{#if windows.songs.open && windows.songs.x !== null}
<div
  class="window"
  class:active={activeWindow === 'songs'}
  style="left:{windows.songs.x}px; top:{windows.songs.y}px; width:{windows.songs.w}px; height:{windows.songs.h}px; z-index:{windows.songs.zIndex};"
  on:mousedown={() => bringToFront('songs')}
  data-id="songs"
>
  <div class="resize n"  on:mousedown={e => startResize(e, 'songs', 'n')}></div>
  <div class="resize s"  on:mousedown={e => startResize(e, 'songs', 's')}></div>
  <div class="resize e"  on:mousedown={e => startResize(e, 'songs', 'e')}></div>
  <div class="resize w"  on:mousedown={e => startResize(e, 'songs', 'w')}></div>
  <div class="resize nw" on:mousedown={e => startResize(e, 'songs', 'nw')}></div>
  <div class="resize ne" on:mousedown={e => startResize(e, 'songs', 'ne')}></div>
  <div class="resize sw" on:mousedown={e => startResize(e, 'songs', 'sw')}></div>
  <div class="resize se" on:mousedown={e => startResize(e, 'songs', 'se')}></div>
  
  <div class="title-bar" on:mousedown={e => startDrag(e, 'songs')}>
    <div class="title-bar-text">Piano Songs</div>
    <div class="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize"></button>
      <button aria-label="Close" on:click={() => closeWindow('songs')}></button>
    </div>
  </div>
  <div class="window-body has-scrollbar" style="padding:0; overflow:hidden;">
    <iframe
      src="/songs.html"
      title="Piano Songs"
      style="border:none; display:block; width:100%; height:100%; background:white;"
    ></iframe>
  </div>
</div>
{/if}

{#if windows.yt.open && windows.yt.x !== null}
<div
  class="window"
  class:active={activeWindow === 'yt'}
  style="left:{windows.yt.x}px; top:{windows.yt.y}px; width:{windows.yt.w}px; height:{windows.yt.h}px; z-index:{windows.yt.zIndex};"
  on:mousedown={() => bringToFront('yt')}
  data-id="yt"
>
  <div class="resize n"  on:mousedown={e => startResize(e, 'yt', 'n')}></div>
  <div class="resize s"  on:mousedown={e => startResize(e, 'yt', 's')}></div>
  <div class="resize e"  on:mousedown={e => startResize(e, 'yt', 'e')}></div>
  <div class="resize w"  on:mousedown={e => startResize(e, 'yt', 'w')}></div>
  <div class="resize nw" on:mousedown={e => startResize(e, 'yt', 'nw')}></div>
  <div class="resize ne" on:mousedown={e => startResize(e, 'yt', 'ne')}></div>
  <div class="resize sw" on:mousedown={e => startResize(e, 'yt', 'sw')}></div>
  <div class="resize se" on:mousedown={e => startResize(e, 'yt', 'se')}></div>
  
  <div class="title-bar" on:mousedown={e => startDrag(e, 'yt')}>
    <div class="title-bar-text">YouTube</div>
    <div class="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize" on:click={() => window.open('https://youtube.studiobean.com/', '_blank')}></button>
      <button aria-label="Close" on:click={() => closeWindow('yt')}></button>
    </div>
  </div>
  <div class="window-body has-scrollbar" style="padding:0; overflow:hidden;">
    <iframe
      src="https://yt.studiobean.com/"
      title="YouTube"
      style="border:none; display:block; width:100%; height:100%; background:white;"
    ></iframe>
  </div>
</div>
{/if}

{#if windows.retro.open && windows.retro.x !== null}
<div
  class="window"
  class:active={activeWindow === 'retro'}
  style="left:{windows.retro.x}px; top:{windows.retro.y}px; width:{windows.retro.w}px; height:{windows.retro.h}px; z-index:{windows.retro.zIndex};"
  on:mousedown={() => bringToFront('retro')}
  data-id="retro"
>
  <div class="resize n"  on:mousedown={e => startResize(e, 'retro', 'n')}></div>
  <div class="resize s"  on:mousedown={e => startResize(e, 'retro', 's')}></div>
  <div class="resize e"  on:mousedown={e => startResize(e, 'retro', 'e')}></div>
  <div class="resize w"  on:mousedown={e => startResize(e, 'retro', 'w')}></div>
  <div class="resize nw" on:mousedown={e => startResize(e, 'retro', 'nw')}></div>
  <div class="resize ne" on:mousedown={e => startResize(e, 'retro', 'ne')}></div>
  <div class="resize sw" on:mousedown={e => startResize(e, 'retro', 'sw')}></div>
  <div class="resize se" on:mousedown={e => startResize(e, 'retro', 'se')}></div>
  
  <div class="title-bar" on:mousedown={e => startDrag(e, 'retro')}>
    <div class="title-bar-text">Retro Games</div>
    <div class="title-bar-controls">
      <button aria-label="Minimize"></button>
      <button aria-label="Maximize"></button>
      <button aria-label="Close" on:click={() => closeWindow('retro')}></button>
    </div>
  </div>
  <div class="window-body has-scrollbar">
    <div class="button-grid">
      <a href="/sm64.html" target="_blank" rel="noopener noreferrer"><button>Super Mario 64</button></a>
      <a href="/sm64/index.html" target="_blank" rel="noopener noreferrer"><button>SM64 PC (Unstable)</button></a>
      <a href="/donkeykong.html" target="_blank" rel="noopener noreferrer"><button>Donkey Kong</button></a>
      <a href="/dk64.html" target="_blank" rel="noopener noreferrer"><button>Donkey Kong 64</button></a>
      <a href="/supermk.html" target="_blank" rel="noopener noreferrer"><button>Super Mario Kart</button></a>
      <a href="/mk64.html" target="_blank" rel="noopener noreferrer"><button>Mario Kart 64</button></a>
      <a href="/mksc.html" target="_blank" rel="noopener noreferrer"><button>MK: Super Circuit</button></a>
      <a href="/mkds.html" target="_blank" rel="noopener noreferrer"><button>Mario Kart DS</button></a>
      <a href="/sm64ds.html" target="_blank" rel="noopener noreferrer"><button>Super Mario 64 DS</button></a>
      <a href="/tloz.html" target="_blank" rel="noopener noreferrer"><button>The Legend of Zelda</button></a>
      <a href="/tlozoot.html" target="_blank" rel="noopener noreferrer"><button>Ocarina of Time</button></a>
      <a href="/tlozmm.html" target="_blank" rel="noopener noreferrer"><button>TLOZ Majora's Mask</button></a>
      <a href="/smb.html" target="_blank" rel="noopener noreferrer"><button>Super Mario Bros.</button></a>
      <a href="/smw.html" target="_blank" rel="noopener noreferrer"><button>Super Mario World</button></a>
    </div>
  </div>
</div>
{/if}

<div style="display: none;">
  <iframe src="/tetris.html"></iframe>
  <iframe src="/bb.html"></iframe>
  <iframe src="/piano.html"></iframe>
  <iframe src="/songs.html"></iframe>
</div>

<style>
  :global(body) {
    margin: 0;
    background: url('/wallpaper.png') center center / cover no-repeat;
    position: relative;
    min-height: 100vh;
    overflow: hidden;
  }
  .window {
    position: fixed;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    min-width: 240px;
    min-height: 150px;
    user-select: none;
  }
  .title-bar {
    flex: 0 0 auto;
  }
  .window-body {
    flex: 1 1 auto;
    padding: 8px;
    box-sizing: border-box;
    overflow: auto;
  }
  .button-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .button-grid button {
    width: 100%;
    min-height: 40px;
  }
  .iframe-block {
    position: fixed;
    inset: 0;
    z-index: 9999;
    cursor: inherit;
  }
  .resize {
    position: absolute;
    z-index: 10;
  }
  .resize.n  { top: -4px;    left: 8px;    right: 8px;   height: 8px;  cursor: n-resize; }
  .resize.s  { bottom: -4px; left: 8px;    right: 8px;   height: 8px;  cursor: s-resize; }
  .resize.e  { right: -4px;  top: 8px;     bottom: 8px;  width: 8px;   cursor: e-resize; }
  .resize.w  { left: -4px;   top: 8px;     bottom: 8px;  width: 8px;   cursor: w-resize; }
  .resize.nw { top: -4px;    left: -4px;   width: 12px;  height: 12px; cursor: nw-resize; }
  .resize.ne { top: -4px;    right: -4px;  width: 12px;  height: 12px; cursor: ne-resize; }
  .resize.sw { bottom: -4px; left: -4px;   width: 12px;  height: 12px; cursor: sw-resize; }
  .resize.se { bottom: -4px; right: -4px;  width: 12px;  height: 12px; cursor: se-resize; }
</style>