// Cross-checks the encoder and decoder against two independent libraries:
// node-qrcode (encoder) and jsQR (decoder). Run: node test/run-tests.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const QRCode = require('qrcode');
const toSJIS = require('qrcode/helper/to-sjis');
const jsQR = require('jsqr');

const load = (f) => vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), { filename: f });
['js/i18n.js', 'js/gf.js', 'js/tables.js', 'js/encoder.js', 'js/decoder.js', 'js/steps.js', 'js/samples.js', 'js/widgets.js', 'js/lessons.js'].forEach((f) => {
  if (fs.existsSync(path.join(__dirname, '..', f))) load(f);
});
const { gf, spec, encoder, decoder } = globalThis.QRT;

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) pass++;
  else {
    fail++;
    if (failures.length < 25) failures.push(name + (detail ? ' :: ' + detail : ''));
  }
}

let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const randInt = (n) => Math.floor(rand() * n);

// 1. Reed-Solomon round trip with injected errors.
for (let t = 0; t < 400; t++) {
  const n = [7, 10, 13, 16, 22, 26, 28, 30][t % 8];
  const len = 5 + randInt(120);
  const data = Array.from({ length: len }, () => randInt(256));
  const ecc = gf.rsEncode(data, n);
  const cw = data.concat(ecc);
  const errs = randInt(Math.floor(n / 2) + 1);
  const bad = cw.slice();
  const used = new Set();
  while (used.size < errs) used.add(randInt(cw.length));
  for (const i of used) bad[i] ^= 1 + randInt(255);
  const r = gf.rsDecode(bad, n);
  check('rs ' + t, r.ok && r.corrected.join() === cw.join() && r.errors.length === errs, `n=${n} errs=${errs} got ${r.errors.length}`);
}

function qrcodeMatrix(q) {
  const size = q.modules.size;
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => q.modules.get(r, c)));
}

const texts = {
  numeric: (len) => Array.from({ length: len }, () => randInt(10)).join(''),
  alphanumeric: (len) => Array.from({ length: len }, () => spec.ALNUM[randInt(45)]).join(''),
  byte: (len) => Array.from({ length: len }, () => 'abcXYZ019 !?/éبغ中'[randInt(17)]).join(''),
  kanji: (len) => Array.from({ length: len }, () => '漢字日本語点茶あ'[randInt(8)]).join(''),
};
const QMODE = { numeric: 'numeric', alphanumeric: 'alphanumeric', byte: 'byte', kanji: 'kanji' };

// 2. node-qrcode -> our decoder, and matrix equality with our encoder, across all versions and levels.
for (let v = 1; v <= 40; v++) {
  for (const ecl of spec.ECL_ORDER) {
    const modes = ['numeric', 'alphanumeric', 'byte', 'kanji'];
    const mode = modes[(v + spec.ECL_ORDER.indexOf(ecl)) % 4];
    const mask = (v * 3 + spec.ECL_ORDER.indexOf(ecl)) % 8;
    const info = spec.blockInfo(v, ecl);
    const capBits = info.dataCodewords * 8 - 4 - spec.countBits(mode, v);
    const unit = { numeric: 10 / 3, alphanumeric: 5.5, byte: 8 * 2.2, kanji: 13 }[mode];
    let len = Math.max(1, Math.floor((capBits / unit) * (0.3 + rand() * 0.6)));
    let text = texts[mode](len);
    let q;
    try {
      q = QRCode.create([{ data: text, mode: QMODE[mode] }], { version: v, errorCorrectionLevel: ecl, maskPattern: mask, toSJISFunc: toSJIS });
    } catch (e) {
      text = texts[mode](1);
      q = QRCode.create([{ data: text, mode: QMODE[mode] }], { version: v, errorCorrectionLevel: ecl, maskPattern: mask, toSJISFunc: toSJIS });
    }
    const m = qrcodeMatrix(q);
    let d;
    try {
      d = decoder.analyze(m);
    } catch (e) {
      check(`decode v${v} ${ecl}`, false, e.message);
      continue;
    }
    check(`decode text v${v} ${ecl} ${mode}`, d.text === text, `got ${JSON.stringify(d.text.slice(0, 30))} want ${JSON.stringify(text.slice(0, 30))}`);
    check(`decode meta v${v} ${ecl}`, d.version === v && d.format.ecl === ecl && d.format.mask === mask && d.rsOk && d.errorCount === 0);
    if (v >= 7) check(`version info v${v}`, d.versionInfo.value === v && d.versionInfo.exact1 && d.versionInfo.exact2);

    const ours = encoder.encode({ segments: [{ mode, text }], ecl, version: v, mask });
    const same = ours.matrix.every((row, r) => row.every((val, c) => val === m[r][c]));
    check(`encoder matrix equals node-qrcode v${v} ${ecl} ${mode}`, same);
  }
}

// 3. Our encoder -> jsQR, random content, auto version and auto mask.
function toRgba(matrix, scale = 4, quiet = 4) {
  const n = matrix.length;
  const w = (n + quiet * 2) * scale;
  const data = new Uint8ClampedArray(w * w * 4).fill(255);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!matrix[r][c]) continue;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const i = ((r + quiet) * scale + y) * w + (c + quiet) * scale + x;
          data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 0;
        }
      }
    }
  }
  return { data, w };
}
for (let t = 0; t < 120; t++) {
  const mode = ['numeric', 'alphanumeric', 'byte'][t % 3];
  const ecl = spec.ECL_ORDER[t % 4];
  const text = texts[mode](1 + randInt(t < 60 ? 40 : 300));
  const enc = encoder.encode({ text, mode, ecl });
  const { data, w } = toRgba(enc.matrix);
  const j = jsQR(data, w, w);
  check(`jsQR reads ours #${t} v${enc.version} ${ecl} ${mode}`, j && j.data === text && j.version === enc.version, j ? JSON.stringify(j.data.slice(0, 20)) : 'null');
  const d = decoder.analyze(enc.matrix);
  check(`we read ours #${t}`, d.text === text && d.format.mask === enc.mask);
}

// 4. Mixed segments and ECI.
{
  const enc = encoder.encode({
    segments: [{ mode: 'eci', value: 26 }, { mode: 'byte', text: 'مرحبا ' }, { mode: 'alphanumeric', text: 'QR-CODE ' }, { mode: 'numeric', text: '2026' }],
    ecl: 'M',
  });
  const d = decoder.analyze(enc.matrix);
  check('mixed segments text', d.text === 'مرحبا QR-CODE 2026', d.text);
  check('mixed segments modes', d.segments.map((s) => s.mode).join() === 'eci,byte,alphanumeric,numeric', d.segments.map((s) => s.mode).join());
  const { data, w } = toRgba(enc.matrix);
  const j = jsQR(data, w, w);
  check('jsQR mixed', j && j.data === 'مرحبا QR-CODE 2026', j && j.data);
}

// 5. Damage (a logo over the centre) is corrected.
{
  const enc = encoder.encode({ text: 'https://example.com/qr-manual-reader', ecl: 'H', version: 5, mask: 2 });
  const m = enc.matrix.map((row) => row.slice());
  const n = m.length;
  const c0 = Math.floor(n / 2) - 3;
  const cat = spec.functionMap(5);
  let hit = 0;
  for (let r = c0; r < c0 + 7; r++) for (let c = c0; c < c0 + 7; c++) if (cat[r][c] === null) { m[r][c] = 0; hit++; }
  const d = decoder.analyze(m);
  check('logo damage corrected', d.text === 'https://example.com/qr-manual-reader' && d.rsOk && d.errorCount > 0, `errors=${d.errorCount} ok=${d.rsOk} text=${d.text}`);
}

// 6. Format / version info with bit errors.
{
  const enc = encoder.encode({ text: 'VERSION SEVEN', ecl: 'Q', version: 8, mask: 5 });
  const m = enc.matrix.map((row) => row.slice());
  const fc = spec.formatCells(m.length);
  m[fc.copy1[3][0]][fc.copy1[3][1]] ^= 1;
  m[fc.copy1[12][0]][fc.copy1[12][1]] ^= 1;
  const vc = spec.versionCells(m.length);
  m[vc.topRight[2][0]][vc.topRight[2][1]] ^= 1;
  const d = decoder.analyze(m);
  check('format with 2 flipped bits', d.format.ecl === 'Q' && d.format.mask === 5 && d.text === 'VERSION SEVEN');
  check('version info with 1 flipped bit', d.versionInfo.value === 8 && !d.versionInfo.exact1 && d.versionInfo.exact2);
}

// 7. Step generation runs for every sample (when those modules exist).
if (globalThis.QRT.steps && globalThis.QRT.samples) {
  for (const s of globalThis.QRT.samples.list) {
    try {
      const built = globalThis.QRT.samples.build(s);
      const d = decoder.analyze(built.matrix);
      check(`sample ${s.id} decodes`, d.text === built.expected, `${JSON.stringify(d.text)} vs ${JSON.stringify(built.expected)}`);
      const en = globalThis.QRT.steps.build(d, { source: built, lang: 'en' });
      const ar = globalThis.QRT.steps.build(d, { source: built, lang: 'ar' });
      for (const [lang, steps] of [['en', en], ['ar', ar]]) {
        check(`sample ${s.id} steps ${lang}`, steps.length > 10 && steps.every((st) => st.title && st.body && st.view && !/undefined|NaN/.test(st.title + st.body)), `${steps.length} steps`);
      }
      check(`sample ${s.id} same steps in both languages`, en.length === ar.length && en.every((st, i) => st.chapter === ar[i].chapter));
      const strip = (html) => html
        .replace(/<div class="sofar">[\s\S]*?<\/div><\/div>/g, '')
        .replace(/<div class="result"[^>]*>[\s\S]*?<\/div>/g, '')
        .replace(/<span class="char"[^>]*>[\s\S]*?<\/span>/g, '')
        .replace(/<div class="calc" dir="auto">[\s\S]*?<\/div>/g, '');
      const titleText = (st) => st.title.replace(/:.*$/, '');
      const arabicInEn = en.filter((st) => /[\u0600-\u06FF]/.test(titleText(st) + strip(st.body)));
      check(`sample ${s.id} English steps have no Arabic text`, arabicInEn.length === 0, arabicInEn.map((x) => x.title).join(' | '));
    } catch (e) {
      check(`sample ${s.id}`, false, e.stack);
    }
  }
}

// 8. Lessons: widgets exist, quizzes are well formed, and every concept link resolves.
if (globalThis.QRT.lessons && globalThis.QRT.widgets) {
  const lessonsEn = globalThis.QRT.lessons.get('en');
  const lessonsAr = globalThis.QRT.lessons.get('ar');
  const shape = (ls) => JSON.stringify(ls.map((l) => [l.id, l.pages.map((p) => [p.widget.type, !!p.task, (p.quiz || []).map((q) => [q.answer, q.options.length])])]));
  check('lessons match across languages', shape(lessonsEn) === shape(lessonsAr));
  const texts = (ls) => ls.flatMap((l) => [l.title, l.summary].concat(...l.pages.map((p) => [p.title, p.body, p.task || ''].concat(...(p.quiz || []).map((q) => [q.q, q.explain].concat(q.options))))));
  const arabicEn = texts(lessonsEn).filter((x) => /[\u0600-\u06FF]/.test(x));
  check('English lessons have no Arabic text', arabicEn.length === 0, arabicEn.slice(0, 3).join(' | '));
  for (const lessons of [lessonsEn, lessonsAr]) {
  const types = new Set(globalThis.QRT.widgets.types);
  const pagesOf = Object.fromEntries(lessons.map((l) => [l.id, l.pages.length]));
  const linkCheck = (html, where) => {
    for (const m of html.matchAll(/#learn=([a-z]+)&page=(\d+)/g)) {
      check(`link ${m[1]}/${m[2]} in ${where}`, pagesOf[m[1]] && Number(m[2]) >= 1 && Number(m[2]) <= pagesOf[m[1]]);
    }
  };
  check('lesson ids unique', new Set(lessons.map((l) => l.id)).size === lessons.length);
  lessons.forEach((l) => {
    l.pages.forEach((p, pi) => {
      const where = `${l.id} page ${pi + 1}`;
      check(`${where} has title, body, widget`, p.title && p.body && p.widget && types.has(p.widget.type), p.widget && p.widget.type);
      (p.quiz || []).forEach((q, qi) => check(`${where} quiz ${qi + 1}`, q.q && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length));
      linkCheck(p.body, where);
    });
  });
  for (const s of globalThis.QRT.samples.list) {
    const built = globalThis.QRT.samples.build(s);
    const steps = globalThis.QRT.steps.build(decoder.analyze(built.matrix), { source: built });
    steps.forEach((st, i) => linkCheck(st.body, `sample ${s.id} step ${i + 1}`));
    check(`sample ${s.id} links to lessons`, steps.some((st) => st.body.includes('#learn=')));
  }
  }
}

console.log(`pass ${pass}  fail ${fail}`);
for (const f of failures) console.log('  FAIL ' + f);
process.exit(fail ? 1 : 0);
