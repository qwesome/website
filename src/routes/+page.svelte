<div class="overlay"></div>
<div class="content-wrapper">
  <div class="content">
    <h1>Orson's Project Hub</h1>
    <h3>If you came across here by mistake, no you didn't.</h3>

    <div class="grid">
      <a href="/mcserver"><button>Minecraft Server</button></a>
      <a href="/mcbeta"><button>Beta Server</button></a>
      <a href="/notflix"><button>Notflix</button></a>
      <a href="/tetris"><button>Tetris</button></a>
      <a href="/test2"><button>Test</button></a>
      <a href="/test3"><button>Test</button></a>
    </div>
  </div>
</div>

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

.content-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  text-align: center;
  transform: scale(1.15);
  transform-origin: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  max-width: 420px;
  margin: 2rem auto;
}

.grid a {
  text-decoration: none;
}

.grid button {
  width: 200px;
  padding: 1rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 2px solid rgb(180, 190, 214);
  background: linear-gradient(to bottom, #781461, #220443);
  color: #fff;
  cursor: pointer;
  transition: none;
}

.grid button:hover {
  background: linear-gradient(to bottom, #781461, #9b1c6a);
  font-weight: bold;
}

@media (prefers-color-scheme: light) {
  .grid button {
    border: 2px solid rgb(30, 32, 37);
    background: linear-gradient(to bottom, #ed99fd, #e94fd4);
    color: #000000;
  }

  .grid button:hover {
    background: linear-gradient(to bottom, #c23cb0, #e94fd4);
    font-weight: bold;
  }

  :global(body) {
    background: url('/background-inverted.png') center center / cover no-repeat;
  }

  .overlay {
    background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgb(252, 243, 255) 100%);
  }
}
</style>
