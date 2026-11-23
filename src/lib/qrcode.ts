/**
 * Standards-compliant ISO/IEC 18004 QR Code encoder (Byte mode, ECC Level M).
 * Supports Versions 1–10 (up to 213 UTF-8 bytes), sufficient for all Loota hunt URLs.
 * Zero external dependencies — produces a boolean matrix ready for crisp SVG rendering.
 */

interface VersionSpec {
  version: number;
  totalCodewords: number;
  ecPerBlock: number;
  blocksGroup1: number;
  dataPerBlock1: number;
  blocksGroup2: number;
  dataPerBlock2: number;
  alignment: number[];
}

// ISO/IEC 18004 Table 9 for Error Correction Level M (15% recovery)
const VERSION_SPECS_M: VersionSpec[] = [
  { version: 1, totalCodewords: 26, ecPerBlock: 10, blocksGroup1: 1, dataPerBlock1: 16, blocksGroup2: 0, dataPerBlock2: 0, alignment: [] },
  { version: 2, totalCodewords: 44, ecPerBlock: 16, blocksGroup1: 1, dataPerBlock1: 28, blocksGroup2: 0, dataPerBlock2: 0, alignment: [6, 18] },
  { version: 3, totalCodewords: 70, ecPerBlock: 26, blocksGroup1: 1, dataPerBlock1: 44, blocksGroup2: 0, dataPerBlock2: 0, alignment: [6, 22] },
  { version: 4, totalCodewords: 100, ecPerBlock: 18, blocksGroup1: 2, dataPerBlock1: 32, blocksGroup2: 0, dataPerBlock2: 0, alignment: [6, 26] },
  { version: 5, totalCodewords: 134, ecPerBlock: 24, blocksGroup1: 2, dataPerBlock1: 43, blocksGroup2: 0, dataPerBlock2: 0, alignment: [6, 30] },
  { version: 6, totalCodewords: 172, ecPerBlock: 16, blocksGroup1: 4, dataPerBlock1: 27, blocksGroup2: 0, dataPerBlock2: 0, alignment: [6, 34] },
  { version: 7, totalCodewords: 196, ecPerBlock: 18, blocksGroup1: 4, dataPerBlock1: 31, blocksGroup2: 0, dataPerBlock2: 0, alignment: [6, 22, 38] },
  { version: 8, totalCodewords: 242, ecPerBlock: 22, blocksGroup1: 2, dataPerBlock1: 38, blocksGroup2: 2, dataPerBlock2: 39, alignment: [6, 24, 42] },
  { version: 9, totalCodewords: 292, ecPerBlock: 22, blocksGroup1: 3, dataPerBlock1: 36, blocksGroup2: 2, dataPerBlock2: 37, alignment: [6, 26, 46] },
  { version: 10, totalCodewords: 346, ecPerBlock: 26, blocksGroup1: 4, dataPerBlock1: 43, blocksGroup2: 1, dataPerBlock2: 44, alignment: [6, 28, 50] },
];

// GF(256) with primitive polynomial 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    for (let j = 0; j < ecCount - 1; j++) {
      rem[j] = rem[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    rem[ecCount - 1] = gfMul(gen[ecCount], factor);
  }
  return rem;
}

function encodeFormatBits(mask: number): number {
  // ECC Level M = 00 (2 bits), followed by 3-bit mask
  const data = (0b00 << 3) | (mask & 0b111);
  let rem = data << 10;
  const poly = 0b10100110111;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) {
      rem ^= poly << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

function encodeVersionBits(version: number): number {
  let rem = version << 12;
  const poly = 0b1111100100101;
  for (let i = 17; i >= 12; i--) {
    if ((rem >> i) & 1) {
      rem ^= poly << (i - 12);
    }
  }
  return (version << 12) | rem;
}

function pushBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i--) {
    bits.push((value >> i) & 1);
  }
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);

  // Pick smallest version that fits Byte mode payload
  const spec =
    VERSION_SPECS_M.find((s) => {
      const dataCapacity = s.blocksGroup1 * s.dataPerBlock1 + s.blocksGroup2 * s.dataPerBlock2;
      const charCountBits = s.version <= 9 ? 8 : 16;
      const headerBits = 4 + charCountBits;
      const neededBits = headerBits + bytes.length * 8;
      return neededBits <= dataCapacity * 8;
    }) ?? VERSION_SPECS_M[VERSION_SPECS_M.length - 1];

  const dataCapacity = spec.blocksGroup1 * spec.dataPerBlock1 + spec.blocksGroup2 * spec.dataPerBlock2;
  const charCountBits = spec.version <= 9 ? 8 : 16;

  // Build bit stream: Mode (0100 = Byte), Count, Data, Terminator, Pad
  const bits: number[] = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, charCountBits);
  for (let i = 0; i < bytes.length; i++) {
    pushBits(bits, bytes[i], 8);
  }

  const maxBits = dataCapacity * 8;
  const terminatorLen = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < terminatorLen; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(bits, padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataCodewords = new Uint8Array(dataCapacity);
  for (let i = 0; i < dataCapacity; i++) {
    let val = 0;
    for (let b = 0; b < 8; b++) {
      val = (val << 1) | bits[i * 8 + b];
    }
    dataCodewords[i] = val;
  }

  // Split into RS blocks & interleave
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < spec.blocksGroup1; i++) {
    const block = dataCodewords.slice(offset, offset + spec.dataPerBlock1);
    offset += spec.dataPerBlock1;
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, spec.ecPerBlock));
  }
  for (let i = 0; i < spec.blocksGroup2; i++) {
    const block = dataCodewords.slice(offset, offset + spec.dataPerBlock2);
    offset += spec.dataPerBlock2;
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, spec.ecPerBlock));
  }

  const interleaved: number[] = [];
  const maxDataLen = Math.max(spec.dataPerBlock1, spec.dataPerBlock2);
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) interleaved.push(block[i]);
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const block of ecBlocks) {
      interleaved.push(block[i]);
    }
  }

  // Build base module grid + function mask
  const size = spec.version * 4 + 17;
  const baseModules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFn = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    baseModules[r][c] = dark;
    isFunction[r][c] = true;
  };

  // Finder patterns + separators
  const drawFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = top + r;
        const cc = left + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const dark =
          inOuter &&
          (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        setFn(rr, cc, dark);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const centers = spec.alignment;
  for (const r of centers) {
    for (const c of centers) {
      if (isFunction[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFn(r + dr, c + dc, dark);
        }
      }
    }
  }

  // Reserve format info areas & dark module
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFn(8, i, false);
    if (!isFunction[i][8]) setFn(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    setFn(8, size - 1 - i, false);
    if (i < 7) setFn(size - 1 - i, 8, false);
  }
  setFn(size - 8, 8, true); // Mandatory dark module

  // Version info (version >= 7)
  if (spec.version >= 7) {
    const vBits = encodeVersionBits(spec.version);
    for (let i = 0; i < 18; i++) {
      const dark = ((vBits >> i) & 1) === 1;
      const r = Math.floor(i / 3);
      const c = size - 11 + (i % 3);
      setFn(r, c, dark);
      setFn(c, r, dark);
    }
  }

  // Place interleaved codeword bits in zigzag columns
  const allBits: number[] = [];
  for (const cw of interleaved) {
    pushBits(allBits, cw, 8);
  }

  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col--; // Skip vertical timing column
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (!isFunction[r][c]) {
          baseModules[r][c] = bitIdx < allBits.length ? allBits[bitIdx] === 1 : false;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  const applyMask = (mask: number): boolean[][] => {
    const grid = baseModules.map((row) => row.slice());
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (isFunction[r][c]) continue;
        let invert = false;
        switch (mask) {
          case 0: invert = (r + c) % 2 === 0; break;
          case 1: invert = r % 2 === 0; break;
          case 2: invert = c % 3 === 0; break;
          case 3: invert = (r + c) % 3 === 0; break;
          case 4: invert = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break;
          case 5: invert = ((r * c) % 2) + ((r * c) % 3) === 0; break;
          case 6: invert = (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; break;
          case 7: invert = (((r + c) % 2) + ((r * c) % 3)) % 2 === 0; break;
        }
        if (invert) grid[r][c] = !grid[r][c];
      }
    }

    // Write format bits
    const fmt = encodeFormatBits(mask);
    for (let i = 0; i <= 5; i++) grid[8][i] = ((fmt >> (14 - i)) & 1) === 1;
    grid[8][7] = ((fmt >> 8) & 1) === 1;
    grid[8][8] = ((fmt >> 7) & 1) === 1;
    grid[7][8] = ((fmt >> 6) & 1) === 1;
    for (let i = 9; i < 15; i++) grid[14 - i][8] = ((fmt >> (14 - i)) & 1) === 1;

    for (let i = 0; i < 7; i++) grid[size - 1 - i][8] = ((fmt >> (14 - i)) & 1) === 1;
    for (let i = 7; i < 15; i++) grid[8][size - 15 + i] = ((fmt >> (14 - i)) & 1) === 1;

    return grid;
  };

  // Pick mask with lowest penalty (N1 runs + N2 2x2 blocks + N4 balance)
  const scoreGrid = (g: boolean[][]): number => {
    let penalty = 0;
    let darkCount = 0;

    for (let r = 0; r < size; r++) {
      let runH = 1;
      let runV = 1;
      for (let c = 0; c < size; c++) {
        if (g[r][c]) darkCount++;
        if (c > 0) {
          if (g[r][c] === g[r][c - 1]) runH++;
          else {
            if (runH >= 5) penalty += runH - 2;
            runH = 1;
          }
          if (g[c][r] === g[c - 1][r]) runV++;
          else {
            if (runV >= 5) penalty += runV - 2;
            runV = 1;
          }
        }
        if (r < size - 1 && c < size - 1) {
          const v = g[r][c];
          if (v === g[r][c + 1] && v === g[r + 1][c] && v === g[r + 1][c + 1]) {
            penalty += 3;
          }
        }
      }
      if (runH >= 5) penalty += runH - 2;
      if (runV >= 5) penalty += runV - 2;
    }

    const ratio = Math.abs((darkCount * 100) / (size * size) - 50);
    penalty += Math.floor(ratio / 5) * 10;
    return penalty;
  };

  let bestGrid = applyMask(0);
  let bestScore = scoreGrid(bestGrid);
  for (let m = 1; m < 8; m++) {
    const candidate = applyMask(m);
    const sc = scoreGrid(candidate);
    if (sc < bestScore) {
      bestScore = sc;
      bestGrid = candidate;
    }
  }

  return bestGrid;
}
