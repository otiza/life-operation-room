/*
  OKLCH → sRGB maths for contrast checks and DESIGN.md export.
  Only plain `oklch(L C H)` values are supported (optional alpha is ignored); that is the only colour form the palettes use.
*/

export type Oklch = [l: number, c: number, h: number];

export function parseOklch(value: string): Oklch | null {
  const match = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*[\d.]+\s*)?\)$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Linear sRGB channels, clamped to the gamut. */
function linearRgb([L, C, h]: Oklch): [number, number, number] {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export function luminance(color: Oklch) {
  const [r, g, b] = linearRgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(x: Oklch, y: Oklch) {
  const a = luminance(x);
  const b = luminance(y);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function toHex(color: Oklch) {
  return `#${linearRgb(color)
    .map((channel) => {
      const encoded = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
      return Math.round(encoded * 255).toString(16).padStart(2, '0');
    })
    .join('')}`;
}
