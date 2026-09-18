// Timed practice in headless Edge: start, aids, marks, checkpoints (wrong then right), finish,
// best time on the home page, the walkthrough link, giving up, a language switch mid-run, and phone.
// Needs the local server on 127.0.0.1:8765. Run: node test/practice-visual.js <output-dir>
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const OUT = process.argv[2] || path.join(__dirname, 'practice-shots');
const BASE = 'http://127.0.0.1:8765/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const report = { errors: [], checks: {} };
  const ok = (name, cond, detail) => { report.checks[name] = cond ? true : `FAIL ${detail || ''}`; };

  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('qrt-lang', 'en'); sessionStorage.setItem('init', '1'); } } catch (e) { /* */ } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => report.errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') report.errors.push(m.text()); });
  const shot = (name, page, full) => (page || p).screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!full });

  await p.goto(BASE);
  await p.waitForTimeout(700);
  const cards = await p.$$eval('#practiceGrid .p-card', (els) => els.map((e) => e.innerText));
  ok('three practice cards', cards.length === 3 && cards.every((c) => /No time yet/.test(c)), JSON.stringify(cards));
  await p.locator('#practiceGrid').scrollIntoViewIfNeeded();
  await shot('01-home-practice');

  await p.click('#practiceGrid [data-level="easy"]');
  await p.waitForSelector('#practice:not([hidden])');
  await p.waitForTimeout(500);
  ok('seed in the address', /#practice=easy&seed=\d+/.test(p.url()), p.url());
  ok('code hidden before start', await p.$eval('#pCover', (e) => !e.hidden));
  await shot('02-before-start');

  await p.click('#pStart');
  await p.waitForTimeout(1400);
  const timer = await p.$eval('#pTimer', (e) => e.innerText);
  ok('timer runs', timer !== '00:00', timer);
  const gen = await p.evaluate(() => QRT.practice.current);

  await p.check('#practice [data-aid="dim"]');
  await p.check('#practice [data-aid="mask"]');
  const box = await p.$eval('#pGrid', (c) => { const r = c.getBoundingClientRect(); return { x: r.left + r.width * 0.62, y: r.top + r.height * 0.62 }; });
  await p.mouse.click(box.x, box.y);
  await p.waitForTimeout(150);
  ok('tap marks a module', await p.evaluate(() => QRT.practice.state.marks.size === 1));
  await shot('03-running-with-aids');

  const wrongEcl = ['L', 'M', 'Q', 'H'].find((l) => l !== gen.ecl);
  await p.selectOption('#pEcl', wrongEcl);
  await p.click('#practice .p-check[data-field="ecl"] button');
  ok('wrong level is refused', await p.$('#practice .p-check[data-field="ecl"] .p-res .bad') !== null);
  await p.selectOption('#pEcl', gen.ecl);
  await p.click('#practice .p-check[data-field="ecl"] button');
  ok('right level is accepted', await p.$('#practice .p-check[data-field="ecl"].ok') !== null);
  await p.selectOption('#pMask', String(gen.mask));
  await p.click('#practice .p-check[data-field="mask"] button');
  ok('right mask is accepted', await p.$('#practice .p-check[data-field="mask"].ok') !== null);

  await p.fill('#pText', gen.text.slice(0, 3) + 'x');
  await p.press('#pText', 'Enter');
  const hint = await p.$eval('#practice .p-check[data-field="text"] .p-res', (e) => e.innerText);
  ok('wrong message says how much is right', /first 3 characters are right/.test(hint), hint);
  await shot('04-wrong-message');
  await p.fill('#pText', gen.text);
  await p.press('#pText', 'Enter');
  await p.waitForTimeout(300);
  const result = await p.evaluate(() => ({ shown: !document.getElementById('pResult').hidden, text: document.getElementById('pResult').innerText, done: document.getElementById('pTimer').classList.contains('done'), walk: !document.getElementById('pWalk').hidden }));
  ok('solved result shows', result.shown && result.done && result.walk && /Solved in/.test(result.text) && /new best/i.test(result.text) && /Wrong checks: 2/.test(result.text) && /Dim fixed parts, Mask dots/.test(result.text), JSON.stringify(result));
  await shot('05-solved');
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('qrt-practice') || '[]'));
  ok('attempt saved', saved.length === 1 && saved[0].finished && saved[0].level === 'easy' && saved[0].time > 1000 && saved[0].aids.length === 2, JSON.stringify(saved));

  await p.click('#pWalk');
  await p.waitForSelector('#lesson:not([hidden])');
  const walked = await p.evaluate(() => QRT.app.d.text);
  ok('walkthrough of the same code', walked === gen.text, `${walked} vs ${gen.text}`);

  await p.click('#homeBtn');
  await p.waitForTimeout(400);
  const easyCard = await p.$eval('#practiceGrid [data-level="easy"]', (e) => e.innerText);
  ok('home shows the best time', /Best time: \d\d:\d\d/.test(easyCard), easyCard);

  // Give up on a common code, and switch language mid-run.
  await p.goto(BASE + '#practice=medium&seed=4242');
  await p.waitForSelector('#practice:not([hidden])');
  await p.click('#pStart');
  await p.waitForTimeout(1200);
  await p.click('#langBtn');
  await p.waitForTimeout(400);
  const ar = await p.evaluate(() => ({ dir: document.documentElement.dir, level: document.getElementById('pLevel').innerText, running: !QRT.practice.state.done && QRT.practice.state.started, timer: document.getElementById('pTimer').innerText }));
  ok('language switch keeps the run going', ar.dir === 'rtl' && /شائع/.test(ar.level) && ar.running && ar.timer !== '00:00', JSON.stringify(ar));
  await shot('06-arabic-running');
  const med = await p.evaluate(() => QRT.practice.current);
  await p.click('#pGiveUp');
  await p.waitForTimeout(300);
  const gaveUp = await p.$eval('#pResult', (e) => e.innerText);
  ok('giving up shows the answer', gaveUp.includes(med.text), gaveUp);
  await shot('07-gave-up-arabic');
  await p.click('#langBtn');
  await p.waitForTimeout(300);
  ok('two attempts stored', await p.evaluate(() => JSON.parse(localStorage.getItem('qrt-practice')).length === 2));

  // Same seed, same code.
  const again = await p.evaluate(() => QRT.practice.generate('medium', 4242).text);
  ok('seed reproduces the code', again === med.text);

  // Hard level, on a phone.
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.addInitScript(() => { try { localStorage.setItem('qrt-lang', 'en'); } catch (e) { /* */ } });
  const mp = await m.newPage();
  mp.on('pageerror', (e) => report.errors.push('phone: ' + e.message));
  await mp.goto(BASE + '#practice=hard&seed=77');
  await mp.waitForSelector('#practice:not([hidden])');
  await mp.waitForTimeout(700);
  await mp.screenshot({ path: path.join(OUT, 'm-01-before.png') });
  await mp.tap('#pStart');
  await mp.waitForTimeout(1300);
  const hard = await mp.evaluate(() => QRT.practice.current);
  ok('hard code is version 4 or more', hard.version >= 4, `v${hard.version}`);
  await mp.screenshot({ path: path.join(OUT, 'm-02-running.png') });
  await mp.evaluate(() => window.scrollBy(0, 420));
  await mp.waitForTimeout(300);
  const phone = await mp.evaluate(() => {
    const stage = document.querySelector('#practice .stage').getBoundingClientRect();
    const top = document.querySelector('.topbar').getBoundingClientRect();
    const input = document.getElementById('pText').getBoundingClientRect();
    const mini = document.getElementById('pTimerMini');
    const mr = mini.getBoundingClientRect();
    return { pinned: Math.abs(stage.top - top.bottom) <= 2, inputVisible: input.top >= 0 && input.bottom <= innerHeight, overflow: document.documentElement.scrollWidth > 391 || innerWidth > 391, miniVisible: mr.height > 0 && mr.top >= 0 && mr.bottom <= innerHeight, miniText: mini.innerText };
  });
  ok('phone: code pinned, answer box visible, no sideways scroll', phone.pinned && phone.inputVisible && !phone.overflow, JSON.stringify(phone));
  ok('phone: timer stays in view while scrolled', phone.miniVisible && phone.miniText !== '00:00', JSON.stringify(phone));
  await mp.screenshot({ path: path.join(OUT, 'm-03-scrolled.png') });
  await mp.goto(BASE);
  await mp.waitForTimeout(600);
  await mp.locator('#practiceGrid').scrollIntoViewIfNeeded();
  await mp.screenshot({ path: path.join(OUT, 'm-04-home-practice.png') });

  await browser.close();
  const failed = Object.entries(report.checks).filter(([, v]) => v !== true);
  console.log(JSON.stringify({ errors: report.errors, passed: Object.keys(report.checks).length - failed.length, failed }, null, 1));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
