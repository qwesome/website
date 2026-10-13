<script lang="ts">
  // [name width %, text width %] per placeholder message
  const rows = [
    [22, 60],
    [18, 40],
    [26, 75],
    [20, 35],
    [24, 55]
  ];
</script>

<div class="sk" role="status" aria-busy="true" aria-label="Loading chat">
  <aside class="side">
    <div class="bar" style="width: 60%; height: 14px"></div>
    <div class="bar" style="width: 35%; height: 10px; margin-top: 14px"></div>
    <div class="bar" style="width: 70%; height: 14px"></div>
    <div class="bar" style="width: 35%; height: 10px; margin-top: 14px"></div>
    <div class="bar" style="width: 55%; height: 14px"></div>
    <div class="bar" style="width: 65%; height: 14px"></div>
    <div class="bar" style="width: 45%; height: 14px"></div>
  </aside>

  <div class="main">
    <div class="head"><div class="bar" style="width: 120px; height: 16px"></div></div>
    <div class="msgs">
      {#each rows as [name, text]}
        <div class="row">
          <div class="bar avatar"></div>
          <div class="col">
            <div class="bar" style="width: {name}%; height: 12px"></div>
            <div class="bar" style="width: {text}%; height: 36px"></div>
          </div>
        </div>
      {/each}
    </div>
    <div class="input"><div class="bar" style="width: 100%; height: 50px; border-radius: 8px"></div></div>
  </div>
</div>

<style>
  .sk { position: absolute; inset: 0; z-index: 100; display: flex; background: var(--base); }
  .side { width: 240px; flex-shrink: 0; background: var(--mantle); border-right: 1px solid var(--surface0); padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .head { padding: 16px 24px; border-bottom: 1px solid var(--surface0); }
  .msgs { flex: 1; padding: 20px 24px; display: flex; flex-direction: column; justify-content: flex-end; gap: 22px; overflow: hidden; }
  .row { display: flex; gap: 14px; }
  .col { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .avatar { width: 36px; height: 36px; flex-shrink: 0; border-radius: 6px; }
  .input { padding: 15px 24px 20px; }

  .bar {
    border-radius: 4px;
    background: linear-gradient(90deg, var(--surface0) 25%, var(--surface1) 37%, var(--surface0) 63%);
    background-size: 400% 100%;
    animation: shimmer 1.4s ease infinite;
  }
  @keyframes shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
  }
  @media (max-width: 768px) {
    .side { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bar { animation: none; }
  }
</style>