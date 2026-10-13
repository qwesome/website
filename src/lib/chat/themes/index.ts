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
  {
    id: 'nord',
    name: 'Nord',
    mode: 'dark',
    defaultAccent: 'frost-cyan',
    accents: [
      { id: 'frost-cyan', name: 'Frost Cyan', value: '#88c0d0' },
      { id: 'frost-ice', name: 'Frost Ice', value: '#8fbcbb' },
      { id: 'frost-blue', name: 'Frost Blue', value: '#81a1c1' },
      { id: 'frost-deep', name: 'Deep Blue', value: '#5e81ac' },
      { id: 'aurora-red', name: 'Aurora Red', value: '#bf616a' },
      { id: 'aurora-orange', name: 'Aurora Orange', value: '#d08770' },
      { id: 'aurora-yellow', name: 'Aurora Yellow', value: '#ebcb8b' },
      { id: 'aurora-green', name: 'Aurora Green', value: '#a3be8c' },
      { id: 'aurora-purple', name: 'Aurora Purple', value: '#b48ead' }
    ],
    tokens: {
      crust: '#2e3440', mantle: '#3b4252', base: '#434c5e',
      surface0: '#4c566a', surface1: '#5e81ac', surface2: '#81a1c1',
      overlay0: '#88c0d0', overlay1: '#8fbcbb', subtext0: '#e5e9f0',
      text: '#eceff4', red: '#bf616a', green: '#a3be8c',
      yellow: '#ebcb8b', pink: '#b48ead', blue: '#81a1c1',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.35)'
    }
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    mode: 'dark',
    defaultAccent: 'cyan',
    accents: [
      { id: 'cyan', name: 'Cyan', value: '#7dcfff' },
      { id: 'magenta', name: 'Magenta', value: '#bb9af7' },
      { id: 'blue', name: 'Blue', value: '#7aa2f7' },
      { id: 'green', name: 'Green', value: '#9ece6a' },
      { id: 'orange', name: 'Orange', value: '#ff9e64' },
      { id: 'red', name: 'Red', value: '#f7768e' }
    ],
    tokens: {
      crust: '#16161e', mantle: '#1a1b26', base: '#24283b',
      surface0: '#2f354f', surface1: '#414868', surface2: '#565f89',
      overlay0: '#737aa2', overlay1: '#9aa5ce', subtext0: '#a9b1d6',
      text: '#c0caf5', red: '#f7768e', green: '#9ece6a',
      yellow: '#e0af68', pink: '#bb9af7', blue: '#7aa2f7',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.4)'
    }
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    mode: 'dark',
    defaultAccent: 'blue',
    accents: [
      { id: 'blue', name: 'Blue', value: '#58a6ff' },
      { id: 'green', name: 'Green', value: '#3fb950' },
      { id: 'purple', name: 'Purple', value: '#bc8cff' },
      { id: 'orange', name: 'Orange', value: '#d29922' },
      { id: 'red', name: 'Red', value: '#f85149' }
    ],
    tokens: {
      crust: '#010409', mantle: '#0d1117', base: '#161b22',
      surface0: '#21262d', surface1: '#30363d', surface2: '#484f58',
      overlay0: '#6e7681', overlay1: '#8b949e', subtext0: '#b1bac4',
      text: '#f0f6fc', red: '#f85149', green: '#3fb950',
      yellow: '#d29922', pink: '#bc8cff', blue: '#58a6ff',
      hoverTint: 'rgba(255, 255, 255, 0.04)', cardShadow: 'rgba(0, 0, 0, 0.4)'
    }
  },
  {
    id: 'high-contrast-dark',
    name: 'High Contrast Dark',
    mode: 'dark',
    defaultAccent: 'yellow',
    accents: [
      { id: 'yellow', name: 'Bright Yellow', value: '#ffff00' },
      { id: 'cyan', name: 'Bright Cyan', value: '#00ffff' },
      { id: 'lime', name: 'Bright Lime', value: '#00ff00' },
      { id: 'magenta', name: 'Bright Pink', value: '#ff00ff' },
      { id: 'white', name: 'Pure White', value: '#ffffff' }
    ],
    tokens: {
      crust: '#000000', mantle: '#0a0a0a', base: '#121212',
      surface0: '#222222', surface1: '#333333', surface2: '#555555',
      overlay0: '#888888', overlay1: '#aaaaaa', subtext0: '#dddddd',
      text: '#ffffff', red: '#ff4d4d', green: '#4dff4d',
      yellow: '#ffff00', pink: '#ff66cc', blue: '#4d94ff',
      hoverTint: 'rgba(255, 255, 255, 0.12)', cardShadow: 'rgba(0, 0, 0, 0.8)'
    }
  },
  {
    id: 'one-dark-pro',
    name: 'One Dark Pro',
    mode: 'dark',
    defaultAccent: 'blue',
    accents: [
      { id: 'blue', name: 'Blue', value: '#61afef' },
      { id: 'purple', name: 'Purple', value: '#c678dd' },
      { id: 'cyan', name: 'Cyan', value: '#56b6c2' },
      { id: 'green', name: 'Green', value: '#98c379' },
      { id: 'orange', name: 'Orange', value: '#d19a66' },
      { id: 'red', name: 'Red', value: '#e06c75' }
    ],
    tokens: {
      crust: '#1e2227', mantle: '#21252b', base: '#282c34',
      surface0: '#2c313a', surface1: '#3e4451', surface2: '#4b5263',
      overlay0: '#5c6370', overlay1: '#abb2bf', subtext0: '#abb2bf',
      text: '#abb2bf', red: '#e06c75', green: '#98c379',
      yellow: '#e5c07b', pink: '#c678dd', blue: '#61afef',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.35)'
    }
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    mode: 'dark',
    defaultAccent: 'cyan',
    accents: [
      { id: 'cyan', name: 'Cyan', value: '#2aa198' },
      { id: 'blue', name: 'Blue', value: '#268bd2' },
      { id: 'violet', name: 'Violet', value: '#6c71c4' },
      { id: 'magenta', name: 'Magenta', value: '#d33682' },
      { id: 'green', name: 'Green', value: '#859900' },
      { id: 'orange', name: 'Orange', value: '#cb4b16' }
    ],
    tokens: {
      crust: '#001e26', mantle: '#00212b', base: '#002b36',
      surface0: '#073642', surface1: '#586e75', surface2: '#657b83',
      overlay0: '#839496', overlay1: '#93a1a1', subtext0: '#93a1a1',
      text: '#839496', red: '#dc322f', green: '#859900',
      yellow: '#b58900', pink: '#d33682', blue: '#268bd2',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.4)'
    }
  },
  {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    mode: 'dark',
    defaultAccent: 'yellow',
    accents: [
      { id: 'yellow', name: 'Yellow', value: '#fabd2f' },
      { id: 'orange', name: 'Orange', value: '#fe8019' },
      { id: 'red', name: 'Red', value: '#fb4934' },
      { id: 'green', name: 'Green', value: '#b8bb26' },
      { id: 'aqua', name: 'Aqua', value: '#8ec07c' },
      { id: 'purple', name: 'Purple', value: '#d3869b' }
    ],
    tokens: {
      crust: '#1d2021', mantle: '#282828', base: '#3c3836',
      surface0: '#504945', surface1: '#665c54', surface2: '#7c6f64',
      overlay0: '#928374', overlay1: '#a89984', subtext0: '#bdae93',
      text: '#ebdbb2', red: '#fb4934', green: '#b8bb26',
      yellow: '#fabd2f', pink: '#d3869b', blue: '#83a598',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.4)'
    }
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    mode: 'dark',
    defaultAccent: 'rose',
    accents: [
      { id: 'rose', name: 'Rose', value: '#ebbcba' },
      { id: 'pine', name: 'Pine', value: '#31748f' },
      { id: 'foam', name: 'Foam', value: '#9ccfd8' },
      { id: 'iris', name: 'Iris', value: '#c4a7e7' },
      { id: 'gold', name: 'Gold', value: '#f6c177' },
      { id: 'love', name: 'Love', value: '#eb6f92' }
    ],
    tokens: {
      crust: '#121019', mantle: '#191724', base: '#1f1d2e',
      surface0: '#26233a', surface1: '#403d52', surface2: '#524f67',
      overlay0: '#6e6a86', overlay1: '#908caa', subtext0: '#e0def4',
      text: '#e0def4', red: '#eb6f92', green: '#31748f',
      yellow: '#f6c177', pink: '#ebbcba', blue: '#9ccfd8',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.4)'
    }
  },
  {
    id: 'monokai-pro',
    name: 'Monokai Pro',
    mode: 'dark',
    defaultAccent: 'yellow',
    accents: [
      { id: 'yellow', name: 'Yellow', value: '#ffd866' },
      { id: 'pink', name: 'Pink', value: '#ff6188' },
      { id: 'orange', name: 'Orange', value: '#fc9867' },
      { id: 'green', name: 'Green', value: '#a9dc76' },
      { id: 'cyan', name: 'Cyan', value: '#78dce8' },
      { id: 'purple', name: 'Purple', value: '#ab9df2' }
    ],
    tokens: {
      crust: '#19181a', mantle: '#221f22', base: '#2d2a2e',
      surface0: '#3a373b', surface1: '#4a474b', surface2: '#5b575c',
      overlay0: '#726e74', overlay1: '#938e94', subtext0: '#c1bec1',
      text: '#fcfcfa', red: '#ff6188', green: '#a9dc76',
      yellow: '#ffd866', pink: '#ab9df2', blue: '#78dce8',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.4)'
    }
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    mode: 'dark',
    defaultAccent: 'cyan',
    accents: [
      { id: 'cyan', name: 'Cyan', value: '#7fdbca' },
      { id: 'blue', name: 'Blue', value: '#82aaff' },
      { id: 'purple', name: 'Purple', value: '#c792ea' },
      { id: 'yellow', name: 'Yellow', value: '#ecc48d' },
      { id: 'green', name: 'Green', value: '#addb67' },
      { id: 'red', name: 'Red', value: '#ef5350' }
    ],
    tokens: {
      crust: '#010e1a', mantle: '#011627', base: '#0b253a',
      surface0: '#11334f', surface1: '#1d3b53', surface2: '#2b4d66',
      overlay0: '#5f7e97', overlay1: '#7e97a6', subtext0: '#a6accd',
      text: '#d6deeb', red: '#ef5350', green: '#addb67',
      yellow: '#ecc48d', pink: '#c792ea', blue: '#82aaff',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.45)'
    }
  },
  {
    id: 'palenight',
    name: 'Material Palenight',
    mode: 'dark',
    defaultAccent: 'purple',
    accents: [
      { id: 'purple', name: 'Purple', value: '#c792ea' },
      { id: 'cyan', name: 'Cyan', value: '#89ddff' },
      { id: 'blue', name: 'Blue', value: '#82aaff' },
      { id: 'green', name: 'Green', value: '#c3e88d' },
      { id: 'orange', name: 'Orange', value: '#f78c6c' },
      { id: 'red', name: 'Red', value: '#ff5370' }
    ],
    tokens: {
      crust: '#1b1e2b', mantle: '#212534', base: '#292d3e',
      surface0: '#343b51', surface1: '#434c67', surface2: '#54607f',
      overlay0: '#676e95', overlay1: '#8796b0', subtext0: '#a6accd',
      text: '#a6accd', red: '#ff5370', green: '#c3e88d',
      yellow: '#ffcb6b', pink: '#c792ea', blue: '#82aaff',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.4)'
    }
  },
  {
    id: 'kanagawa-wave',
    name: 'Kanagawa Wave',
    mode: 'dark',
    defaultAccent: 'wave-blue',
    accents: [
      { id: 'wave-blue', name: 'Wave Blue', value: '#7e9cd8' },
      { id: 'spring-green', name: 'Spring Green', value: '#98bb6c' },
      { id: 'carp-yellow', name: 'Carp Yellow', value: '#e6c384' },
      { id: 'surimi-orange', name: 'Surimi Orange', value: '#ffa066' },
      { id: 'sakura-pink', name: 'Sakura Pink', value: '#d27e99' },
      { id: 'oni-violet', name: 'Oni Violet', value: '#957fb8' }
    ],
    tokens: {
      crust: '#121215', mantle: '#16161d', base: '#1f1f28',
      surface0: '#2a2a37', surface1: '#363646', surface2: '#54546d',
      overlay0: '#717c7c', overlay1: '#938aa9', subtext0: '#c8c093',
      text: '#dcd7ba', red: '#c34043', green: '#76946a',
      yellow: '#c0a36e', pink: '#957fb8', blue: '#7e9cd8',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.4)'
    }
  },
  {
    id: 'google-dark',
    name: 'Google Dark',
    mode: 'dark',
    defaultAccent: 'blue',
    accents: [
      { id: 'blue', name: 'Google Blue', value: '#8ab4f8' },
      { id: 'red', name: 'Google Red', value: '#f28b82' },
      { id: 'yellow', name: 'Google Yellow', value: '#fdd663' },
      { id: 'green', name: 'Google Green', value: '#81c995' }
    ],
    tokens: {
      crust: '#171717', mantle: '#202124', base: '#303134',
      surface0: '#3c4043', surface1: '#4a4e51', surface2: '#5f6368',
      overlay0: '#80868b', overlay1: '#9aa0a6', subtext0: '#bdc1c6',
      text: '#e8eaed', red: '#f28b82', green: '#81c995',
      yellow: '#fdd663', pink: '#f6aea9', blue: '#8ab4f8',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.35)'
    }
  },
  {
    id: 'slack-dark',
    name: 'Slack Dark',
    mode: 'dark',
    defaultAccent: 'aubergine',
    accents: [
      { id: 'aubergine', name: 'Aubergine', value: '#611f69' },
      { id: 'green', name: 'Active Green', value: '#2bac76' },
      { id: 'blue', name: 'Mentions Blue', value: '#1264a3' },
      { id: 'amber', name: 'Notification Gold', value: '#e8912d' }
    ],
    tokens: {
      crust: '#121016', mantle: '#1a1d21', base: '#222529',
      surface0: '#2c3136', surface1: '#383e45', surface2: '#4a515a',
      overlay0: '#616871', overlay1: '#868e96', subtext0: '#abadaf',
      text: '#d1d2d3', red: '#e01e5a', green: '#2bac76',
      yellow: '#ecb22e', pink: '#e01e5a', blue: '#36c5f0',
      hoverTint: 'rgba(255, 255, 255, 0.05)', cardShadow: 'rgba(0, 0, 0, 0.4)'
    }
  },
  {
    id: 'vercel-dark',
    name: 'Vercel Dark',
    mode: 'dark',
    defaultAccent: 'white',
    accents: [
      { id: 'white', name: 'Pure White', value: '#ffffff' },
      { id: 'blue', name: 'Vercel Blue', value: '#0070f3' },
      { id: 'cyan', name: 'Geist Cyan', value: '#50e3c2' },
      { id: 'purple', name: 'Geist Purple', value: '#7928ca' }
    ],
    tokens: {
      crust: '#000000', mantle: '#0a0a0a', base: '#111111',
      surface0: '#1a1a1a', surface1: '#262626', surface2: '#333333',
      overlay0: '#444444', overlay1: '#666666', subtext0: '#888888',
      text: '#eddfe0', red: '#ee0000', green: '#50e3c2',
      yellow: '#f5a623', pink: '#f81ce5', blue: '#0070f3',
      hoverTint: 'rgba(255, 255, 255, 0.08)', cardShadow: 'rgba(0, 0, 0, 0.8)'
    }
  },
  {
    id: 'x-lights-out',
    name: 'Twitter Lights Out',
    mode: 'dark',
    defaultAccent: 'twitter-blue',
    accents: [
      { id: 'twitter-blue', name: 'X Blue', value: '#1d9bf0' },
      { id: 'yellow', name: 'Yellow', value: '#ffd400' },
      { id: 'pink', name: 'Magenta', value: '#f91880' },
      { id: 'purple', name: 'Purple', value: '#7856ff' },
      { id: 'orange', name: 'Orange', value: '#ff7a00' },
      { id: 'green', name: 'Green', value: '#00ba7c' }
    ],
    tokens: {
      crust: '#000000', mantle: '#0a0a0a', base: '#16181c',
      surface0: '#202327', surface1: '#2f3336', surface2: '#3e4144',
      overlay0: '#536471', overlay1: '#71767b', subtext0: '#8b98a5',
      text: '#e7e9ea', red: '#f4212e', green: '#00ba7c',
      yellow: '#ffd400', pink: '#f91880', blue: '#1d9bf0',
      hoverTint: 'rgba(255, 255, 255, 0.07)', cardShadow: 'rgba(0, 0, 0, 0.6)'
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
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    mode: 'light',
    defaultAccent: 'blue',
    accents: [
      { id: 'blue', name: 'Blue', value: '#0969da' },
      { id: 'green', name: 'Green', value: '#1a7f37' },
      { id: 'purple', name: 'Purple', value: '#8250df' },
      { id: 'orange', name: 'Orange', value: '#bf8700' },
      { id: 'red', name: 'Red', value: '#cf222e' }
    ],
    tokens: {
      crust: '#f6f8fa', mantle: '#ffffff', base: '#ffffff',
      surface0: '#f6f8fa', surface1: '#eaeeed', surface2: '#d0d7de',
      overlay0: '#afb8c1', overlay1: '#8c959f', subtext0: '#57606a',
      text: '#24292f', red: '#cf222e', green: '#1a7f37',
      yellow: '#bf8700', pink: '#8250df', blue: '#0969da',
      hoverTint: 'rgba(0, 0, 0, 0.05)', cardShadow: 'rgba(31, 35, 40, 0.12)'
    }
  },
  {
    id: 'high-contrast-light',
    name: 'High Contrast Light',
    mode: 'light',
    defaultAccent: 'blue',
    accents: [
      { id: 'blue', name: 'Cobalt Blue', value: '#0020c2' },
      { id: 'red', name: 'Crimson Red', value: '#b30000' },
      { id: 'green', name: 'Dark Green', value: '#006600' },
      { id: 'purple', name: 'Deep Purple', value: '#520066' },
      { id: 'black', name: 'Jet Black', value: '#000000' }
    ],
    tokens: {
      crust: '#eaeaea', mantle: '#f5f5f5', base: '#ffffff',
      surface0: '#e0e0e0', surface1: '#cccccc', surface2: '#999999',
      overlay0: '#666666', overlay1: '#444444', subtext0: '#222222',
      text: '#000000', red: '#b30000', green: '#006600',
      yellow: '#806000', pink: '#990066', blue: '#0020c2',
      hoverTint: 'rgba(0, 0, 0, 0.08)', cardShadow: 'rgba(0, 0, 0, 0.25)'
    }
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    mode: 'light',
    defaultAccent: 'cyan',
    accents: [
      { id: 'cyan', name: 'Cyan', value: '#2aa198' },
      { id: 'blue', name: 'Blue', value: '#268bd2' },
      { id: 'violet', name: 'Violet', value: '#6c71c4' },
      { id: 'magenta', name: 'Magenta', value: '#d33682' },
      { id: 'green', name: 'Green', value: '#859900' },
      { id: 'orange', name: 'Orange', value: '#cb4b16' }
    ],
    tokens: {
      crust: '#eee8d5', mantle: '#fdf6e3', base: '#fdf6e3',
      surface0: '#eee8d5', surface1: '#93a1a1', surface2: '#839496',
      overlay0: '#657b83', overlay1: '#586e75', subtext0: '#586e75',
      text: '#657b83', red: '#dc322f', green: '#859900',
      yellow: '#b58900', pink: '#d33682', blue: '#268bd2',
      hoverTint: 'rgba(0, 0, 0, 0.04)', cardShadow: 'rgba(0, 0, 0, 0.08)'
    }
  },
  {
    id: 'gruvbox-light',
    name: 'Gruvbox Light',
    mode: 'light',
    defaultAccent: 'orange',
    accents: [
      { id: 'orange', name: 'Orange', value: '#af3a03' },
      { id: 'yellow', name: 'Yellow', value: '#b57614' },
      { id: 'red', name: 'Red', value: '#9d0006' },
      { id: 'green', name: 'Green', value: '#79740e' },
      { id: 'aqua', name: 'Aqua', value: '#427b58' },
      { id: 'purple', name: 'Purple', value: '#8f3f71' }
    ],
    tokens: {
      crust: '#d5c4a1', mantle: '#fbf1c7', base: '#fbf1c7',
      surface0: '#ebdbb2', surface1: '#d5c4a1', surface2: '#bdae93',
      overlay0: '#a89984', overlay1: '#928374', subtext0: '#665c54',
      text: '#3c3836', red: '#9d0006', green: '#79740e',
      yellow: '#b57614', pink: '#8f3f71', blue: '#076678',
      hoverTint: 'rgba(0, 0, 0, 0.04)', cardShadow: 'rgba(0, 0, 0, 0.08)'
    }
  },
  {
    id: 'rose-pine-dawn',
    name: 'Rosé Pine Dawn',
    mode: 'light',
    defaultAccent: 'rose',
    accents: [
      { id: 'rose', name: 'Rose', value: '#d7827e' },
      { id: 'pine', name: 'Pine', value: '#286983' },
      { id: 'foam', name: 'Foam', value: '#56949f' },
      { id: 'iris', name: 'Iris', value: '#907aa9' },
      { id: 'gold', name: 'Gold', value: '#ea9d34' },
      { id: 'love', name: 'Love', value: '#b4637a' }
    ],
    tokens: {
      crust: '#f2e9e1', mantle: '#faf4ed', base: '#faf4ed',
      surface0: '#f2e9e1', surface1: '#e4dcd4', surface2: '#dfdad9',
      overlay0: '#cecacd', overlay1: '#9893a5', subtext0: '#797593',
      text: '#575279', red: '#b4637a', green: '#286983',
      yellow: '#ea9d34', pink: '#d7827e', blue: '#56949f',
      hoverTint: 'rgba(0, 0, 0, 0.04)', cardShadow: 'rgba(0, 0, 0, 0.08)'
    }
  },
  {
    id: 'google-light',
    name: 'Google Light',
    mode: 'light',
    defaultAccent: 'blue',
    accents: [
      { id: 'blue', name: 'Google Blue', value: '#1a73e8' },
      { id: 'red', name: 'Google Red', value: '#d93025' },
      { id: 'yellow', name: 'Google Yellow', value: '#f9ab00' },
      { id: 'green', name: 'Google Green', value: '#188038' }
    ],
    tokens: {
      crust: '#f1f3f4', mantle: '#f8f9fa', base: '#ffffff',
      surface0: '#f1f3f4', surface1: '#e8eaed', surface2: '#dadce0',
      overlay0: '#bdc1c6', overlay1: '#9aa0a6', subtext0: '#5f6368',
      text: '#202124', red: '#d93025', green: '#188038',
      yellow: '#f9ab00', pink: '#e37400', blue: '#1a73e8',
      hoverTint: 'rgba(0, 0, 0, 0.04)', cardShadow: 'rgba(60, 64, 67, 0.15)'
    }
  },
  {
    id: 'hacker-news',
    name: 'Hacker News',
    mode: 'light',
    defaultAccent: 'hn-orange',
    accents: [
      { id: 'hn-orange', name: 'HN Orange', value: '#ff6600' },
      { id: 'burnt-orange', name: 'Burnt Orange', value: '#d05300' }
    ],
    tokens: {
      crust: '#e8e8e0', mantle: '#f6f6ef', base: '#ffffff',
      surface0: '#f6f6ef', surface1: '#ecece3', surface2: '#e2e2d8',
      overlay0: '#a5a59d', overlay1: '#828282', subtext0: '#717171',
      text: '#222222', red: '#cc0000', green: '#2e7d32',
      yellow: '#ff6600', pink: '#d05300', blue: '#0066cc',
      hoverTint: 'rgba(0, 0, 0, 0.04)', cardShadow: 'rgba(0, 0, 0, 0.08)'
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