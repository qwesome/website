<div class="overlay"></div>
<div class="content">
  <h1>Minecraft Server</h1>
<div class="info-box">
  <h3>WHITELIST IS ENABLED!</h3>
  <h2>Join the discord for more information: 
    <a href="https://discord.gg/y6tKHZpQPR" target="_blank" rel="noopener noreferrer">
      https://discord.gg/y6tKHZpQPR
    </a>
  </h2>

  <p>
    IP: <span id="server-ip">studiobean.com</span>
    <button class="copy-btn" on:click={copyToClipboard} aria-label="Copy to clipboard">Copy</button>
    Bedrock Port: 19132
  </p>

  <div class="flex-row">
    <p>This server is intended to have a slower progress rate, limiting features from in-game for specific times. Features integration with Simple Voice Chat, Xaero's maps, and more. This server is intended for friends and not for public connections, hosted in New Zealand from a home server. The seed is 2998251340611620110. To join on console (or as an alternative on any bedrock platform), add the user "qwesomeconnect" as an Xbox friend, and join their world.</p>

    <div class="carousel">
      <button on:click={prevImage}>&lt;</button>
      <img src={images[current]} alt="Carousel Image">
      <button on:click={nextImage}>&gt;</button>
    </div>
  </div>
</div>
</div>

{#if copied}
  <div class="copied-overlay" key={overlayKey}>
    Copied to clipboard!
  </div>
{/if}

<script lang="ts">
  let copied = false;
  let overlayKey = 0;

  function copyToClipboard() {
    navigator.clipboard.writeText('studiobean.com');
    copied = false;
    overlayKey += 1;
    copied = true;
    setTimeout(() => copied = false, 1500);
  }

  let images = [
    '/src/carousel/mcserver/01.png',
    '/src/carousel/mcserver/02.png',
    '/src/carousel/mcserver/03.png',
    '/src/carousel/mcserver/04.png'
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
.flex-row {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.flex-row p {
  flex: 1;
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
    background: linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgb(23,33,49) 100%);
  }
  .content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .info-box {
    margin-top: 2rem;
    width: 75vw;
    background: rgba(27, 1, 54, 0.3);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    border: 2px solid rgb(180, 190, 214);
    box-shadow: 0 4px 32px rgba(0,0,0,0.3);
    padding: 2rem 2rem 0% 2rem;
    color: #ffffff;
    font-size: 1.2rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;    
    line-height: 1.5;
    min-height: 60vh;
    .info-box h2, .info-box h3, .info-box p {
      margin: 0.2rem 0;
      padding: 0;
      text-align: center;
    }
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
  }
  .copy-btn {
    padding: 0.2rem 0.4rem;
    font-size: 1.1rem;
    border-radius: 8px;
    border: 2px solid rgb(180, 190, 214);
    background: linear-gradient(to bottom, #781461, #220443);
    color: #fff;
    cursor: pointer;
    vertical-align: middle;
  }
  .copy-btn:hover {
    background: linear-gradient(to bottom, #781461, #9b1c6a);
    font-weight: bold;
  }
  .copy-text {
    font-size: 1.1rem;
    user-select: none;
    transition: font-weight 0.2s;
    vertical-align: middle;
  }
  .copy-text:active {
    font-weight: bold;
  }
  .copied-overlay {
    position: fixed;
    top: 10%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(34, 4, 67, 0.95);
    color: #fff;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-size: 1.3rem;
    font-weight: bold;
    z-index: 9999;
    box-shadow: 0 4px 32px rgba(0,0,0,0.3);
    animation: fadeInOut 1.5s;
    pointer-events: none;
  }
  @keyframes fadeInOut {
    0% { opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { opacity: 0; }
  }
</style>