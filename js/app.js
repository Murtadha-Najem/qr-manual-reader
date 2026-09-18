// Page wiring: the fundamentals lessons, choosing a code (example, typed text, photo),
// stepping through the walkthrough, the language switch, and keeping the URL in sync.
(function () {
  const Q = window.QRT;
  const I = Q.i18n;
  const t = I.t;
  const $ = (id) => document.getElementById(id);
  const view = new Q.GridView($('grid'));
  const lessons = () => Q.lessons.get(I.lang);
  const state = { d: null, steps: [], i: 0, source: null, hashBase: '', learn: null, returnTo: null, solved: {}, answers: {} };
  window.QRT.app = state;

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
  const progress = () => store.get('qrt-progress', {});

  const errorText = (e) => {
    const msg = e && e.message ? e.message : String(e);
    const keys = { TOO_LONG: 'errTooLong', TOO_LONG_FOR_VERSION: 'errTooLongVersion', TOO_LONG_FOR_COUNT: 'errTooLongCount', BAD_SIZE: 'errBadSize', BAD_FORMAT: 'errBadFormat' };
    if (keys[msg]) return t(keys[msg]);
    if (/Numeric mode/.test(msg)) return t('errNumeric');
    if (/Alphanumeric mode/.test(msg)) return t('errAlnum');
    if (/Kanji mode/.test(msg)) return t('errKanji');
    return t('errGeneric', { msg });
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

  function drawMatrix(canvas, matrix, quiet) {
    const n = matrix.length;
    const q = quiet == null ? 2 : quiet;
    const ctx = canvas.getContext('2d');
    const s = canvas.width / (n + q * 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111827';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (matrix[r][c]) ctx.fillRect((c + q) * s, (r + q) * s, s + 0.4, s + 0.4);
  }

  function drawMiniMask(canvas, k) {
    const ctx = canvas.getContext('2d');
    const n = 12;
    const s = canvas.width / n;
    const fn = Q.spec.MASKS[k];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        ctx.fillStyle = fn(r, c) ? '#0891b2' : '#e0f2fe';
        ctx.fillRect(c * s, r * s, s, s);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    for (let i = 1; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(canvas.width, i * s); ctx.stroke();
    }
  }

  // ---------- Views ----------
  let widget = null;
  function destroyWidget() {
    if (widget) { widget.destroy(); widget = null; }
  }
  function showView(name) {
    const changed = (name === 'picker' && $('picker').hidden) || (name === 'reader' && $('lesson').hidden) || (name === 'learn' && $('learn').hidden) || (name === 'practice' && $('practice').hidden);
    $('picker').hidden = name !== 'picker';
    $('lesson').hidden = name !== 'reader';
    $('learn').hidden = name !== 'learn';
    $('practice').hidden = name !== 'practice';
    if (name !== 'practice') Q.practice.stop();
    $('backBtn').hidden = name === 'picker';
    $('lessonMeta').hidden = name !== 'reader';
    if (name !== 'learn') destroyWidget();
    if (changed) window.scrollTo(0, 0);
  }
  function showPicker() {
    showView('picker');
    renderLessonGrid();
    renderPracticeCards();
  }

  // ---------- Home: practice ----------
  function renderPracticeCards() {
    $('practiceGrid').innerHTML = Q.practice.LEVELS.map((level) => {
      const key = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[level];
      const b = Q.practice.best(level);
      return `<button type="button" class="p-card" data-level="${level}"><strong>${t('level' + key)}</strong><span>${t('level' + key + 'Desc')}</span><em class="${b == null ? 'none' : ''}">${b == null ? t('noTimeYet') : t('bestTime', { time: Q.practice.fmt(b) })}</em></button>`;
    }).join('');
  }
  $('practiceGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (b) location.hash = `practice=${b.dataset.level}`;
  });
  function goHome() {
    state.returnTo = null;
    history.replaceState(null, '', location.pathname);
    showPicker();
  }

  // ---------- Home: lessons ----------
  function renderLessonGrid() {
    const list = lessons();
    const p = progress();
    const done = list.filter((l) => p[l.id]).length;
    const pages = (n) => (I.lang === 'en' ? `${n} ${n === 1 ? 'page' : 'pages'}` : `${n} ${n === 1 ? 'صفحة' : 'صفحات'}`);
    $('lessonGrid').innerHTML = list.map((l, i) => `<button type="button" class="lesson-card${p[l.id] ? ' done' : ''}" data-lesson="${l.id}">
      <span class="ln">${i + 1}</span>
      <div><strong>${l.title}</strong><span class="sum">${l.summary}</span><em>${p[l.id] ? t('lessonCompleted') : pages(l.pages.length)}</em></div>
    </button>`).join('');
    $('progressText').textContent = t('progress', { done, total: list.length });
    $('progressBar').style.width = `${(done / list.length) * 100}%`;
    const next = list.find((l) => !p[l.id]);
    $('continueBtn').textContent = done === 0 ? t('startFirst') : next ? t('continueWith', { title: next.title }) : t('reviewLessons');
    $('continueBtn').dataset.lesson = (next || list[0]).id;
  }
  $('lessonGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lesson]');
    if (b) { state.returnTo = null; openLesson(b.dataset.lesson, 0); }
  });
  $('continueBtn').addEventListener('click', () => { state.returnTo = null; openLesson($('continueBtn').dataset.lesson, 0); });

  // ---------- Lessons ----------
  function openLesson(id, pageIndex) {
    const list = lessons();
    const li = list.findIndex((l) => l.id === id);
    if (li < 0) { goHome(); return; }
    const L = list[li];
    const pi = Math.max(0, Math.min(L.pages.length - 1, pageIndex || 0));
    const page = L.pages[pi];
    showView('learn');
    state.learn = { id, page: pi };
    const key = `${id}:${pi}`;
    $('learnLabel').textContent = t('lessonLabel', { i: li + 1, n: list.length, title: L.title });
    $('learnDots').innerHTML = L.pages.length > 1 ? L.pages.map((_, i) => `<i class="${i === pi ? 'on' : i < pi ? 'past' : ''}"></i>`).join('') : '';
    $('learnTitle').textContent = page.title;
    let extras = '';
    if (page.task) {
      extras += `<div class="task${state.solved[key] ? ' solved' : ''}" id="taskBox"><span class="t-h">${state.solved[key] ? t('taskDone') : t('tryIt')}</span>${page.task}</div>`;
    }
    if (page.quiz) {
      extras += `<div class="quiz"><h3>${t('quizTitle')}</h3>${page.quiz.map((q, qi) => `<div class="q" data-qi="${qi}"><p>${q.q}</p><div class="opts">${q.options.map((o, oi) => `<button type="button" data-oi="${oi}">${o}</button>`).join('')}</div><p class="explain" hidden></p></div>`).join('')}</div>`;
    }
    if (pi === L.pages.length - 1) extras += `<div class="done-msg" id="doneMsg" hidden>${t('lessonDone')}</div>`;
    $('learnBody').innerHTML = page.body;
    $('learnExtras').innerHTML = extras;
    if (page.quiz) {
      page.quiz.forEach((q, qi) => {
        const a = state.answers[`${key}:${qi}`];
        if (a != null) showAnswer($('learnExtras').querySelector(`.q[data-qi="${qi}"]`), q, a);
      });
    }
    $('learnScroll').scrollTop = 0;
    if (isPhone()) window.scrollTo(0, 0);
    destroyWidget();
    widget = Q.widgets.mount(page.widget.type, $('learnStage'), page.widget, { solve: () => solveTask(key) });
    $('learnPrev').disabled = li === 0 && pi === 0;
    const last = pi === L.pages.length - 1;
    $('learnNext').textContent = !last ? t('next') : li < list.length - 1 ? t('nextLesson') : t('startReading');
    $('learnReturn').hidden = !state.returnTo;
    if (state.returnTo) $('learnReturn').href = state.returnTo;
    history.replaceState(null, '', `#learn=${id}&page=${pi + 1}`);
    checkComplete(L);
  }

  function showAnswer(qEl, q, oi) {
    const right = oi === q.answer;
    qEl.querySelectorAll('.opts button').forEach((btn, i) => {
      btn.classList.toggle('right', right && i === oi);
      btn.classList.toggle('wrong', !right && i === oi);
      btn.disabled = right;
    });
    const ex = qEl.querySelector('.explain');
    ex.hidden = false;
    ex.innerHTML = right ? `<span class="good">${t('right')}</span> ${q.explain || ''}` : `<span class="bad">${t('wrong')}</span>`;
  }

  function checkComplete(L) {
    const results = [];
    L.pages.forEach((pg, pi) => (pg.quiz || []).forEach((q, qi) => results.push(state.answers[`${L.id}:${pi}:${qi}`] === q.answer)));
    const onLast = state.learn && state.learn.id === L.id && state.learn.page === L.pages.length - 1;
    const complete = results.length ? results.every(Boolean) : onLast;
    if (complete && !progress()[L.id]) {
      const p = progress();
      p[L.id] = true;
      store.set('qrt-progress', p);
    }
    const msg = $('doneMsg');
    if (msg) msg.hidden = !progress()[L.id];
  }

  function solveTask(key) {
    if (state.solved[key]) return;
    state.solved[key] = true;
    const box = $('taskBox');
    if (box && state.learn && `${state.learn.id}:${state.learn.page}` === key) {
      box.classList.add('solved');
      box.querySelector('.t-h').textContent = t('taskDone');
    }
  }

  $('learnExtras').addEventListener('click', (e) => {
    const b = e.target.closest('.q .opts button');
    if (!b || !state.learn) return;
    const qEl = b.closest('.q');
    const qi = Number(qEl.dataset.qi);
    const L = lessons().find((l) => l.id === state.learn.id);
    const q = L.pages[state.learn.page].quiz[qi];
    const oi = Number(b.dataset.oi);
    state.answers[`${L.id}:${state.learn.page}:${qi}`] = oi;
    showAnswer(qEl, q, oi);
    checkComplete(L);
  });
  $('learnPrev').addEventListener('click', () => {
    const list = lessons();
    const { id, page } = state.learn;
    const li = list.findIndex((l) => l.id === id);
    if (page > 0) openLesson(id, page - 1);
    else if (li > 0) openLesson(list[li - 1].id, list[li - 1].pages.length - 1);
  });
  $('learnNext').addEventListener('click', () => {
    const list = lessons();
    const { id, page } = state.learn;
    const li = list.findIndex((l) => l.id === id);
    const L = list[li];
    if (page < L.pages.length - 1) openLesson(id, page + 1);
    else if (li < list.length - 1) openLesson(list[li + 1].id, 0);
    else location.hash = 's=hello';
  });

  // ---------- Home: reader ----------
  function setTab(name) {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x.dataset.tab === name));
    ['samples', 'custom', 'image'].forEach((x) => ($('tab-' + x).hidden = x !== name));
  }
  document.querySelectorAll('.tab').forEach((x) => x.addEventListener('click', () => setTab(x.dataset.tab)));

  const sampleCards = [];
  Q.samples.list.forEach((s) => {
    const built = Q.samples.build(s);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'sample';
    card.dataset.sample = s.id;
    const thumb = document.createElement('canvas');
    thumb.width = 180;
    thumb.height = 180;
    if (s.kind === 'photo') thumb.getContext('2d').drawImage(Q.image.demoPhoto(built.matrix), 0, 0, 180, 180);
    else drawMatrix(thumb, built.matrix);
    card.appendChild(thumb);
    const body = document.createElement('div');
    body.className = 'sample-body';
    body.innerHTML = `<strong dir="auto"></strong><span></span><div class="tags" dir="ltr"></div>`;
    card.appendChild(body);
    card.addEventListener('click', () => { state.returnTo = null; startSample(s.id, 0); });
    $('sampleGrid').appendChild(card);
    sampleCards.push({ s, enc: built.enc, body });
  });
  function renderSampleCards() {
    for (const { s, enc, body } of sampleCards) {
      body.querySelector('strong').textContent = s.title[I.lang];
      body.querySelector('span').textContent = s.desc[I.lang];
      const modes = [...new Set(s.segments.map((x) => Q.spec.MODES[x.mode].name))];
      body.querySelector('.tags').innerHTML = [`V${enc.version}`, enc.ecl, t('maskTag', { k: enc.mask })].concat(modes).map((x) => `<i>${x}</i>`).join('');
    }
  }

  for (let v = 1; v <= 40; v++) $('cVersion').insertAdjacentHTML('beforeend', `<option value="${v}">${v} (${v * 4 + 17}×${v * 4 + 17})</option>`);
  for (let k = 0; k < 8; k++) $('cMask').insertAdjacentHTML('beforeend', `<option value="${k}">${k}: ${Q.spec.MASK_FORMULAS[k]}</option>`);

  $('customForm').addEventListener('submit', (e) => {
    e.preventDefault();
    startCustom({ text: $('cText').value, mode: $('cMode').value, ecl: $('cEcl').value, version: $('cVersion').value, mask: $('cMask').value }, 0);
  });

  function startSample(id, stepIndex) {
    const s = Q.samples.list.find((x) => x.id === id);
    if (!s) { goHome(); return false; }
    const built = Q.samples.build(s);
    if (s.kind === 'photo') {
      const photo = Q.image.demoPhoto(built.matrix);
      const img = photo.getContext('2d').getImageData(0, 0, photo.width, photo.height);
      return startFromImage(img, photo, `#s=${id}`, stepIndex, ['photoNote']);
    }
    return startReader(built.matrix, { kind: 'sample', id }, `#s=${id}`, stepIndex);
  }

  function startCustom(opts, stepIndex) {
    const err = $('customError');
    err.hidden = true;
    const fail = (text) => {
      err.textContent = text;
      err.hidden = false;
      showPicker();
      setTab('custom');
      return false;
    };
    if (!opts.text) return fail(t('typeFirst'));
    let enc;
    try {
      enc = Q.encoder.encode({
        text: opts.text,
        mode: opts.mode,
        ecl: opts.ecl,
        version: opts.version === 'auto' ? undefined : Number(opts.version),
        mask: opts.mask === 'auto' ? null : Number(opts.mask),
      });
    } catch (e) {
      return fail(errorText(e));
    }
    const p = new URLSearchParams({ t: opts.text, m: opts.mode, e: opts.ecl, v: opts.version, k: opts.mask });
    return startReader(enc.matrix, { kind: 'custom' }, '#' + p.toString(), stepIndex);
  }

  function startFromImage(imageData, sourceCanvas, hashBase, stepIndex, noteKeys) {
    const err = $('imageError');
    err.hidden = true;
    let found;
    try {
      found = Q.image.fromImageData(imageData);
    } catch (e) {
      found = null;
    }
    if (!found) {
      err.textContent = t('noCode');
      err.hidden = false;
      showPicker();
      setTab('image');
      return false;
    }
    const previewUrl = Q.image.previewWithQuad(sourceCanvas, found.location);
    const keys = (noteKeys || []).concat(found.inverted ? ['invertedNote'] : []);
    return startReader(found.matrix, { kind: 'image', previewUrl, jsqrText: found.text, noteKeys: keys }, hashBase, stepIndex, (e) => {
      err.textContent = errorText(e);
      err.hidden = false;
      setTab('image');
    });
  }

  async function handleFile(file) {
    if (!file || !/^image\//.test(file.type)) return;
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.naturalWidth * k);
      cv.height = Math.round(img.naturalHeight * k);
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      state.returnTo = null;
      startFromImage(ctx.getImageData(0, 0, cv.width, cv.height), cv, '', 0);
    } catch (e) {
      $('imageError').textContent = t('openFail');
      $('imageError').hidden = false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  $('fileInput').addEventListener('change', (e) => handleFile(e.target.files[0]));
  const dz = $('dropzone');
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); handleFile(e.dataTransfer.files[0]); });
  window.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((x) => x.type.startsWith('image/'));
    if (item && !$('picker').hidden) { setTab('image'); handleFile(item.getAsFile()); }
  });

  // ---------- Reader ----------
  function buildSteps() {
    const src = state.source;
    if (src && src.noteKeys) src.note = src.noteKeys.map((k) => t(k)).join(' ');
    state.steps = Q.steps.build(state.d, { source: src });
    const d = state.d;
    $('lessonMeta').textContent = t('meta', { v: d.version, ecl: d.format.ecl, mask: d.format.mask });
    buildChapters();
    $('jump').innerHTML = state.steps.map((s, i) => `<option value="${i}">${i + 1}. ${escapeHtml(s.title)}</option>`).join('');
  }

  function startReader(matrix, source, hashBase, stepIndex, onError) {
    let d;
    try {
      d = Q.decoder.analyze(matrix);
    } catch (e) {
      if (onError) onError(e);
      else alert(errorText(e));
      showPicker();
      return false;
    }
    state.d = d;
    state.source = source;
    state.hashBase = hashBase || '';
    showView('reader');
    buildSteps();
    const allDone = lessons().every((l) => progress()[l.id]);
    $('readerNotice').hidden = allDone || store.get('qrt-notice-closed', false);
    view.setAnalysis(d);
    view.resize();
    go(Math.min(stepIndex || 0, state.steps.length - 1), true);
    return true;
  }

  function buildChapters() {
    const present = Q.steps.CHAPTERS.filter((c) => state.steps.some((s) => s.chapter === c.key));
    $('chapters').innerHTML = present.map((c) => `<button type="button" data-ch="${c.key}">${Q.steps.chapterName(c.key, I.lang)}</button>`).join('');
    $('chapters').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      go(state.steps.findIndex((s) => s.chapter === b.dataset.ch));
    }));
  }

  function go(i, instant) {
    if (i < 0 || i >= state.steps.length) return;
    state.i = i;
    const step = state.steps[i];
    view.show(step, instant);
    $('stepTitle').textContent = step.title;
    $('stepBody').innerHTML = step.body;
    $('stepBody').querySelectorAll('canvas[data-mini-mask]').forEach((c) => drawMiniMask(c, Number(c.dataset.miniMask)));
    $('stepCount').textContent = t('stepCount', { i: i + 1, n: state.steps.length });
    $('legend').innerHTML = (step.legend || []).map(([color, text]) => `<span><i style="background:${color}"></i>${escapeHtml(text)}</span>`).join('');
    const tools = step.tools || [];
    $('stageTools').querySelector('[data-tool="replay"]').hidden = !tools.includes('replay');
    const seg = $('stageTools').querySelector('[data-tool="compare"]');
    seg.hidden = !tools.includes('compare');
    seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'after'));
    $('prevBtn').disabled = i === 0;
    $('nextBtn').disabled = i === state.steps.length - 1;
    $('nextBtn').textContent = i === state.steps.length - 1 ? t('finished') : t('next');
    $('jump').value = String(i);
    const cur = Q.steps.CHAPTERS.findIndex((c) => c.key === step.chapter);
    $('chapters').querySelectorAll('button').forEach((b) => {
      const idx = Q.steps.CHAPTERS.findIndex((c) => c.key === b.dataset.ch);
      b.classList.toggle('on', b.dataset.ch === step.chapter);
      b.classList.toggle('past', idx < cur);
    });
    $('stepBody').scrollTop = 0;
    if (!instant && isPhone()) window.scrollTo(0, 0);
    // On a phone the lessons notice would push the explanation off screen, so it only shows on the first step.
    const noticeWanted = !lessons().every((l) => progress()[l.id]) && !store.get('qrt-notice-closed', false);
    $('readerNotice').hidden = !noticeWanted || (isPhone() && i > 0);
    if (state.hashBase) history.replaceState(null, '', `${state.hashBase}&step=${i + 1}`);
  }

  $('prevBtn').addEventListener('click', () => go(state.i - 1));
  $('nextBtn').addEventListener('click', () => go(state.i + 1));
  $('jump').addEventListener('change', (e) => go(Number(e.target.value)));
  $('backBtn').addEventListener('click', goHome);
  $('homeBtn').addEventListener('click', goHome);
  $('noticeClose').addEventListener('click', () => { store.set('qrt-notice-closed', true); $('readerNotice').hidden = true; });
  $('stageTools').querySelector('[data-tool="replay"]').addEventListener('click', () => {
    view.playMask();
    $('stageTools').querySelectorAll('[data-tool="compare"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'after'));
  });
  $('stageTools').querySelectorAll('[data-tool="compare"] button').forEach((b) => b.addEventListener('click', () => {
    view.setCompare(b.dataset.v === 'before');
    b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  }));
  $('autoZoom').addEventListener('change', (e) => view.setAutoZoom(e.target.checked));

  document.addEventListener('keydown', (e) => {
    if ($('lesson').hidden) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    const rtl = document.documentElement.dir === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(state.i + 1); }
    else if (e.key === back || e.key === 'PageUp') { e.preventDefault(); go(state.i - 1); }
  });

  new ResizeObserver(() => view.resize()).observe($('canvasWrap'));

  // ---------- Phone layout ----------
  // On a narrow screen the walkthrough grid is pinned under the top bar, and a lesson's widget
  // moves from its own column into the panel, between the explanation and the task.
  const phone = window.matchMedia('(max-width: 920px)');
  function isPhone() {
    return phone.matches;
  }
  function placeLearnStage() {
    const stage = $('learnStage');
    const target = isPhone() ? $('learnSlot') : $('learnStageHome');
    if (stage.parentElement !== target) target.appendChild(stage);
  }
  phone.addEventListener('change', placeLearnStage);
  placeLearnStage();
  const topbar = document.querySelector('.topbar');
  new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', topbar.offsetHeight + 'px')).observe(topbar);

  // Swipe the grid sideways to move between steps.
  const readerStage = $('lesson').querySelector('.stage');
  let touchStart = null;
  readerStage.addEventListener('touchstart', (e) => {
    touchStart = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  readerStage.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const end = e.changedTouches[0];
    const dx = end.clientX - touchStart.x;
    const dy = end.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > 40) return;
    const forward = document.documentElement.dir === 'rtl' ? dx > 0 : dx < 0;
    go(state.i + (forward ? 1 : -1));
  }, { passive: true });

  // ---------- Language ----------
  $('langBtn').addEventListener('click', () => I.set(I.lang === 'en' ? 'ar' : 'en'));
  I.onChange(() => {
    $('langBtn').lang = I.lang === 'en' ? 'ar' : 'en';
    renderSampleCards();
    renderLessonGrid();
    renderPracticeCards();
    if (!$('practice').hidden) {
      Q.practice.render();
    } else if (!$('learn').hidden && state.learn) {
      openLesson(state.learn.id, state.learn.page);
    } else if (!$('lesson').hidden && state.d) {
      const i = state.i;
      buildSteps();
      view.resize();
      go(i, true);
    }
  });

  // ---------- Routing ----------
  // Links inside the walkthrough point at lessons (#learn=...); following one remembers the
  // walkthrough position so the lesson can offer a way back.
  function route(oldHash) {
    const p = new URLSearchParams(location.hash.slice(1));
    const step = Math.max(0, Number(p.get('step') || 1) - 1);
    if (p.get('learn')) {
      if (oldHash && /(^|[#&])(s|t)=/.test(oldHash)) state.returnTo = oldHash;
      openLesson(p.get('learn'), Math.max(0, Number(p.get('page') || 1) - 1));
      return;
    }
    state.returnTo = null;
    if (p.get('practice')) {
      const level = Q.practice.LEVELS.includes(p.get('practice')) ? p.get('practice') : 'medium';
      let seed = Number(p.get('seed'));
      if (!seed) {
        seed = 1 + Math.floor(Math.random() * 999999);
        history.replaceState(null, '', `#practice=${level}&seed=${seed}`);
      }
      showView('practice');
      Q.practice.start(level, seed);
      return;
    }
    if (p.get('s')) startSample(p.get('s'), step);
    else if (p.get('t') !== null) {
      $('cText').value = p.get('t');
      $('cMode').value = p.get('m') || 'auto';
      $('cEcl').value = p.get('e') || 'M';
      $('cVersion').value = p.get('v') || 'auto';
      $('cMask').value = p.get('k') || 'auto';
      startCustom({ text: p.get('t'), mode: $('cMode').value, ecl: $('cEcl').value, version: $('cVersion').value, mask: $('cMask').value }, step);
    } else showPicker();
  }
  window.addEventListener('hashchange', (e) => route(new URL(e.oldURL).hash));

  I.apply();
  $('langBtn').lang = I.lang === 'en' ? 'ar' : 'en';
  renderSampleCards();
  route('');
})();
