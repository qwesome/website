<header class="page-header">
  <img src="/notflix.png" alt="Notflix" on:click={refreshPage}>
</header>

<iframe src="https://studiobean.com:8920/" title="Notflix" allowfullscreen class="full-page" bind:this={iframe}></iframe>

<script lang="ts">
  let iframe: HTMLIFrameElement;

  function refreshPage() {
    location.reload();
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

  @media (prefers-color-scheme: light) {
    .grid button {
      border: 2px solid rgb(30, 32, 37);
      background: linear-gradient(to bottom, #ed99fd, #e94fd4);
      color: #000000;
    }

    :global(body) {
      background: url('/background-inverted.png') center center / cover no-repeat;
    }
  }
</style>
