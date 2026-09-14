// Walks every fundamentals lesson in headless Edge through the real interface: performs each
// page's task, answers each quiz (a wrong answer first, then the right one), checks progress,
// the reader-to-lesson-and-back flow, and saves screenshots.
// Needs the local server on 127.0.0.1:8765. Run: node test/lessons-visual.js <output-dir>
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const OUT = process.argv[2] || path.join(__dirname, 'lesson-shots');
const BASE = 'http://127.0.0.1:8765/';
const LANG = process.env.LANG_UI || 'en';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const report = { errors: [], problems: [], tasks: {}, quizzes: {} };
  const watch = (pg) => {
    pg.on('console', (m) => { if (m.type() === 'error') report.errors.push(m.text()); });
    pg.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  };
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript((l) => { try { localStorage.setItem('qrt-lang', l); } catch (e) {} }, LANG);
  const page = await ctx.newPage();
  watch(page);
  const shot = (name, pg, full) => (pg || page).screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!full });

  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(700);
  await shot('00-home-start');

  const lessons = await page.evaluate(() => QRT.lessons.get(QRT.i18n.lang).map((l) => ({ id: l.id, pages: l.pages.map((p) => ({ widget: p.widget, task: !!p.task, quiz: (p.quiz || []).map((q) => ({ answer: q.answer, n: q.options.length })) })) })));
  await page.click('#continueBtn');
  await page.waitForSelector('#learn:not([hidden])');

  for (let li = 0; li < lessons.length; li++) {
    const L = lessons[li];
    for (let pi = 0; pi < L.pages.length; pi++) {
      const P = L.pages[pi];
      const tag = `L${String(li + 1).padStart(2, '0')}-${L.id}-p${pi + 1}`;
      await page.waitForTimeout(450);
      const where = await page.evaluate(() => QRT.app.learn);
      if (!where || where.id !== L.id || where.page !== pi) report.problems.push({ tag, where });
      const info = await page.evaluate(() => ({
        title: document.getElementById('learnTitle').innerText,
        body: document.getElementById('learnBody').innerText,
        stage: document.getElementById('learnStage').children.length,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }));
      if (!info.title || info.body.length < 40 || !info.stage || info.overflow || /undefined|NaN|\[object/.test(info.body)) {
        report.problems.push({ tag, info: { title: info.title, len: info.body.length, stage: info.stage, overflow: info.overflow } });
      }
      await shot(tag);

      const w = P.widget;
      const stage = '#learnStage';
      if (P.task) {
        if (w.type === 'bits') {
          const diff = (w.start || 0) ^ w.target;
          for (let i = 0; i < 8; i++) if ((diff >> (7 - i)) & 1) await page.click(`${stage} .w-mod[data-i="${i}"]`);
        } else if (w.type === 'xor') {
          for (let i = 0; i < w.a.length; i++) if (Number(w.a[i]) ^ Number(w.b[i])) await page.click(`${stage} [data-row="g"][data-i="${i}"]`);
        } else if (w.type === 'coords') {
          const box = await page.evaluate(([r, c]) => {
            const cv = document.querySelector('#learnStage canvas');
            const g = cv._geo;
            const rect = cv.getBoundingClientRect();
            return { x: rect.left + g.ox + (c + 0.5) * g.s, y: rect.top + g.oy + (r + 0.5) * g.s };
          }, w.target);
          await page.mouse.click(box.x, box.y);
        } else if (w.type === 'anatomy') {
          await page.click(`${stage} [data-v="7"]`);
          await page.waitForTimeout(150);
          await page.click(`${stage} [data-part="${w.targetPart}"]`);
        } else if (w.type === 'versions') {
          await page.$eval(`${stage} input[type=range]`, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, w.targetVersion);
        } else if (w.type === 'damage') {
          for (let k = 0; k < 60; k++) {
            if (await page.$(`${stage} canvas[data-readable="0"]`)) break;
            await page.click(`${stage} [data-a="blob"]`);
          }
        } else if (w.type === 'format') {
          await page.click(`${stage} [data-ecl="M"]`);
          await page.click(`${stage} [data-mask="0"]`);
          await page.check(`${stage} [data-a="raw"]`);
        } else if (w.type === 'mask') {
          const best = await page.$$eval(`${stage} [data-pen]`, (els) => { const pens = els.map((e) => Number(e.dataset.pen)); return pens.indexOf(Math.min(...pens)); });
          await page.click(`${stage} [data-k="${best === 0 ? 1 : 0}"]`);
          await page.click(`${stage} [data-k="${best}"]`);
        } else if (w.type === 'modes') {
          await page.fill(`${stage} input`, 'QR CODE 7');
        } else if (w.type === 'zigzag') {
          for (let k = 0; k < 3; k++) await page.click(`${stage} [data-a="next"]`);
        } else if (w.type === 'interleave') {
          const order = (await page.$eval(`${stage} [data-order]`, (e) => e.dataset.order)).split(',');
          await page.click(`${stage} .w-src [data-id="${order[1]}"]`);
          report.tasks[`${tag}-wrong-feedback`] = await page.$eval(`${stage} .w-msg`, (e) => e.innerText);
          for (const id of order) await page.click(`${stage} .w-src [data-id="${id}"]`);
        }
        await page.waitForTimeout(250);
        report.tasks[tag] = !!(await page.$('#taskBox.solved'));
      }

      for (let qi = 0; qi < P.quiz.length; qi++) {
        const q = P.quiz[qi];
        const wrong = q.answer === 0 ? 1 : 0;
        await page.click(`#learnExtras .q[data-qi="${qi}"] button[data-oi="${wrong}"]`);
        const wrongShown = await page.$eval(`#learnExtras .q[data-qi="${qi}"] .explain`, (e) => (e.querySelector('.bad') ? 'bad' : ''));
        await page.click(`#learnExtras .q[data-qi="${qi}"] button[data-oi="${q.answer}"]`);
        const rightShown = await page.$eval(`#learnExtras .q[data-qi="${qi}"] .explain`, (e) => (e.querySelector('.good') ? 'good' : ''));
        report.quizzes[`${tag}-q${qi + 1}`] = wrongShown === 'bad' && rightShown === 'good';
      }
      if (P.task || P.quiz.length) await shot(tag + '-done');

      const lastOverall = li === lessons.length - 1 && pi === L.pages.length - 1;
      if (!lastOverall) await page.click('#learnNext');
    }
  }

  report.progress = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('qrt-progress') || '{}')).length);
  await page.click('#homeBtn');
  await page.waitForTimeout(500);
  report.homeProgress = await page.$eval('#progressText', (e) => e.innerText);
  await shot('99-home-done', null, true);

  // From a reader step, open a concept link, then come back to the same step.
  await page.goto(BASE + '#s=hello&step=9');
  await page.reload();
  await page.waitForSelector('#lesson:not([hidden])');
  const link = await page.$eval('#stepBody a.concept', (a) => a.getAttribute('href'));
  await page.click('#stepBody a.concept');
  await page.waitForSelector('#learn:not([hidden])');
  await page.waitForTimeout(400);
  const returnVisible = await page.$eval('#learnReturn', (e) => !e.hidden);
  await shot('flow-concept-from-reader');
  await page.click('#learnReturn');
  await page.waitForSelector('#lesson:not([hidden])');
  await page.waitForTimeout(300);
  report.returnFlow = { link, returnVisible, backAtStep: await page.evaluate(() => QRT.app.i + 1) };

  // Deep link straight to a lesson page, and the notice for a learner who has not finished.
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '#learn=format&page=2');
  await page.reload();
  await page.waitForSelector('#learn:not([hidden])');
  report.deepLink = await page.evaluate(() => QRT.app.learn);
  await page.goto(BASE + '#s=hello&step=1');
  await page.reload();
  await page.waitForSelector('#lesson:not([hidden])');
  report.noticeShown = await page.$eval('#readerNotice', (e) => !e.hidden);

  // Mobile.
  // Switching language keeps the place: in a lesson, and in the walkthrough.
  await page.goto(BASE + '#learn=mask&page=2');
  await page.reload();
  await page.waitForSelector('#learn:not([hidden])');
  const before = await page.evaluate(() => ({ lang: QRT.i18n.lang, title: document.getElementById('learnTitle').innerText, dir: document.documentElement.dir }));
  await page.click('#langBtn');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ lang: QRT.i18n.lang, title: document.getElementById('learnTitle').innerText, dir: document.documentElement.dir, page: QRT.app.learn }));
  await shot('lang-switched-lesson');
  await ctx.clearCookies();
  const page2 = await ctx.newPage();
  watch(page2);
  await page2.goto(BASE + '#s=hello&step=12');
  await page2.waitForSelector('#lesson:not([hidden])');
  await page2.click('#langBtn');
  await page2.waitForTimeout(500);
  const readerAfter = await page2.evaluate(() => ({ lang: QRT.i18n.lang, step: QRT.app.i + 1, title: document.getElementById('stepTitle').innerText, dir: document.documentElement.dir }));
  await shot('lang-switched-reader', page2);
  report.langSwitch = { before, after, readerAfter };

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mctx.addInitScript((l) => { try { localStorage.setItem('qrt-lang', l); } catch (e) {} }, LANG);
  const m = await mctx.newPage();
  watch(m);
  for (const [id, pg] of [['bits', 2], ['xor', 2], ['anatomy', 1], ['format', 2], ['mask', 2], ['ecc', 1], ['modes', 2], ['order', 2]]) {
    await m.goto(BASE + `#learn=${id}&page=${pg}`);
    await m.reload();
    await m.waitForSelector('#learn:not([hidden])');
    await m.waitForTimeout(600);
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow) report.problems.push({ mobile: `${id}/${pg}`, overflow });
    await m.screenshot({ path: path.join(OUT, `m-${id}-${pg}.png`), fullPage: true });
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  const failedTasks = Object.entries(report.tasks).filter(([k, v]) => v === false).map(([k]) => k);
  const failedQuiz = Object.entries(report.quizzes).filter(([, v]) => !v).map(([k]) => k);
  console.log(JSON.stringify({ errors: report.errors, problems: report.problems, tasks: Object.keys(report.tasks).length, failedTasks, interleaveWrong: Object.entries(report.tasks).find(([k]) => k.includes('wrong')), quizzes: Object.keys(report.quizzes).length, failedQuiz, progress: report.progress, homeProgress: report.homeProgress, returnFlow: report.returnFlow, deepLink: report.deepLink, noticeShown: report.noticeShown, langSwitch: report.langSwitch }, null, 1));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
