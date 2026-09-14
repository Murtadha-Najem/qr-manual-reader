// QR code encoder: text or explicit segments to a module matrix (1 = dark).
// Version, error-correction level, mask and mode can all be forced so examples show every variant.
(function (root) {
  const QRT = (root.QRT = root.QRT || {});
  const S = QRT.spec;
  const G = QRT.gf;

  let sjisMap = null;
  function sjisTable() {
    if (sjisMap) return sjisMap;
    sjisMap = new Map();
    let dec;
    try {
      dec = new TextDecoder('shift_jis', { fatal: true });
    } catch (e) {
      return sjisMap;
    }
    for (const [lo, hi] of [[0x81, 0x9f], [0xe0, 0xeb]]) {
      for (let lead = lo; lead <= hi; lead++) {
        for (let trail = 0x40; trail <= 0xfc; trail++) {
          if (trail === 0x7f) continue;
          const code = (lead << 8) | trail;
          if (code > 0xebbf) continue;
          try {
            const ch = dec.decode(new Uint8Array([lead, trail]));
            if (ch.length === 1 && !sjisMap.has(ch)) sjisMap.set(ch, code);
          } catch (e) {
            /* not a valid pair */
          }
        }
      }
    }
    return sjisMap;
  }

  function pushBits(arr, value, len) {
    for (let i = len - 1; i >= 0; i--) arr.push((value >>> i) & 1);
  }

  const canNumeric = (t) => /^[0-9]+$/.test(t);
  const canAlnum = (t) => t.length > 0 && [...t].every((ch) => S.ALNUM.includes(ch));
  const canKanji = (t) => t.length > 0 && [...t].every((ch) => sjisTable().has(ch));

  function autoMode(text) {
    if (canNumeric(text)) return 'numeric';
    if (canAlnum(text)) return 'alphanumeric';
    return 'byte';
  }

  function makeSegment(seg) {
    const mode = seg.mode && seg.mode !== 'auto' ? seg.mode : autoMode(seg.text);
    const bits = [];
    if (mode === 'eci') {
      const v = seg.value;
      if (v < 128) pushBits(bits, v, 8);
      else if (v < 16384) pushBits(bits, 0x8000 | v, 16);
      else pushBits(bits, 0xc00000 | v, 24);
      return { mode, value: v, count: 0, bits };
    }
    const text = seg.text;
    if (mode === 'numeric') {
      if (!canNumeric(text)) throw new Error('Numeric mode accepts digits 0-9 only');
      for (let i = 0; i < text.length; i += 3) {
        const g = text.substr(i, 3);
        pushBits(bits, parseInt(g, 10), g.length * 3 + 1);
      }
      return { mode, text, count: text.length, bits };
    }
    if (mode === 'alphanumeric') {
      if (!canAlnum(text)) throw new Error('Alphanumeric mode accepts 0-9, A-Z, space and $%*+-./: only');
      for (let i = 0; i < text.length; i += 2) {
        if (i + 1 < text.length) pushBits(bits, S.ALNUM.indexOf(text[i]) * 45 + S.ALNUM.indexOf(text[i + 1]), 11);
        else pushBits(bits, S.ALNUM.indexOf(text[i]), 6);
      }
      return { mode, text, count: text.length, bits };
    }
    if (mode === 'byte') {
      const bytes = seg.bytes || Array.from(new TextEncoder().encode(text));
      for (const b of bytes) pushBits(bits, b, 8);
      return { mode, text, count: bytes.length, bits };
    }
    if (mode === 'kanji') {
      if (!canKanji(text)) throw new Error('Kanji mode accepts Shift JIS double-byte characters only');
      const chars = [...text];
      for (const ch of chars) {
        let code = sjisTable().get(ch);
        code -= code <= 0x9ffc ? 0x8140 : 0xc140;
        pushBits(bits, (code >>> 8) * 0xc0 + (code & 0xff), 13);
      }
      return { mode, text, count: chars.length, bits };
    }
    throw new Error('Unknown mode ' + mode);
  }

  function segmentLength(seg, version) {
    if (seg.mode === 'eci') return 4 + seg.bits.length;
    return 4 + S.countBits(seg.mode, version) + seg.bits.length;
  }

  function drawFunctionPatterns(version, m) {
    const n = m.length;
    for (let i = 0; i < n; i++) {
      m[6][i] = i % 2 === 0 ? 1 : 0;
      m[i][6] = i % 2 === 0 ? 1 : 0;
    }
    for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const r = r0 + dr;
          const c = c0 + dc;
          if (r < 0 || c < 0 || r >= n || c >= n) continue;
          const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
          m[r][c] = dist !== 2 && dist !== 4 ? 1 : 0;
        }
      }
    }
    const pos = S.alignmentPositions(version);
    const last = pos.length - 1;
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) m[pos[i] + dr][pos[j] + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1 ? 1 : 0;
        }
      }
    }
    m[n - 8][8] = 1;
    if (version >= 7) {
      const word = S.versionWord(version);
      const vc = S.versionCells(n);
      for (let i = 0; i < 18; i++) {
        const bit = (word >>> i) & 1;
        m[vc.topRight[i][0]][vc.topRight[i][1]] = bit;
        m[vc.bottomLeft[i][0]][vc.bottomLeft[i][1]] = bit;
      }
    }
  }

  function drawFormat(m, ecl, mask) {
    const word = S.formatWord(ecl, mask);
    const fc = S.formatCells(m.length);
    for (let i = 0; i < 15; i++) {
      const bit = (word >>> i) & 1;
      m[fc.copy1[i][0]][fc.copy1[i][1]] = bit;
      m[fc.copy2[i][0]][fc.copy2[i][1]] = bit;
    }
  }

  function penalty(m) {
    const n = m.length;
    let score = 0;
    const lines = [];
    for (let i = 0; i < n; i++) {
      lines.push(m[i]);
      lines.push(m.map((row) => row[i]));
    }
    const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0].join('');
    const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1].join('');
    for (const line of lines) {
      let run = 1;
      for (let i = 1; i <= n; i++) {
        if (i < n && line[i] === line[i - 1]) run++;
        else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      const s = '0000' + line.join('') + '0000';
      for (let i = 0; i + 11 <= s.length; i++) {
        const w = s.substr(i, 11);
        if (w === A || w === B) score += 40;
      }
    }
    let dark = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        dark += m[r][c];
        if (r < n - 1 && c < n - 1) {
          const v = m[r][c];
          if (m[r][c + 1] === v && m[r + 1][c] === v && m[r + 1][c + 1] === v) score += 3;
        }
      }
    }
    const total = n * n;
    score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return score;
  }

  // opts: { text, mode, segments, ecl, version, minVersion, mask }
  function encode(opts) {
    const ecl = opts.ecl || 'M';
    const segs = (opts.segments || [{ mode: opts.mode, text: opts.text }]).map(makeSegment);
    const minV = opts.version || opts.minVersion || 1;
    const maxV = opts.version || 40;
    let version = null;
    let used = 0;
    for (let v = minV; v <= maxV; v++) {
      used = segs.reduce((sum, s) => sum + segmentLength(s, v), 0);
      if (used <= S.blockInfo(v, ecl).dataCodewords * 8) {
        version = v;
        break;
      }
    }
    if (!version) throw new Error(opts.version ? 'TOO_LONG_FOR_VERSION' : 'TOO_LONG');

    const info = S.blockInfo(version, ecl);
    const capacity = info.dataCodewords * 8;
    const bits = [];
    for (const s of segs) {
      pushBits(bits, S.MODES[s.mode].bits, 4);
      if (s.mode !== 'eci') {
        const cb = S.countBits(s.mode, version);
        if (s.count >= 1 << cb) throw new Error('TOO_LONG_FOR_COUNT');
        pushBits(bits, s.count, cb);
      }
      for (const b of s.bits) bits.push(b);
    }
    pushBits(bits, 0, Math.min(4, capacity - bits.length));
    pushBits(bits, 0, (8 - (bits.length % 8)) % 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      data.push(v);
    }
    for (let pad = 0xec; data.length < info.dataCodewords; pad ^= 0xec ^ 0x11) data.push(pad);

    const blocks = [];
    let k = 0;
    for (const b of info.blocks) {
      const d = data.slice(k, k + b.dataLen);
      k += b.dataLen;
      blocks.push({ data: d, ecc: G.rsEncode(d, b.eccLen) });
    }
    const stream = S.interleaveOrder(info).map((o) => blocks[o.block][o.kind][o.index]);

    const n = S.sizeOf(version);
    const cat = S.functionMap(version);
    const base = Array.from({ length: n }, () => new Array(n).fill(0));
    drawFunctionPatterns(version, base);
    const order = S.dataOrder(cat);
    order.forEach(([r, c], i) => {
      const cw = i >> 3;
      base[r][c] = cw < stream.length ? (stream[cw] >>> (7 - (i & 7))) & 1 : 0;
    });

    const candidates = opts.mask === undefined || opts.mask === null || opts.mask === 'auto' ? [0, 1, 2, 3, 4, 5, 6, 7] : [Number(opts.mask)];
    let best = null;
    for (const mask of candidates) {
      const m = base.map((row) => row.slice());
      const fn = S.MASKS[mask];
      for (const [r, c] of order) if (fn(r, c)) m[r][c] ^= 1;
      drawFormat(m, ecl, mask);
      const p = candidates.length > 1 ? penalty(m) : 0;
      if (!best || p < best.penalty) best = { matrix: m, mask, penalty: p };
    }
    return { matrix: best.matrix, version, ecl, mask: best.mask, segments: segs, data, stream, bitsUsed: used, capacity };
  }

  QRT.encoder = { encode, autoMode, canNumeric, canAlnum, canKanji, sjisTable, penalty };
})(typeof window !== 'undefined' ? window : globalThis);
