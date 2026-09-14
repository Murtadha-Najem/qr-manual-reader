// Canvas view of the module grid: tints, outlined boxes with per-cell labels, the reading path,
// mask dots, the mask animation, rulers, and animated zoom to the cells a step is about.
(function (root) {
  const QRT = (root.QRT = root.QRT || {});

  function rgba(hexColor, a) {
    const v = parseInt(hexColor.slice(1), 16);
    return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
  }
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const PATH = '#e11d48';

  class GridView {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.d = null;
      this.step = null;
      this.vp = null;
      this.target = null;
      this.anim = null;
      this.compare = false;
      this.autoZoom = true;
      this.raf = 0;
      this.dpr = 1;
      this.override = null;
    }

    setAnalysis(d) {
      this.d = d;
      this.vp = this.fullView();
      this.target = null;
    }

    fullView() {
      const n = this.d.size;
      return { x: -1.5, y: -1.5, w: n + 3, h: n + 3 };
    }

    focusView(cells) {
      const n = this.d.size;
      if (!cells || !cells.length || !this.autoZoom) return this.fullView();
      let r0 = Infinity, r1 = -Infinity, c0 = Infinity, c1 = -Infinity;
      for (const [r, c] of cells) {
        r0 = Math.min(r0, r); r1 = Math.max(r1, r);
        c0 = Math.min(c0, c); c1 = Math.max(c1, c);
      }
      const pad = 2.5;
      const minSize = Math.min(n + 3, Math.max(12, n * 0.4));
      const w = Math.max(c1 - c0 + 1 + pad * 2, r1 - r0 + 1 + pad * 2, minSize);
      if (w >= n + 1) return this.fullView();
      const cx = (c0 + c1 + 1) / 2;
      const cy = (r0 + r1 + 1) / 2;
      const clamp = (val) => Math.max(-1.5, Math.min(n + 1.5 - w, val));
      return { x: clamp(cx - w / 2), y: clamp(cy - w / 2), w, h: w };
    }

    show(step, instant) {
      this.step = step;
      this.compare = false;
      const n = this.d.size;
      this.override = null;
      if (step.view.override) {
        this.override = new Map();
        step.view.override.cells.forEach(([r, c], i) => this.override.set(r * n + c, step.view.override.values[i]));
      }
      this.retarget(instant);
      if (step.view.grid === 'maskAnim') this.playMask();
      else this.anim = null;
      this.kick();
    }

    retarget(instant) {
      if (!this.step) return;
      const target = this.focusView(this.step.view.focus);
      if (instant || !this.vp) {
        this.vp = target;
        this.target = null;
      } else {
        this.from = Object.assign({}, this.vp);
        this.target = target;
        this.t0 = performance.now();
      }
      this.kick();
    }

    playMask() {
      this.compare = false;
      this.anim = { start: performance.now() + 400, dur: 1800, p: 0 };
      this.kick();
    }

    setCompare(before) {
      this.compare = before;
      this.kick();
    }

    setAutoZoom(on) {
      this.autoZoom = on;
      this.retarget(false);
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(50, Math.round(rect.width * dpr));
      const h = Math.max(50, Math.round(rect.height * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.dpr = dpr;
      this.kick();
    }

    kick() {
      if (!this.raf) this.raf = requestAnimationFrame((t) => { this.raf = 0; this.frame(t); });
    }

    frame(now) {
      let more = false;
      if (this.target) {
        const t = Math.min(1, (now - this.t0) / 500);
        const e = ease(t);
        for (const k of ['x', 'y', 'w', 'h']) this.vp[k] = this.from[k] + (this.target[k] - this.from[k]) * e;
        if (t < 1) more = true;
        else { this.vp = Object.assign({}, this.target); this.target = null; }
      }
      if (this.anim) {
        this.anim.p = Math.max(0, (now - this.anim.start) / this.anim.dur);
        if (this.anim.p < 1.2) more = true;
      }
      this.draw();
      if (more) this.kick();
    }

    draw() {
      const { ctx, canvas, d, step } = this;
      if (!d || !step || !this.vp) return;
      const W = canvas.width;
      const H = canvas.height;
      const vp = this.vp;
      const s = Math.min(W / vp.w, H / vp.h);
      const ox = (W - vp.w * s) / 2 - vp.x * s;
      const oy = (H - vp.h * s) / 2 - vp.y * s;
      const n = d.size;
      const view = step.view;
      const dpr = this.dpr;
      const cssCell = s / dpr;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.setTransform(s, 0, 0, s, ox, oy);

      const r0 = Math.max(0, Math.floor(vp.y) - 1);
      const r1 = Math.min(n - 1, Math.ceil(vp.y + vp.h) + 1);
      const c0 = Math.max(0, Math.floor(vp.x) - 1);
      const c1 = Math.min(n - 1, Math.ceil(vp.x + vp.w) + 1);

      const mode = this.compare ? 'raw' : view.grid;
      const p = mode === 'maskAnim' ? (this.anim ? this.anim.p : 1) : 0;
      const maskFn = QRT.spec.MASKS[d.format.mask];
      const ov = this.compare ? null : this.override;
      const value = (r, c) => {
        if (ov && ov.has(r * n + c)) return ov.get(r * n + c);
        if (mode === 'raw') return d.matrix[r][c];
        if (mode === 'unmasked') return d.unmasked[r][c];
        return d.cat[r][c] === null && p > (r + c) / (2 * n) ? d.unmasked[r][c] : d.matrix[r][c];
      };

      const eps = 0.5 / s;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const k = d.cat[r][c];
          const val = value(r, c);
          const dimmed = (view.dim && k !== null) || (view.dimData && k === null);
          if (view.solid && k === null) ctx.fillStyle = '#ffffff';
          else ctx.fillStyle = val ? (dimmed ? '#b9bec8' : '#111827') : dimmed ? '#eef0f3' : '#ffffff';
          ctx.fillRect(c - eps, r - eps, 1 + 2 * eps, 1 + 2 * eps);
          if (mode === 'maskAnim' && k === null && maskFn(r, c)) {
            const key = (r + c) / (2 * n);
            if (p > key && p < key + 0.1) {
              ctx.fillStyle = rgba('#06b6d4', 0.75 * (1 - (p - key) / 0.1));
              ctx.fillRect(c, r, 1, 1);
            }
          }
        }
      }

      if (cssCell >= 7) {
        ctx.beginPath();
        for (let r = r0; r <= r1 + 1; r++) { ctx.moveTo(c0, r); ctx.lineTo(c1 + 1, r); }
        for (let c = c0; c <= c1 + 1; c++) { ctx.moveTo(c, r0); ctx.lineTo(c, r1 + 1); }
        ctx.strokeStyle = 'rgba(100,116,139,0.22)';
        ctx.lineWidth = 1 / s;
        ctx.stroke();
      }

      for (const t of view.tints || []) {
        ctx.fillStyle = rgba(t.color, t.alpha == null ? 0.3 : t.alpha);
        for (const [r, c] of t.cells) ctx.fillRect(c, r, 1, 1);
      }

      if (view.groups) {
        ctx.beginPath();
        for (const g of view.groups) this.outlinePath(g, n);
        ctx.strokeStyle = 'rgba(15,23,42,0.55)';
        ctx.lineWidth = Math.max(0.05, (1.3 * dpr) / s);
        ctx.stroke();
      }

      const labeled = new Set();
      for (const b of view.boxes || []) if (b.labels) for (const [r, c] of b.cells) labeled.add(r * n + c);

      if (view.maskDots) {
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            if (d.cat[r][c] !== null || !maskFn(r, c) || labeled.has(r * n + c)) continue;
            ctx.fillStyle = value(r, c) ? '#67e8f9' : '#0891b2';
            ctx.beginPath();
            ctx.arc(c + 0.5, r + 0.5, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (view.path && view.path.length > 1) {
        if (view.pathStyle === 'fine') this.drawZigzag(view.path, s, 0.9, true);
        else this.drawSnake(view.path, s, cssCell);
      }

      const labelJobs = [];
      for (const b of view.boxes || []) {
        ctx.fillStyle = rgba(b.color, b.fill == null ? 0.22 : b.fill);
        for (const [r, c] of b.cells) ctx.fillRect(c, r, 1, 1);
        ctx.beginPath();
        this.outlinePath(b.cells, n);
        const lw = Math.max(0.09, (2.6 * dpr) / s);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = lw * 2.2;
        ctx.stroke();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = lw;
        ctx.stroke();
        if (b.labels || b.seq) b.cells.forEach(([r, c], i) => labelJobs.push({ r, c, text: b.labels ? b.labels[i] : null, seq: b.seq ? i + 1 : null, color: b.color }));
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (cssCell >= 13 && labelJobs.length) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const job of labelJobs) {
          const x = ox + (job.c + 0.5) * s;
          const y = oy + (job.r + 0.5) * s;
          const dark = view.solid && d.cat[job.r][job.c] === null ? 0 : value(job.r, job.c);
          if (job.text != null && job.text !== '') {
            const size = s * (String(job.text).length > 1 ? 0.4 : 0.52);
            ctx.font = `600 ${size}px system-ui, "Segoe UI", Tahoma, sans-serif`;
            ctx.fillStyle = dark ? '#ffffff' : '#0f172a';
            ctx.fillText(String(job.text), x, y + size * 0.06);
          }
          if (job.seq != null && cssCell >= 26) {
            const size = Math.max(9 * dpr, s * 0.2);
            ctx.font = `600 ${size}px system-ui, "Segoe UI", sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = dark ? 'rgba(255,255,255,0.75)' : rgba(job.color, 0.95);
            ctx.fillText(String(job.seq), ox + job.c * s + s * 0.1, oy + job.r * s + s * 0.07);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
          }
        }
      }

      if (cssCell >= 11) this.drawRulers(ox, oy, s, r0, r1, c0, c1, cssCell);
    }

    // Adds the outer edges of a set of cells to the current path.
    outlinePath(cells, n) {
      const ctx = this.ctx;
      const set = new Set(cells.map(([r, c]) => r * n + c));
      for (const [r, c] of cells) {
        if (r === 0 || !set.has((r - 1) * n + c)) { ctx.moveTo(c, r); ctx.lineTo(c + 1, r); }
        if (r === n - 1 || !set.has((r + 1) * n + c)) { ctx.moveTo(c, r + 1); ctx.lineTo(c + 1, r + 1); }
        if (c === 0 || !set.has(r * n + c - 1)) { ctx.moveTo(c, r); ctx.lineTo(c, r + 1); }
        if (c === n - 1 || !set.has(r * n + c + 1)) { ctx.moveTo(c + 1, r); ctx.lineTo(c + 1, r + 1); }
      }
    }

    arrow(x, y, ang, L) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L);
      ctx.lineTo(x + Math.cos(ang + 2.45) * L, y + Math.sin(ang + 2.45) * L);
      ctx.lineTo(x + Math.cos(ang - 2.45) * L, y + Math.sin(ang - 2.45) * L);
      ctx.closePath();
      ctx.fill();
    }

    // Exact cell-by-cell order: right cell, left cell, next row.
    drawZigzag(path, s, alpha, arrows) {
      const ctx = this.ctx;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(PATH, alpha);
      ctx.lineWidth = Math.max(0.06, (2 * this.dpr) / s);
      ctx.beginPath();
      path.forEach(([r, c], i) => {
        if (i === 0) ctx.moveTo(c + 0.5, r + 0.5);
        else {
          const [pr, pc] = path[i - 1];
          if (Math.abs(pr - r) + Math.abs(pc - c) > 3) ctx.moveTo(c + 0.5, r + 0.5);
          else ctx.lineTo(c + 0.5, r + 0.5);
        }
      });
      ctx.stroke();
      if (!arrows) return;
      ctx.fillStyle = rgba(PATH, alpha);
      for (let i = 1; i < path.length; i++) {
        const [ar, ac] = path[i - 1];
        const [br, bc] = path[i];
        if (Math.abs(ar - br) + Math.abs(ac - bc) > 3) continue;
        const ang = Math.atan2(br - ar, bc - ac);
        const t = 0.62;
        this.arrow(ac + 0.5 + (bc - ac) * t, ar + 0.5 + (br - ar) * t, ang, 0.17);
      }
    }

    // The big picture: a snake running up and down through each pair of columns.
    drawSnake(path, s, cssCell) {
      const ctx = this.ctx;
      const n = this.d.size;
      const pairX = (c) => (c > 6 ? (c % 2 === 0 ? c : c + 1) : c % 2 === 1 ? c : c + 1);
      const groups = [];
      for (const [r, c] of path) {
        const x = pairX(c);
        const g = groups[groups.length - 1];
        if (g && g.x === x) g.last = r;
        else groups.push({ x, first: r, last: r });
      }
      // Each column pair is travelled end to end: the part before its first data cell passes
      // over fixed modules that are skipped, so it is drawn dashed.
      const solid = [];
      const skipped = [];
      groups.forEach((g, i) => {
        const enter = i === 0 ? g.first : groups[i - 1].last;
        if (i > 0) solid.push([[groups[i - 1].x, enter + 0.5], [g.x, enter + 0.5]]);
        if (enter !== g.first) skipped.push([[g.x, enter + 0.5], [g.x, g.first + 0.5]]);
        solid.push([[g.x, g.first + 0.5], [g.x, g.last + 0.5]]);
      });
      if (cssCell >= 16) this.drawZigzag(path, s, 0.22, false);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const stroke = (segs, style, width, dash) => {
        ctx.beginPath();
        for (const [[x1, y1], [x2, y2]] of segs) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
        ctx.strokeStyle = style;
        ctx.lineWidth = width;
        ctx.setLineDash(dash || []);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      stroke(solid, rgba(PATH, 0.16), 1.7);
      stroke(solid, rgba(PATH, 0.95), Math.max(0.12, (3 * this.dpr) / s));
      stroke(skipped, rgba(PATH, 0.7), Math.max(0.08, (2 * this.dpr) / s), [0.35, 0.3]);
      ctx.fillStyle = PATH;
      const L = Math.max(0.45, (9 * this.dpr) / s);
      groups.forEach((g) => {
        const len = Math.abs(g.last - g.first);
        if (len < 2) return;
        const dir = g.last < g.first ? -1 : 1;
        const marks = Math.max(1, Math.floor(len / 9));
        for (let m = 1; m <= marks; m++) {
          const y = g.first + 0.5 + ((g.last - g.first) * m) / (marks + 1);
          this.arrow(g.x, y, dir < 0 ? -Math.PI / 2 : Math.PI / 2, L);
        }
      });
      const [sr, sc] = path[0];
      ctx.beginPath();
      ctx.arc(pairX(sc), sr + 0.5, Math.max(0.35, (6 * this.dpr) / s), 0, Math.PI * 2);
      ctx.fill();
      void n;
    }

    drawRulers(ox, oy, s, r0, r1, c0, c1, cssCell) {
      const ctx = this.ctx;
      const dpr = this.dpr;
      const band = 17 * dpr;
      const W = this.canvas.width;
      const H = this.canvas.height;
      ctx.fillStyle = 'rgba(248,250,252,0.94)';
      ctx.fillRect(0, 0, W, band);
      ctx.fillRect(0, 0, band, H);
      ctx.fillStyle = '#475569';
      ctx.font = `${10.5 * dpr}px system-ui, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const every = cssCell >= 20 ? 1 : 2;
      for (let c = c0; c <= c1; c++) {
        if (c % every) continue;
        const x = ox + (c + 0.5) * s;
        if (x > band) ctx.fillText(String(c), x, band / 2);
      }
      for (let r = r0; r <= r1; r++) {
        if (r % every) continue;
        const y = oy + (r + 0.5) * s;
        if (y > band) ctx.fillText(String(r), band / 2, y);
      }
    }
  }

  QRT.GridView = GridView;
})(typeof window !== 'undefined' ? window : globalThis);
