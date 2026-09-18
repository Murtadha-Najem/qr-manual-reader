// Timed practice: a random code at a chosen difficulty, read by the learner and checked as they go.
// generate() is pure (seeded, so a code can be reproduced); the rest drives the practice screen.
(function (root) {
  const QRT = (root.QRT = root.QRT || {});
  const LEVELS = ['easy', 'medium', 'hard'];

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  const WORDS = ['apple', 'river', 'cloud', 'tiger', 'lemon', 'piano', 'orbit', 'maple', 'pixel', 'coffee', 'garden', 'rocket',
    'silver', 'planet', 'window', 'forest', 'candle', 'mirror', 'dragon', 'spring', 'bridge', 'music', 'ocean', 'paper'];
  const CAPS = ['HELLO', 'QR', 'CODE', 'READ', 'EYE', 'GRID', 'MASK', 'BYTE', 'DATA', 'BLOCK', 'CAT', 'SUN', 'MOON', 'STAR', 'BOOK', 'KEY'];
  const DOMAINS = ['example.com', 'qr.io', 'read.me', 'site.org', 'my.app'];

  // Same level and seed always give the same code.
  function generate(level, seed) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const r = rng(seed * 101 + attempt);
      let mode;
      let text;
      let ecl;
      let opts = {};
      if (level === 'easy') {
        if (r() < 0.5) {
          mode = 'numeric';
          text = Array.from({ length: 6 + Math.floor(r() * 7) }, () => Math.floor(r() * 10)).join('');
        } else {
          mode = 'alphanumeric';
          text = pick(r, CAPS) + pick(r, [' ', '-']) + pick(r, CAPS) + (r() < 0.5 ? ' ' + (10 + Math.floor(r() * 90)) : '');
        }
        ecl = pick(r, ['L', 'M', 'Q']);
        opts = { version: 1 };
      } else if (level === 'medium') {
        mode = 'byte';
        text = r() < 0.5 ? `https://${pick(r, DOMAINS)}/${pick(r, WORDS)}` : `${pick(r, WORDS)} ${pick(r, WORDS)} ${100 + Math.floor(r() * 900)}`;
        ecl = pick(r, ['L', 'M']);
        opts = { minVersion: 2 };
      } else {
        mode = 'byte';
        const words = Array.from({ length: 5 + Math.floor(r() * 4) }, () => pick(r, WORDS));
        text = words.join(' ').replace(/^./, (ch) => ch.toUpperCase()) + pick(r, ['.', '!', '?']);
        ecl = pick(r, ['Q', 'H']);
        opts = { minVersion: 4 };
      }
      const mask = Math.floor(r() * 8);
      try {
        const enc = QRT.encoder.encode(Object.assign({ segments: [{ mode, text }], ecl, mask }, opts));
        if (level === 'medium' && enc.version > 4) continue;
        if (level === 'hard' && enc.version > 8) continue;
        return { level, seed, text, mode, ecl, mask, version: enc.version, matrix: enc.matrix };
      } catch (e) {
        /* does not fit this way; try the next draw */
      }
    }
    throw new Error('Could not generate a practice code');
  }

  // ---------- Stored attempts ----------
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    },
  };
  const history = () => store.get('qrt-practice', []);
  function best(level) {
    const done = history().filter((a) => a.level === level && a.finished);
    return done.length ? Math.min(...done.map((a) => a.time)) : null;
  }
  function fmt(ms) {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // ---------- Practice screen ----------
  const $ = (id) => document.getElementById(id);
  const t = (k, v) => QRT.i18n.t(k, v);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  let view = null;
  let S = null;
  let ticker = null;
  // Two timer displays: the one in the panel, and a small one pinned under the code on a phone.
  const timers = () => [$('pTimer'), $('pTimerMini')];
  const setTimer = (text, done) => timers().forEach((el) => { el.textContent = text; el.classList.toggle('done', !!done); });

  function bindOnce() {
    view = new QRT.GridView($('pGrid'));
    view.autoZoom = false;
    new ResizeObserver(() => view.resize()).observe($('pCanvasWrap'));
    $('pStart').addEventListener('click', startTimer);
    document.querySelectorAll('#practice [data-aid]').forEach((box) => box.addEventListener('change', () => {
      S.aids[box.dataset.aid] = box.checked;
      if (box.checked && S.started && !S.done) S.aidsUsed.add(box.dataset.aid);
      draw();
    }));
    $('pClearMarks').addEventListener('click', () => { S.marks.clear(); draw(); });
    $('pGrid').addEventListener('click', (e) => {
      if (!S || !S.started) return;
      const cell = view.hitCell(e.clientX, e.clientY);
      if (!cell) return;
      const key = cell[0] * S.d.size + cell[1];
      if (S.marks.has(key)) S.marks.delete(key);
      else S.marks.add(key);
      draw();
    });
    document.querySelectorAll('#practice .p-check').forEach((box) => {
      box.querySelector('button').addEventListener('click', () => check(box.dataset.field));
    });
    $('pText').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check('text'); } });
    $('pNew').addEventListener('click', () => { location.hash = `practice=${S.gen.level}`; });
    $('pGiveUp').addEventListener('click', () => finish(false));
    $('pDownload').addEventListener('click', download);
  }

  function start(level, seed) {
    stop();
    if (!LEVELS.includes(level)) level = 'medium';
    if (!view) bindOnce();
    const gen = generate(level, seed);
    const d = QRT.decoder.analyze(gen.matrix);
    S = { gen, d, marks: new Set(), aids: { dim: false, mask: false, path: false }, aidsUsed: new Set(), started: false, t0: 0, splits: {}, mistakes: 0, done: null };
    $('pEcl').value = '';
    $('pMask').value = '';
    $('pText').value = '';
    document.querySelectorAll('#practice .p-check').forEach((box) => {
      box.classList.remove('ok');
      box.querySelectorAll('select, input, button').forEach((x) => { x.disabled = false; });
      box.querySelector('.p-res').innerHTML = '';
    });
    document.querySelectorAll('#practice [data-aid]').forEach((box) => { box.checked = false; });
    $('pCover').hidden = false;
    setTimer('00:00', false);
    $('pGiveUp').hidden = false;
    view.setAnalysis(d);
    view.resize();
    draw();
    render();
  }

  function draw() {
    if (!S) return;
    const n = S.d.size;
    const marks = [...S.marks].map((k) => [Math.floor(k / n), k % n]);
    view.show({ view: { grid: 'raw', dim: S.aids.dim, maskDots: S.aids.mask, path: S.aids.path ? S.d.order : null, tints: marks.length ? [{ cells: marks, color: '#f59e0b', alpha: 0.6 }] : [] } }, true);
  }

  function startTimer() {
    if (!S || S.started) return;
    S.started = true;
    S.t0 = performance.now();
    $('pCover').hidden = true;
    for (const [k, on] of Object.entries(S.aids)) if (on) S.aidsUsed.add(k);
    ticker = setInterval(() => setTimer(fmt(performance.now() - S.t0), false), 250);
    $('pText').focus({ preventScroll: true });
  }

  function stop() {
    clearInterval(ticker);
    ticker = null;
  }

  function check(field) {
    if (!S || !S.started || S.done) return;
    const now = performance.now() - S.t0;
    const box = document.querySelector(`#practice .p-check[data-field="${field}"]`);
    const res = box.querySelector('.p-res');
    let ok = false;
    let extra = '';
    if (field === 'ecl') ok = $('pEcl').value === S.gen.ecl;
    else if (field === 'mask') ok = $('pMask').value === String(S.gen.mask);
    else {
      const given = [...$('pText').value];
      const want = [...S.gen.text];
      ok = given.join('') === want.join('');
      if (!ok) {
        let same = 0;
        while (same < given.length && same < want.length && given[same] === want[same]) same++;
        extra = ' ' + t('pPrefix', { n: same, a: given.length, b: want.length });
      }
    }
    if (ok) {
      S.splits[field] = now;
      box.classList.add('ok');
      box.querySelectorAll('select, input, button').forEach((x) => { x.disabled = true; });
      res.innerHTML = `<span class="good">${t('pRight', { time: fmt(now) })}</span>`;
      if (field === 'text') finish(true);
    } else {
      S.mistakes++;
      box.classList.remove('shake');
      void box.offsetWidth;
      box.classList.add('shake');
      res.innerHTML = `<span class="bad">${t('pWrong')}</span>${esc(extra)}`;
    }
  }

  function finish(solved) {
    if (!S || S.done) return;
    if (!S.started) {
      S.started = true;
      S.t0 = performance.now();
      $('pCover').hidden = true;
    }
    stop();
    const time = performance.now() - S.t0;
    const previousBest = best(S.gen.level);
    const all = history();
    all.push({ level: S.gen.level, seed: S.gen.seed, time: Math.round(time), finished: solved, aids: [...S.aidsUsed], mistakes: S.mistakes, date: new Date().toISOString() });
    store.set('qrt-practice', all.slice(-60));
    S.done = { solved, time, newBest: solved && (previousBest == null || time < previousBest) };
    setTimer(fmt(time), solved);
    $('pGiveUp').hidden = true;
    document.querySelectorAll('#practice .p-check select, #practice .p-check input, #practice .p-check button').forEach((x) => { x.disabled = true; });
    render();
  }

  function walkHash() {
    const g = S.gen;
    return '#' + new URLSearchParams({ t: g.text, m: g.mode, e: g.ecl, v: String(g.version), k: String(g.mask) }).toString() + '&step=1';
  }

  const aidName = (k) => t({ dim: 'aidDim', mask: 'aidMask', path: 'aidPath' }[k]);
  const levelName = (l) => t({ easy: 'levelEasy', medium: 'levelMedium', hard: 'levelHard' }[l]);

  // Text that depends on the language or on progress; safe to call again after a language switch.
  function render() {
    if (!S) return;
    const g = S.gen;
    $('pLevel').textContent = `${levelName(g.level)}, #${g.seed}`;
    let result = '';
    if (S.done) {
      const d = S.done;
      const splits = ['ecl', 'mask', 'text'].filter((k) => S.splits[k] != null)
        .map((k) => `<li>${t({ ecl: 'pLevelLabel', mask: 'pMaskLabel', text: 'pTextLabel' }[k])}: <b dir="ltr">${fmt(S.splits[k])}</b></li>`).join('');
      result = d.solved
        ? `<div class="p-result"><h3>${t('pSolved', { time: fmt(d.time) })}</h3>
            ${d.newBest ? `<p class="good"><b>${t('pNewBest')}</b></p>` : ''}
            ${splits ? `<ul>${splits}</ul>` : ''}
            <p>${t('pMistakes', { n: S.mistakes })}. ${S.aidsUsed.size ? t('pAidsUsed', { list: [...S.aidsUsed].map(aidName).join(', ') }) : t('pNoAids')}.</p></div>`
        : `<div class="p-result gaveup"><h3>${t('pAnswerTitle')}</h3><p class="p-answer" dir="auto">${esc(g.text)}</p></div>`;
    }
    $('pResult').innerHTML = result;
    $('pResult').hidden = !result;
    $('pWalk').href = walkHash();
    $('pWalk').hidden = !S.done;

    const mine = history().filter((a) => a.level === g.level).slice(-5).reverse();
    const b = best(g.level);
    $('pStats').innerHTML = `<h3>${t('pHistory')}</h3>
      <p>${b == null ? t('noTimeYet') : t('bestTime', { time: fmt(b) })}</p>
      ${mine.length ? `<table class="tbl"><tr><th>${t('pTime')}</th><th>${t('pAids')}</th></tr>${mine.map((a) => `<tr><td dir="ltr">${a.finished ? fmt(a.time) : t('pGaveUp')}</td><td>${a.aids.length ? a.aids.map(aidName).join(', ') : t('pNone')}</td></tr>`).join('')}</table>` : ''}`;
  }

  // A large printable picture with row and column numbers, for reading on paper.
  function download() {
    if (!S) return;
    const m = S.gen.matrix;
    const n = m.length;
    const cell = 28;
    const margin = 2.5 * cell;
    const size = Math.round(n * cell + margin * 2);
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#111827';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell);
    ctx.strokeStyle = 'rgba(100,116,139,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      ctx.moveTo(margin, margin + i * cell); ctx.lineTo(margin + n * cell, margin + i * cell);
      ctx.moveTo(margin + i * cell, margin); ctx.lineTo(margin + i * cell, margin + n * cell);
    }
    ctx.stroke();
    ctx.fillStyle = '#475569';
    ctx.font = `${Math.round(cell * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      ctx.fillText(String(i), margin + (i + 0.5) * cell, margin - cell * 0.8);
      ctx.fillText(String(i), margin - cell * 0.9, margin + (i + 0.5) * cell);
    }
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = `qr-practice-${S.gen.level}-${S.gen.seed}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  QRT.practice = {
    LEVELS, generate, best, history, fmt, start, stop, render,
    get current() { return S ? S.gen : null; },
    get state() { return S; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
