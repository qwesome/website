<div class="overlay"></div>
<div class="content">
  <h1>Piano</h1>
  <iframe title="Piano" src="/piano.html" autofocus="true"></iframe>
</div>

<a href="/songs.html" target="_blank" rel="noopener noreferrer" class="songs-btn">
  <button>Songs</button>
</a>

<style>
:global(html), :global(body) {
  overflow: hidden;
  height: 100%;
  margin: 0;
  padding: 0;
}

:global(body) {
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
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  text-align: center;
  gap: 1rem;
}

iframe {
  width: min(100vw, 900px);
  height: min(70vh, 600px);
  border: 4px solid #DF11B2;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(240, 0, 188, 0.2);
}

.songs-btn {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 100;
    text-decoration: none;
}

.songs-btn button {
    padding: .5rem;
    font-size: 1.1rem;
    border-radius: 8px;
    border: 2px solid rgb(180, 190, 214);
    background: linear-gradient(to bottom, #781461, #220443);
    color: #fff;
    cursor: pointer;
    transition: background 0.3s;
}

.songs-btn button:hover {
    background: linear-gradient(to bottom, #781461, #9b1c6a);
    font-weight: bold;
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
