export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  crust: string;
  mantle: string;
  base: string;
  surface0: string;
  surface1: string;
  surface2: string;
  overlay0: string;
  overlay1: string;
  subtext0: string;
  text: string;
  // Semantic colors
  red: string;
  green: string;
  yellow: string;
  pink: string;
  blue: string;
  // Extended palette (optional — derived per theme when absent so colours that
  // used to be static now follow the active theme).
  rosewater?: string;
  flamingo?: string;
  mauve?: string;
  maroon?: string;
  peach?: string;
  teal?: string;
  sky?: string;
  sapphire?: string;
  lavender?: string;
  // Tint overlays
  hoverTint: string;
  cardShadow: string;
}

export interface AccentColor {
  id: string;
  name: string;
  value: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  mode: ThemeMode;
  tokens: ThemeTokens;
  accents: AccentColor[];
  defaultAccent: string;
}

export interface CustomTheme extends ThemeDefinition {
  isCustom: true;
}

export interface AppearanceSettings {
  mode: 'system' | 'light' | 'dark';
  darkTheme: string;
  lightTheme: string;
  accents: Record<string, string>; // themeId -> accentId or hex
  customThemes: CustomTheme[];
  /** Chat setting: when to show message timestamps. */
  showTimestamps?: 'always' | 'hover' | 'never';
  /** Chat setting: group consecutive messages by the same author. */
  groupConsecutiveMessages?: boolean;
  /** Chat setting: auto-expand link embeds. */
  showEmbeds?: boolean;
  /** Chat setting: Enter (without Shift) sends the message. */
  enterToSend?: boolean;
  /** Chat setting: show the server members column. */
  showMembersList?: boolean;
  /** Chat setting: tighten message spacing. */
  compactMessages?: boolean;
  /** Chat setting: reduce/disable animations. */
  reduceMotion?: boolean;
  /** Chat setting: global message font scale. */
  fontScale?: number;
  /** Chat setting: sound id played on incoming messages ('off' = disabled). */
  notificationSound?: string;
  /** Chat setting: notification sound volume (0–1). */
  notificationVolume?: number;
  /** Chat setting: desktop notifications for DMs while unfocused. */
  desktopNotifications?: boolean;
  /** Chat setting: confirm before destructive actions. */
  confirmDeletes?: boolean;
}