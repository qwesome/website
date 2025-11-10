<script>
  let iframe;
</script>

<iframe src="focus-app.html" title="Focus App" allowfullscreen class="full-page" bind:this={iframe}></iframe>

<style>
  :global(html), :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    height: 100%;
    width: 100%;
  }

  .full-page {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    border: none;
    display: block;
  }
</style>