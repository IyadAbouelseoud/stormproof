// Reduced-motion, focus-visible, RTL and comprehension checks. cwd web/. Usage: node ../qa/track2/conform.mjs [BASE]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(process.cwd() + '/');
const { chromium } = require('@playwright/test');
const BASE = process.argv[2] ?? 'http://localhost:4172/';
const RES = path.resolve(process.cwd(), '../qa/track2/results');
const res = { motion: [], focus: [], rtl: [], comprehension: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome' });

const MOTION_JS = () =>
  document
    .getAnimations()
    .filter((a) => a.playState === 'running')
    .map((a) => {
      const kfs = a.effect?.getKeyframes?.() ?? [];
      const props = new Set(kfs.flatMap((k) => Object.keys(k)).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)));
      const t = a.effect?.getTiming?.() ?? {};
      return { target: (a.effect?.target?.className?.baseVal ?? a.effect?.target?.className ?? a.effect?.target?.tagName ?? '').toString().slice(0, 50), name: a.animationName ?? a.transitionProperty ?? '', props: [...props].join(','), dur: t.duration, iter: t.iterations };
    })
    .filter((m) => /transform|translate|scale|rotate/.test(m.props));

const FOCUS_JS = () => {
  const bad = [];
  const els = [...document.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex="0"], summary')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  return { total: els.length, els: els.map((e) => e.tagName.toLowerCase() + '.' + (e.className?.toString?.() ?? '').split(' ').slice(0, 2).join('.')) };
};

async function stage(page, tag, name) {
  const m = await page.evaluate(MOTION_JS);
  if (m.length) res.motion.push({ tag, name, running: m });
  // focus check: tab through up to 25 controls, record those w/o visible indicator
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  const seen = new Set();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      const ow = parseFloat(cs.outlineWidth) || 0;
      const ind = (cs.outlineStyle !== 'none' && ow > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
      return { id: e.tagName.toLowerCase() + '.' + (e.className?.toString?.() ?? '').split(' ').slice(0, 2).join('.'), ind, outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, shadow: cs.boxShadow.slice(0, 40) };
    });
    if (!info) continue;
    if (seen.has(info.id)) continue;
    seen.add(info.id);
    if (!info.ind) res.focus.push({ tag, name, ...info });
  }
}

for (const lang of ['en', 'ar']) {
  const tag = `1440-${lang}-rm`;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => res.errors.push(`${tag} ${e.message}`));
  await page.goto(BASE);
  await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 20000 });
  if (lang === 'ar') await page.click('.lang-toggle-btn');
  await page.waitForTimeout(1500);
  // comprehension (en only meaningful, but record both)
  const c = await page.evaluate(() => {
    const s = document.querySelector('.sp-sunstripe, [class*="sunstripe" i] svg, .brief-sunstripe-box');
    const r = s?.getBoundingClientRect();
    const hdr = document.querySelector('header, .app-header, .mission-header');
    return { stripeFound: !!s, stripeBottom: r?.bottom ?? null, stripeTop: r?.top ?? null, firstLine: (hdr?.innerText ?? document.body.innerText).split('\n').slice(0, 4).join(' | ').slice(0, 200), dir: document.documentElement.dir, lang: document.documentElement.lang };
  });
  res.comprehension.push({ lang, ...c });
  await stage(page, tag, 'brief');
  const next = () => page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
  // RTL arrow check: nav buttons text + computed direction + sample logical layout
  res.rtl.push({ lang, navText: await page.locator('.nav-controls-bar .sp-btn-nav').allInnerTexts(), startArrow: await page.locator('.brief-start-arrow').innerText().catch(() => null), railDir: await page.evaluate(() => getComputedStyle(document.querySelector('.cml-rail-list')).direction) });
  await next(); await page.waitForTimeout(1200); await stage(page, tag, 'build');
  await next(); await page.waitForTimeout(1800); await stage(page, tag, 'orbit');
  await next(); await page.waitForSelector('.launch-btn:not([disabled])'); await page.waitForTimeout(600); await stage(page, tag, 'launch');
  await page.click('.launch-btn');
  await page.waitForSelector('.screen--flight'); await page.waitForTimeout(1500); await stage(page, tag, 'flight');
  await page.locator('.flight-controls .sp-btn--quiet').click();
  await page.waitForSelector('.reentry'); await page.waitForTimeout(1500); await stage(page, tag, 'reentry');
  await page.click('.reentry .sp-btn');
  await page.waitForSelector('.screen--report'); await page.waitForTimeout(2500); await stage(page, tag, 'report');
  res.rtl.push({ lang, screen: 'report', chain: await page.evaluate(() => [...document.querySelectorAll('.sp-cause')].slice(0, 2).map((e) => e.getBoundingClientRect().left)), dir: await page.evaluate(() => getComputedStyle(document.querySelector('.sp-cause') ?? document.body).direction) });
  await page.click('.report-nav-actions .sp-btn >> nth=1');
  await page.waitForSelector('.screen--refly'); await page.waitForTimeout(1000); await stage(page, tag, 'refly');
  await ctx.close();
}
// comprehension at 1440 default motion, en, night
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForFunction(() => !document.querySelector('.engine-status'));
  await page.waitForTimeout(2000);
  res.comprehension.push({ lang: 'en-default-motion', ...(await page.evaluate(() => { const r = document.querySelector('.brief-sunstripe-box')?.getBoundingClientRect(); return { stripeTop: r?.top, stripeBottom: r?.bottom, h: innerHeight }; })) });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(RES, 'conform.json'), JSON.stringify(res, null, 1));
console.log('motion offenders', res.motion.length, 'focus without indicator', res.focus.length, 'errors', res.errors.length);
console.log(JSON.stringify(res.comprehension));
