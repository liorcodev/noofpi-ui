import type { ShapeKind } from "../types";
import { round } from "./background";

/**
 * How a shape is drawn in a 100x100 box: `solid` shapes can be filled or outlined, `line` shapes are
 * always strokes, `dots` are always filled.
 */
export interface ShapePath {
  d: string;
  mode: "solid" | "line" | "dots";
  evenodd?: boolean;
}

const polygon = (sides: number, rotation = -90, radius = 46) =>
  `M${Array.from({ length: sides }, (_, i) => {
    const angle = ((rotation + (360 / sides) * i) * Math.PI) / 180;
    return `${round(50 + radius * Math.cos(angle))} ${round(50 + radius * Math.sin(angle))}`;
  }).join("L")}Z`;

const star = (points: number, outer = 46, inner = 20) =>
  `M${Array.from({ length: points * 2 }, (_, i) => {
    const angle = ((-90 + (180 / points) * i) * Math.PI) / 180;
    const radius = i % 2 ? inner : outer;
    return `${round(50 + radius * Math.cos(angle))} ${round(50 + radius * Math.sin(angle))}`;
  }).join("L")}Z`;

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;

export const SHAPE_PATHS: Record<ShapeKind, ShapePath> = {
  circle: { d: circle(50, 50, 46), mode: "solid" },
  ring: {
    d: circle(50, 50, 46) + circle(50, 50, 26),
    mode: "solid",
    evenodd: true,
  },
  square: { d: "M8 8H92V92H8Z", mode: "solid" },
  squircle: {
    d: "M30 8H70C86 8 92 14 92 30V70C92 86 86 92 70 92H30C14 92 8 86 8 70V30C8 14 14 8 30 8Z",
    mode: "solid",
  },
  triangle: { d: polygon(3), mode: "solid" },
  diamond: { d: polygon(4), mode: "solid" },
  pentagon: { d: polygon(5), mode: "solid" },
  hexagon: { d: polygon(6, 0), mode: "solid" },
  octagon: { d: polygon(8, -67.5), mode: "solid" },
  star: { d: star(5), mode: "solid" },
  sparkle: {
    d: "M50 4C54 32 68 46 96 50C68 54 54 68 50 96C46 68 32 54 4 50C32 46 46 32 50 4Z",
    mode: "solid",
  },
  plus: {
    d: "M38 8H62V38H92V62H62V92H38V62H8V38H38Z",
    mode: "solid",
  },
  semicircle: { d: "M4 70A46 46 0 0 1 96 70Z", mode: "solid" },
  quarter: { d: "M10 90V10A80 80 0 0 1 90 90Z", mode: "solid" },
  crescent: {
    d: "M62 6A46 46 0 1 0 94 62A36 36 0 0 1 62 6Z",
    mode: "solid",
  },
  cross: { d: "M16 16L84 84M84 16L16 84", mode: "line" },
  asterisk: { d: "M50 6V94M12 28L88 72M88 28L12 72", mode: "line" },
  arc: { d: "M10 76A40 40 0 0 1 90 76", mode: "line" },
  wave: { d: "M4 50Q16 22 28 50T52 50T76 50T100 50", mode: "line" },
  zigzag: { d: "M4 66L22 34L40 66L58 34L76 66L94 34", mode: "line" },
  bars: { d: "M18 12V88M39 12V88M61 12V88M82 12V88", mode: "line" },
  dots: {
    d: [18, 50, 82]
      .flatMap((y) => [18, 50, 82].map((x) => circle(x, y, 6)))
      .join(""),
    mode: "dots",
  },
};
