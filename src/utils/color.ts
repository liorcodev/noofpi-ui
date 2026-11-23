import type { ColorPickerFormat } from "../types";

/** A color as hue (0-360), saturation, value and alpha (all 0-1). It keeps the hue of grays, which RGB can't */
export interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

const round = (n: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
};

function rgbToHsva(r: number, g: number, b: number, a: number): Hsva {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? delta / max : 0, v: max, a };
}

export function hsvaToRgb({ h, s, v }: Hsva): [number, number, number] {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return [channel(5), channel(3), channel(1)];
}

function hsvaToHsl({ h, s, v }: Hsva): [number, number, number] {
  const l = v * (1 - s / 2);
  return [h, l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l), l];
}

function hslToHsva(h: number, s: number, l: number, a: number): Hsva {
  const v = l + s * Math.min(l, 1 - l);
  return { h, s: v ? 2 * (1 - l / v) : 0, v, a };
}

const HEX = /^#?([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const FUNCTION = /^(rgba?|hsla?)\(\s*([^)]+?)\s*\)$/i;

/** A channel as a number, or a percentage of `scale` */
function channel(token: string, scale: number): number | null {
  const percent = token.endsWith("%");
  const n = Number(percent ? token.slice(0, -1) : token);
  if (token === "" || Number.isNaN(n)) return null;
  return percent ? (n / 100) * scale : n;
}

/** Reads `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()` and `hsl()`/`hsla()` (comma or space separated) */
export function parseColor(value: unknown): Hsva | null {
  if (typeof value !== "string") return null;
  const text = value.trim();

  const hex = HEX.exec(text)?.[1];
  if (hex) {
    const full =
      hex.length <= 4 ? [...hex].map((char) => char + char).join("") : hex;
    const [r, g, b, a] = [0, 2, 4, 6].map((i) =>
      full.length > i ? parseInt(full.slice(i, i + 2), 16) : 255,
    ) as [number, number, number, number];
    return rgbToHsva(r, g, b, a / 255);
  }

  const match = FUNCTION.exec(text);
  if (!match) return null;
  const tokens = match[2]!.split(/[\s,/]+/).filter(Boolean);
  if (tokens.length < 3 || tokens.length > 4) return null;

  const alpha = tokens[3] === undefined ? 1 : channel(tokens[3], 1);
  if (alpha === null) return null;
  const a = clamp(alpha, 0, 1);

  if (match[1]!.toLowerCase().startsWith("rgb")) {
    const [r, g, b] = tokens.slice(0, 3).map((token) => channel(token, 255));
    if (r == null || g == null || b == null) return null;
    return rgbToHsva(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255), a);
  }

  const hue = channel(tokens[0]!.replace(/deg$/i, ""), 360);
  const s = channel(tokens[1]!, 1);
  const l = channel(tokens[2]!, 1);
  if (hue === null || s === null || l === null) return null;
  // Bare `s` and `l` numbers are percentages in CSS
  const toUnit = (token: string, n: number) =>
    token.endsWith("%") ? n : n / 100;
  return hslToHsva(
    ((hue % 360) + 360) % 360,
    clamp(toUnit(tokens[1]!, s), 0, 1),
    clamp(toUnit(tokens[2]!, l), 0, 1),
    a,
  );
}

const hex2 = (n: number) => n.toString(16).padStart(2, "0");

/** The color as a CSS string. A color that isn't fully opaque keeps its alpha, unless `alpha` is `false` */
export function formatColor(
  color: Hsva,
  format: ColorPickerFormat,
  alpha = true,
): string {
  const a = alpha ? round(clamp(color.a, 0, 1), 2) : 1;
  if (format === "hsl") {
    const [h, s, l] = hsvaToHsl(color);
    const parts = `${round(h)}, ${round(s * 100)}%, ${round(l * 100)}%`;
    return a < 1 ? `hsla(${parts}, ${a})` : `hsl(${parts})`;
  }
  const [r, g, b] = hsvaToRgb(color);
  if (format === "rgb")
    return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(Math.round(a * 255)) : ""}`;
}
