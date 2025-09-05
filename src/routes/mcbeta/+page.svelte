<div class="overlay"></div>
<div class="content">
  <h1>Minecraft Beta 1.7.3 Server</h1>
  <div class="info-box">
    <p>
      IP: studiobean.com:8374<br>
      Version: Beta 1.7.3
    </p>
    <p>
      <a href="/Eaglercraft.html">Play Online</a> ~
      <a href="/Eaglercraft.html" download="Eaglercraft_b1.7.3.html">HTML Download</a>
    </p>
    <div class="flex-row">
      <p>
        This server is in the Beta 1.7.3 version of the game, accessible through the default
        Minecraft launcher via enabling the setting "Show historical versions of Minecraft:
        Java Edition in the Launcher". Using the JVM argument "-Dhttp.proxyHost=betacraft.uk
        -Dhttp.proxyPort=11705" allows you to see skins of users, or you can use the Betacraft
        launcher. <br><br>
        To join from Eaglercraft (web browser), join "ws://studiobean.com:8008/".
      </p>
      <div class="carousel">
        <button on:click={prevImage}>&lt;</button>
        <img src={images[current]} alt="Carousel">
        <button on:click={nextImage}>&gt;</button>
      </div>
    </div>
  </div>
</div>

<script lang="ts">
  let images = [
    '/carousel/mcbeta/01.png',
    '/carousel/mcbeta/02.png',
    '/carousel/mcbeta/03.png',
    '/carousel/mcbeta/04.png'
  ];
  let current = 0;

  function nextImage() {
    current = (current + 1) % images.length;
  }

  function prevImage() {
    current = (current - 1 + images.length) % images.length;
  }
</script>

<style>
:global(html), :global(body) {
  overflow: hidden;
  height: 100%;
  margin: 0;
  padding: 0;
}

:global(body) {
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
  background: linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgb(23,33,49) 100%);
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

.info-box {
  margin-top: 2rem;
  width: 75vw;
  max-width: 1000px;
  background: rgba(27, 1, 54, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 2px solid rgb(180, 190, 214);
  box-shadow: 0 4px 32px rgba(0,0,0,0.3);
  padding: 2rem;
  color: #ffffff;
  font-size: 1.2rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;    
  line-height: 1.5;
  min-height: 60vh;
}

.flex-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
}

.flex-row p {
  flex: 1;
  min-width: 250px;
  text-align: left;
}

.carousel {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

.carousel img {
  width: 300px;
  height: 200px;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid rgb(180, 190, 214);
}

.carousel button {
  padding: 0.5rem 1rem;
  font-size: 1.2rem;
  cursor: pointer;
}

button {
  padding: 1.2rem;
  font-size: 1.1rem;
  border-radius: 8px;
  border: 2px solid rgb(180, 190, 214);
  background: linear-gradient(to bottom, #781461, #220443);
  color: #ffffff;
  cursor: pointer;
  transition: background 0.3s;
}

button:hover {
  background: linear-gradient(to bottom, #781461, #781461);
}

@media (prefers-color-scheme: light) {
  :global(body) {
    background: url('/background-inverted.png') center center / cover no-repeat;
  }

  .overlay {
    background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgb(252, 243, 255) 100%);
  }

  button {
    border: 2px solid rgb(30, 32, 37);
    background: linear-gradient(to bottom, #ed99fd, #e94fd4);
    color: #000000;
  }

  button:hover {
    background: linear-gradient(to bottom, #c23cb0, #e94fd4);
    font-weight: bold;
  }

  p {
    color: #000000;
  }

  .info-box {
    background: rgba(220, 193, 248, 0.3);
    color: #000000;
  }
}
</style>
