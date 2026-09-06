/**
 * Minimal QR Code encoder — byte mode, all 40 versions, ECC levels L/M/Q/H.
 *
 * Vendored (no runtime dependency) because the tree needs the raw module
 * matrix, not a rendered image, and it has to build in the Cloudflare Worker
 * runtime. Algorithm follows ISO/IEC 18004; structure mirrors Nayuki's
 * public-domain reference implementation (https://www.nayuki.io/page/qr-code-generator-library).
 *
 * `encodeQr(text)` returns a square `boolean[][]` indexed `[row][col]`,
 * `true` = dark module.
 */

export type EccLevel = "L" | "M" | "Q" | "H";

// Format-info bits per ECC level (ISO/IEC 18004 Table 12), indexed by our ordinal.
const ECC_ORDINAL: Record<EccLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };
const ECC_FORMAT_BITS: Record<EccLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

// Error-correction codewords per block, [eccOrdinal][version] (version 0 unused).
const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // L
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28], // M
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // Q
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], // H
];

// Number of error-correction blocks, [eccOrdinal][version].
const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25], // L
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49], // M
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68], // Q
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81], // H
];

const MIN_VERSION = 1;
const MAX_VERSION = 40;
const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

/** Total number of data-region bits (before ECC) for a version. */
function getNumRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

/** Number of 8-bit data codewords (not ECC) that fit in the given version + ECC level. */
function getNumDataCodewords(ver: number, ecc: EccLevel): number {
  const o = ECC_ORDINAL[ecc];
  return (
    Math.floor(getNumRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[o][ver] * NUM_ERROR_CORRECTION_BLOCKS[o][ver]
  );
}

/* ---------- Reed–Solomon over GF(2^8), primitive polynomial 0x11D ---------- */

function reedSolomonComputeDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonComputeRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    for (let j = 0; j < result.length; j++) {
      result[j] ^= reedSolomonMultiply(divisor[j], factor);
    }
  }
  return result;
}

function reedSolomonMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/* ---------- Bit buffer ---------- */

function appendBits(value: number, len: number, bb: number[]): void {
  for (let i = len - 1; i >= 0; i--) bb.push((value >>> i) & 1);
}

/* ---------- Main encode ---------- */

export function encodeQr(text: string, ecc: EccLevel = "H"): boolean[][] {
  const bytes = utf8Bytes(text);

  // Smallest version that fits, keeping the requested ECC level.
  let version = MIN_VERSION;
  let dataCapacityBits = 0;
  for (; ; version++) {
    if (version > MAX_VERSION) {
      throw new RangeError("Data too long for a QR code at this ECC level");
    }
    dataCapacityBits = getNumDataCodewords(version, ecc) * 8;
    const charCountBits = version < 10 ? 8 : 16;
    const needed = 4 + charCountBits + bytes.length * 8;
    if (needed <= dataCapacityBits) break;
  }

  // Build the bit stream: mode (byte = 0100), char count, payload.
  const bb: number[] = [];
  appendBits(0x4, 4, bb);
  appendBits(bytes.length, version < 10 ? 8 : 16, bb);
  for (const b of bytes) appendBits(b, 8, bb);

  // Terminator + byte alignment + pad bytes.
  appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
  appendBits(0, (8 - (bb.length % 8)) % 8, bb);
  for (let pad = 0xec; bb.length < dataCapacityBits; pad ^= 0xec ^ 0x11) {
    appendBits(pad, 8, bb);
  }

  // Pack bits into data codewords.
  const dataCodewords = new Array<number>(bb.length / 8).fill(0);
  bb.forEach((bit, i) => {
    dataCodewords[i >>> 3] |= bit << (7 - (i & 7));
  });

  const allCodewords = addEccAndInterleave(dataCodewords, version, ecc);
  return buildMatrix(version, ecc, allCodewords);
}

/** Split into blocks, append RS ECC per block, interleave back together. */
function addEccAndInterleave(data: number[], version: number, ecc: EccLevel): number[] {
  const o = ECC_ORDINAL[ecc];
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[o][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[o][version];
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks: number[][] = [];
  const rsDiv = reedSolomonComputeDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + datLen);
    k += datLen;
    const block = dat.slice();
    const eccBytes = reedSolomonComputeRemainder(dat, rsDiv);
    if (i < numShortBlocks) block.push(0); // placeholder so column indices line up
    block.push(...eccBytes);
    blocks.push(block);
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      // Skip the placeholder pad column in short blocks.
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        result.push(blocks[j][i]);
      }
    }
  }
  return result;
}

/* ---------- Matrix construction ---------- */

function buildMatrix(version: number, ecc: EccLevel, codewords: number[]): boolean[][] {
  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const setFunctionModule = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  // Timing patterns.
  for (let i = 0; i < size; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Finder patterns + separators.
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          setFunctionModule(x, y, dist !== 2 && dist !== 4);
        }
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  // Alignment patterns.
  const alignPositions = alignmentPatternPositions(version);
  const numAlign = alignPositions.length;
  for (let i = 0; i < numAlign; i++) {
    for (let j = 0; j < numAlign; j++) {
      // Skip the three that collide with finder patterns.
      if ((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0)) {
        continue;
      }
      const cx = alignPositions[i];
      const cy = alignPositions[j];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFunctionModule(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // Reserve format + version info areas (filled properly after masking).
  drawFormatBits(version, ecc, 0, modules, isFunction);
  if (version >= 7) drawVersionBits(version, modules, isFunction);

  // Zigzag data placement.
  let bitIndex = 0;
  const getBit = (i: number) => (i < codewords.length * 8 ? (codewords[i >>> 3] >>> (7 - (i & 7))) & 1 : 0);
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let k = 0; k < 2; k++) {
        const x = right - k;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x]) {
          modules[y][x] = getBit(bitIndex) === 1;
          bitIndex++;
        }
      }
    }
  }

  // Try all 8 masks, keep the lowest-penalty one.
  let bestMask = 0;
  let bestPenalty = Infinity;
  let bestModules = modules;
  for (let mask = 0; mask < 8; mask++) {
    const trial = modules.map((row) => row.slice());
    applyMask(trial, isFunction, mask);
    drawFormatBits(version, ecc, mask, trial, isFunction.map((r) => r.slice()));
    const penalty = computePenalty(trial, size);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestModules = trial;
    }
  }
  void bestMask;
  return bestModules;
}

function alignmentPatternPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const size = version * 4 + 17;
  const result: number[] = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

function drawFormatBits(
  version: number,
  ecc: EccLevel,
  mask: number,
  modules: boolean[][],
  isFunction: boolean[][],
): void {
  const size = version * 4 + 17;
  const data = (ECC_FORMAT_BITS[ecc] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  const place = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  for (let i = 0; i <= 5; i++) place(8, i, ((bits >>> i) & 1) === 1);
  place(8, 7, ((bits >>> 6) & 1) === 1);
  place(8, 8, ((bits >>> 7) & 1) === 1);
  place(7, 8, ((bits >>> 8) & 1) === 1);
  for (let i = 9; i < 15; i++) place(14 - i, 8, ((bits >>> i) & 1) === 1);

  for (let i = 0; i < 8; i++) place(size - 1 - i, 8, ((bits >>> i) & 1) === 1);
  for (let i = 8; i < 15; i++) place(8, size - 15 + i, ((bits >>> i) & 1) === 1);
  place(8, size - 8, true); // always-dark module
}

function drawVersionBits(version: number, modules: boolean[][], isFunction: boolean[][]): void {
  const size = version * 4 + 17;
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    modules[b][a] = dark;
    modules[a][b] = dark;
    isFunction[b][a] = true;
    isFunction[a][b] = true;
  }
}

function applyMask(modules: boolean[][], isFunction: boolean[][], mask: number): void {
  const size = modules.length;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isFunction[y][x]) continue;
      let invert = false;
      switch (mask) {
        case 0: invert = (x + y) % 2 === 0; break;
        case 1: invert = y % 2 === 0; break;
        case 2: invert = x % 3 === 0; break;
        case 3: invert = (x + y) % 3 === 0; break;
        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
        case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
      }
      if (invert) modules[y][x] = !modules[y][x];
    }
  }
}

function computePenalty(modules: boolean[][], size: number): number {
  let penalty = 0;

  // Rule 1: runs of 5+ same-colour modules in a row/column.
  for (let y = 0; y < size; y++) {
    let runColor = false;
    let runLen = 0;
    for (let x = 0; x < size; x++) {
      if (modules[y][x] === runColor) {
        runLen++;
        if (runLen === 5) penalty += PENALTY_N1;
        else if (runLen > 5) penalty++;
      } else {
        runColor = modules[y][x];
        runLen = 1;
      }
    }
  }
  for (let x = 0; x < size; x++) {
    let runColor = false;
    let runLen = 0;
    for (let y = 0; y < size; y++) {
      if (modules[y][x] === runColor) {
        runLen++;
        if (runLen === 5) penalty += PENALTY_N1;
        else if (runLen > 5) penalty++;
      } else {
        runColor = modules[y][x];
        runLen = 1;
      }
    }
  }

  // Rule 2: 2x2 blocks of one colour.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
        penalty += PENALTY_N2;
      }
    }
  }

  // Rule 3: finder-like 1:1:3:1:1 patterns.
  const pattern = [true, false, true, true, true, false, true];
  const hasPatternAt = (cells: boolean[], i: number): boolean => {
    for (let k = 0; k < 7; k++) if (cells[i + k] !== pattern[k]) return false;
    const before = i - 4 >= 0 ? cells.slice(i - 4, i).every((v) => !v) : false;
    const after = i + 11 <= cells.length ? cells.slice(i + 7, i + 11).every((v) => !v) : false;
    return before || after;
  };
  for (let y = 0; y < size; y++) {
    const row = modules[y];
    for (let x = 0; x + 7 <= size; x++) if (hasPatternAt(row, x)) penalty += PENALTY_N3;
  }
  for (let x = 0; x < size; x++) {
    const col = modules.map((r) => r[x]);
    for (let y = 0; y + 7 <= size; y++) if (hasPatternAt(col, y)) penalty += PENALTY_N3;
  }

  // Rule 4: overall dark/light balance.
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) dark++;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  penalty += k * PENALTY_N4;

  return penalty;
}

function utf8Bytes(text: string): number[] {
  if (typeof TextEncoder !== "undefined") return Array.from(new TextEncoder().encode(text));
  // Fallback for environments without TextEncoder.
  const out: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0) as number;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return out;
}
