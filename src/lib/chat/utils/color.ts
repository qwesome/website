export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function relativeLuminance(rgb: RGB): number {
  const [aR, aG, aB] = [rgb.r, rgb.g, rgb.b].map(v => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableOn(bgHex: string, lightHex = '#ffffff', darkHex = '#181926'): string {
  const lightContrast = contrastRatio(bgHex, lightHex);
  const darkContrast = contrastRatio(bgHex, darkHex);
  return lightContrast >= darkContrast ? lightHex : darkHex;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

/**
 * Pushes `fgHex` toward white (on dark backgrounds) or black (on light ones)
 * until it clears `min` contrast against `bgHex`. Used so palette colours stay
 * legible whichever theme/background they land on.
 */
export function ensureLegible(fgHex: string, bgHex: string, min = 3): string {
  if (contrastRatio(fgHex, bgHex) >= min) return fgHex;
  const fg = hexToRgb(fgHex);
  const target = relativeLuminance(hexToRgb(bgHex)) < 0.5 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  let best = fgHex;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    best = rgbToHex(mix(fg, target, t));
    if (contrastRatio(best, bgHex) >= min) return best;
  }
  return best;
}