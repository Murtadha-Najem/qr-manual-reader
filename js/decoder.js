// Instrumented QR decoder. Besides the text, it records where every value came from
// (which modules, which bits) so each step can be drawn on the code itself.
(function (root) {
  const QRT = (root.QRT = root.QRT || {});
  const S = QRT.spec;
  const G = QRT.gf;

  function decodeBytes(bytes, charset) {
    try {
      return new TextDecoder(charset).decode(new Uint8Array(bytes));
    } catch (e) {
      return String.fromCharCode(...bytes);
    }
  }

  function isUtf8(bytes) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Split a byte segment into the byte groups that form single characters.
  function groupBytes(bytes, charset) {
    const groups = [];
    let i = 0;
    while (i < bytes.length) {
      let len = 1;
      const b = bytes[i];
      if (charset === 'utf-8') {
        if (b >= 0xf0) len = 4;
        else if (b >= 0xe0) len = 3;
        else if (b >= 0xc0) len = 2;
      } else if (charset === 'utf-16be') {
        len = 2;
      } else if (['shift_jis', 'big5', 'gb18030', 'euc-kr'].includes(charset)) {
        if (b >= 0x81 && !(charset === 'shift_jis' && b >= 0xa0 && b <= 0xdf)) len = 2;
      }
      len = Math.min(len, bytes.length - i);
      groups.push({ offset: i, len });
      i += len;
    }
    return groups;
  }

  function readInt(bits, start, len) {
    let v = 0;
    for (let i = 0; i < len; i++) v = v * 2 + bits[start + i];
    return v;
  }

  function analyze(input) {
    const matrix = input.map((row) => row.map((v) => (v ? 1 : 0)));
    const n = matrix.length;
    if (n < 21 || n > 177 || (n - 17) % 4 !== 0 || matrix.some((row) => row.length !== n)) {
      throw new Error('BAD_SIZE');
    }
    const res = { size: n, matrix };
    let version = S.versionOf(n);

    if (version >= 7) {
      const vc = S.versionCells(n);
      const read = (cells) => cells.reduce((acc, [r, c], i) => acc | (matrix[r][c] << i), 0);
      const raw1 = read(vc.topRight);
      const raw2 = read(vc.bottomLeft);
      let best = null;
      for (let v = 7; v <= 40; v++) {
        const w = S.versionWord(v);
        const d = Math.min(S.hamming(raw1, w), S.hamming(raw2, w));
        if (!best || d < best.distance) best = { value: v, distance: d, word: w };
      }
      res.versionInfo = {
        cells: vc, raw1, raw2, value: best.value, word: best.word, distance: best.distance,
        exact1: raw1 === best.word, exact2: raw2 === best.word, ok: best.distance <= 3,
        matchesSize: best.value === version,
      };
    }
    res.version = version;

    const cat = S.functionMap(version);
    res.cat = cat;
    res.alignment = S.alignmentPositions(version);

    // Format information.
    const fc = S.formatCells(n);
    const readF = (cells) => cells.reduce((acc, [r, c], i) => acc | (matrix[r][c] << i), 0);
    const raw1 = readF(fc.copy1);
    const raw2 = readF(fc.copy2);
    let best = null;
    for (const ecl of S.ECL_ORDER) {
      for (let mask = 0; mask < 8; mask++) {
        const w = S.formatWord(ecl, mask);
        const d1 = S.hamming(raw1, w);
        const d2 = S.hamming(raw2, w);
        const d = Math.min(d1, d2);
        if (!best || d < best.distance) best = { ecl, mask, word: w, distance: d, d1, d2 };
      }
    }
    if (best.distance > 3) throw new Error('BAD_FORMAT');
    res.format = {
      cells: fc, raw1, raw2, unmasked1: raw1 ^ S.FORMAT_XOR, ecl: best.ecl, mask: best.mask,
      word: best.word, distance1: best.d1, distance2: best.d2,
      eclBits: S.ECL_BITS[best.ecl], bch: S.formatBch((S.ECL_BITS[best.ecl] << 3) | best.mask),
    };
    const ecl = best.ecl;
    const mask = best.mask;

    // Remove the mask.
    const maskFn = S.MASKS[mask];
    const unmasked = matrix.map((row) => row.slice());
    const maskCells = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (cat[r][c] === null && maskFn(r, c)) {
          unmasked[r][c] ^= 1;
          maskCells.push([r, c]);
        }
      }
    }
    res.unmasked = unmasked;
    res.maskCells = maskCells;

    // Codewords in placement order.
    const order = S.dataOrder(cat);
    res.order = order;
    const info = S.blockInfo(version, ecl);
    res.info = info;
    const codewords = [];
    for (let k = 0; k < info.totalCodewords; k++) {
      const cells = order.slice(k * 8, k * 8 + 8);
      const value = cells.reduce((acc, [r, c]) => (acc << 1) | unmasked[r][c], 0);
      codewords.push({ stream: k, cells, value, read: value });
    }
    res.codewords = codewords;
    res.remainderCells = order.slice(info.totalCodewords * 8);

    // Undo interleaving.
    const blocks = info.blocks.map((b) => ({ dataLen: b.dataLen, eccLen: b.eccLen, dataStream: [], eccStream: [] }));
    S.interleaveOrder(info).forEach((o, s) => {
      Object.assign(codewords[s], { block: o.block, kind: o.kind, blockIndex: o.index });
      blocks[o.block][o.kind === 'data' ? 'dataStream' : 'eccStream'][o.index] = s;
    });

    // Reed-Solomon check and correction per block.
    let allOk = true;
    let errorCount = 0;
    for (const b of blocks) {
      const cw = b.dataStream.concat(b.eccStream).map((s) => codewords[s].value);
      const rs = G.rsDecode(cw, b.eccLen);
      b.rs = rs;
      b.ok = rs.ok;
      if (!rs.ok) allOk = false;
      for (const e of rs.errors) {
        const s = e.index < b.dataLen ? b.dataStream[e.index] : b.eccStream[e.index - b.dataLen];
        codewords[s].corrected = true;
        codewords[s].value = e.to;
        errorCount++;
      }
      b.data = b.dataStream.map((s) => codewords[s].value);
    }
    res.blocks = blocks;
    res.rsOk = allOk;
    res.errorCount = errorCount;

    // Data bit stream with the module of every bit.
    const dataStreams = [];
    for (const b of blocks) for (const s of b.dataStream) dataStreams.push(s);
    res.dataStreams = dataStreams;
    const bits = [];
    for (const s of dataStreams) for (let j = 7; j >= 0; j--) bits.push((codewords[s].value >>> j) & 1);
    res.bits = bits;
    res.bitCells = (start, len) => {
      const out = [];
      for (let i = start; i < start + len; i++) out.push(codewords[dataStreams[i >> 3]].cells[i & 7]);
      return out;
    };

    parseSegments(res);
    return res;
  }

  function parseSegments(res) {
    const bits = res.bits;
    const version = res.version;
    const total = bits.length;
    let pos = 0;
    let charset = null;
    const segments = [];
    res.segments = segments;
    res.problems = [];

    while (true) {
      if (total - pos < 4) {
        res.terminator = { start: pos, len: total - pos, implicit: true };
        pos = total;
        break;
      }
      const modeValue = readInt(bits, pos, 4);
      const modeKey = S.MODE_BY_BITS[modeValue];
      const seg = { mode: modeKey || 'unknown', modeBits: { start: pos, len: 4, value: modeValue }, items: [], text: '' };
      pos += 4;
      if (modeKey === 'terminator') {
        res.terminator = { start: pos - 4, len: 4, implicit: false };
        break;
      }
      if (!modeKey) {
        segments.push(seg);
        res.problems.push('UNKNOWN_MODE');
        break;
      }
      segments.push(seg);

      if (modeKey === 'eci') {
        const first = readInt(bits, pos, 8);
        let len = 8;
        let value = first;
        if ((first & 0x80) === 0) value = first;
        else if ((first & 0xc0) === 0x80) { len = 16; value = readInt(bits, pos, 16) & 0x3fff; }
        else { len = 24; value = readInt(bits, pos, 24) & 0x1fffff; }
        seg.eci = { start: pos, len, value, charset: S.ECI_CHARSETS[value] || null };
        charset = seg.eci.charset;
        pos += len;
        continue;
      }
      if (modeKey === 'structuredAppend') {
        seg.append = { start: pos, len: 16, index: readInt(bits, pos, 4), total: readInt(bits, pos + 4, 4) + 1, parity: readInt(bits, pos + 8, 8) };
        pos += 16;
        continue;
      }
      if (modeKey === 'fnc1First') continue;
      if (modeKey === 'fnc1Second') {
        seg.appIndicator = { start: pos, len: 8, value: readInt(bits, pos, 8) };
        pos += 8;
        continue;
      }

      const cb = S.countBits(modeKey, version);
      const count = readInt(bits, pos, cb);
      seg.countBits = { start: pos, len: cb, value: count };
      pos += cb;

      const need = (len) => {
        if (pos + len > total) {
          res.problems.push('TRUNCATED');
          return false;
        }
        return true;
      };

      if (modeKey === 'numeric') {
        let left = count;
        while (left > 0) {
          const digits = Math.min(3, left);
          const len = digits * 3 + 1;
          if (!need(len)) break;
          const value = readInt(bits, pos, len);
          const text = String(value).padStart(digits, '0');
          seg.items.push({ start: pos, len, value, text, digits });
          seg.text += text;
          pos += len;
          left -= digits;
        }
      } else if (modeKey === 'alphanumeric') {
        let left = count;
        while (left > 0) {
          const pair = left >= 2;
          const len = pair ? 11 : 6;
          if (!need(len)) break;
          const value = readInt(bits, pos, len);
          const a = pair ? Math.floor(value / 45) : value;
          const b = pair ? value % 45 : null;
          const text = pair ? (S.ALNUM[a] || '?') + (S.ALNUM[b] || '?') : S.ALNUM[a] || '?';
          seg.items.push({ start: pos, len, value, text, a, b, pair });
          seg.text += text;
          pos += len;
          left -= pair ? 2 : 1;
        }
      } else if (modeKey === 'byte') {
        const bytes = [];
        const starts = [];
        for (let i = 0; i < count; i++) {
          if (!need(8)) break;
          starts.push(pos);
          bytes.push(readInt(bits, pos, 8));
          pos += 8;
        }
        let cs = charset;
        seg.charsetSource = 'eci';
        if (!cs) {
          cs = isUtf8(bytes) ? 'utf-8' : 'iso-8859-1';
          seg.charsetSource = cs === 'utf-8' ? 'guess-utf8' : 'default-latin1';
        }
        seg.charset = cs;
        seg.bytes = bytes;
        for (const g of groupBytes(bytes, cs)) {
          const gb = bytes.slice(g.offset, g.offset + g.len);
          const text = decodeBytes(gb, cs);
          seg.items.push({ start: starts[g.offset], len: g.len * 8, bytes: gb, text });
        }
        seg.text = decodeBytes(bytes, cs);
      } else if (modeKey === 'kanji') {
        for (let i = 0; i < count; i++) {
          if (!need(13)) break;
          const value = readInt(bits, pos, 13);
          const hi = Math.floor(value / 0xc0);
          const lo = value % 0xc0;
          const packed = (hi << 8) | lo;
          const sjis = packed + (packed < 0x1f00 ? 0x8140 : 0xc140);
          const text = decodeBytes([sjis >> 8, sjis & 0xff], 'shift_jis');
          seg.items.push({ start: pos, len: 13, value, hi, lo, packed, sjis, text });
          seg.text += text;
          pos += 13;
        }
      }
      if (res.problems.includes('TRUNCATED')) break;
    }

    if (!res.terminator) res.terminator = { start: pos, len: 0, implicit: true };
    const afterTerm = res.terminator.start + res.terminator.len;
    const padLen = (8 - (afterTerm % 8)) % 8;
    res.padBits = { start: afterTerm, len: Math.min(padLen, total - afterTerm) };
    res.padBytes = [];
    for (let p = afterTerm + res.padBits.len; p + 8 <= total; p += 8) {
      res.padBytes.push({ start: p, len: 8, value: readInt(bits, p, 8) });
    }
    res.text = segments.map((s) => s.text || '').join('');
  }

  QRT.decoder = { analyze };
})(typeof window !== 'undefined' ? window : globalThis);
