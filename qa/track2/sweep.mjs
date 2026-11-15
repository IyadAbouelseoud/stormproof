// Axe + overflow + AR text + screenshots sweep. cwd web/. Usage: node ../qa/track2/sweep.mjs [BASE]
// env: ONLY="390-ar-paper" restricts combos; RESFILE=name.json; MODE=cadet|engineer (prompt H; default cadet)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(process.cwd() + '/');
const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const BASE = process.argv[2] ?? 'http://localhost:4172/';
const OUT = path.resolve(process.cwd(), '../qa/screens');
const RES = path.resolve(process.cwd(), '../qa/track2/results');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RES, { recursive: true });
const report = { axe: [], overflow: [], dials: [], errors: [], arText: {}, misc: [] };

const OVERFLOW_JS = () => {
  const out = [];
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const sel = (e) =>
    e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
    if (!vis(e)) continue;
    const cs = getComputedStyle(e);
    if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0) {
      const scrollable = cs.overflowX === 'auto' || cs.overflowX === 'scroll';
      const clips = cs.overflowX !== 'visible';
      out.push({ kind: scrollable ? 'scrollable' : clips ? 'CLIPPED' : 'overflow-visible', sel: sel(e), sw: e.scrollWidth, cw: e.clientWidth, text: (e.textContent || '').trim().slice(0, 40) });
    } else if (e.scrollHeight > e.clientHeight + 2 && cs.overflowY === 'hidden' && e.clientHeight > 0) {
      out.push({ kind: 'CLIPPED-Y', sel: sel(e), sh: e.scrollHeight, ch: e.clientHeight, text: (e.textContent || '').trim().slice(0, 40) });
    }
  }
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) out.push({ kind: 'PAGE-HSCROLL', sw: de.scrollWidth, cw: de.clientWidth });
  const dials = [];
  for (const d of document.querySelectorAll('.sp-dial-container')) {
    const dr = d.getBoundingClientRect();
    for (const el of d.querySelectorAll('.sp-dial-num, .sp-dial-unit')) {
      const r = el.getBoundingClientRect();
      dials.push({ cls: el.className, text: el.textContent, sw: el.scrollWidth, cw: el.clientWidth, inside: r.left >= dr.left - 1 && r.right <= dr.right + 1 && r.top >= dr.top - 1 && r.bottom <= dr.bottom + 1 });
    }
  }
  const inView = (e) => {
    const r = e.getBoundingClientRect();
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (o.overflowY !== 'visible' || o.overflowX !== 'visible') {
        const pr = p.getBoundingClientRect();
        if (r.bottom <= pr.top + 1 || r.top >= pr.bottom - 1 || r.right <= pr.left + 1 || r.left >= pr.right - 1) return false;
      }
    }
    return true;
  };
  const leaves = [...document.querySelectorAll('body *')].filter((e) => vis(e) && !e.closest('svg') && !e.closest('.odometer, [class*="odometer"]') && e.children.length === 0 && /\d/.test(e.textContent || '') && inView(e));
  const rects = leaves.map((e) => [e, e.getBoundingClientRect()]);
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const [a, ra] = rects[i];
      const [b, rb] = rects[j];
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w > 2 && h > 2 && w * h > 0.25 * Math.min(ra.width * ra.height, rb.width * rb.height))
        out.push({ kind: 'NUM-OVERLAP', a: sel(a) + ':' + a.textContent.trim().slice(0, 15), b: sel(b) + ':' + b.textContent.trim().slice(0, 15) });
    }
  return { out, dials };
};

async function inspect(page, tag, name) {
  const key = `${tag}-${name}`;
  await page.screenshot({ path: path.join(OUT, `t2-${key}.png`), fullPage: false });
  try {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
    for (const v of r.violations)
      report.axe.push({ key, id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n')[1]) });
  } catch (e) {
    report.misc.push(`${key} axe failed ${e.message}`);
  }
  const { out, dials } = await page.evaluate(OVERFLOW_JS);
  for (const o of out) report.overflow.push({ key, ...o });
  for (const d of dials) report.dials.push({ key, ...d });
  if (tag.includes('-ar-') && tag.endsWith('night')) report.arText[key] = await page.evaluate(() => document.body.innerText);
}

const combos = [];
for (const vp of [[390, 844], [1440, 900]]) for (const lang of ['en', 'ar']) for (const theme of ['night', 'paper']) combos.push({ vp, lang, theme });
const browser = await chromium.launch({ channel: 'chrome' });
for (const scen of ['angola', 'jeddah'])
  for (const { vp, lang, theme } of combos) {
    const tag = `${scen}-${vp[0]}-${lang}-${theme}`;
    if (process.env.ONLY && !tag.includes(process.env.ONLY)) continue;
    console.log('==', tag);
    const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] } });
    const page = await ctx.newPage();
    await page.addInitScript((m) => { try { localStorage.setItem('sp-mode', m); } catch {} }, process.env.MODE ?? 'cadet');
    page.on('console', (m) => m.type() === 'error' && report.errors.push(`${tag} console: ${m.text()}`));
    page.on('pageerror', (e) => report.errors.push(`${tag} pageerror: ${e.message}`));
    page.on('crash', () => report.errors.push(`${tag} CRASH`));
    try {
      await page.goto(BASE);
      await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 20000 });
      if (lang === 'ar') await page.click('.lang-toggle-btn');
      if (theme === 'paper') await page.click('.theme-toggle-btn');
      await page.waitForTimeout(500);
      const I = (n) => inspect(page, tag, n);
      if (scen === 'jeddah') {
        await I('brief-picker');
        await page.locator('.jd-card').nth(1).click();
        await page.waitForSelector('.jd-event');
        await page.waitForTimeout(400);
        await I('brief');
      } else {
        await page.waitForTimeout(1500);
        await I('brief');
        if (vp[0] === 1440 && lang === 'en' && theme === 'night') {
          const m = await page.evaluate(() => {
            const s = document.querySelector('[class*="sunstripe" i], [class*="sun-stripe" i]');
            const r = s?.getBoundingClientRect();
            return { found: !!s, cls: s?.className, bottom: r?.bottom, h1: document.querySelector('h1')?.textContent, ps: [...document.querySelectorAll('.screen p')].slice(0, 3).map((p) => p.textContent) };
          });
          report.misc.push('comprehension ' + JSON.stringify(m));
        }
      }
      const next = () => page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
      await next(); await page.waitForTimeout(500); await I('build');
      const chipBad = page.locator('.tracker-chip--fail').first();
      if (await chipBad.count()) { await chipBad.click(); await page.waitForTimeout(300); await I('build-tracker-hint'); await page.keyboard.press('Escape'); }
      await page.locator('.xd-spot[data-slot="camera"]').first().click(); await page.waitForTimeout(400); await I('build-bay');
      await page.locator('.bench-inspect').first().click(); await page.waitForTimeout(1200); await I('build-partlab');
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      await next(); await page.waitForTimeout(1500); await I('orbit');
      await next();
      await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 15000 });
      await page.waitForTimeout(400);
      await I('launch');
      await page.click('.launch-btn');
      await page.waitForSelector('.screen--flight', { timeout: 15000 });
      await page.waitForTimeout(1000);
      await I('flight-start');
      await page.locator('.flight-controls .btn-row .sp-btn').nth(2).click();
      await page.locator('.flight-controls > .sp-btn').first().click();
      let stormSeen = false;
      const dl = Date.now() + 25000;
      while (Date.now() < dl) {
        if (await page.locator('.storm-card').count()) {
          stormSeen = true;
          await page.waitForTimeout(700);
          await I('flight-storm');
          await page.locator('.storm-card .sp-btn').first().click();
          break;
        }
        if (await page.locator('.reentry').count()) break;
        await page.waitForTimeout(150);
      }
      if (!stormSeen) report.misc.push(`${tag} storm card not reached within 25s`);
      await page.waitForTimeout(400);
      await I('flight-mid');
      for (let i = 0; i < 40 && !(await page.locator('.reentry').count()); i++) {
        const storm = page.locator('.storm-card .sp-btn').first();
        if (await storm.count()) await storm.click().catch(() => {});
        await page.locator('.flight-controls .sp-btn--quiet').click({ timeout: 800 }).catch(() => {});
        await page.waitForTimeout(250);
      }
      await page.waitForTimeout(800);
      await I('flight-reentry');
      await page.click('.reentry .sp-btn');
      await page.waitForSelector('.screen--report');
      await page.waitForTimeout(2500);
      await I('report');
      if (scen === 'angola') {
        await page.click('.report-nav-actions .sp-btn >> nth=1');
        await page.waitForSelector('.screen--refly');
        await page.waitForTimeout(800);
        await I('refly');
      }
    } catch (e) {
      report.errors.push(`${tag} walk: ${e.message.split('\n')[0]}`);
      try { await page.screenshot({ path: path.join(OUT, `t2-${tag}-FAILED.png`) }); } catch {}
    }
    await ctx.close();
  }
await browser.close();
fs.writeFileSync(path.join(RES, process.env.RESFILE ?? 'sweep.json'), JSON.stringify(report, null, 1));
const ser = report.axe.filter((a) => a.impact === 'serious' || a.impact === 'critical');
console.log('axe total', report.axe.length, 'serious+critical', ser.length, 'errors', report.errors.length, 'overflow', report.overflow.length);
