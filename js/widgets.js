// Interactive widgets for the fundamentals lessons. Each widget is mounted into a container
// with its parameters and an api { solve(), onDestroy(fn) }; solve() marks the page's task done.
// Every choice a widget offers carries its own short explanation, not just a label.
(function (root) {
  const QRT = (root.QRT = root.QRT || {});
  const S = QRT.spec;
  const T = (ar, en) => (QRT.i18n ? QRT.i18n.tr(ar, en) : en);

  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const bin = (v, len) => v.toString(2).padStart(len, '0');
  const C = { mode: '#dc2626', count: '#2563eb', data: '#16a34a', mask: '#0891b2', gray: '#94a3b8', format: '#ca8a04', slate: '#475569' };

  const ECL_TEXT = {
    L: () => T('L: يتحمل تلف حتى 7% تقريباً. أصغر كود وأقل حماية.', 'L: survives about 7% damage. Smallest code, least protection.'),
    M: () => T('M: يتحمل تلف حتى 15% تقريباً. الخيار الشائع.', 'M: survives about 15% damage. The usual choice.'),
    Q: () => T('Q: يتحمل تلف حتى 25% تقريباً.', 'Q: survives about 25% damage.'),
    H: () => T('H: يتحمل تلف حتى 30% تقريباً. أكبر كود، ويُستعمل عندما يوضع شعار فوق الكود.', 'H: survives about 30% damage. Largest code, used when a logo sits on top.'),
  };
  const MASK_TEXT = [
    () => T('شطرنج: مربع نعم ومربع لا.', 'Checkerboard: every other module.'),
    () => T('خطوط أفقية: كل صف ثانٍ.', 'Horizontal stripes: every other row.'),
    () => T('خطوط عمودية: كل عمود ثالث.', 'Vertical stripes: every third column.'),
    () => T('خطوط مائلة: كل قطر ثالث.', 'Diagonal lines: every third diagonal.'),
    () => T('مستطيلات متناوبة بحجم 2×3.', 'Alternating 2×3 blocks.'),
    () => T('شبكة من الصلبان تتكرر كل 6 مربعات.', 'A grid of crosses repeating every 6 modules.'),
    () => T('نمط متشابك يتكرر كل 6 مربعات.', 'An interwoven pattern repeating every 6 modules.'),
    () => T('نمط مائل متشابك يتكرر كل 6 مربعات.', 'A slanted interwoven pattern repeating every 6 modules.'),
  ];

  function bitRow(parts) {
    const inner = parts
      .map((p) => [...p.bits].map((b) => `<span class="bit" style="--c:${p.color}">${b}</span>`).join(''))
      .join('<span class="bitgap"></span>');
    return `<span class="bits" dir="ltr">${inner}</span>`;
  }

  // Sizes a canvas to its CSS box and returns a context in CSS pixels.
  function prep(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(10, Math.round(rect.width * dpr));
    canvas.height = Math.max(10, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  // Draws an n x n grid; fill(r, c) returns a colour. Returns the geometry for hit testing.
  function drawGrid(canvas, n, fill, opts) {
    opts = opts || {};
    const { ctx, w, h } = prep(canvas);
    const margin = opts.margin == null ? 1 : opts.margin;
    const s = Math.min(w, h) / (n + margin * 2);
    const ox = (w - s * n) / 2 + (opts.shiftX || 0) * s;
    const oy = (h - s * n) / 2 + (opts.shiftY || 0) * s;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        ctx.fillStyle = fill(r, c);
        ctx.fillRect(ox + c * s - 0.2, oy + r * s - 0.2, s + 0.4, s + 0.4);
      }
    }
    if (s >= 7 && opts.lines !== false) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        ctx.moveTo(ox, oy + i * s); ctx.lineTo(ox + n * s, oy + i * s);
        ctx.moveTo(ox + i * s, oy); ctx.lineTo(ox + i * s, oy + n * s);
      }
      ctx.strokeStyle = 'rgba(100,116,139,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const geo = { s, ox, oy, n, ctx };
    canvas._geo = geo;
    if (opts.after) opts.after(ctx, geo);
    return geo;
  }

  function hit(canvas, e) {
    const g = canvas._geo;
    if (!g) return null;
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left - g.ox) / g.s);
    const r = Math.floor((e.clientY - rect.top - g.oy) / g.s);
    return r >= 0 && c >= 0 && r < g.n && c < g.n ? [r, c] : null;
  }

  function outline(ctx, g, cells, color, width) {
    const set = new Set(cells.map(([r, c]) => r * 1000 + c));
    ctx.beginPath();
    for (const [r, c] of cells) {
      const x = g.ox + c * g.s;
      const y = g.oy + r * g.s;
      if (!set.has((r - 1) * 1000 + c)) { ctx.moveTo(x, y); ctx.lineTo(x + g.s, y); }
      if (!set.has((r + 1) * 1000 + c)) { ctx.moveTo(x, y + g.s); ctx.lineTo(x + g.s, y + g.s); }
      if (!set.has(r * 1000 + c - 1)) { ctx.moveTo(x, y); ctx.lineTo(x, y + g.s); }
      if (!set.has(r * 1000 + c + 1)) { ctx.moveTo(x + g.s, y); ctx.lineTo(x + g.s, y + g.s); }
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function observe(api, el, fn) {
    const ro = new ResizeObserver(() => fn());
    ro.observe(el);
    api.onDestroy(() => ro.disconnect());
  }

  const W = {};

  // ---------- Bits and bytes ----------
  W.bits = (root, p, api) => {
    const len = 8;
    let v = p.start || 0;
    root.innerHTML = `<div class="w-box">
      <div class="w-bitgrid" dir="ltr">${Array.from({ length: len }, (_, i) => `<div class="w-col"><span class="w-weight">${2 ** (len - 1 - i)}</span><button type="button" class="w-mod" data-i="${i}" aria-label="${T('بت', 'bit')} ${i + 1}"></button></div>`).join('')}</div>
      <div class="w-eq" dir="ltr"></div>
      <div class="w-out">
        <div><span>${T('الرقم', 'Number')}</span><b data-o="dec"></b></div>
        <div><span>Hex</span><b data-o="hex" dir="ltr"></b></div>
        ${p.showChar ? `<div><span>${T('الحرف في جدول ASCII', 'ASCII character')}</span><b data-o="chr"></b></div>` : ''}
      </div>
      ${p.target != null ? `<div class="w-goal">${T('الهدف:', 'Goal:')} <b>${p.target}</b>${p.showChar ? T(` (الحرف ${String.fromCharCode(p.target)})`, ` (the letter ${String.fromCharCode(p.target)})`) : ''}</div>` : ''}
    </div>`;
    const mods = root.querySelectorAll('.w-mod');
    const render = () => {
      const terms = [];
      mods.forEach((m, i) => {
        const on = (v >> (len - 1 - i)) & 1;
        m.classList.toggle('on', !!on);
        m.textContent = on;
        if (on) terms.push(2 ** (len - 1 - i));
      });
      root.querySelector('.w-eq').textContent = terms.length ? `${terms.join(' + ')} = ${v}` : '0';
      root.querySelector('[data-o="dec"]').textContent = v;
      root.querySelector('[data-o="hex"]').textContent = '0x' + v.toString(16).toUpperCase().padStart(2, '0');
      const chr = root.querySelector('[data-o="chr"]');
      if (chr) chr.textContent = v === 32 ? T('مسافة', 'space') : v > 32 && v < 127 ? String.fromCharCode(v) : T('لا حرف', 'none');
      if (p.target != null && v === p.target) api.solve();
    };
    mods.forEach((m) => m.addEventListener('click', () => { v ^= 1 << (len - 1 - Number(m.dataset.i)); render(); }));
    render();
  };

  // ---------- XOR ----------
  W.xor = (root, p, api) => {
    const a = [...p.a].map(Number);
    const b = [...p.b].map(Number);
    const len = a.length;
    const guess = new Array(len).fill(0);
    let twice = false;
    const rule = `<table class="w-rule" dir="ltr"><tr><td>0 XOR 0</td><td><b>0</b></td></tr><tr><td>0 XOR 1</td><td><b>1</b></td></tr><tr><td>1 XOR 0</td><td><b>1</b></td></tr><tr><td>1 XOR 1</td><td><b>0</b></td></tr></table>`;
    const row = (label, bits, opts) => {
      opts = opts || {};
      return `<tr class="${opts.cls || ''}"><th>${label}</th><td><div class="w-row" dir="ltr">${bits.map((x, i) => {
        const mark = opts.marks ? (opts.marks[i] ? ' ok' : ' bad') : '';
        return `<button type="button" class="w-mod sm${x ? ' on' : ''}${opts.res ? ' res' : ''}${mark}" ${opts.edit ? `data-row="${opts.edit}" data-i="${i}"` : 'disabled'}>${x}</button>`;
      }).join('')}</div></td></tr>`;
    };
    const render = () => {
      const res = a.map((x, i) => x ^ b[i]);
      let html = '';
      if (p.mode === 'free') {
        html = `<table class="w-xor">${row(T('السطر الأول', 'First row'), a, { edit: 'a' })}${row(T('السطر الثاني', 'Second row'), b, { edit: 'b' })}${row(T('النتيجة', 'Result'), res, { res: true, cls: 'sum' })}</table>`;
      } else if (p.mode === 'solve') {
        const marks = guess.map((x, i) => x === res[i]);
        const right = marks.filter(Boolean).length;
        html = `<table class="w-xor">${row(T('السطر الأول', 'First row'), a)}${row(T('السطر الثاني', 'Second row'), b)}${row(T('نتيجتك', 'Your result'), guess, { edit: 'g', res: true, marks, cls: 'sum' })}</table>
          <div class="w-msg ${right === len ? 'good' : ''}">${right === len ? T('كل البتات صحيحة', 'Every bit is right') : T(`صحيح ${right} من ${len}`, `${right} of ${len} correct`)}</div>`;
        if (right === len) api.solve();
      } else {
        const back = res.map((x, i) => x ^ b[i]);
        html = `<table class="w-xor">${row(T('البتات الأصلية', 'Original bits'), a)}${row(T('النمط', 'Pattern'), b)}${row(T('بعد الدمج', 'After XOR'), res, { res: true, cls: 'sum' })}
          ${twice ? row(T('النمط مرة ثانية', 'Pattern again'), b) + row(T('الناتج', 'Result'), back, { cls: 'sum back' }) : ''}</table>
          ${twice ? `<div class="w-msg good">${T('الناتج يطابق البتات الأصلية تماماً', 'The result matches the original bits exactly')}</div>` : ''}
          <div class="w-actions"><button type="button" class="tool" data-a="twice">${twice ? T('أعد', 'Reset') : T('ادمج مع النمط مرة ثانية', 'XOR with the pattern again')}</button></div>`;
      }
      root.innerHTML = `<div class="w-box">${html}<div class="w-rule-wrap"><span>${T('القاعدة', 'The rule')}</span>${rule}</div></div>`;
    };
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.a === 'twice') { twice = !twice; render(); return; }
      const i = Number(btn.dataset.i);
      if (btn.dataset.row === 'a') a[i] ^= 1;
      else if (btn.dataset.row === 'b') b[i] ^= 1;
      else if (btn.dataset.row === 'g') guess[i] ^= 1;
      else return;
      render();
    });
    render();
  };

  // ---------- Grid coordinates ----------
  W.coords = (root, p, api) => {
    const n = 21;
    const m = QRT.encoder.encode({ text: 'HI', ecl: 'L', version: 1, mask: 0 }).matrix;
    const at = (r, c) => T(`الصف ${r}، العمود ${c}`, `Row ${r}, column ${c}`);
    root.innerHTML = `<div class="w-box"><div class="w-canvas-wrap"><canvas class="w-canvas"></canvas></div><div class="w-coord-out" aria-live="polite">${p.target ? T(`اضغط على المربع في الصف ${p.target[0]} والعمود ${p.target[1]}`, `Click the module in row ${p.target[0]}, column ${p.target[1]}`) : T('مرّر المؤشر فوق الشبكة', 'Move the pointer over the grid')}</div></div>`;
    const canvas = root.querySelector('canvas');
    const out = root.querySelector('.w-coord-out');
    let hover = null;
    let picked = null;
    let solved = false;
    const draw = () => {
      drawGrid(canvas, n, (r, c) => {
        if (picked && picked[0] === r && picked[1] === c) return solved ? '#16a34a' : '#f97316';
        if (hover && hover[0] === r && hover[1] === c) return '#2563eb';
        const band = hover && (hover[0] === r || hover[1] === c);
        if (m[r][c]) return band ? '#94a3b8' : '#cbd5e1';
        return band ? '#dbeafe' : '#ffffff';
      }, {
        margin: 1.3, shiftX: 0.6, shiftY: 0.6,
        after: (ctx, g) => {
          ctx.font = `${Math.max(8, Math.min(12, g.s * 0.55))}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (let i = 0; i < n; i++) {
            if (g.s < 14 && i % 2) continue;
            ctx.fillStyle = hover && hover[1] === i ? '#2563eb' : '#475569';
            ctx.fillText(String(i), g.ox + (i + 0.5) * g.s, g.oy - g.s * 0.7);
            ctx.fillStyle = hover && hover[0] === i ? '#2563eb' : '#475569';
            ctx.fillText(String(i), g.ox - g.s * 0.8, g.oy + (i + 0.5) * g.s);
          }
        },
      });
    };
    canvas.addEventListener('pointermove', (e) => {
      const h = hit(canvas, e);
      if (String(h) === String(hover)) return;
      hover = h;
      if (h && !p.target) out.textContent = at(h[0], h[1]);
      draw();
    });
    canvas.addEventListener('pointerleave', () => { hover = null; draw(); });
    canvas.addEventListener('click', (e) => {
      const h = hit(canvas, e);
      if (!h) return;
      picked = h;
      if (p.target) {
        solved = h[0] === p.target[0] && h[1] === p.target[1];
        out.innerHTML = solved
          ? `<span class="good">${T('صحيح: ', 'Correct: ')}${at(h[0], h[1])}</span>`
          : `<span class="bad">${T(`هذا الصف ${h[0]} والعمود ${h[1]}. المطلوب الصف ${p.target[0]} والعمود ${p.target[1]}.`, `That is row ${h[0]}, column ${h[1]}. You need row ${p.target[0]}, column ${p.target[1]}.`)}</span>`;
        if (solved) api.solve();
      } else {
        out.textContent = at(h[0], h[1]);
      }
      draw();
    });
    observe(api, canvas, draw);
  };

  // ---------- Anatomy ----------
  const PARTS = () => [
    { key: 'finder', color: '#7c3aed', name: T('مربعات التحديد', 'Finder patterns'), desc: T('ثلاثة مربعات في الزوايا. يجدها الماسح أولاً ليعرف مكان الكود واتجاهه، والزاوية التي بلا مربع هي دائماً الأسفل يمين.', 'Three corner squares. A scanner finds them first to locate the code and its orientation; the corner without one is always bottom right.') },
    { key: 'separator', color: '#a78bfa', name: T('الفواصل', 'Separators'), desc: T('خط أبيض بعرض مربع واحد حول كل مربع تحديد، يفصله عن باقي الكود.', 'A white border one module wide around each finder, keeping it apart from the rest.') },
    { key: 'timing', color: '#ea580c', name: T('خطا التوقيت', 'Timing patterns'), desc: T('خط متقطع في الصف 6 وآخر في العمود 6. يساعدان على عدّ الصفوف والأعمدة بدقة.', 'Dotted lines in row 6 and column 6. They help count rows and columns accurately.') },
    { key: 'alignment', color: '#0d9488', name: T('مربعات المحاذاة', 'Alignment patterns'), desc: T('مربعات 5×5 تساعد على تصحيح انحناء الصورة. لا توجد في النسخة 1، ويزيد عددها مع حجم الكود.', '5×5 squares that help correct a curved image. None in version 1; more as the code grows.') },
    { key: 'dark', color: '#db2777', name: T('الوحدة الداكنة', 'Dark module'), desc: T('مربع واحد أسود دائماً بجانب مربع التحديد السفلي. لا يحمل أي معلومة.', 'One module that is always black, beside the bottom finder. It carries no information.') },
    { key: 'format', color: '#ca8a04', name: T('معلومات التنسيق', 'Format information'), desc: T('15 بت مكتوبة مرتين حول مربعات التحديد: مستوى التصحيح ورقم القناع. أول ما نقرؤه.', '15 bits written twice around the finders: the error correction level and mask number. The first thing we read.') },
    { key: 'version', color: '#4f46e5', name: T('معلومات النسخة', 'Version information'), desc: T('كتلتان 6×3 فيهما رقم النسخة. توجدان فقط من النسخة 7 فما فوق.', 'Two 6×3 blocks holding the version number. Only present from version 7 up.') },
    { key: 'data', color: '#16a34a', name: T('منطقة البيانات', 'Data area'), desc: T('كل ما تبقى بعد الأجزاء الثابتة: الرسالة وبايتات التصحيح. هي التي نقرؤها.', 'Everything left after the fixed parts: the message and correction bytes. This is what we read.') },
  ];
  W.anatomy = (root, p, api) => {
    let version = p.version || 2;
    let part = p.part || 'finder';
    const versions = p.versions || [1, 2, 7];
    const parts = PARTS();
    root.innerHTML = `<div class="w-box">
      <div class="w-seg" data-g="v">${versions.map((v) => `<button type="button" data-v="${v}">${T('النسخة', 'Version')} ${v}</button>`).join('')}</div>
      <div class="w-gv"><canvas></canvas></div>
      <div class="w-parts">
        ${parts.map((x) => `<button type="button" class="w-part" data-part="${x.key}" style="--c:${x.color}"><span class="w-part-sw"></span><span class="w-part-txt"><b>${x.name}</b><small>${x.desc}</small><em class="w-part-na">${T('غير موجود في هذه النسخة', 'Not present in this version')}</em></span></button>`).join('')}
        <button type="button" class="w-part all" data-part="all" style="--c:#0f172a"><span class="w-part-sw"></span><span class="w-part-txt"><b>${T('الكل', 'All parts')}</b><small>${T('كل جزء بلونه في وقت واحد. الأخضر وحده يحمل الرسالة، وكل ما عداه ثابت ومساعد.', 'Every part in its own colour at once. Only green carries the message; everything else is fixed and there to help.')}</small></span></button>
      </div>
    </div>`;
    const canvas = root.querySelector('canvas');
    const view = new QRT.GridView(canvas);
    view.autoZoom = false;
    let d;
    const build = () => {
      const enc = QRT.encoder.encode({ text: 'QR CODE', ecl: 'M', version, mask: 2 });
      d = QRT.decoder.analyze(enc.matrix);
      view.setAnalysis(d);
    };
    const absent = (key) => (key === 'alignment' && version === 1) || (key === 'version' && version < 7);
    const show = () => {
      const n = d.size;
      const cellsOf = (key) => {
        const out = [];
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if ((d.cat[r][c] || 'data') === key) out.push([r, c]);
        return out;
      };
      const v2 = { grid: 'raw', boxes: [], tints: [] };
      if (part === 'all') {
        for (const x of parts) v2.tints.push({ cells: cellsOf(x.key), color: x.color, alpha: 0.55 });
      } else {
        v2.boxes.push({ cells: cellsOf(part), color: parts.find((q) => q.key === part).color, fill: 0.4 });
      }
      view.show({ view: v2 }, true);
      root.querySelectorAll('[data-part]').forEach((b) => {
        b.classList.toggle('on', b.dataset.part === part);
        b.classList.toggle('na', absent(b.dataset.part));
        b.disabled = absent(b.dataset.part);
      });
      root.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === version));
      if (p.targetPart && part === p.targetPart) api.solve();
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.v) {
        version = Number(b.dataset.v);
        if (absent(part)) part = 'all';
        build();
        show();
      } else if (b.dataset.part) {
        part = b.dataset.part;
        show();
      }
    });
    build();
    observe(api, canvas, () => { view.resize(); });
    requestAnimationFrame(() => { view.resize(); show(); });
  };

  // ---------- Versions ----------
  W.versions = (root, p, api) => {
    let v = p.start || 1;
    const cache = {};
    root.innerHTML = `<div class="w-box">
      <div class="w-canvas-wrap"><canvas class="w-canvas"></canvas></div>
      <label class="w-slider"><span>${T('النسخة', 'Version')} <b data-o="v"></b></span><input type="range" min="1" max="40" value="${v}" aria-label="${T('النسخة', 'Version')}"></label>
      <table class="tbl w-facts">
        <tr><td>${T('الحجم', 'Size')}</td><td data-o="size" dir="ltr"></td></tr>
        <tr><td>${T('مربعات المحاذاة (الخضراء الداكنة)', 'Alignment patterns (dark green)')}</td><td data-o="align"></td></tr>
        <tr><td>${T('معلومات النسخة (البنفسجية)', 'Version information (purple)')}</td><td data-o="vinfo"></td></tr>
        <tr><td>${T('أطول نص عادي (بايت) حسب المستوى', 'Longest plain text (bytes) by level')}</td><td data-o="cap"></td></tr>
        <tr><td>${T('أطول رقم بالمستوى M', 'Longest number at level M')}</td><td data-o="num"></td></tr>
      </table>
      ${p.targetVersion ? `<div class="w-goal">${T('الهدف: كود حجمه', 'Goal: a code of size')} <b dir="ltr">${S.sizeOf(p.targetVersion)}×${S.sizeOf(p.targetVersion)}</b></div>` : ''}
    </div>`;
    const canvas = root.querySelector('canvas');
    const input = root.querySelector('input');
    const capacity = (ver, ecl, mode) => {
      const bits = S.blockInfo(ver, ecl).dataCodewords * 8 - 4 - S.countBits(mode, ver);
      if (mode === 'byte') return Math.floor(bits / 8);
      const rem = bits % 10;
      return Math.floor(bits / 10) * 3 + (rem >= 7 ? 2 : rem >= 4 ? 1 : 0);
    };
    const render = () => {
      if (!cache[v]) cache[v] = QRT.encoder.encode({ text: 'A', ecl: 'M', version: v, mask: 0 }).matrix;
      const m = cache[v];
      const cat = S.functionMap(v);
      const n = m.length;
      drawGrid(canvas, n, (r, c) => {
        const k = cat[r][c];
        if (k === 'alignment') return m[r][c] ? '#0f766e' : '#99f6e4';
        if (k === 'version') return m[r][c] ? '#3730a3' : '#c7d2fe';
        return m[r][c] ? '#111827' : '#ffffff';
      }, { margin: 1, lines: n <= 45 });
      const pos = S.alignmentPositions(v);
      const align = v === 1 ? 0 : pos.length * pos.length - 3;
      root.querySelector('[data-o="v"]').textContent = v;
      root.querySelector('[data-o="size"]').textContent = `${n} × ${n}  (17 + 4 × ${v})`;
      root.querySelector('[data-o="align"]').innerHTML = align ? `<span style="color:#0f766e;font-weight:700">${align}</span>` : T('لا يوجد', 'None');
      root.querySelector('[data-o="vinfo"]').innerHTML = v >= 7 ? `<span style="color:#3730a3;font-weight:700">${T('موجودة', 'Present')}</span>` : T('لا توجد (تبدأ من النسخة 7)', 'None (starts at version 7)');
      root.querySelector('[data-o="cap"]').innerHTML = S.ECL_ORDER.map((l) => `${l}: <b>${capacity(v, l, 'byte')}</b>`).join(T('، ', ', '));
      root.querySelector('[data-o="num"]').textContent = T(`${capacity(v, 'M', 'numeric')} خانة`, `${capacity(v, 'M', 'numeric')} digits`);
      if (p.targetVersion && v === p.targetVersion) api.solve();
    };
    input.addEventListener('input', () => { v = Number(input.value); render(); });
    observe(api, canvas, render);
  };

  // ---------- Damage and error correction ----------
  W.damage = (root, p, api) => {
    const text = p.text || 'HELLO';
    let ecl = p.ecl || 'M';
    root.innerHTML = `<div class="w-box">
      <div class="w-controls"><div><span>${T('مستوى التصحيح', 'Error correction level')}</span><div class="w-seg">${S.ECL_ORDER.map((l) => `<button type="button" data-ecl="${l}">${l} (${S.ECL_RECOVERY[l]}%)</button>`).join('')}</div></div></div>
      <p class="w-choice" data-o="ecl"></p>
      <p class="w-caption"></p>
      <div class="w-canvas-wrap"><canvas class="w-canvas touch"></canvas></div>
      <div class="w-status" aria-live="polite"></div>
      <div class="w-bars"></div>
      <div class="w-actions"><button type="button" class="tool" data-a="blob">${T('بقعة عشوائية', 'Random stain')}</button><button type="button" class="tool" data-a="reset">${T('أعد الكود سليماً', 'Restore the code')}</button></div>
    </div>`;
    const canvas = root.querySelector('canvas');
    let enc, cur, cat, d0, flipped, hint = '';
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const setup = () => {
      enc = QRT.encoder.encode({ text, ecl });
      cur = enc.matrix.map((row) => row.slice());
      cat = S.functionMap(enc.version);
      d0 = QRT.decoder.analyze(enc.matrix);
      flipped = new Set();
      root.querySelectorAll('[data-ecl]').forEach((b) => b.classList.toggle('on', b.dataset.ecl === ecl));
      root.querySelector('[data-o="ecl"]').textContent = ECL_TEXT[ecl]();
      const info = d0.info;
      root.querySelector('.w-caption').innerHTML = T(
        `النسخة ${enc.version}: <b>${info.dataCodewords}</b> بايت بيانات و<b>${info.eccPerBlock * info.numBlocks}</b> بايت تصحيح${info.numBlocks > 1 ? ` في ${info.numBlocks} كتل` : ''}.`,
        `Version ${enc.version}: <b>${info.dataCodewords}</b> data bytes and <b>${info.eccPerBlock * info.numBlocks}</b> correction bytes${info.numBlocks > 1 ? ` in ${info.numBlocks} blocks` : ''}.`);
    };
    const draw = () => {
      const n = cur.length;
      drawGrid(canvas, n, (r, c) => {
        if (flipped.has(r * n + c)) return cur[r][c] ? '#c2410c' : '#fdba74';
        return cur[r][c] ? '#111827' : '#ffffff';
      }, { margin: 1.5 });
    };
    const evaluate = () => {
      const n = cur.length;
      let total = 0;
      let over = false;
      const bars = d0.blocks.map((b, bi) => {
        const streams = b.dataStream.concat(b.eccStream);
        const dmg = streams.filter((s) => d0.codewords[s].cells.some(([r, c]) => flipped.has(r * n + c))).length;
        const cap = Math.floor(b.eccLen / 2);
        total += dmg;
        if (dmg > cap) over = true;
        const label = d0.blocks.length > 1 ? T(`الكتلة ${bi + 1}`, `Block ${bi + 1}`) : T('البايتات التالفة', 'Damaged bytes');
        return `<div class="w-bar${dmg > cap ? ' over' : ''}"><span>${label}</span><div class="track"><i style="width:${Math.min(100, (dmg / cap) * 100)}%"></i></div><em>${T(`${dmg} من ${cap}`, `${dmg} of ${cap}`)}</em></div>`;
      });
      let readable = false;
      try {
        const d = QRT.decoder.analyze(cur);
        readable = d.rsOk && d.text === text;
      } catch (e) {
        readable = false;
      }
      root.querySelector('.w-bars').innerHTML = bars.join('');
      root.querySelector('.w-status').innerHTML = hint
        ? `<span class="muted">${hint}</span>`
        : readable
          ? `<span class="good">${T('ما زال مقروءاً', 'Still readable')}: «${esc(text)}»</span>${total ? T(` بعد إصلاح ${total} بايت`, ` after repairing ${total} ${total === 1 ? 'byte' : 'bytes'}`) : ''}`
          : `<span class="bad">${T('لم يعد مقروءاً.', 'No longer readable.')}</span> ${T(`التلف ${over && d0.blocks.length > 1 ? 'في إحدى الكتل ' : ''}أكبر مما تستطيع بايتات التصحيح إصلاحه.`, `The damage${over && d0.blocks.length > 1 ? ' in one block' : ''} is more than the correction bytes can repair.`)}`;
      canvas.dataset.readable = readable ? '1' : '0';
      if (!readable) api.solve();
    };
    const flip = (r, c) => {
      const key = r * cur.length + c;
      cur[r][c] ^= 1;
      if (flipped.has(key)) flipped.delete(key);
      else flipped.add(key);
    };
    let painting = false;
    let stroke = new Set();
    const apply = (e) => {
      const h = hit(canvas, e);
      if (!h) return;
      const [r, c] = h;
      const key = r * cur.length + c;
      if (stroke.has(key)) return;
      stroke.add(key);
      if (cat[r][c] !== null) {
        hint = T('هذا جزء ثابت. في الواقع تلفه يمنع الماسح من إيجاد الكود أصلاً، لذلك جرّب هنا منطقة البيانات.', 'That is a fixed part. In real life, damaging it stops a scanner finding the code at all, so try the data area here.');
      } else {
        hint = '';
        flip(r, c);
      }
      draw();
      evaluate();
    };
    canvas.addEventListener('pointerdown', (e) => { painting = true; stroke = new Set(); canvas.setPointerCapture(e.pointerId); apply(e); });
    canvas.addEventListener('pointermove', (e) => { if (painting) apply(e); });
    canvas.addEventListener('pointerup', () => { painting = false; });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.ecl) { ecl = b.dataset.ecl; setup(); }
      else if (b.dataset.a === 'reset') setup();
      else if (b.dataset.a === 'blob') {
        const n = cur.length;
        const cr = 9 + Math.floor(rnd() * (n - 12));
        const cc = 9 + Math.floor(rnd() * (n - 12));
        for (let r = cr - 2; r <= cr + 2; r++) {
          for (let c = cc - 2; c <= cc + 2; c++) {
            if (r < 0 || c < 0 || r >= n || c >= n || cat[r][c] !== null) continue;
            if (!flipped.has(r * n + c) && rnd() < 0.6) flip(r, c);
          }
        }
      } else return;
      hint = '';
      draw();
      evaluate();
    });
    setup();
    evaluate();
    observe(api, canvas, draw);
  };

  // ---------- Format information and the fixed pattern ----------
  W.format = (root, p, api) => {
    let ecl = p.ecl || 'Q';
    let mask = p.mask == null ? 3 : p.mask;
    let raw = false;
    root.innerHTML = `<div class="w-box">
      <div class="w-controls">
        <div><span>${T('مستوى التصحيح', 'Error correction level')}</span><div class="w-seg">${S.ECL_ORDER.map((l) => `<button type="button" data-ecl="${l}">${l}</button>`).join('')}</div></div>
        <div><span>${T('القناع', 'Mask')}</span><div class="w-seg">${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<button type="button" data-mask="${k}">${k}</button>`).join('')}</div></div>
      </div>
      <div class="w-choices"><p class="w-choice" data-o="ecl"></p><p class="w-choice" data-o="mask"></p></div>
      <label class="toggle w-center"><input type="checkbox" data-a="raw"> ${T('بدون النمط الثابت', 'Without the fixed pattern')}</label>
      <div class="w-canvas-wrap small"><canvas class="w-canvas"></canvas></div>
      <table class="xor w-ftable"></table>
      <p class="w-callout" hidden></p>
    </div>`;
    const canvas = root.querySelector('canvas');
    const table = root.querySelector('.w-ftable');
    const callout = root.querySelector('.w-callout');
    const render = () => {
      const data5 = (S.ECL_BITS[ecl] << 3) | mask;
      const word = (data5 << 10) | S.formatBch(data5);
      const written = raw ? word : word ^ S.FORMAT_XOR;
      const w = bin(word, 15);
      root.querySelector('[data-o="ecl"]').innerHTML = `<b>${T('المستوى', 'Level')}</b> ${ECL_TEXT[ecl]()}`;
      root.querySelector('[data-o="mask"]').innerHTML = `<b>${T('القناع', 'Mask')} ${mask}:</b> ${MASK_TEXT[mask]()} <span dir="ltr" class="ltr muted">${S.MASK_FORMULAS[mask]}</span>`;
      table.innerHTML = `
        <tr><th>${T(`مستوى التصحيح ${ecl}`, `Level ${ecl}`)}</th><td>${bitRow([{ bits: w.slice(0, 2), color: C.mode }])}</td></tr>
        <tr><th>${T(`القناع ${mask}`, `Mask ${mask}`)}</th><td>${bitRow([{ bits: w.slice(2, 5), color: C.mask }])}</td></tr>
        <tr><th>${T('بتات التحقق (تُحسب منهما)', 'Check bits (computed from both)')}</th><td>${bitRow([{ bits: w.slice(5), color: C.gray }])}</td></tr>
        <tr class="sum"><th>${T('الـ15 بت', 'All 15 bits')}</th><td>${bitRow([{ bits: w.slice(0, 2), color: C.mode }, { bits: w.slice(2, 5), color: C.mask }, { bits: w.slice(5), color: C.gray }])}</td></tr>
        ${raw ? '' : `<tr><th>${T('النمط الثابت', 'Fixed pattern')}</th><td>${bitRow([{ bits: bin(S.FORMAT_XOR, 15), color: C.slate }])}</td></tr>`}
        <tr class="sum"><th>${raw ? T('ما يُكتب في الكود (بلا نمط)', 'Written into the code (no pattern)') : T('ما يُكتب في الكود (بعد XOR)', 'Written into the code (after XOR)')}</th><td>${bitRow([{ bits: bin(written, 15), color: C.format }])}</td></tr>`;
      callout.hidden = !raw;
      callout.textContent = word === 0
        ? T('كل البتات أصفار: الشريط الذهبي على الكود أبيض بالكامل، ولا يختلف عن مساحة فارغة. هذا بالضبط ما يمنعه النمط الثابت.', 'Every bit is zero: the gold strip on the code is completely white and looks just like empty space. This is exactly what the fixed pattern prevents.')
        : T('هذا ما سيُكتب لو لم يوجد النمط الثابت. جرّب المستوى M والقناع 0.', 'This is what would be written without the fixed pattern. Try level M with mask 0.');
      root.querySelectorAll('[data-ecl]').forEach((b) => b.classList.toggle('on', b.dataset.ecl === ecl));
      root.querySelectorAll('[data-mask]').forEach((b) => b.classList.toggle('on', Number(b.dataset.mask) === mask));
      const m = QRT.encoder.encode({ text: 'QR', ecl, version: 1, mask }).matrix;
      const fc = S.formatCells(21);
      fc.copy1.forEach(([r, c], i) => { m[r][c] = (written >> i) & 1; });
      fc.copy2.forEach(([r, c], i) => { m[r][c] = (written >> i) & 1; });
      const fset = new Set(fc.copy1.concat(fc.copy2).map(([r, c]) => r * 21 + c));
      drawGrid(canvas, 21, (r, c) => (fset.has(r * 21 + c) ? (m[r][c] ? '#854d0e' : '#fef3c7') : m[r][c] ? '#111827' : '#ffffff'), {
        margin: 1,
        after: (ctx, g) => {
          outline(ctx, g, fc.copy1, '#ca8a04', 3);
          outline(ctx, g, fc.copy2, '#ca8a04', 3);
        },
      });
      if (ecl === 'M' && mask === 0 && raw) api.solve();
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.ecl) ecl = b.dataset.ecl;
      else if (b.dataset.mask) mask = Number(b.dataset.mask);
      else return;
      render();
    });
    root.querySelector('[data-a="raw"]').addEventListener('change', (e) => { raw = e.target.checked; render(); });
    observe(api, canvas, render);
  };

  // ---------- Mask ----------
  W.mask = (root, p, api) => {
    const enc = QRT.encoder.encode({ text: p.text || 'MASK', ecl: 'L', version: 1 });
    const d = QRT.decoder.analyze(enc.matrix);
    const n = d.size;
    const cat = d.cat;
    const masked = (k) => {
      const m = d.unmasked.map((row) => row.slice());
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (cat[r][c] === null && S.MASKS[k](r, c)) m[r][c] ^= 1;
      const word = S.formatWord('L', k);
      const fc = S.formatCells(n);
      fc.copy1.forEach(([r, c], i) => { m[r][c] = (word >> i) & 1; });
      fc.copy2.forEach(([r, c], i) => { m[r][c] = (word >> i) & 1; });
      return m;
    };
    const pens = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => QRT.encoder.penalty(masked(k)));
    const best = pens.indexOf(Math.min(...pens));
    let k = p.start == null ? best : p.start;
    // A task page must not open already solved.
    if (p.task && k === best) k = (best + 3) % 8;
    let showRuns = true;
    root.innerHTML = `<div class="w-box">
      <div class="w-seg w-masks">${pens.map((pen, i) => `<button type="button" data-k="${i}" data-pen="${pen}"><b>${T('قناع', 'Mask')} ${i}</b>${p.hidePenalty ? '' : `<small>${T('عقوبة', 'penalty')} ${pen}</small>`}</button>`).join('')}</div>
      <p class="w-choice" data-o="desc"></p>
      <div class="w-triple">
        <figure><canvas></canvas><figcaption>${T('قبل القناع', 'Before the mask')}</figcaption></figure>
        <figure><canvas></canvas><figcaption data-o="rule"></figcaption></figure>
        <figure><canvas></canvas><figcaption>${T('بعد القناع', 'After the mask')}</figcaption></figure>
      </div>
      <label class="toggle w-center"><input type="checkbox" checked data-a="runs"> ${T('أظهر المناطق المزعجة بالأحمر', 'Show troublesome areas in red')}</label>
      <p class="w-stats"></p>
    </div>`;
    const [cBefore, cRule, cAfter] = root.querySelectorAll('canvas');
    const runsOf = (m) => {
      const marked = new Set();
      let count = 0;
      const scan = (get) => {
        for (let a = 0; a < n; a++) {
          let start = 0;
          for (let i = 1; i <= n; i++) {
            const [r0, c0] = get(a, start);
            let same = false;
            if (i < n) {
              const [r, c] = get(a, i);
              same = cat[r][c] === null && cat[r0][c0] === null && m[r][c] === m[r0][c0];
            }
            if (!same) {
              if (i - start >= 5 && cat[r0][c0] === null) {
                count++;
                for (let j = start; j < i; j++) { const [r, c] = get(a, j); marked.add(r * n + c); }
              }
              start = i;
            }
          }
        }
      };
      scan((a, i) => [a, i]);
      scan((a, i) => [i, a]);
      return { marked, count };
    };
    const beforeRuns = runsOf(d.unmasked);
    const render = () => {
      const after = masked(k);
      const ar = runsOf(after);
      const fn = S.MASKS[k];
      const paint = (m, runs) => (r, c) => {
        if (cat[r][c] !== null) return m[r][c] ? '#cbd5e1' : '#f1f5f9';
        if (showRuns && runs.marked.has(r * n + c)) return m[r][c] ? '#991b1b' : '#fca5a5';
        return m[r][c] ? '#111827' : '#ffffff';
      };
      drawGrid(cBefore, n, paint(d.unmasked, beforeRuns), { margin: 0.5, lines: false });
      drawGrid(cRule, n, (r, c) => (cat[r][c] !== null ? '#f1f5f9' : fn(r, c) ? '#0891b2' : '#ecfeff'), { margin: 0.5, lines: false });
      drawGrid(cAfter, n, paint(after, ar), { margin: 0.5, lines: false });
      root.querySelector('[data-o="rule"]').textContent = T(`القاعدة ${k} (الأزرق يُقلب)`, `Rule ${k} (blue gets flipped)`);
      root.querySelector('[data-o="desc"]').innerHTML = `<b>${T('القناع', 'Mask')} ${k}:</b> ${MASK_TEXT[k]()} <span dir="ltr" class="ltr muted">${S.MASK_FORMULAS[k]}</span>`;
      root.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('on', Number(b.dataset.k) === k));
      root.querySelector('.w-stats').innerHTML = T(
        `المناطق المزعجة: <b>${beforeRuns.count}</b> قبل القناع، و<b>${ar.count}</b> بعده.${p.hidePenalty ? '' : ` عقوبة القناع ${k}: <b>${pens[k]}</b>${k === best ? '، وهي الأقل بين الثمانية.' : '.'}`}`,
        `Troublesome areas: <b>${beforeRuns.count}</b> before the mask, <b>${ar.count}</b> after.${p.hidePenalty ? '' : ` Penalty for mask ${k}: <b>${pens[k]}</b>${k === best ? ', the lowest of the eight.' : '.'}`}`);
      if (k === best && p.task) api.solve();
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-k]');
      if (!b) return;
      k = Number(b.dataset.k);
      render();
    });
    root.querySelector('[data-a="runs"]').addEventListener('change', (e) => { showRuns = e.target.checked; render(); });
    observe(api, root.querySelector('.w-triple'), render);
  };

  // ---------- Encoding modes ----------
  W.modes = (root, p, api) => {
    root.innerHTML = `<div class="w-box">
      <label class="w-input"><span>${T('اكتب نصاً', 'Type some text')}</span><input type="text" dir="auto" maxlength="40" value="${esc(p.text || '')}" aria-label="${T('النص', 'Text')}"></label>
      <div class="w-modes"></div>
      <div class="w-layout-h"></div>
      <div class="w-layout" dir="ltr"></div>
    </div>`;
    const input = root.querySelector('input');
    const E = QRT.encoder;
    const render = () => {
      const text = input.value;
      const chars = [...text];
      const n = chars.length;
      const bytes = new TextEncoder().encode(text).length;
      const rows = [
        { key: 'numeric', name: 'Numeric', desc: T('أرقام 0 إلى 9 فقط. كل 3 أرقام في 10 بتات.', 'Digits 0 to 9 only. Every 3 digits in 10 bits.'), ok: n > 0 && E.canNumeric(text), bits: 4 + 10 + Math.floor(n / 3) * 10 + [0, 4, 7][n % 3] },
        { key: 'alphanumeric', name: 'Alphanumeric', desc: T('45 رمزاً: أرقام، حروف إنجليزية كبيرة، مسافة و$%*+-./: . كل حرفين في 11 بت.', '45 symbols: digits, capital letters, space and $%*+-./: . Every 2 characters in 11 bits.'), ok: n > 0 && E.canAlnum(text), bits: 4 + 9 + Math.floor(n / 2) * 11 + (n % 2 ? 6 : 0) },
        { key: 'byte', name: 'Byte', desc: T('أي نص بأي لغة. كل بايت 8 بتات، والحرف العربي بايتان.', 'Any text in any language. 8 bits per byte; an Arabic letter takes two bytes.'), ok: n > 0, bits: 4 + 8 + bytes * 8 },
        { key: 'kanji', name: 'Kanji', desc: T('حروف يابانية فقط. كل حرف 13 بت.', 'Japanese characters only. 13 bits each.'), ok: n > 0 && E.canKanji(text), bits: 4 + 8 + n * 13 },
      ];
      const allowed = rows.filter((r) => r.ok);
      const best = allowed.length ? allowed.reduce((a, b) => (b.bits < a.bits ? b : a)) : null;
      const max = Math.max(...rows.map((r) => r.bits), 1);
      root.querySelector('.w-modes').innerHTML = rows.map((r) => `<div class="w-mode${r.ok ? '' : ' no'}${best && r.key === best.key ? ' best' : ''}">
        <div class="w-mode-h"><b>${r.name}</b><span>${r.ok ? `${r.bits} ${T('بت', 'bits')}${best && r.key === best.key ? T('، الأقل', ', the fewest') : ''}` : T('لا يقبل هذا النص', 'Cannot hold this text')}</span></div>
        <small class="w-mode-d">${r.desc}</small>
        <div class="track"><i style="width:${r.ok ? (r.bits / max) * 100 : 0}%"></i></div></div>`).join('');
      if (!best) {
        root.querySelector('.w-layout-h').textContent = '';
        root.querySelector('.w-layout').innerHTML = '';
        return;
      }
      const groups = [];
      if (best.key === 'numeric') {
        for (let i = 0; i < n; i += 3) { const g = text.substr(i, 3); groups.push({ label: g, bits: bin(parseInt(g, 10), g.length * 3 + 1) }); }
      } else if (best.key === 'alphanumeric') {
        for (let i = 0; i < n; i += 2) {
          if (i + 1 < n) groups.push({ label: chars[i] + chars[i + 1], bits: bin(S.ALNUM.indexOf(chars[i]) * 45 + S.ALNUM.indexOf(chars[i + 1]), 11) });
          else groups.push({ label: chars[i], bits: bin(S.ALNUM.indexOf(chars[i]), 6) });
        }
      } else if (best.key === 'byte') {
        for (const ch of chars) groups.push({ label: ch, bits: [...new TextEncoder().encode(ch)].map((b) => bin(b, 8)).join(' ') });
      } else {
        for (const ch of chars) groups.push({ label: ch, bits: T('13 بت', '13 bits') });
      }
      const modeBits = bin(S.MODES[best.key].bits, 4);
      const countLen = S.countBits(best.key, 1);
      const countVal = best.key === 'byte' ? bytes : n;
      root.querySelector('.w-layout-h').innerHTML = T(`شكل الرسالة بترميز <b>${best.name}</b> (للنسخ 1 إلى 9):`, `The message laid out in <b>${best.name}</b> mode (versions 1 to 9):`);
      const shown = groups.slice(0, 6);
      root.querySelector('.w-layout').innerHTML = `<span class="lay mode"><small>${T('النوع', 'Mode')}</small>${modeBits}</span>
        <span class="lay count"><small>${T('العدد', 'Count')} = ${countVal}</small>${bin(countVal, countLen)}</span>
        ${shown.map((g) => `<span class="lay data"><small dir="auto">${esc(g.label === ' ' ? T('مسافة', 'space') : g.label)}</small>${g.bits}</span>`).join('')}
        ${groups.length > shown.length ? `<span class="lay data"><small>+${groups.length - shown.length}</small>…</span>` : ''}
        <span class="lay term"><small>${T('النهاية', 'End')}</small>0000</span>`;
      if (p.task === 'alnum' && E.canAlnum(text) && /[A-Z]/.test(text)) api.solve();
    };
    input.addEventListener('input', render);
    render();
  };

  // ---------- Reading order ----------
  W.zigzag = (root, p, api) => {
    const enc = QRT.encoder.encode({ text: 'HELLO WORLD', ecl: 'Q', version: 1, mask: 3 });
    const d = QRT.decoder.analyze(enc.matrix);
    root.innerHTML = `<div class="w-box">
      <div class="w-gv"><canvas></canvas></div>
      <div class="w-actions">
        <button type="button" class="tool" data-a="play">${T('تشغيل', 'Play')}</button>
        <button type="button" class="tool" data-a="next">${T('البايت التالي', 'Next byte')}</button>
        <button type="button" class="tool" data-a="reset">${T('من البداية', 'From the start')}</button>
        <span class="w-count"></span>
      </div>
    </div>`;
    const canvas = root.querySelector('canvas');
    const view = new QRT.GridView(canvas);
    view.autoZoom = false;
    view.setAnalysis(d);
    const total = d.codewords.length;
    let k = 1;
    let timer = null;
    const show = () => {
      const cur = d.codewords[k - 1];
      const tints = d.codewords.slice(0, k - 1).map((c, i) => ({ cells: c.cells, color: i % 2 ? '#2563eb' : '#16a34a', alpha: 0.35 }));
      view.show({ view: { grid: 'unmasked', dim: true, tints, boxes: [{ cells: cur.cells, color: '#dc2626', fill: 0.3, labels: cur.cells.map((_, i) => String(i + 1)) }], path: d.order.slice(0, k * 8), pathStyle: 'fine' } }, true);
      root.querySelector('.w-count').textContent = T(`البايت ${k} من ${total}`, `Byte ${k} of ${total}`);
      if (k >= 4) api.solve();
    };
    const stop = () => { clearInterval(timer); timer = null; root.querySelector('[data-a="play"]').textContent = T('تشغيل', 'Play'); };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.a === 'play') {
        if (timer) stop();
        else {
          if (k >= total) k = 0;
          b.textContent = T('إيقاف', 'Pause');
          timer = setInterval(() => { if (k >= total) { stop(); return; } k++; show(); }, 700);
        }
      } else if (b.dataset.a === 'next') { stop(); if (k < total) k++; show(); }
      else if (b.dataset.a === 'reset') { stop(); k = 1; show(); }
    });
    api.onDestroy(stop);
    observe(api, canvas, () => view.resize());
    requestAnimationFrame(() => { view.resize(); show(); });
  };

  // ---------- Interleaving practice ----------
  W.interleave = (root, p, api) => {
    const sizes = p.blocks || [4, 4, 5];
    const names = ['A', 'B', 'C', 'D'];
    const colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea'];
    const order = [];
    const maxLen = Math.max(...sizes);
    for (let i = 0; i < maxLen; i++) sizes.forEach((len, bi) => { if (i < len) order.push(`${names[bi]}${i + 1}`); });
    let placed = [];
    let auto = null;
    const startMsg = T('اضغط أول بايت يُكتب على المسار.', 'Click the first byte written on the path.');
    root.innerHTML = `<div class="w-box" data-order="${order.join(',')}">
      <div class="w-src">${sizes.map((len, bi) => `<div class="w-brow"><span class="w-bname" style="--c:${colors[bi]}">${T('الكتلة', 'Block')} ${names[bi]}</span><div class="w-bchips" dir="ltr">${Array.from({ length: len }, (_, i) => `<button type="button" class="w-chip" data-id="${names[bi]}${i + 1}" style="--c:${colors[bi]}">${names[bi]}${i + 1}</button>`).join('')}</div></div>`).join('')}</div>
      <div class="w-stream-h">${T('على مسار القراءة، بالترتيب:', 'On the reading path, in order:')}</div>
      <div class="w-stream" dir="ltr"></div>
      <p class="w-msg" aria-live="polite">${startMsg}</p>
      <div class="w-actions"><button type="button" class="tool" data-a="solution">${T('اعرض الحل', 'Show the answer')}</button><button type="button" class="tool" data-a="reset">${T('من جديد', 'Start over')}</button></div>
    </div>`;
    const stream = root.querySelector('.w-stream');
    const msg = root.querySelector('.w-msg');
    const colorOf = (id) => colors[names.indexOf(id[0])];
    const render = () => {
      stream.innerHTML = placed.map((id) => `<span class="w-chip" style="--c:${colorOf(id)}">${id}</span>`).join('') +
        Array.from({ length: order.length - placed.length }, () => '<span class="w-slot"></span>').join('');
      root.querySelectorAll('.w-src .w-chip').forEach((b) => { b.classList.toggle('used', placed.includes(b.dataset.id)); b.disabled = placed.includes(b.dataset.id); });
    };
    const place = (id, byUser) => {
      const expected = order[placed.length];
      if (id !== expected) {
        const chip = root.querySelector(`.w-src [data-id="${id}"]`);
        chip.classList.remove('shake');
        void chip.offsetWidth;
        chip.classList.add('shake');
        const last = placed[placed.length - 1];
        msg.innerHTML = `<span class="bad">${T('ليس هذا.', 'Not this one.')}</span> ${last
          ? T(`بعد ${last} يأتي البايت رقم ${expected.slice(1)} من الكتلة ${expected[0]}.`, `After ${last} comes byte ${expected.slice(1)} of block ${expected[0]}.`)
          : T('نبدأ بأول بايت من الكتلة A.', 'Start with the first byte of block A.')}`;
        return;
      }
      placed.push(id);
      render();
      if (placed.length === order.length) {
        msg.innerHTML = `<span class="good">${T('صحيح. هذا ترتيب البايتات على المسار.', 'Correct. This is the order of the bytes on the path.')}</span> ${T('لاحظ أن C5 جاء في النهاية لأن الكتلة C أطول.', 'Notice that C5 comes last because block C is longer.')}`;
        if (byUser) api.solve();
      } else {
        msg.textContent = byUser ? T('صحيح، تابع.', 'Right, keep going.') : '';
      }
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.id) { if (!auto) place(b.dataset.id, true); }
      else if (b.dataset.a === 'reset') { clearInterval(auto); auto = null; placed = []; msg.textContent = startMsg; render(); }
      else if (b.dataset.a === 'solution') {
        clearInterval(auto);
        placed = [];
        render();
        auto = setInterval(() => {
          if (placed.length >= order.length) { clearInterval(auto); auto = null; return; }
          place(order[placed.length], false);
        }, 260);
      }
    });
    api.onDestroy(() => clearInterval(auto));
    render();
  };

  function mount(type, el, params, handlers) {
    const cleanups = [];
    let alive = true;
    const api = { solve: () => alive && handlers.solve && handlers.solve(), onDestroy: (fn) => cleanups.push(fn) };
    // Each widget gets its own host, so a late callback from a widget that was just replaced
    // only touches its own detached nodes.
    el.innerHTML = '';
    const host = document.createElement('div');
    host.className = 'w-host';
    el.appendChild(host);
    if (!W[type]) {
      host.textContent = 'Unknown widget ' + type;
      return { destroy() { host.remove(); } };
    }
    W[type](host, params || {}, api);
    return {
      destroy: () => {
        alive = false;
        cleanups.forEach((fn) => fn());
        host.remove();
      },
    };
  }

  QRT.widgets = { mount, types: Object.keys(W) };
})(typeof window !== 'undefined' ? window : globalThis);
