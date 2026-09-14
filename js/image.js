// Reading a module grid out of a photo. jsQR only locates the code (corners and version);
// we sample the modules ourselves so the lesson starts from a plain grid of ones and zeros.
(function (root) {
  const QRT = (root.QRT = root.QRT || {});

  // Perspective map from the unit square to a quad: (0,0) TL, (1,0) TR, (1,1) BR, (0,1) BL.
  function squareToQuad(p0, p1, p2, p3) {
    const dx3 = p0.x - p1.x + p2.x - p3.x;
    const dy3 = p0.y - p1.y + p2.y - p3.y;
    let a11, a12, a13, a21, a22, a23, a31, a32;
    if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
      a11 = p1.x - p0.x; a21 = p2.x - p1.x; a31 = p0.x;
      a12 = p1.y - p0.y; a22 = p2.y - p1.y; a32 = p0.y;
      a13 = 0; a23 = 0;
    } else {
      const dx1 = p1.x - p2.x;
      const dx2 = p3.x - p2.x;
      const dy1 = p1.y - p2.y;
      const dy2 = p3.y - p2.y;
      const den = dx1 * dy2 - dx2 * dy1;
      a13 = (dx3 * dy2 - dx2 * dy3) / den;
      a23 = (dx1 * dy3 - dx3 * dy1) / den;
      a11 = p1.x - p0.x + a13 * p1.x;
      a21 = p3.x - p0.x + a23 * p3.x;
      a31 = p0.x;
      a12 = p1.y - p0.y + a13 * p1.y;
      a22 = p3.y - p0.y + a23 * p3.y;
      a32 = p0.y;
    }
    return (u, v) => {
      const den = a13 * u + a23 * v + 1;
      return { x: (a11 * u + a21 * v + a31) / den, y: (a12 * u + a22 * v + a32) / den };
    };
  }

  function otsu(values) {
    const hist = new Array(256).fill(0);
    for (const v of values) hist[Math.max(0, Math.min(255, Math.round(v)))]++;
    const total = values.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (!wB) continue;
      const wF = total - wB;
      if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; threshold = t; }
    }
    return threshold + 0.5;
  }

  function fromImageData(img) {
    if (typeof jsQR !== 'function') throw new Error('NO_LOCATOR');
    const found = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
    if (!found) return null;
    const version = found.version;
    const n = version * 4 + 17;
    const L = found.location;
    const map = squareToQuad(L.topLeftCorner, L.topRightCorner, L.bottomRightCorner, L.bottomLeftCorner);
    const lum = (x, y) => {
      const xi = Math.max(0, Math.min(img.width - 1, Math.round(x)));
      const yi = Math.max(0, Math.min(img.height - 1, Math.round(y)));
      const i = (yi * img.width + xi) * 4;
      return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    };
    const means = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let acc = 0;
        for (const dy of [-0.22, 0, 0.22]) {
          for (const dx of [-0.22, 0, 0.22]) {
            const pt = map((c + 0.5 + dx) / n, (r + 0.5 + dy) / n);
            acc += lum(pt.x, pt.y);
          }
        }
        means.push(acc / 9);
      }
    }
    const th = otsu(means);
    let matrix = [];
    for (let r = 0; r < n; r++) matrix.push(means.slice(r * n, r * n + n).map((m) => (m < th ? 1 : 0)));
    // The centre of the top-left finder is always dark; if not, the code is printed inverted.
    let inverted = false;
    if (!matrix[3][3] && !matrix[0][0]) {
      matrix = matrix.map((row) => row.map((x) => 1 - x));
      inverted = true;
    }
    return { matrix, version, location: L, text: found.data, inverted };
  }

  function previewWithQuad(source, location, maxSide) {
    maxSide = maxSide || 520;
    const w = source.width;
    const h = source.height;
    const k = Math.min(1, maxSide / Math.max(w, h));
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * k);
    cv.height = Math.round(h * k);
    const ctx = cv.getContext('2d');
    ctx.drawImage(source, 0, 0, cv.width, cv.height);
    const L = location;
    const pts = [L.topLeftCorner, L.topRightCorner, L.bottomRightCorner, L.bottomLeftCorner];
    ctx.lineWidth = Math.max(3, cv.width / 120);
    ctx.strokeStyle = '#e11d48';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)));
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#7c3aed';
    for (const p of [L.topLeftFinderPattern, L.topRightFinderPattern, L.bottomLeftFinderPattern]) {
      ctx.beginPath();
      ctx.arc(p.x * k, p.y * k, Math.max(5, cv.width / 70), 0, Math.PI * 2);
      ctx.fill();
    }
    return cv.toDataURL('image/jpeg', 0.88);
  }

  // A synthetic "phone photo": rotated, skewed, unevenly lit, noisy and slightly blurred.
  function demoPhoto(matrix) {
    const n = matrix.length;
    const size = 640;
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#cfc8b8');
    bg.addColorStop(1, '#8f8778');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2 + 12, size / 2 - 6);
    ctx.rotate(-0.24);
    ctx.transform(1, 0.07, -0.1, 0.96, 0, 0);
    const m = 360 / (n + 8);
    const half = ((n + 8) * m) / 2;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#f6f3ec';
    ctx.fillRect(-half, -half, (n + 8) * m, (n + 8) * m);
    ctx.shadowBlur = 0;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!matrix[r][c]) continue;
        ctx.fillStyle = `rgba(24,22,20,${0.86 + rnd() * 0.14})`;
        ctx.fillRect(-half + (c + 4) * m - 0.3, -half + (r + 4) * m - 0.3, m + 0.6, m + 0.6);
      }
    }
    ctx.restore();
    const light = ctx.createRadialGradient(size * 0.3, size * 0.25, 40, size * 0.3, size * 0.25, size * 0.95);
    light.addColorStop(0, 'rgba(255,250,235,0.28)');
    light.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const noise = (rnd() - 0.5) * 34;
      img.data[i] += noise;
      img.data[i + 1] += noise;
      img.data[i + 2] += noise;
    }
    ctx.putImageData(img, 0, 0);
    const out = document.createElement('canvas');
    out.width = size;
    out.height = size;
    const octx = out.getContext('2d');
    octx.filter = 'blur(1.1px)';
    octx.drawImage(cv, 0, 0);
    return out;
  }

  QRT.image = { fromImageData, previewWithQuad, demoPhoto, squareToQuad };
})(typeof window !== 'undefined' ? window : globalThis);
