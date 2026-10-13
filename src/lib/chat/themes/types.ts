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
  /** Chat setting: whether the default global server is visible. */
  showGlobalServer?: boolean;
}