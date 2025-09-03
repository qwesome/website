<div class="overlay"></div>
<div class="content">
  <h1>Tetris</h1>
  <iframe title="Tetris" src="/tetris.html" autofocus="true"
  width="800" height="600" style="border: ;"></iframe>
</div>

<style>
  :global(html), :global(body) {
    overflow: hidden;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  :global(body) {
    zoom: 1.15;
    background: url('/background.png') center center / cover no-repeat;
    position: relative;
    min-height: 100vh;
  }
  .overlay {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 0;
    background: linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgb(23,33,49) 100%);
  }
  .content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }

iframe {
    border: 4px solid #DF11B2;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(240, 0, 188, 0.2);
}

  @media (prefers-color-scheme: light) {
:global(body) {
  background: url('/background-inverted.png') center center / cover no-repeat;
}
.overlay {
  background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgb(252, 243, 255) 100%);
}
iframe {
    border: 4px solid #f066d2;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(240, 0, 188, 0.2);
}

}
</style>
