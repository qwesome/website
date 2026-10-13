import type { ThemeDefinition, AccentColor } from './types';
import { ensureLegible, readableOn } from '../utils/color';

// Official Catppuccin 14 Accent Colors
export const CATPPUCCIN_ACCENTS: Record<'latte' | 'frappe' | 'macchiato' | 'mocha', AccentColor[]> = {
  latte: [
    { id: 'rosewater', name: 'Rosewater', value: '#dc8a78' },
    { id: 'flamingo', name: 'Flamingo', value: '#dd7878' },
    { id: 'pink', name: 'Pink', value: '#ea76cb' },
    { id: 'mauve', name: 'Mauve', value: '#8839ef' },
    { id: 'red', name: 'Red', value: '#d20f39' },
    { id: 'maroon', name: 'Maroon', value: '#e64553' },
    { id: 'peach', name: 'Peach', value: '#fe640b' },
    { id: 'yellow', name: 'Yellow', value: '#df8e1d' },
    { id: 'green', name: 'Green', value: '#40a02b' },
    { id: 'teal', name: 'Teal', value: '#179299' },
    { id: 'sky', name: 'Sky', value: '#04a5e5' },
    { id: 'sapphire', name: 'Sapphire', value: '#209fb5' },
    { id: 'blue', name: 'Blue', value: '#1e66f5' },
    { id: 'lavender', name: 'Lavender', value: '#7287fd' }
  ],
  frappe: [
    { id: 'rosewater', name: 'Rosewater', value: '#f2d5cf' },
    { id: 'flamingo', name: 'Flamingo', value: '#eebebe' },
    { id: 'pink', name: 'Pink', value: '#f4b8e4' },
    { id: 'mauve', name: 'Mauve', value: '#ca9ee6' },
    { id: 'red', name: 'Red', value: '#e78284' },
    { id: 'maroon', name: 'Maroon', value: '#ea999c' },
    { id: 'peach', name: 'Peach', value: '#ef9f76' },
    { id: 'yellow', name: 'Yellow', value: '#e5c890' },
    { id: 'green', name: 'Green', value: '#a6d189' },
    { id: 'teal', name: 'Teal', value: '#81c8be' },
    { id: 'sky', name: 'Sky', value: '#99d1db' },
    { id: 'sapphire', name: 'Sapphire', value: '#85c1dc' },
    { id: 'blue', name: 'Blue', value: '#8caaee' },
    { id: 'lavender', name: 'Lavender', value: '#babbf1' }
  ],
  macchiato: [
    { id: 'rosewater', name: 'Rosewater', value: '#f4dbd6' },
    { id: 'flamingo', name: 'Flamingo', value: '#f0c6c6' },
    { id: 'pink', name: 'Pink', value: '#f5bde6' },
    { id: 'mauve', name: 'Mauve', value: '#c6a0f6' },
    { id: 'red', name: 'Red', value: '#ed8796' },
    { id: 'maroon', name: 'Maroon', value: '#ee99a0' },
    { id: 'peach', name: 'Peach', value: '#f5a97f' },
    { id: 'yellow', name: 'Yellow', value: '#eed49f' },
    { id: 'green', name: 'Green', value: '#a6da95' },
    { id: 'teal', name: 'Teal', value: '#8bd5ca' },
    { id: 'sky', name: 'Sky', value: '#91d7e3' },
    { id: 'sapphire', name: 'Sapphire', value: '#7dc4e4' },
    { id: 'blue', name: 'Blue', value: '#8aadf4' },
    { id: 'lavender', name: 'Lavender', value: '#b7bdf8' }
  ],
  mocha: [
    { id: 'rosewater', name: 'Rosewater', value: '#f5e0dc' },
    { id: 'flamingo', name: 'Flamingo', value: '#f2cdcd' },
    { id: 'pink', name: 'Pink', value: '#f5c2e7' },
    { id: 'mauve', name: 'Mauve', value: '#cba6f7' },
    { id: 'red', name: 'Red', value: '#f38ba8' },
    { id: 'maroon', name: 'Maroon', value: '#eba0ac' },
    { id: 'peach', name: 'Peach', value: '#fab387' },
    { id: 'yellow', name: 'Yellow', value: '#f9e2af' },
    { id: 'green', name: 'Green', value: '#a6e3a1' },
    { id: 'teal', name: 'Teal', value: '#94e2d5' },
    { id: 'sky', name: 'Sky', value: '#89dceb' },
    { id: 'sapphire', name: 'Sapphire', value: '#74c7ec' },
    { id: 'blue', name: 'Blue', value: '#89b4fa' },
    { id: 'lavender', name: 'Lavender', value: '#b4befe' }
  ]
};

export const BUILTIN_THEMES: ThemeDefinition[] = [
  // --- DARK THEMES ---
  {
    id: 'catppuccin-macchiato',
    name: 'Catppuccin Macchiato',
    mode: 'dark',
    defaultAccent: 'mauve',
    accents: CATPPUCCIN_ACCENTS.macchiato,
    tokens: {
      crust: '#181926', mantle: '#1e2030', base: '#24273a',
      surface0: '#363a4f', surface1: '#494d64', surface2: '#5b6078',
      overlay0: '#6e738d', overlay1: '#8087a2', subtext0: '#a5adcb',
      text: '#cad3f5', red: '#ed8796', green: '#a6da95',
      yellow: '#eed49f', pink: '#f5bde6', blue: '#8aadf4',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.35)'
    }
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    mode: 'dark',
    defaultAccent: 'mauve',
    accents: CATPPUCCIN_ACCENTS.mocha,
    tokens: {
      crust: '#11111b', mantle: '#181825', base: '#1e1e2e',
      surface0: '#313244', surface1: '#45475a', surface2: '#585b70',
      overlay0: '#6c7086', overlay1: '#7f849c', subtext0: '#a6adc8',
      text: '#cdd6f4', red: '#f38ba8', green: '#a6e3a1',
      yellow: '#f9e2af', pink: '#f5c2e7', blue: '#89b4fa',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.4)'
    }
  },
  {
    id: 'catppuccin-frappe',
    name: 'Catppuccin Frappé',
    mode: 'dark',
    defaultAccent: 'mauve',
    accents: CATPPUCCIN_ACCENTS.frappe,
    tokens: {
      crust: '#232634', mantle: '#292c3c', base: '#303446',
      surface0: '#414559', surface1: '#51576d', surface2: '#626880',
      overlay0: '#737994', overlay1: '#838ba7', subtext0: '#a5adce',
      text: '#c6d0f5', red: '#e78284', green: '#a6d189',
      yellow: '#e5c890', pink: '#f4b8e4', blue: '#8caaee',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.25)'
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    mode: 'dark',
    defaultAccent: 'purple',
    accents: [
      { id: 'purple', name: 'Purple', value: '#bd93f9' },
      { id: 'pink', name: 'Pink', value: '#ff79c6' },
      { id: 'cyan', name: 'Cyan', value: '#8be9fd' },
      { id: 'green', name: 'Green', value: '#50fa7b' },
      { id: 'orange', name: 'Orange', value: '#ffb86c' },
      { id: 'red', name: 'Red', value: '#ff5555' }
    ],
    tokens: {
      crust: '#191a21', mantle: '#21222c', base: '#282a36',
      surface0: '#343746', surface1: '#44475a', surface2: '#6272a4',
      overlay0: '#6272a4', overlay1: '#7988b8', subtext0: '#f8f8f2',
      text: '#f8f8f2', red: '#ff5555', green: '#50fa7b',
      yellow: '#f1fa8c', pink: '#ff79c6', blue: '#8be9fd',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.35)'
    }
  },
  {
    id: 'discord-dark',
    name: 'Discord Dark',
    mode: 'dark',
    defaultAccent: 'blurple',
    accents: [
      { id: 'blurple', name: 'Blurple', value: '#5865f2' },
      { id: 'green', name: 'Green', value: '#57f287' },
      { id: 'yellow', name: 'Yellow', value: '#fee75c' },
      { id: 'fuchsia', name: 'Fuchsia', value: '#eb459e' },
      { id: 'red', name: 'Red', value: '#ed4245' }
    ],
    tokens: {
      crust: '#111214', mantle: '#1e1f22', base: '#2b2d31',
      surface0: '#313338', surface1: '#383a40', surface2: '#404249',
      overlay0: '#4e5058', overlay1: '#80848e', subtext0: '#949ba4',
      text: '#dbdee1', red: '#ed4245', green: '#57f287',
      yellow: '#fee75c', pink: '#eb459e', blue: '#5865f2',
      hoverTint: 'rgba(255, 255, 255, 0.04)', cardShadow: 'rgba(0, 0, 0, 0.3)'
    }
  },

  // --- LIGHT THEMES ---
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    mode: 'light',
    defaultAccent: 'mauve',
    accents: CATPPUCCIN_ACCENTS.latte,
    tokens: {
      crust: '#dce0e8', mantle: '#e6e9ef', base: '#eff1f5',
      surface0: '#ccd0da', surface1: '#bcc0cc', surface2: '#acb0be',
      overlay0: '#9ca0b0', overlay1: '#8c8fa1', subtext0: '#6c6f85',
      text: '#4c4f69', red: '#d20f39', green: '#40a02b',
      yellow: '#df8e1d', pink: '#ea76cb', blue: '#1e66f5',
      hoverTint: 'rgba(0, 0, 0, 0.04)', cardShadow: 'rgba(0, 0, 0, 0.08)'
    }
  },
  {
    id: 'discord-light',
    name: 'Discord Light',
    mode: 'light',
    defaultAccent: 'blurple',
    accents: [
      { id: 'blurple', name: 'Blurple', value: '#5865f2' },
      { id: 'green', name: 'Green', value: '#23a55a' },
      { id: 'yellow', name: 'Yellow', value: '#f0b232' },
      { id: 'fuchsia', name: 'Fuchsia', value: '#eb459e' },
      { id: 'red', name: 'Red', value: '#f23f43' }
    ],
    tokens: {
      crust: '#e3e5e8', mantle: '#f2f3f5', base: '#ffffff',
      surface0: '#ebedef', surface1: '#e1e3e6', surface2: '#d4d7dc',
      overlay0: '#b5bac1', overlay1: '#80848e', subtext0: '#5c5e66',
      text: '#313338', red: '#f23f43', green: '#23a55a',
      yellow: '#f0b232', pink: '#eb459e', blue: '#5865f2',
      hoverTint: 'rgba(0, 0, 0, 0.04)', cardShadow: 'rgba(0, 0, 0, 0.1)'
    }
  }
];

export function getTheme(id: string, customThemes: ThemeDefinition[] = []): ThemeDefinition {
  return [...BUILTIN_THEMES, ...customThemes].find(t => t.id === id) || BUILTIN_THEMES[0];
}

export function resolveAccentHex(theme: ThemeDefinition, choice?: string): string {
  if (!choice) {
    const match = theme.accents.find(a => a.id === theme.defaultAccent);
    return match ? match.value : theme.accents[0]?.value || '#c6a0f6';
  }
  if (choice.startsWith('#')) return choice;
  const match = theme.accents.find(a => a.id === choice);
  return match ? match.value : theme.accents[0]?.value || '#c6a0f6';
}

export function resolveThemeTokens(theme: ThemeDefinition, accentChoice?: string): Record<string, string> {
  const accentHex = resolveAccentHex(theme, accentChoice);
  const onAccentHex = readableOn(accentHex);

  const t = theme.tokens;
  const accentMap = Object.fromEntries(theme.accents.map((a) => [a.id, a.value]));
  const base = t.base;

  // Extended palette keys that older themes never defined. Pull real values from
  // the theme's own accent list where possible, otherwise infer a close colour,
  // then nudge each one until it is legible on this theme's background.
  const hints: Record<string, string> = {
    rosewater: t.pink,
    flamingo: t.pink,
    mauve: accentHex,
    maroon: t.red,
    peach: t.yellow,
    teal: t.green,
    sky: t.blue,
    sapphire: t.blue,
    lavender: t.blue
  };
  const palette: Record<string, string> = {
    rosewater: t.rosewater ?? accentMap.rosewater ?? hints.rosewater,
    flamingo: t.flamingo ?? accentMap.flamingo ?? hints.flamingo,
    pink: t.pink,
    mauve: t.mauve ?? accentMap.mauve ?? hints.mauve,
    red: t.red,
    maroon: t.maroon ?? accentMap.maroon ?? hints.maroon,
    peach: t.peach ?? accentMap.peach ?? hints.peach,
    yellow: t.yellow,
    green: t.green,
    teal: t.teal ?? accentMap.teal ?? hints.teal,
    sky: t.sky ?? accentMap.sky ?? hints.sky,
    sapphire: t.sapphire ?? accentMap.sapphire ?? hints.sapphire,
    blue: t.blue,
    lavender: t.lavender ?? accentMap.lavender ?? hints.lavender
  };
  for (const key of Object.keys(palette)) {
    palette[key] = ensureLegible(palette[key], base, 3);
  }

  return {
    ...theme.tokens,
    ...palette,
    accent: accentHex,
    'accent-hover': accentHex + 'dd',
    'on-accent': onAccentHex
  };
}