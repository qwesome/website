<script lang="ts">
  import { appearance } from '../../state/appearance.svelte';
  import { toast } from '../../state/toasts.svelte';
  import { getTheme, resolveThemeTokens } from '../../themes';
  import { exportThemeToString } from '../../themes/codec';
  import type { CustomTheme, ThemeMode, ThemeTokens } from '../../themes/types';
  import Icon from '../ui/Icon.svelte';

  // Keys the maker exposes as colour pickers. hoverTint/cardShadow are derived
  // from the mode instead (they are rgba overlays, not hex swatches).
  const COLOR_KEYS: { key: keyof ThemeTokens; label: string }[] = [
    { key: 'crust', label: 'crust' },
    { key: 'mantle', label: 'mantle' },
    { key: 'base', label: 'base' },
    { key: 'surface0', label: 'surface 0' },
    { key: 'surface1', label: 'surface 1' },
    { key: 'surface2', label: 'surface 2' },
    { key: 'overlay0', label: 'overlay 0' },
    { key: 'overlay1', label: 'overlay 1' },
    { key: 'subtext0', label: 'subtext' },
    { key: 'text', label: 'text' },
    { key: 'red', label: 'red' },
    { key: 'green', label: 'green' },
    { key: 'yellow', label: 'yellow' },
    { key: 'pink', label: 'pink' },
    { key: 'blue', label: 'blue' }
  ];

  function colorsFrom(theme: ReturnType<typeof getTheme>): ThemeTokens {
    return { ...theme.tokens };
  }

  let name = $state('my theme');
  let mode = $state<ThemeMode>('dark');
  let accent = $state('#c6a0f6');
  let tokens = $state<ThemeTokens>(colorsFrom(getTheme('catppuccin-macchiato')));
  let exportCode = $state('');
  let building = $state(false);

  function applyModeDefaults(next: ThemeMode) {
    mode = next;
    if (next === 'dark') {
      tokens.hoverTint = 'rgba(255, 255, 255, 0.05)';
      tokens.cardShadow = 'rgba(0, 0, 0, 0.35)';
    } else {
      tokens.hoverTint = 'rgba(0, 0, 0, 0.04)';
      tokens.cardShadow = 'rgba(0, 0, 0, 0.1)';
    }
  }

  function buildTheme(): CustomTheme {
    return {
      id: 'custom-' + Date.now().toString(36),
      name: name.trim() || 'custom theme',
      mode,
      defaultAccent: 'custom',
      accents: [{ id: 'custom', name: 'Custom', value: accent }],
      tokens: { ...tokens },
      isCustom: true
    };
  }

  function preview() {
    const theme = buildTheme();
    appearance.applyPreview({
      mode,
      darkTheme: theme.id,
      lightTheme: theme.id,
      accents: { [theme.id]: 'custom' },
      customThemes: [theme]
    });
  }

  function saveTheme() {
    const theme = buildTheme();
    appearance.customThemes.push(theme);
    appearance.accents[theme.id] = 'custom';
    if (mode === 'dark') appearance.darkTheme = theme.id;
    else appearance.lightTheme = theme.id;
    appearance.mode = mode;
    appearance.save();
    toast('Custom theme saved', 'success');
  }

  async function exportTheme() {
    building = true;
    try {
      exportCode = await exportThemeToString(buildTheme());
      toast('Theme code generated', 'success');
    } catch (e) {
      console.error(e);
      toast('Export failed', 'error');
    } finally {
      building = false;
    }
  }

  async function copyCode() {
    if (!exportCode) return;
    try {
      await navigator.clipboard.writeText(exportCode);
      toast('Theme code copied', 'success');
    } catch {
      toast('Copy failed', 'error');
    }
  }

  function downloadJson() {
    const theme = buildTheme();
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme.name.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<section class="maker">
  <div class="maker-row">
    <input class="field" bind:value={name} placeholder="theme name" />
    <div class="seg">
      <button class:active={mode === 'dark'} onclick={() => applyModeDefaults('dark')}>dark</button>
      <button class:active={mode === 'light'} onclick={() => applyModeDefaults('light')}>light</button>
    </div>
    <label class="accent-pick">
      <span>accent</span>
      <input type="color" bind:value={accent} />
    </label>
  </div>

  <div class="swatches">
    {#each COLOR_KEYS as c (c.key)}
      <label class="swatch-pick" title={c.label}>
        <input type="color" bind:value={tokens[c.key] as string} oninput={preview} />
        <span>{c.label}</span>
      </label>
    {/each}
  </div>

  <div class="maker-actions">
    <button class="action-btn" onclick={preview}><Icon name="refresh" size={13} /> preview</button>
    <button class="action-btn" onclick={saveTheme}><Icon name="check" size={13} /> save theme</button>
    <button class="action-btn" onclick={exportTheme} disabled={building}><Icon name="copy" size={13} /> export code</button>
    <button class="action-btn" onclick={downloadJson}><Icon name="image" size={13} /> .json</button>
  </div>

  {#if exportCode}
    <div class="export-row">
      <textarea class="export-box" readonly value={exportCode} rows="2"></textarea>
      <button class="action-btn" onclick={copyCode}>copy</button>
    </div>
  {/if}
</section>

<style>
  .maker { display: flex; flex-direction: column; gap: 0.75rem; }
  .maker-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .field {
    flex: 1;
    min-width: 140px;
    background: var(--base);
    border: 1px solid var(--surface0);
    color: var(--text);
    padding: 0.45rem 0.6rem;
    border-radius: var(--r-xs, 6px);
    font-family: inherit;
    font-size: 0.8rem;
  }
  .seg { display: flex; background: var(--base); border: 1px solid var(--surface0); border-radius: var(--r-xs, 6px); padding: 2px; }
  .seg button {
    background: transparent;
    border: none;
    color: var(--subtext0);
    padding: 0.3rem 0.7rem;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.78rem;
  }
  .seg button.active { background: var(--surface0); color: var(--text); }
  .accent-pick { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: var(--subtext0); }
  .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 0.5rem; }
  .swatch-pick { display: flex; flex-direction: column; gap: 4px; font-size: 0.7rem; color: var(--subtext0); }
  .swatch-pick input[type='color'] {
    width: 100%;
    height: 26px;
    padding: 0;
    border: 1px solid var(--surface1);
    border-radius: var(--r-xs, 6px);
    background: none;
    cursor: pointer;
  }
  .maker-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--surface0);
    color: var(--text);
    border: 1px solid var(--surface1);
    padding: 0.45rem 0.9rem;
    border-radius: var(--r-xs, 6px);
    cursor: pointer;
    font-family: inherit;
    font-size: 0.78rem;
  }
  .action-btn:hover { border-color: var(--accent); }
  .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .export-row { display: flex; gap: 0.5rem; align-items: flex-start; }
  .export-box {
    flex: 1;
    background: var(--crust);
    border: 1px solid var(--surface0);
    color: var(--subtext0);
    padding: 0.5rem;
    border-radius: var(--r-xs, 6px);
    font-family: inherit;
    font-size: 0.7rem;
    resize: vertical;
    word-break: break-all;
  }
</style>
