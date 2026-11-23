import { BUTTON_COLORS } from "../types";

/** A small seeded random generator (mulberry32): the same seed always gives the same numbers */
export function createRandom(seed: number): () => number {
  let state = Math.floor(Number.isFinite(seed) ? seed : 1) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** A color name (`"primary"`) becomes its theme variable; any other string is used as a CSS color */
export function resolveColor(color: string, shade = 500): string {
  if (!(BUTTON_COLORS as readonly string[]).includes(color)) return color;
  const nearest = SHADES.reduce((a, b) =>
    Math.abs(b - shade) < Math.abs(a - shade) ? b : a,
  );
  return `var(--ui-${color}-${nearest})`;
}
