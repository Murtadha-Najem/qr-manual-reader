// GF(256) arithmetic and Reed-Solomon encode/decode for QR codes.
// Field polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D), generator roots a^0 .. a^(n-1).
(function (root) {
  const QRT = (root.QRT = root.QRT || {});

  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

  function mul(a, b) {
    return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
  }
  function div(a, b) {
    if (b === 0) throw new Error('division by zero in GF(256)');
    return a === 0 ? 0 : EXP[(LOG[a] + 255 - LOG[b]) % 255];
  }
  function alphaPow(e) {
    return EXP[((e % 255) + 255) % 255];
  }

  // Coefficients highest degree first, monic.
  function generator(n) {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) {
        next[j] ^= g[j];
        next[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = next;
    }
    return g;
  }

  // Returns the n error-correction codewords for the data array.
  function rsEncode(data, n) {
    const g = generator(n);
    const reg = new Array(n).fill(0);
    for (const byte of data) {
      const factor = byte ^ reg.shift();
      reg.push(0);
      for (let j = 0; j < n; j++) reg[j] ^= mul(g[j + 1], factor);
    }
    return reg;
  }

  // Evaluate polynomial given highest degree first.
  function evalHigh(poly, xv) {
    let y = 0;
    for (const c of poly) y = mul(y, xv) ^ c;
    return y;
  }
  // Evaluate polynomial given lowest degree first.
  function evalLow(poly, xv) {
    let y = 0;
    for (let i = poly.length - 1; i >= 0; i--) y = mul(y, xv) ^ poly[i];
    return y;
  }

  function syndromes(codeword, n) {
    const s = [];
    for (let i = 0; i < n; i++) s.push(evalHigh(codeword, EXP[i]));
    return s;
  }

  // codeword: data followed by n ecc bytes. Returns
  // { ok, corrected, errors: [{ index, from, to }], syndromes }
  function rsDecode(codeword, n) {
    const len = codeword.length;
    const S = syndromes(codeword, n);
    if (S.every((v) => v === 0)) {
      return { ok: true, corrected: codeword.slice(), errors: [], syndromes: S };
    }

    // Berlekamp-Massey, polynomials lowest degree first.
    let C = [1];
    let B = [1];
    let L = 0;
    let m = 1;
    let b = 1;
    for (let k = 0; k < n; k++) {
      let d = S[k];
      for (let i = 1; i <= L; i++) d ^= mul(C[i] || 0, S[k - i]);
      if (d === 0) {
        m++;
        continue;
      }
      const coef = div(d, b);
      const T = C.slice();
      const need = B.length + m;
      while (C.length < need) C.push(0);
      for (let i = 0; i < B.length; i++) C[i + m] ^= mul(coef, B[i]);
      if (2 * L <= k) {
        L = k + 1 - L;
        B = T;
        b = d;
        m = 1;
      } else {
        m++;
      }
    }
    while (C.length > 1 && C[C.length - 1] === 0) C.pop();
    const fail = { ok: false, corrected: codeword.slice(), errors: [], syndromes: S };
    if (L * 2 > n || C.length - 1 !== L) return fail;

    // Chien search: error at degree p when C(a^-p) == 0.
    const positions = [];
    for (let p = 0; p < len; p++) {
      if (evalLow(C, alphaPow(-p)) === 0) positions.push(p);
    }
    if (positions.length !== L) return fail;

    // Omega = S(x) * C(x) mod x^n
    const omega = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < C.length && i + j < n; j++) omega[i + j] ^= mul(S[i], C[j]);
    }
    // Formal derivative of C.
    const dC = [];
    for (let i = 1; i < C.length; i++) dC.push(i % 2 === 1 ? C[i] : 0);

    const corrected = codeword.slice();
    const errors = [];
    for (const p of positions) {
      const X = alphaPow(p);
      const Xinv = alphaPow(-p);
      const denom = evalLow(dC, Xinv);
      if (denom === 0) return fail;
      const mag = mul(X, div(evalLow(omega, Xinv), denom));
      const index = len - 1 - p;
      errors.push({ index, from: codeword[index], to: codeword[index] ^ mag });
      corrected[index] ^= mag;
    }
    if (!syndromes(corrected, n).every((v) => v === 0)) return fail;
    errors.sort((a, b2) => a.index - b2.index);
    return { ok: true, corrected, errors, syndromes: S };
  }

  QRT.gf = { EXP, LOG, mul, div, generator, rsEncode, rsDecode, syndromes };
})(typeof window !== 'undefined' ? window : globalThis);
