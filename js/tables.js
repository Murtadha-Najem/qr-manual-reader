// QR code specification tables and the geometry shared by the encoder and decoder.
// Coordinates are always [row, col].
(function (root) {
  const QRT = (root.QRT = root.QRT || {});

  const ECL_ORDER = ['L', 'M', 'Q', 'H'];
  // Two-bit value stored in the format information for each level.
  const ECL_BITS = { L: 1, M: 0, Q: 3, H: 2 };
  const ECL_FROM_BITS = { 1: 'L', 0: 'M', 3: 'Q', 2: 'H' };
  const ECL_RECOVERY = { L: 7, M: 15, Q: 25, H: 30 };

  // Index [ecl][version]; entry 0 unused.
  const ECC_PER_BLOCK = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  };
  const NUM_BLOCKS = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
  };

  const MODES = {
    numeric: { bits: 0b0001, name: 'Numeric', count: [10, 12, 14] },
    alphanumeric: { bits: 0b0010, name: 'Alphanumeric', count: [9, 11, 13] },
    byte: { bits: 0b0100, name: 'Byte', count: [8, 16, 16] },
    kanji: { bits: 0b1000, name: 'Kanji', count: [8, 10, 12] },
    eci: { bits: 0b0111, name: 'ECI', count: null },
    structuredAppend: { bits: 0b0011, name: 'Structured Append', count: null },
    fnc1First: { bits: 0b0101, name: 'FNC1 (GS1)', count: null },
    fnc1Second: { bits: 0b1001, name: 'FNC1 (AIM)', count: null },
    terminator: { bits: 0b0000, name: 'Terminator', count: null },
  };
  const MODE_BY_BITS = {};
  for (const [key, m] of Object.entries(MODES)) MODE_BY_BITS[m.bits] = key;

  const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  const ECI_CHARSETS = {
    0: 'cp437', 1: 'iso-8859-1', 2: 'cp437', 3: 'iso-8859-1', 4: 'iso-8859-2', 5: 'iso-8859-3',
    6: 'iso-8859-4', 7: 'iso-8859-5', 8: 'iso-8859-6', 9: 'iso-8859-7', 10: 'iso-8859-8',
    11: 'iso-8859-9', 12: 'iso-8859-10', 13: 'iso-8859-11', 15: 'iso-8859-13', 16: 'iso-8859-14',
    17: 'iso-8859-15', 18: 'iso-8859-16', 20: 'shift_jis', 21: 'windows-1250', 22: 'windows-1251',
    23: 'windows-1252', 24: 'windows-1256', 25: 'utf-16be', 26: 'utf-8', 27: 'us-ascii',
    28: 'big5', 29: 'gb18030', 30: 'euc-kr',
  };

  function sizeOf(version) {
    return version * 4 + 17;
  }
  function versionOf(size) {
    return (size - 17) / 4;
  }

  function countBits(mode, version) {
    const c = MODES[mode].count;
    if (!c) return 0;
    return version <= 9 ? c[0] : version <= 26 ? c[1] : c[2];
  }

  function alignmentPositions(version) {
    if (version === 1) return [];
    const numAlign = Math.floor(version / 7) + 2;
    const step = Math.floor((version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
    const result = [6];
    for (let pos = sizeOf(version) - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  function rawDataModules(version) {
    let result = (16 * version + 128) * version + 64;
    if (version >= 2) {
      const numAlign = Math.floor(version / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (version >= 7) result -= 36;
    }
    return result;
  }

  function blockInfo(version, ecl) {
    const numBlocks = NUM_BLOCKS[ecl][version];
    const eccPerBlock = ECC_PER_BLOCK[ecl][version];
    const totalCodewords = Math.floor(rawDataModules(version) / 8);
    const dataCodewords = totalCodewords - eccPerBlock * numBlocks;
    const shortCount = numBlocks - (totalCodewords % numBlocks);
    const shortBlockLen = Math.floor(totalCodewords / numBlocks);
    const shortDataLen = shortBlockLen - eccPerBlock;
    const blocks = [];
    for (let i = 0; i < numBlocks; i++) {
      blocks.push({ dataLen: shortDataLen + (i < shortCount ? 0 : 1), eccLen: eccPerBlock });
    }
    return {
      version, ecl, numBlocks, eccPerBlock, totalCodewords, dataCodewords,
      shortCount, shortDataLen, longCount: numBlocks - shortCount, longDataLen: shortDataLen + 1,
      remainderBits: rawDataModules(version) % 8, blocks,
    };
  }

  // Stream position of every block byte after interleaving:
  // data bytes are taken column by column across blocks, then ecc bytes the same way.
  function interleaveOrder(info) {
    const order = []; // { block, kind: 'data'|'ecc', index }
    const maxData = info.blocks.reduce((m, b) => Math.max(m, b.dataLen), 0);
    for (let i = 0; i < maxData; i++) {
      info.blocks.forEach((b, bi) => {
        if (i < b.dataLen) order.push({ block: bi, kind: 'data', index: i });
      });
    }
    for (let i = 0; i < info.eccPerBlock; i++) {
      info.blocks.forEach((b, bi) => order.push({ block: bi, kind: 'ecc', index: i }));
    }
    return order;
  }

  const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];
  const MASK_FORMULAS = [
    '(row + col) mod 2 = 0',
    'row mod 2 = 0',
    'col mod 3 = 0',
    '(row + col) mod 3 = 0',
    '(floor(row / 2) + floor(col / 3)) mod 2 = 0',
    '(row × col) mod 2 + (row × col) mod 3 = 0',
    '((row × col) mod 2 + (row × col) mod 3) mod 2 = 0',
    '((row + col) mod 2 + (row × col) mod 3) mod 2 = 0',
  ];

  const FORMAT_XOR = 0x5412; // 101010000010010

  // 15-bit format word (before placement), bit 14 first.
  function formatWord(ecl, mask) {
    const data = (ECL_BITS[ecl] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | (rem & 0x3ff)) ^ FORMAT_XOR;
  }
  function formatBch(data5) {
    let rem = data5;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return rem & 0x3ff;
  }

  function versionWord(version) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    return (version << 12) | (rem & 0xfff);
  }

  // Cells holding format bit i (0 = least significant), first and second copy.
  function formatCells(size) {
    const a = [];
    const b = [];
    for (let i = 0; i < 15; i++) {
      let r;
      let c;
      if (i <= 5) { r = i; c = 8; }
      else if (i === 6) { r = 7; c = 8; }
      else if (i === 7) { r = 8; c = 8; }
      else if (i === 8) { r = 8; c = 7; }
      else { r = 8; c = 14 - i; }
      a.push([r, c]);
      if (i < 8) b.push([8, size - 1 - i]);
      else b.push([size - 15 + i, 8]);
    }
    return { copy1: a, copy2: b };
  }

  // Cells holding version bit i (0 = least significant): top-right block, bottom-left block.
  function versionCells(size) {
    const tr = [];
    const bl = [];
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      tr.push([b, a]);
      bl.push([a, b]);
    }
    return { topRight: tr, bottomLeft: bl };
  }

  // Category of every module: finder, separator, timing, alignment, dark, format, version, or null (data).
  function functionMap(version) {
    const n = sizeOf(version);
    const cat = Array.from({ length: n }, () => new Array(n).fill(null));
    for (let i = 0; i < n; i++) {
      cat[6][i] = 'timing';
      cat[i][6] = 'timing';
    }
    const finderAt = (r0, c0) => {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const r = r0 + dr;
          const c = c0 + dc;
          if (r < 0 || c < 0 || r >= n || c >= n) continue;
          cat[r][c] = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 ? 'finder' : 'separator';
        }
      }
    };
    finderAt(0, 0);
    finderAt(0, n - 7);
    finderAt(n - 7, 0);
    const pos = alignmentPositions(version);
    const last = pos.length - 1;
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) cat[pos[i] + dr][pos[j] + dc] = 'alignment';
      }
    }
    const fc = formatCells(n);
    for (const [r, c] of fc.copy1.concat(fc.copy2)) cat[r][c] = 'format';
    cat[n - 8][8] = 'dark';
    if (version >= 7) {
      const vc = versionCells(n);
      for (const [r, c] of vc.topRight.concat(vc.bottomLeft)) cat[r][c] = 'version';
    }
    return cat;
  }

  // Order in which data bits are placed: two-column zigzag from the bottom-right corner.
  function dataOrder(cat) {
    const n = cat.length;
    const order = [];
    let upward = true;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < n; v++) {
        const r = upward ? n - 1 - v : v;
        for (let j = 0; j < 2; j++) {
          const c = right - j;
          if (cat[r][c] === null) order.push([r, c]);
        }
      }
      upward = !upward;
    }
    return order;
  }

  function hamming(a, b) {
    let x = a ^ b;
    let d = 0;
    while (x) {
      d += x & 1;
      x >>>= 1;
    }
    return d;
  }

  QRT.spec = {
    ECL_ORDER, ECL_BITS, ECL_FROM_BITS, ECL_RECOVERY, ECC_PER_BLOCK, NUM_BLOCKS, MODES, MODE_BY_BITS,
    ALNUM, ECI_CHARSETS, MASKS, MASK_FORMULAS, FORMAT_XOR, sizeOf, versionOf, countBits,
    alignmentPositions, rawDataModules, blockInfo, interleaveOrder, formatWord, formatBch, versionWord,
    formatCells, versionCells, functionMap, dataOrder, hamming,
  };
})(typeof window !== 'undefined' ? window : globalThis);
