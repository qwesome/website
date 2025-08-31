<div class="overlay"></div>
<div class="content">
  <h1>Orson's Project Hub</h1>
  <h3>If you came across here by mistake, no you didn't.</h3>

  <div class="grid">
    <button on:click={() => window.location.href = '/mcserver'}>
      Minecraft Server
    </button>
    <button on:click={() => window.location.href = '/mcbeta'}>
      Beta Server
    </button>
    <button on:click={() => window.location.href = '/notflix'}>
      Notflix
    </button>
    <button>Test</button>
    <button>Test</button>
    <button>Test</button>
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
    zoom: 1.15;
    background: url('/src/lib/assets/background.png') center center / cover no-repeat;
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
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    max-width: 400px;
    margin: 2rem auto;
  }
  button {
    padding: 1.2rem;
    font-size: 1.1rem;
    border-radius: 8px;
    border: 2px solid rgb(180, 190, 214);
    background: linear-gradient(to bottom, #781461, #220443);
    cursor: pointer;
    transition: background 0.3s;
  }
  button:hover {
    background: linear-gradient(to bottom, #781461, #781461);
    font-weight: bold;
  }
</style>