<header class="page-header">
  <img src="/static/assets/notflix.png" alt="Notflix" on:click={resetIframe}>
</header>

<iframe src="https://studiobean.com:8920/" class="full-page" bind:this={iframe}></iframe>

<script lang="ts">
  let iframe: HTMLIFrameElement;

  function resetIframe() {
    if (iframe) {
      iframe.src = "http://studiobean.com:8099/web/#/home.html";
    }
  }
</script>

<style>
  .page-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 75px;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1rem;
    z-index: 10;
  }

  .page-header img {
    max-height: 100%;
    width: auto;
    object-fit: contain;
    cursor: pointer;
  }

  .full-page {
    position: fixed;
    top: 75px;
    left: 0;
    width: 100vw;
    height: calc(100vh - 75px);
    border: none;
  }
</style>
