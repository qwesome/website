import { getTheme, resolveThemeTokens } from '../themes';
import type { AppearanceSettings, CustomTheme, ThemeDefinition } from '../themes/types';
import { api } from '../api/client';

const STORAGE_KEY = 'chat_appearance_settings';

export type TimestampMode = 'always' | 'hover' | 'never';

export class AppearanceState {
  mode = $state<'system' | 'light' | 'dark'>('system');
  darkTheme = $state<string>('catppuccin-macchiato');
  lightTheme = $state<string>('catppuccin-latte');
  accents = $state<Record<string, string>>({});
  customThemes = $state<CustomTheme[]>([]);

  /** When to show message timestamps. */
  showTimestamps = $state<TimestampMode>('hover');
  /** Group consecutive messages by the same author (Discord-style). */
  groupConsecutiveMessages = $state(true);
  /** Auto-expand link embeds under messages. */
  showEmbeds = $state(true);
  /** Enter (without Shift) sends the message. */
  enterToSend = $state(true);
  /** Show the server members column. */
  showMembersList = $state(true);
  /** Tighten message spacing for more on screen. */
  compactMessages = $state(false);
  /** Reduce/disable animations. */
  reduceMotion = $state(false);
  /** Global message font scale. */
  fontScale = $state(1);
  /** Sound id played on incoming messages ('off' = disabled). */
  notificationSound = $state<string>('off');
  /** Notification sound volume (0–1). */
  notificationVolume = $state(1);
  /** Show a desktop notification for DMs while the tab is unfocused. */
  desktopNotifications = $state(false);
  /** Ask before deleting servers/channels. */
  confirmDeletes = $state(true);

  activeTheme = $derived(this.resolveActiveTheme());

  constructor() {
    this.loadFromStorage();
  }

  /** Normalises a stored timestamp value (old builds stored a boolean). */
  private parseTimestamps(v: unknown): TimestampMode {
    if (v === 'always' || v === 'hover' || v === 'never') return v;
    if (v === true) return 'always';
    if (v === false) return 'never';
    return 'hover';
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
        if (parsed.showTimestamps !== undefined) this.showTimestamps = this.parseTimestamps(parsed.showTimestamps);
        if (parsed.groupConsecutiveMessages !== undefined) this.groupConsecutiveMessages = parsed.groupConsecutiveMessages;
        if (parsed.showEmbeds !== undefined) this.showEmbeds = parsed.showEmbeds;
        if (parsed.enterToSend !== undefined) this.enterToSend = parsed.enterToSend;
        if (parsed.showMembersList !== undefined) this.showMembersList = parsed.showMembersList;
        if (parsed.compactMessages !== undefined) this.compactMessages = parsed.compactMessages;
        if (parsed.reduceMotion !== undefined) this.reduceMotion = parsed.reduceMotion;
        if (parsed.fontScale !== undefined) this.fontScale = parsed.fontScale;
        if (parsed.notificationSound !== undefined) this.notificationSound = parsed.notificationSound;
        if (parsed.notificationVolume !== undefined) this.notificationVolume = parsed.notificationVolume;
        if (parsed.desktopNotifications !== undefined) this.desktopNotifications = parsed.desktopNotifications;
        if (parsed.confirmDeletes !== undefined) this.confirmDeletes = parsed.confirmDeletes;
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
      showTimestamps: this.showTimestamps,
      groupConsecutiveMessages: this.groupConsecutiveMessages,
      showEmbeds: this.showEmbeds,
      enterToSend: this.enterToSend,
      showMembersList: this.showMembersList,
      compactMessages: this.compactMessages,
      reduceMotion: this.reduceMotion,
      fontScale: this.fontScale,
      notificationSound: this.notificationSound,
      notificationVolume: this.notificationVolume,
      desktopNotifications: this.desktopNotifications,
      confirmDeletes: this.confirmDeletes
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
        const s = res.settings;
        if (s.mode) this.mode = s.mode;
        if (s.darkTheme) this.darkTheme = s.darkTheme;
        if (s.lightTheme) this.lightTheme = s.lightTheme;
        if (s.accents) this.accents = s.accents;
        if (s.customThemes) this.customThemes = s.customThemes;
        if (s.showTimestamps !== undefined) this.showTimestamps = this.parseTimestamps(s.showTimestamps);
        if (s.groupConsecutiveMessages !== undefined) this.groupConsecutiveMessages = s.groupConsecutiveMessages;
        if (s.showEmbeds !== undefined) this.showEmbeds = s.showEmbeds;
        if (s.enterToSend !== undefined) this.enterToSend = s.enterToSend;
        if (s.showMembersList !== undefined) this.showMembersList = s.showMembersList;
        if (s.compactMessages !== undefined) this.compactMessages = s.compactMessages;
        if (s.reduceMotion !== undefined) this.reduceMotion = s.reduceMotion;
        if (s.fontScale !== undefined) this.fontScale = s.fontScale;
        if (s.notificationSound !== undefined) this.notificationSound = s.notificationSound;
        if (s.notificationVolume !== undefined) this.notificationVolume = s.notificationVolume;
        if (s.desktopNotifications !== undefined) this.desktopNotifications = s.desktopNotifications;
        if (s.confirmDeletes !== undefined) this.confirmDeletes = s.confirmDeletes;
        this.save();
      }
    } catch (e) {
      // Degrade gracefully if offline or unauthenticated
    }
  }

  /** Wipes every persisted setting back to defaults. */
  reset() {
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    this.mode = 'system';
    this.darkTheme = 'catppuccin-macchiato';
    this.lightTheme = 'catppuccin-latte';
    this.accents = {};
    this.customThemes = [];
    this.showTimestamps = 'hover';
    this.groupConsecutiveMessages = true;
    this.showEmbeds = true;
    this.enterToSend = true;
    this.showMembersList = true;
    this.compactMessages = false;
    this.reduceMotion = false;
    this.fontScale = 1;
    this.notificationSound = 'off';
    this.notificationVolume = 1;
    this.desktopNotifications = false;
    this.confirmDeletes = true;
    this.applyToDOM();
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
    if (typeof document !== 'undefined') {
      const root = document.querySelector('.chat-root') as HTMLElement;
      if (root) root.style.setProperty('--font-scale', String(this.fontScale));
    }
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
