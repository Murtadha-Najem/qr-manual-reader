// Drives the real page in headless Edge: walks every step of every example through the UI,
// checks for broken text or blank canvases, and saves screenshots for review.
// Needs the local server on 127.0.0.1:8765. Run: node test/visual.js <output-dir>
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const OUT = process.argv[2] || path.join(__dirname, 'shots');
const BASE = 'http://127.0.0.1:8765/';
const FULL = new Set((process.env.FULL || 'hello').split(','));
const LANG = process.env.LANG_UI || 'en';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const report = { errors: [], problems: [], counts: {}, results: {} };
  const watch = (page) => {
    page.on('console', (m) => { if (m.type() === 'error') report.errors.push(m.text()); });
    page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  };

  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((l) => { try { localStorage.setItem('qrt-lang', l); } catch (e) {} }, LANG);
  const page = await ctx.newPage();
  watch(page);
  const shot = (name, p) => (p || page).screenshot({ path: path.join(OUT, name + '.png') });

  await page.goto(BASE);
  await page.waitForTimeout(900);
  await shot('00-home');

  const ids = await page.$$eval('.sample', (els) => els.map((e) => e.dataset.sample));
  for (const id of ids) {
    await page.goto(BASE);
    await page.waitForTimeout(250);
    await page.click(`.sample[data-sample="${id}"]`);
    await page.waitForSelector('#lesson:not([hidden])');
    const total = await page.$$eval('#jump option', (o) => o.length);
    report.counts[id] = total;
    let prevChapter = null;
    for (let i = 0; i < total; i++) {
      if (i > 0) await page.click('#nextBtn');
      const { chapter, title } = await page.evaluate(() => QRT.app.steps[QRT.app.i]);
      const interesting = /Interleaving|Putting the blocks|Error check|Version information|Reading the version|character set number|^Character 1|^Byte 1|^Character:|^Digits|new segment|rest of the segment|All the bytes|reading path|split into|Data or correction|التداخل|نعيد ترتيب|فحص الأخطاء|معلومات النسخة|قراءة رقم النسخة|رقم مجموعة|^الحرف 1|^البايت 1|^الحرف:|^الأرقام|جزء جديد|بقية الجزء|كل البايتات|مسار القراءة|الكود مقسوم|بيانات أم تصحيح/.test(title);
      const key = FULL.has(id) || chapter !== prevChapter || i === total - 1 || interesting;
      prevChapter = chapter;
      await page.waitForTimeout(key ? 700 : 40);
      const info = await page.evaluate(() => {
        const body = document.getElementById('stepBody').innerText;
        const title = document.getElementById('stepTitle').innerText;
        const cv = document.getElementById('grid');
        const data = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let dark = 0;
        for (let k = 0; k < data.length; k += 4 * 31) if (data[k] < 90) dark++;
        return { title, bad: /undefined|NaN|\[object|null/.test(body + title), empty: body.trim().length < 15, dark, scrollW: document.documentElement.scrollWidth, vw: innerWidth };
      });
      if (info.bad || info.empty || info.dark === 0 || info.scrollW > info.vw + 1) report.problems.push({ id, step: i + 1, ...info });
      if (key) await shot(`${id}-${String(i + 1).padStart(2, '0')}`);
    }
    report.results[id] = await page.evaluate((sid) => {
      const s = QRT.samples.list.find((x) => x.id === sid);
      const exp = QRT.samples.build(s).expected;
      return { ok: QRT.app.d.text === exp, got: QRT.app.d.text, errors: QRT.app.d.errorCount, v: QRT.app.d.version, ecl: QRT.app.d.format.ecl, mask: QRT.app.d.format.mask, resultBox: (document.querySelector('.result') || {}).innerText };
    }, id);
  }

  // Mask animation mid-flight and the "before" toggle.
  await page.goto(BASE + '#s=hello');
  await page.reload();
  await page.waitForSelector('#lesson:not([hidden])');
  const animIndex = await page.evaluate(() => QRT.app.steps.findIndex((s) => s.view.grid === 'maskAnim'));
  await page.selectOption('#jump', String(animIndex));
  await page.waitForTimeout(1250);
  await shot('anim-mid');
  await page.waitForTimeout(1500);
  await page.click('[data-tool="compare"] button[data-v="before"]');
  await page.waitForTimeout(200);
  await shot('anim-before');

  // Deep link reload lands on the same step.
  await page.goto(BASE + '#s=arabic&step=30');
  await page.reload();
  await page.waitForSelector('#lesson:not([hidden])');
  report.deepLink = await page.evaluate(() => QRT.app.i + 1);

  // Custom text: too long for version 1, then automatic version.
  await page.goto(BASE);
  await page.reload();
  await page.click('.tab[data-tab="custom"]');
  await page.fill('#cText', 'Hello, 世界 2026');
  await page.selectOption('#cVersion', '1');
  await page.click('#customForm button[type="submit"]');
  await page.waitForTimeout(300);
  report.customError = await page.$eval('#customError', (e) => (e.hidden ? null : e.innerText));
  await shot('custom-error');
  await page.selectOption('#cVersion', 'auto');
  await page.selectOption('#cEcl', 'H');
  await page.click('#customForm button[type="submit"]');
  await page.waitForSelector('#lesson:not([hidden])');
  report.custom = await page.evaluate(() => ({ text: QRT.app.d.text, v: QRT.app.d.version, ecl: QRT.app.d.format.ecl, hash: location.hash }));

  // Upload a real PNG file.
  const png = path.join(OUT, 'upload.png');
  await QRCode.toFile(png, 'Uploaded file test 123', { scale: 7, margin: 4, errorCorrectionLevel: 'Q' });
  await page.goto(BASE);
  await page.reload();
  await page.click('.tab[data-tab="image"]');
  await page.setInputFiles('#fileInput', png);
  await page.waitForSelector('#lesson:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(600);
  await shot('upload-01');
  report.upload = await page.evaluate(() => ({ text: QRT.app.d.text, errors: QRT.app.d.errorCount }));

  // A file with no code in it.
  const blank = path.join(OUT, 'blank.png');
  const bctx = await browser.newContext();
  const bpage = await bctx.newPage();
  await bpage.setContent('<div style="width:300px;height:300px;background:linear-gradient(#ccc,#888)"></div>');
  await (await bpage.$('div')).screenshot({ path: blank });
  await bctx.close();
  await page.goto(BASE);
  await page.reload();
  await page.click('.tab[data-tab="image"]');
  await page.setInputFiles('#fileInput', blank);
  await page.waitForTimeout(1200);
  report.noCode = await page.$eval('#imageError', (e) => (e.hidden ? null : e.innerText));

  // Mobile layout.
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mctx.addInitScript((l) => { try { localStorage.setItem('qrt-lang', l); } catch (e) {} }, LANG);
  const mpage = await mctx.newPage();
  watch(mpage);
  await mpage.goto(BASE);
  await mpage.waitForTimeout(700);
  await mpage.screenshot({ path: path.join(OUT, 'm-home.png') });
  for (const step of [1, 9, 13, 22, 26, 33]) {
    await mpage.goto(BASE + `#s=arabic&step=${step}`);
    await mpage.reload();
    await mpage.waitForSelector('#lesson:not([hidden])');
    await mpage.waitForTimeout(800);
    await mpage.screenshot({ path: path.join(OUT, `m-arabic-${step}.png`), fullPage: true });
    const sw = await mpage.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    if (sw[0] > sw[1] + 1) report.problems.push({ mobile: step, scrollWidth: sw });
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ errors: report.errors, problems: report.problems.slice(0, 20), counts: report.counts, results: Object.fromEntries(Object.entries(report.results).map(([k, v]) => [k, v.ok])), deepLink: report.deepLink, customError: report.customError, custom: report.custom, upload: report.upload, noCode: report.noCode }, null, 1));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
