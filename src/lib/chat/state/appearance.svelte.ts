import { getTheme, resolveThemeTokens } from '../themes';
import type { AppearanceSettings, CustomTheme, ThemeDefinition } from '../themes/types';
import { api } from '../api/client';

const STORAGE_KEY = 'chat_appearance_settings';

export class AppearanceState {
  mode = $state<'system' | 'light' | 'dark'>('system');
  darkTheme = $state<string>('catppuccin-macchiato');
  lightTheme = $state<string>('catppuccin-latte');
  accents = $state<Record<string, string>>({});
  customThemes = $state<CustomTheme[]>([]);
  /** Whether the default "global" server is shown in the sidebar. */
  showGlobalServer = $state(true);

  activeTheme = $derived(this.resolveActiveTheme());

  constructor() {
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Partial<AppearanceSettings> = JSON.parse(raw);
        if (parsed.mode) this.mode = parsed.mode;
        if (parsed.darkTheme) this.darkTheme = parsed.darkTheme;
        if (parsed.lightTheme) this.lightTheme = parsed.lightTheme;
        if (parsed.accents) this.accents = parsed.accents;
        if (parsed.customThemes) this.customThemes = parsed.customThemes;
        if (parsed.showGlobalServer !== undefined) this.showGlobalServer = parsed.showGlobalServer;
      }
    } catch (e) {
      console.warn('Failed to load appearance settings from localStorage', e);
    }
  }

  save() {
    if (typeof window === 'undefined') return;
    const settings: AppearanceSettings = {
      mode: this.mode,
      darkTheme: this.darkTheme,
      lightTheme: this.lightTheme,
      accents: $state.snapshot(this.accents),
      customThemes: $state.snapshot(this.customThemes),
      showGlobalServer: this.showGlobalServer
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    this.applyToDOM();

    // Debounced sync to server
    api('/api/settings', { method: 'PUT', json: { settings } }).catch(() => {});
  }

  async loadFromServer() {
    try {
      const res = await api<{ settings: AppearanceSettings }>('/api/settings');
      if (res.settings && Object.keys(res.settings).length > 0) {
        if (res.settings.mode) this.mode = res.settings.mode;
        if (res.settings.darkTheme) this.darkTheme = res.settings.darkTheme;
        if (res.settings.lightTheme) this.lightTheme = res.settings.lightTheme;
        if (res.settings.accents) this.accents = res.settings.accents;
        if (res.settings.customThemes) this.customThemes = res.settings.customThemes;
        if (res.settings.showGlobalServer !== undefined) this.showGlobalServer = res.settings.showGlobalServer;
        this.save();
      }
    } catch (e) {
      // Degrade gracefully if offline or unauthenticated
    }
  }

  private resolveActiveTheme(): ThemeDefinition {
    let mode: 'light' | 'dark' = 'dark';
    if (this.mode === 'system') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      mode = prefersDark ? 'dark' : 'light';
    } else {
      mode = this.mode;
    }

    const themeId = mode === 'dark' ? this.darkTheme : this.lightTheme;
    return getTheme(themeId, this.customThemes);
  }

  applyToDOM() {
    this.applyPreview({
      mode: this.mode,
      darkTheme: this.darkTheme,
      lightTheme: this.lightTheme,
      accents: this.accents,
      customThemes: this.customThemes
    });
  }

  /** Applies a *draft* appearance to the DOM without touching storage/server.
   *  Used for live previews in the settings modal before "save changes". */
  applyPreview(opts: {
    mode: AppearanceSettings['mode'];
    darkTheme: string;
    lightTheme: string;
    accents: Record<string, string>;
    customThemes: CustomTheme[];
  }) {
    if (typeof document === 'undefined') return;
    const root = document.querySelector('.chat-root') as HTMLElement;
    if (!root) return;

    let mode: 'light' | 'dark' = 'dark';
    if (opts.mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      mode = prefersDark ? 'dark' : 'light';
    } else {
      mode = opts.mode;
    }
    const themeId = mode === 'dark' ? opts.darkTheme : opts.lightTheme;
    const theme = getTheme(themeId, opts.customThemes);
    const accentChoice = opts.accents[theme.id];
    const tokens = resolveThemeTokens(theme, accentChoice);

    Object.entries(tokens).forEach(([key, val]) => {
      root.style.setProperty(`--${key}`, val);
    });

    root.style.colorScheme = theme.mode;
  }
}

export const appearance = new AppearanceState();