<script lang="ts">
  import { onMount } from 'svelte';
  import { clickOutside } from '../../actions/clickOutside';
  import { focusOnMount } from '../../actions/focusOnMount';
  import { loadEmojis, categoryLabel, type EmojiData, type EmojiEntry } from '../../api/emoji';

  let {
    onpick,
    onclose,
    inline = false,
    closeOnPick = true
  }: {
    onpick: (char: string) => void;
    onclose?: () => void;
    /** Rendered as a static block (embedded) instead of a floating panel. */
    inline?: boolean;
    /** Close after picking; shift-click always keeps the picker open. */
    closeOnPick?: boolean;
  } = $props();

  let data = $state<EmojiData | null>(null);
  let query = $state('');
  let activeCat = $state('');
  let scrollRef = $state<HTMLDivElement | null>(null);

  const filtered = $derived.by<EmojiEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q || !data) return [];
    return data.all.filter((e) => e.name.includes(q) || e.short.includes(q)).slice(0, 160);
  });

  onMount(() => {
    let alive = true;
    loadEmojis().then((d) => {
      if (!alive) return;
      data = d;
      activeCat = d.categories[0] ?? '';
    });
    return () => {
      alive = false;
    };
  });

  function pick(e: MouseEvent, char: string) {
    onpick(char);
    if (closeOnPick && !e.shiftKey) onclose?.();
  }

  function jump(cat: string) {
    activeCat = cat;
    const el = scrollRef?.querySelector<HTMLElement>(`[data-cat="${CSS.escape(cat)}"]`);
    if (el && scrollRef) scrollRef.scrollTop = Math.max(0, el.offsetTop - 6);
  }
</script>

<div class="emoji-picker" class:inline use:clickOutside={{ onoutside: () => !inline && onclose?.(), ignore: '.emoji-btn' }}>
  <div class="emoji-header">
    <input
      type="text"
      placeholder="Search emoji…"
      bind:value={query}
      spellcheck="false"
      autocomplete="off"
      use:focusOnMount={!inline}
    />
  </div>

  {#if query.trim()}
    <div class="emoji-scroll" bind:this={scrollRef}>
      {#if filtered.length > 0}
        <div class="emoji-grid">
          {#each filtered as e (e.char)}
            <button type="button" class="emoji" title={e.name || e.char} onclick={(ev) => pick(ev, e.char)}>{e.char}</button>
          {/each}
        </div>
      {:else}
        <p class="emoji-status">no emoji match “{query.trim()}”</p>
      {/if}
    </div>
  {:else if !data}
    <p class="emoji-status">loading emoji…</p>
  {:else}
    <div class="emoji-cats">
      {#each data.categories as cat (cat)}
        <button type="button" class="cat" class:active={activeCat === cat} title={categoryLabel(cat)} onclick={() => jump(cat)}>
          {data.byCategory[cat][0]?.char ?? '•'}
        </button>
      {/each}
    </div>

    <div class="emoji-scroll" bind:this={scrollRef}>
      {#each data.categories as cat (cat)}
        <section class="cat-section" data-cat={cat}>
          <div class="cat-label">{categoryLabel(cat)}</div>
          <div class="emoji-grid">
            {#each data.byCategory[cat] as e (e.char)}
              <button type="button" class="emoji" title={e.name || e.char} onclick={(ev) => pick(ev, e.char)}>{e.char}</button>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .emoji-picker { position: absolute; bottom: calc(100% - 10px); right: 24px; width: min(340px, calc(100% - 48px)); height: 360px; background: var(--mantle); border: 1px solid var(--surface0); border-radius: var(--r-sm); margin-bottom: 10px; display: flex; flex-direction: column; box-shadow: var(--shadow-menu); z-index: 100; overflow: hidden; }
  .emoji-picker.inline { position: static; width: 100%; height: 100%; margin: 0; border-radius: var(--r-sm); box-shadow: none; }
  .emoji-header { display: flex; padding: 10px; background: var(--crust); border-bottom: 1px solid var(--surface0); flex-shrink: 0; }
  .emoji-header input { all: unset; flex: 1; background: var(--mantle); color: var(--text); padding: 6px 10px; border-radius: 4px; font-size: 13px; border: 1px solid var(--surface0); user-select: text; cursor: text; }
  .emoji-header input:focus { border-color: var(--accent); }
  .emoji-cats { display: flex; gap: 2px; padding: 6px 8px; border-bottom: 1px solid var(--surface0); overflow-x: auto; scrollbar-width: none; flex-shrink: 0; }
  .emoji-cats::-webkit-scrollbar { display: none; }
  .cat { all: unset; cursor: pointer; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; border-radius: var(--r-xs); flex-shrink: 0; opacity: 0.6; }
  .cat:hover { background: var(--surface0); opacity: 1; }
  .cat.active { background: color-mix(in srgb, var(--accent) 24%, transparent); opacity: 1; }
  .emoji-scroll { position: relative; flex: 1; overflow-y: auto; padding: 4px 6px 10px; scrollbar-width: thin; scrollbar-color: var(--surface2) transparent; }
  .cat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--surface2); padding: 12px 6px 4px; position: sticky; top: 0; background: var(--mantle); }
  .emoji-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 1px; }
  .emoji { all: unset; cursor: pointer; aspect-ratio: 1; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; line-height: 1; border-radius: var(--r-xs); }
  .emoji:hover { background: var(--surface0); }
  .emoji-status { margin: 0; padding: 24px 12px; text-align: center; color: var(--overlay0); font-size: 12px; }
</style>
