<div class="overlay"></div>
<div class="content-wrapper">
  <div class="content">
    <h1>Retro Games</h1>
    <div class="grid">
      <a href="/sm64"><button>Super Mario 64</button></a>
      <a href="/sm64native"><button>SM64 PC (Unstable)</button></a>
      <a href="/donkeykong"><button>Donkey Kong</button></a>
      <a href="/dk64"><button>Donkey Kong 64</button></a>
      <a href="/supermk"><button>Super Mario Kart</button></a>
      <a href="/mk64"><button>Mario Kart 64</button></a>
      <a href="/mksc"><button>MK: Super Circuit</button></a>
      <a href="/mkds"><button>Mario Kart DS</button></a>
      <a href="/sm64ds"><button>Super Mario 64 DS</button></a>
      <a href="/tloz"><button>The Legend of Zelda</button></a>
      <a href="/tlozoot"><button>Ocarina of Time</button></a>
      <a href="/tlozmm"><button>TLOZ Majora's Mask</button></a>
      <a href="/smb"><button>Super Mario Bros.</button></a>
      <a href="/smw"><button>Super Mario World</button></a>
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
