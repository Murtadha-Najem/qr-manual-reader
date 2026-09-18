// Phone checks in headless Edge with touch emulation: the walkthrough grid stays pinned while
// the explanation scrolls, swiping the grid changes step, the bottom navigation stays in view,
// lessons put the explanation before the widget, and nothing overflows sideways.
// Needs the local server on 127.0.0.1:8765. Run: node test/phone.js <output-dir>
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const OUT = process.argv[2] || path.join(__dirname, 'phone-shots');
const BASE = 'http://127.0.0.1:8765/';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await browserLaunch();
  const report = { errors: [], problems: [], checks: {} };

  for (const [w, h, lang] of [[390, 844, 'en'], [360, 740, 'en'], [390, 844, 'ar']]) {
    const tag = `${w}-${lang}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript((l) => { try { localStorage.setItem('qrt-lang', l); } catch (e) { /* */ } }, lang);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => report.errors.push(`${tag}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') report.errors.push(`${tag}: ${m.text()}`); });
    const open = async (hash) => {
      await p.goto(BASE + hash);
      await p.reload();
      await p.waitForTimeout(900);
    };
    // Compare with the real phone width: in mobile emulation the layout viewport grows to fit
    // wide content, so innerWidth alone would hide an overflow.
    const overflow = () => p.evaluate((vw) => document.documentElement.scrollWidth > vw + 1 || innerWidth > vw + 1, w);

    // Home.
    await open('');
    await p.screenshot({ path: path.join(OUT, `${tag}-home.png`) });
    if (await overflow()) report.problems.push(`${tag} home overflows`);

    // Walkthrough: first screen, then scrolled down.
    for (const [name, hash] of [['r9', '#s=hello&step=9'], ['r27', '#s=hello&step=27'], ['rblocks', '#s=blocks&step=24'], ['rarabic', '#s=arabic&step=28']]) {
      await open(hash);
      await p.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) });
      const first = await p.evaluate(() => {
        const title = document.getElementById('stepTitle').getBoundingClientRect();
        const nav = document.querySelector('#lesson .nav').getBoundingClientRect();
        return { titleVisible: title.top >= 0 && title.bottom <= innerHeight, navBottom: nav.bottom, vh: innerHeight };
      });
      await p.evaluate(() => window.scrollBy(0, 500));
      await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(OUT, `${tag}-${name}-scrolled.png`) });
      const scrolled = await p.evaluate(() => {
        const stage = document.querySelector('#lesson .stage').getBoundingClientRect();
        const topbar = document.querySelector('.topbar').getBoundingClientRect();
        const nav = document.querySelector('#lesson .nav').getBoundingClientRect();
        return { stageTop: Math.round(stage.top), topbarBottom: Math.round(topbar.bottom), navBottom: Math.round(nav.bottom), vh: innerHeight, scrollY: Math.round(scrollY) };
      });
      const pinned = Math.abs(scrolled.stageTop - scrolled.topbarBottom) <= 2;
      const navInView = Math.abs(scrolled.navBottom - scrolled.vh) <= 2 && Math.abs(first.navBottom - first.vh) <= 2;
      report.checks[`${tag}-${name}`] = { titleOnFirstScreen: first.titleVisible, gridPinned: pinned, navInView };
      if (!first.titleVisible || !pinned || !navInView) report.problems.push({ tag, name, first, scrolled });
      if (await overflow()) report.problems.push(`${tag} ${name} overflows`);
    }

    // Swipe the grid: forward, then back.
    await open('#s=hello&step=5');
    const swipe = async (dir) => {
      await p.evaluate((d) => {
        const stage = document.querySelector('#lesson .stage');
        const r = stage.getBoundingClientRect();
        const y = r.top + r.height / 2;
        const x0 = r.left + r.width / 2 + (d === 'left' ? 80 : -80);
        const x1 = r.left + r.width / 2 + (d === 'left' ? -80 : 80);
        const touch = (x) => new Touch({ identifier: 1, target: stage, clientX: x, clientY: y });
        stage.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(x0)], changedTouches: [touch(x0)], bubbles: true }));
        stage.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(x1)], bubbles: true }));
      }, dir);
      await p.waitForTimeout(250);
      return p.evaluate(() => QRT.app.i + 1);
    };
    const rtl = lang === 'ar';
    const afterForward = await swipe(rtl ? 'right' : 'left');
    const afterBack = await swipe(rtl ? 'left' : 'right');
    report.checks[`${tag}-swipe`] = { start: 5, afterForward, afterBack };
    if (afterForward !== 6 || afterBack !== 5) report.problems.push({ tag, swipe: { afterForward, afterBack } });

    // Lessons: explanation, then widget, then task.
    for (const [name, hash] of [['bits', '#learn=bits&page=2'], ['anat', '#learn=anatomy&page=1'], ['fmt', '#learn=format&page=2'], ['dmg', '#learn=ecc&page=1'], ['mask', '#learn=mask&page=2'], ['zig', '#learn=order&page=1'], ['inter', '#learn=order&page=2']]) {
      await open(hash);
      await p.screenshot({ path: path.join(OUT, `${tag}-l-${name}.png`) });
      const order = await p.evaluate(() => {
        const body = document.getElementById('learnBody').getBoundingClientRect();
        const stage = document.getElementById('learnStage');
        const sr = stage.getBoundingClientRect();
        const extras = document.getElementById('learnExtras').getBoundingClientRect();
        return {
          inSlot: stage.parentElement.id === 'learnSlot',
          textFirst: body.top < sr.top,
          widgetBeforeTask: sr.bottom <= extras.top + 1,
          titleOnFirstScreen: document.getElementById('learnTitle').getBoundingClientRect().top < innerHeight,
          stageHasContent: stage.querySelector('.w-box') !== null,
        };
      });
      report.checks[`${tag}-l-${name}`] = order;
      if (!order.inSlot || !order.textFirst || !order.widgetBeforeTask || !order.titleOnFirstScreen || !order.stageHasContent) report.problems.push({ tag, name, order });
      if (await overflow()) report.problems.push(`${tag} lesson ${name} overflows`);
      if (name === 'fmt' || name === 'anat') await p.screenshot({ path: path.join(OUT, `${tag}-l-${name}-full.png`), fullPage: true });
    }

    // Small touch targets left in the walkthrough and a lesson.
    for (const hash of ['#s=hello&step=9', '#learn=mask&page=2']) {
      await open(hash);
      const small = await p.evaluate(() => [...document.querySelectorAll('.nav button, .nav select, .chapters button, .tab, .topbar button, .stage-tools .tool, .seg button, .q .opts button, .w-seg button, .w-part')]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 32; })
        .map((e) => `${e.className || e.tagName}:${Math.round(e.getBoundingClientRect().height)}`));
      report.checks[`${tag}-small ${hash}`] = small;
    }
    await ctx.close();
  }

  // Desktop is unchanged: the lesson widget stays in its own column.
  const dctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const d = await dctx.newPage();
  d.on('pageerror', (e) => report.errors.push(`desktop: ${e.message}`));
  await d.goto(BASE + '#learn=anatomy&page=1');
  await d.reload();
  await d.waitForTimeout(800);
  report.checks.desktopStageInColumn = await d.evaluate(() => document.getElementById('learnStage').parentElement.id === 'learnStageHome');
  await d.screenshot({ path: path.join(OUT, 'desktop-anat.png') });
  await d.goto(BASE + '#s=hello&step=9');
  await d.reload();
  await d.waitForTimeout(800);
  report.checks.desktopNavInPanel = await d.evaluate(() => getComputedStyle(document.querySelector('#lesson .nav')).position !== 'fixed');
  await d.screenshot({ path: path.join(OUT, 'desktop-r9.png') });
  await dctx.close();

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ errors: report.errors, problems: report.problems, swipe: Object.fromEntries(Object.entries(report.checks).filter(([k]) => k.includes('swipe'))), small: Object.fromEntries(Object.entries(report.checks).filter(([k]) => k.includes('small'))), desktop: [report.checks.desktopStageInColumn, report.checks.desktopNavInPanel] }, null, 1));

  function browserLaunch() {
    return chromium.launch({ executablePath: EDGE, headless: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
