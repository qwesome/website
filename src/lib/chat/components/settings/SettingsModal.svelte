<script lang="ts">
  import { appearance } from '../../state/appearance.svelte';
  import { BUILTIN_THEMES, getTheme } from '../../themes';
  import { exportThemeToString, importThemeFromString } from '../../themes/codec';
  import type { AppearanceSettings } from '../../themes/types';
  import Icon from '../ui/Icon.svelte';

  let { open = $bindable(false) } = $props();

  let activeTab = $state<'appearance' | 'profile' | 'servers'>('appearance');
  let importCode = $state('');
  let importError = $state('');

  // Draft state for uncommitted changes
  let draftMode = $state<'single' | 'dual'>('single');
  let draftActiveMode = $state<'dark' | 'light'>('dark');
  let draftDarkTheme = $state('catppuccin-macchiato');
  let draftLightTheme = $state('catppuccin-latte');
  let draftAccents = $state<Record<string, string>>({});

  let isDirty = $state(false);

  // Sync draft state from active settings on open
  $effect(() => {
    if (open) {
      draftMode = appearance.mode === 'system' ? 'dual' : 'single';
      draftActiveMode = appearance.mode === 'light' ? 'light' : 'dark';
      draftDarkTheme = appearance.darkTheme;
      draftLightTheme = appearance.lightTheme;
      draftAccents = JSON.parse(JSON.stringify(appearance.accents));
      isDirty = false;
    }
  });

  function markDirty() {
    isDirty = true;
    // Live-preview the draft without saving to storage or the server.
    appearance.applyPreview({
      mode: draftMode === 'dual' ? 'system' : draftActiveMode,
      darkTheme: draftDarkTheme,
      lightTheme: draftLightTheme,
      accents: draftAccents,
      customThemes: appearance.customThemes
    });
  }

  function handleSave() {
    if (!isDirty) return;

    if (draftMode === 'dual') {
      appearance.mode = 'system';
    } else {
      appearance.mode = draftActiveMode;
    }

    appearance.darkTheme = draftDarkTheme;
    appearance.lightTheme = draftLightTheme;
    appearance.accents = draftAccents;

    appearance.save();
    isDirty = false;
  }

  function close() {
    // Discard unsaved edits: put the committed theme back on screen.
    if (isDirty) appearance.applyToDOM();
    open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  async function handleImport() {
    importError = '';
    try {
      const imported = await importThemeFromString(importCode.trim());
      appearance.customThemes.push(imported);
      appearance.save();
      importCode = '';
    } catch (err: any) {
      importError = err.message || 'Failed to import theme';
    }
  }

  const darkThemes = $derived(BUILTIN_THEMES.filter(t => t.mode === 'dark'));
  const lightThemes = $derived(BUILTIN_THEMES.filter(t => t.mode === 'light'));

  const activeSelectedTheme = $derived(
    draftActiveMode === 'dark' ? getTheme(draftDarkTheme) : getTheme(draftLightTheme)
  );
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={close} onkeydown={(e) => e.key === 'Escape' && close()} role="presentation">
    <div class="modal-body" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <header class="modal-header">
        <h2>settings</h2>
        <button class="icon-btn" onclick={close} aria-label="Close modal">
          <Icon name="x" />
        </button>
      </header>

      <div class="settings-layout">
        <nav class="settings-sidebar">
          <button
            class="tab-btn"
            class:active={activeTab === 'appearance'}
            onclick={() => (activeTab = 'appearance')}
          >
            appearance
          </button>
          <button
            class="tab-btn"
            class:active={activeTab === 'servers'}
            onclick={() => (activeTab = 'servers')}
          >
            servers
          </button>
        </nav>

        <main class="settings-content">
          {#if activeTab === 'appearance'}
            <!-- Mode Toggle & Dual Theme Sync -->
            <section class="setting-group">
              <div class="setting-row">
                <span class="setting-label">mode</span>
                <div class="toggle-group">
                  <button
                    class="mode-toggle-btn"
                    class:active={draftActiveMode === 'dark'}
                    onclick={() => { draftActiveMode = 'dark'; markDirty(); }}
                  >
                    dark
                  </button>
                  <button
                    class="mode-toggle-btn"
                    class:active={draftActiveMode === 'light'}
                    onclick={() => { draftActiveMode = 'light'; markDirty(); }}
                  >
                    light
                  </button>
                </div>
              </div>

              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={draftMode === 'dual'}
                  onchange={(e) => {
                    draftMode = e.currentTarget.checked ? 'dual' : 'single';
                    markDirty();
                  }}
                />
                <span>select both a light and dark theme (sync with system)</span>
              </label>
            </section>

            <!-- Accent Selector (the mode the accent applies to) -->
            {#if activeSelectedTheme}
              <section class="setting-group">
                <h3>accent color ({activeSelectedTheme.name.toLowerCase()})</h3>
                <div class="accent-row">
                  {#each activeSelectedTheme.accents as acc}
                    <button
                      class="accent-btn"
                      class:selected={(draftAccents[activeSelectedTheme.id] || activeSelectedTheme.defaultAccent) === acc.id}
                      style="background: {acc.value}"
                      title={acc.name}
                      aria-label={acc.name}
                      onclick={() => {
                        draftAccents[activeSelectedTheme.id] = acc.id;
                        markDirty();
                      }}
                    ></button>
                  {/each}
                </div>
              </section>
            {/if}

            <!-- Dark Themes: unlocked only when dual mode (or active) so a single
                 theme stays single when the "sync with system" option is off. -->
            {#if draftMode === 'dual' || draftActiveMode === 'dark'}
              <section class="setting-group">
                <h3>dark themes</h3>
                <div class="theme-grid">
                  {#each darkThemes as theme}
                    <button
                      class="theme-card"
                      class:active={draftDarkTheme === theme.id}
                      onclick={() => {
                        draftDarkTheme = theme.id;
                        draftActiveMode = 'dark';
                        markDirty();
                      }}
                    >
                      <div class="swatch-row">
                        <span class="swatch" style="background: {theme.tokens.crust}"></span>
                        <span class="swatch" style="background: {theme.tokens.base}"></span>
                        <span class="swatch" style="background: {theme.tokens.surface0}"></span>
                        <span class="swatch" style="background: {theme.tokens.text}"></span>
                      </div>
                      <span class="theme-name">{theme.name.toLowerCase()}</span>
                    </button>
                  {/each}
                </div>
              </section>
            {/if}

            <!-- Light Themes -->
            {#if draftMode === 'dual' || draftActiveMode === 'light'}
              <section class="setting-group">
                <h3>light themes</h3>
                <div class="theme-grid">
                  {#each lightThemes as theme}
                    <button
                      class="theme-card"
                      class:active={draftLightTheme === theme.id}
                      onclick={() => {
                        draftLightTheme = theme.id;
                        draftActiveMode = 'light';
                        markDirty();
                      }}
                    >
                      <div class="swatch-row">
                        <span class="swatch" style="background: {theme.tokens.crust}"></span>
                        <span class="swatch" style="background: {theme.tokens.base}"></span>
                        <span class="swatch" style="background: {theme.tokens.surface0}"></span>
                        <span class="swatch" style="background: {theme.tokens.text}"></span>
                      </div>
                      <span class="theme-name">{theme.name.toLowerCase()}</span>
                    </button>
                  {/each}
                </div>
              </section>
            {/if}

            <!-- Custom Theme Import -->
            <section class="setting-group">
              <h3>import custom theme</h3>
              <div class="import-row">
                <input
                  type="text"
                  placeholder="paste uct1:... string"
                  bind:value={importCode}
                  class="import-input"
                />
                <button class="action-btn" onclick={handleImport}>import</button>
              </div>
              {#if importError}
                <p class="error-msg">{importError}</p>
              {/if}
            </section>
          {:else if activeTab === 'servers'}
            <section class="setting-group">
              <div class="setting-row">
                <span class="setting-label">show the default global server</span>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    checked={appearance.showGlobalServer}
                    onchange={(e) => {
                      appearance.showGlobalServer = e.currentTarget.checked;
                      appearance.save();
                    }}
                  />
                  <span>everyone is a member of this server</span>
                </label>
              </div>
            </section>
          {/if}
        </main>
      </div>

      <footer class="modal-footer">
        <button
          class="save-btn"
          disabled={!isDirty}
          onclick={handleSave}
        >
          save changes
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }
  .modal-body {
    background: var(--mantle);
    border: 1px solid var(--surface0);
    border-radius: 8px;
    width: 680px;
    max-width: 90vw;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--surface0);
  }
  .modal-header h2 { margin: 0; font-size: 1.1rem; font-weight: 600; }
  .settings-layout { display: flex; flex: 1; overflow: hidden; }
  .settings-sidebar {
    width: 160px;
    background: var(--crust);
    border-right: 1px solid var(--surface0);
    padding: 0.75rem 0.5rem;
  }
  .tab-btn {
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--subtext0);
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
  }
  .tab-btn.active, .tab-btn:hover { background: var(--surface0); color: var(--text); }
  .settings-content { flex: 1; padding: 1.25rem; overflow-y: auto; }
  .setting-group { margin-bottom: 1.5rem; }
  .setting-group h3 { font-size: 0.85rem; color: var(--subtext0); margin-bottom: 0.5rem; }
  .setting-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
  .setting-label { font-size: 0.85rem; color: var(--subtext0); }
  .toggle-group { display: flex; background: var(--base); border: 1px solid var(--surface0); border-radius: 4px; padding: 2px; }
  .mode-toggle-btn {
    background: transparent;
    border: none;
    color: var(--subtext0);
    padding: 0.25rem 0.75rem;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.8rem;
  }
  .mode-toggle-btn.active { background: var(--surface0); color: var(--text); }
  .checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--subtext0); cursor: pointer; }
  .accent-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .accent-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
  }
  .accent-btn.selected { border-color: var(--text); transform: scale(1.1); }
  .theme-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .theme-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--base);
    border: 1px solid var(--surface0);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--text);
  }
  .theme-card.active { border-color: var(--accent); }
  .swatch-row { display: flex; gap: 0.25rem; }
  .swatch { width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.1); }
  .theme-name { font-size: 0.8rem; }
  .import-row { display: flex; gap: 0.5rem; }
  .import-input {
    flex: 1;
    background: var(--base);
    border: 1px solid var(--surface0);
    color: var(--text);
    padding: 0.5rem;
    border-radius: 4px;
    font-family: inherit;
  }
  .action-btn {
    background: var(--surface0);
    color: var(--text);
    border: 1px solid var(--surface1);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
  }
  .modal-footer {
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--surface0);
    display: flex;
    justify-content: flex-end;
    background: var(--crust);
  }
  .save-btn {
    background: var(--accent);
    color: var(--on-accent);
    border: none;
    padding: 0.5rem 1.25rem;
    border-radius: 4px;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .save-btn:disabled {
    background: var(--surface0);
    color: var(--subtext0);
    cursor: not-allowed;
    opacity: 0.6;
  }
  .icon-btn { background: transparent; border: none; color: var(--subtext0); cursor: pointer; }
  .error-msg { color: var(--red); font-size: 0.8rem; margin-top: 0.25rem; }
</style>