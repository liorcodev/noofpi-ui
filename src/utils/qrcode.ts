import type { QRCodeErrorCorrection } from "../types";

/** How the text was packed: the denser `numeric` and `alphanumeric` modes are picked automatically when the text fits. */
export type QRMode = "numeric" | "alphanumeric" | "byte";

export interface QROptions {
  /** Error correction level. Default: `"M"` */
  ecc?: QRCodeErrorCorrection;
  /** Smallest version (1 to 40) to use, the code grows to fit longer text. Default: `1` */
  minVersion?: number;
  /** Mask pattern (0 to 7). By default the one with the lowest penalty is used */
  mask?: number;
}

export interface QRMatrix {
  /** 1 to 40 */
  version: number;
  /** Modules per side: `17 + 4 * version` */
  size: number;
  ecc: QRCodeErrorCorrection;
  /** The mask pattern that was applied, 0 to 7 */
  mask: number;
  mode: QRMode;
  /** `modules[y][x]` is `true` for a dark module */
  modules: boolean[][];
}

const MIN_VERSION = 1;
const MAX_VERSION = 40;

const ECC_INDEX: Record<QRCodeErrorCorrection, number> = {
  L: 0,
  M: 1,
  Q: 2,
  H: 3,
};
// The two bits written into the format information
const ECC_FORMAT_BITS: Record<QRCodeErrorCorrection, number> = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

// Per error correction level (L, M, Q, H) and version; index 0 is unused
const ECC_CODEWORDS_PER_BLOCK = [
  [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30,
    28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30,
  ],
  [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26,
    26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
    28, 28, 28,
  ],
  [
    -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28,
    26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30,
  ],
  [
    -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28,
    26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30,
  ],
];
const ERROR_CORRECTION_BLOCKS = [
  [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10,
    12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
  ],
  [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17,
    17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
  [
    -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23,
    23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
  ],
  [
    -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25,
    25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77,
    81,
  ],
];

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const NUMERIC_PATTERN = /^[0-9]+$/;
const ALPHANUMERIC_PATTERN = /^[0-9A-Z $%*+\-./:]+$/;

const MODE_INDICATOR: Record<QRMode, number> = {
  numeric: 0b0001,
  alphanumeric: 0b0010,
  byte: 0b0100,
};
// Bits of the character count field for versions 1-9, 10-26 and 27-40
const COUNT_BITS: Record<QRMode, [number, number, number]> = {
  numeric: [10, 12, 14],
  alphanumeric: [9, 11, 13],
  byte: [8, 16, 16],
};

const bit = (value: number, index: number) => ((value >>> index) & 1) !== 0;

function appendBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

function pickMode(text: string): QRMode {
  if (NUMERIC_PATTERN.test(text)) return "numeric";
  if (ALPHANUMERIC_PATTERN.test(text)) return "alphanumeric";
  return "byte";
}

interface Segment {
  mode: QRMode;
  /** Characters, or bytes in byte mode */
  count: number;
  bits: number[];
}

function makeSegment(text: string): Segment {
  const mode = pickMode(text);
  const bits: number[] = [];
  if (mode === "numeric") {
    for (let i = 0; i < text.length; i += 3) {
      const group = text.slice(i, i + 3);
      appendBits(bits, Number(group), group.length * 3 + 1);
    }
    return { mode, count: text.length, bits };
  }
  if (mode === "alphanumeric") {
    for (let i = 0; i < text.length; i += 2) {
      if (i + 1 < text.length)
        appendBits(
          bits,
          ALPHANUMERIC.indexOf(text[i]!) * 45 +
            ALPHANUMERIC.indexOf(text[i + 1]!),
          11,
        );
      else appendBits(bits, ALPHANUMERIC.indexOf(text[i]!), 6);
    }
    return { mode, count: text.length, bits };
  }
  const bytes = new TextEncoder().encode(text);
  for (const byte of bytes) appendBits(bits, byte, 8);
  return { mode, count: bytes.length, bits };
}

const countBits = (mode: QRMode, version: number) =>
  COUNT_BITS[mode][version <= 9 ? 0 : version <= 26 ? 1 : 2];

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step =
    version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const positions = [6];
  for (let pos = version * 4 + 10; positions.length < count; pos -= step)
    positions.splice(1, 0, pos);
  return positions;
}

// Modules left for data and error correction once every function pattern is accounted for
function rawDataModules(version: number) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const count = Math.floor(version / 7) + 2;
    result -= (25 * count - 10) * count - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version: number, ecc: QRCodeErrorCorrection) {
  const index = ECC_INDEX[ecc];
  return (
    Math.floor(rawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[index]![version]! *
      ERROR_CORRECTION_BLOCKS[index]![version]!
  );
}

// Reed-Solomon over GF(256) with the primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;

const multiply = (a: number, b: number) =>
  a && b ? EXP[LOG[a]! + LOG[b]!]! : 0;

function reedSolomonDivisor(degree: number) {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = multiply(result[j]!, root);
      if (j + 1 < degree) result[j]! ^= result[j + 1]!;
    }
    root = multiply(root, 2);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]) {
  const result = new Array<number>(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);
    divisor.forEach((coefficient, i) => {
      result[i]! ^= multiply(coefficient, factor);
    });
  }
  return result;
}

// Splits the data into blocks, adds error correction to each and interleaves them
function addErrorCorrection(
  data: number[],
  version: number,
  ecc: QRCodeErrorCorrection,
) {
  const index = ECC_INDEX[ecc];
  const blockCount = ERROR_CORRECTION_BLOCKS[index]![version]!;
  const eccLength = ECC_CODEWORDS_PER_BLOCK[index]![version]!;
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blockCount - (rawCodewords % blockCount);
  const shortLength = Math.floor(rawCodewords / blockCount);

  const divisor = reedSolomonDivisor(eccLength);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < blockCount; i++) {
    const length = shortLength - eccLength + (i < shortBlocks ? 0 : 1);
    const block = data.slice(k, k + length);
    k += length;
    const parity = reedSolomonRemainder(block, divisor);
    // Short blocks get a gap so every block has the same length
    if (i < shortBlocks) block.push(0);
    blocks.push(block.concat(parity));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0]!.length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLength - eccLength || j >= shortBlocks)
        result.push(block[i]!);
    });
  }
  return result;
}

function buildCodewords(
  segment: Segment,
  version: number,
  ecc: QRCodeErrorCorrection,
) {
  const capacity = dataCodewords(version, ecc) * 8;
  const bits: number[] = [];
  appendBits(bits, MODE_INDICATOR[segment.mode], 4);
  appendBits(bits, segment.count, countBits(segment.mode, version));
  for (const value of segment.bits) bits.push(value);
  appendBits(bits, 0, Math.min(4, capacity - bits.length));
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11)
    appendBits(bits, pad, 8);

  const codewords: number[] = new Array(bits.length / 8).fill(0);
  bits.forEach((value, i) => {
    codewords[i >>> 3]! |= value << (7 - (i & 7));
  });
  return codewords;
}

class Grid {
  readonly modules: boolean[][];
  private readonly reserved: boolean[][];

  constructor(readonly size: number) {
    this.modules = Array.from({ length: size }, () =>
      new Array<boolean>(size).fill(false),
    );
    this.reserved = Array.from({ length: size }, () =>
      new Array<boolean>(size).fill(false),
    );
  }

  isReserved(x: number, y: number) {
    return this.reserved[y]![x]!;
  }

  setFunction(x: number, y: number, dark: boolean) {
    this.modules[y]![x] = dark;
    this.reserved[y]![x] = true;
  }

  drawFunctionPatterns(version: number) {
    const { size } = this;
    for (let i = 0; i < size; i++) {
      this.setFunction(6, i, i % 2 === 0);
      this.setFunction(i, 6, i % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(size - 4, 3);
    this.drawFinder(3, size - 4);

    const positions = alignmentPositions(version);
    const last = positions.length - 1;
    positions.forEach((x, i) =>
      positions.forEach((y, j) => {
        // The three corners belong to the finder patterns
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === last) ||
          (i === last && j === 0)
        )
          return;
        this.drawAlignment(x, y);
      }),
    );

    // Reserve the format area; the real bits come with the mask
    this.drawFormat(ECC_FORMAT_BITS.L, 0);
    this.drawVersion(version);
  }

  private drawFinder(cx: number, cy: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < this.size && y >= 0 && y < this.size)
          this.setFunction(x, y, distance !== 2 && distance !== 4);
      }
    }
  }

  private drawAlignment(cx: number, cy: number) {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        this.setFunction(
          cx + dx,
          cy + dy,
          Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
        );
  }

  drawFormat(eccBits: number, mask: number) {
    const { size } = this;
    const data = (eccBits << 3) | mask;
    let rest = data;
    for (let i = 0; i < 10; i++) rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
    const bits = ((data << 10) | rest) ^ 0x5412;

    for (let i = 0; i <= 5; i++) this.setFunction(8, i, bit(bits, i));
    this.setFunction(8, 7, bit(bits, 6));
    this.setFunction(8, 8, bit(bits, 7));
    this.setFunction(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) this.setFunction(14 - i, 8, bit(bits, i));

    for (let i = 0; i < 8; i++) this.setFunction(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++)
      this.setFunction(8, size - 15 + i, bit(bits, i));
    this.setFunction(8, size - 8, true);
  }

  private drawVersion(version: number) {
    if (version < 7) return;
    let rest = version;
    for (let i = 0; i < 12; i++) rest = (rest << 1) ^ ((rest >>> 11) * 0x1f25);
    const bits = (version << 12) | rest;
    for (let i = 0; i < 18; i++) {
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunction(a, b, bit(bits, i));
      this.setFunction(b, a, bit(bits, i));
    }
  }

  // Zigzags up and down two-module columns from the bottom right corner
  drawCodewords(codewords: number[]) {
    const { size } = this;
    const total = codewords.length * 8;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < size; vertical++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vertical : vertical;
          if (!this.isReserved(x, y) && i < total) {
            this.modules[y]![x] = bit(codewords[i >>> 3]!, 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  applyMask(mask: number) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.isReserved(x, y) || !maskHits(mask, x, y)) continue;
        this.modules[y]![x] = !this.modules[y]![x];
      }
    }
  }

  penalty() {
    const { size, modules } = this;
    let result = 0;
    let dark = 0;

    // Runs of 5 or more modules, and the 1:1:3:1:1 finder look-alike with four light modules beside it
    const scan = (line: boolean[]) => {
      let run = 1;
      for (let i = 1; i <= line.length; i++) {
        if (i < line.length && line[i] === line[i - 1]) {
          run++;
          continue;
        }
        if (run >= 5) result += 3 + run - 5;
        run = 1;
      }
      for (let i = 0; i + 11 <= line.length; i++) {
        const window = line
          .slice(i, i + 11)
          .map(Number)
          .join("");
        if (window === "10111010000" || window === "00001011101") result += 40;
      }
    };
    for (let y = 0; y < size; y++) {
      scan(modules[y]!);
      scan(modules.map((row) => row[y]!));
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (modules[y]![x]) dark++;
        if (
          x < size - 1 &&
          y < size - 1 &&
          modules[y]![x] === modules[y]![x + 1] &&
          modules[y]![x] === modules[y + 1]![x] &&
          modules[y]![x] === modules[y + 1]![x + 1]
        )
          result += 3;
      }
    }

    const total = size * size;
    result += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return result;
  }
}

function maskHits(mask: number, x: number, y: number) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/**
 * Encodes `text` as a QR Code (Model 2, versions 1 to 40) and returns its module matrix, without the quiet zone.
 * Picks the densest of the numeric, alphanumeric and UTF-8 byte modes and the smallest version that fits.
 * Throws a `RangeError` when the text doesn't fit even in version 40 at that error correction level.
 */
export function encodeQR(text: string, options: QROptions = {}): QRMatrix {
  const ecc = options.ecc ?? "M";
  if (!(ecc in ECC_INDEX))
    throw new RangeError(`Unknown error correction "${ecc}"`);
  const { mask } = options;
  if (mask !== undefined && !(Number.isInteger(mask) && mask >= 0 && mask <= 7))
    throw new RangeError("The mask must be an integer from 0 to 7");
  const minVersion = Math.min(
    Math.max(
      Math.trunc(options.minVersion ?? MIN_VERSION) || MIN_VERSION,
      MIN_VERSION,
    ),
    MAX_VERSION,
  );

  const segment = makeSegment(text);
  let version = minVersion;
  for (; ; version++) {
    const used = 4 + countBits(segment.mode, version) + segment.bits.length;
    if (used <= dataCodewords(version, ecc) * 8) break;
    if (version >= MAX_VERSION)
      throw new RangeError("The text is too long for a QR code");
  }

  const codewords = addErrorCorrection(
    buildCodewords(segment, version, ecc),
    version,
    ecc,
  );
  const grid = new Grid(version * 4 + 17);
  grid.drawFunctionPatterns(version);
  grid.drawCodewords(codewords);

  let chosen = mask ?? 0;
  if (mask === undefined) {
    let lowest = Infinity;
    for (let candidate = 0; candidate < 8; candidate++) {
      grid.applyMask(candidate);
      grid.drawFormat(ECC_FORMAT_BITS[ecc], candidate);
      const penalty = grid.penalty();
      if (penalty < lowest) {
        lowest = penalty;
        chosen = candidate;
      }
      grid.applyMask(candidate);
    }
  }
  grid.applyMask(chosen);
  grid.drawFormat(ECC_FORMAT_BITS[ecc], chosen);

  return {
    version,
    size: grid.size,
    ecc,
    mask: chosen,
    mode: segment.mode,
    modules: grid.modules,
  };
}

/**
 * The dark modules as horizontal runs `[x, y, width]`, each one module high. `skip` leaves modules out,
 * for example to make room for a logo.
 */
export function qrRuns(
  modules: boolean[][],
  skip?: (x: number, y: number) => boolean,
): [x: number, y: number, width: number][] {
  const runs: [number, number, number][] = [];
  modules.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const dark = x < row.length && row[x]! && !skip?.(x, y);
      if (dark && start < 0) start = x;
      else if (!dark && start >= 0) {
        runs.push([start, y, x - start]);
        start = -1;
      }
    }
  });
  return runs;
}

/**
 * An SVG path (`d`) of the dark modules, where one module is one unit. Horizontal neighbours are merged
 * into one rectangle. `offset` moves the whole code, which is how the renderer adds the quiet zone.
 */
export function qrToPath(
  modules: boolean[][],
  offset = 0,
  skip?: (x: number, y: number) => boolean,
): string {
  return qrRuns(modules, skip)
    .map(
      ([x, y, width]) => `M${x + offset} ${y + offset}h${width}v1h-${width}z`,
    )
    .join("");
}
