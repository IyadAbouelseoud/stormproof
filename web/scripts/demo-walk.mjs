// Pitch demo gate (DEMO.md): performs the scripted demo click by click and checks the numbers on screen.
// Usage (cwd web/, after `pnpm build`, with `pnpm preview --port 4172`): node scripts/demo-walk.mjs [BASE]
// env: W, H (viewport), LANG=ar, SHOTS=1 (screenshots to qa/screens/demo-*.png), MODE=cadet (default engineer: the judges' demo)
import { chromium } from '@playwright/test';
const BASE = process.argv[2] ?? 'http://localhost:4172/';
const W = Number(process.env.W ?? 1440), H = Number(process.env.H ?? 900);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: W, height: H }, reducedMotion: process.env.RM === '1' ? 'reduce' : 'no-preference' });
const errs = [];
const bad = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
p.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && errs.push('EXTERNAL ' + r.url()));
const MODE = process.env.MODE ?? 'engineer';
await p.addInitScript((m) => { try { localStorage.setItem('sp-mode', m); } catch {} }, MODE);
const t0 = Date.now();
const lap = (name) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s  ${name}`);
const shot = async (name) => { if (process.env.SHOTS === '1') { await p.waitForTimeout(600); await p.screenshot({ path: `../qa/screens/demo-${W}-${name}.png` }); } };
const next = () => p.click('.nav-controls-bar .sp-btn-nav >> nth=1');
const expectText = async (sel, parts, where) => {
  const text = (await p.locator(sel).innerText()).replace(/\s+/g, ' ');
  for (const s of parts) if (!text.includes(s)) bad.push(`${where}: "${s}" not on screen`);
};
const flyToReport = async (tag) => {
  await p.waitForSelector('.screen--flight', { timeout: 20000 });
  let storms = 0;
  for (let i = 0; i < 80 && !(await p.locator('.reentry').count()); i++) {
    const storm = p.locator('.storm-card .sp-btn').first();
    if (await storm.count()) { storms++; await storm.click(); }
    await p.click('.flight-controls .sp-btn--quiet', { timeout: 1000 }).catch(() => {});
    await p.waitForTimeout(250);
  }
  lap(`${tag}: flight ended (storm votes asked: ${storms})`);
  await shot(`${tag}-flight`);
  await p.click('.reentry .sp-btn');
  await p.waitForSelector('.screen--report', { timeout: 15000 });
  await p.waitForTimeout(1800);
};

await p.goto(BASE);
await p.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 20000 });
lap('1 Brief ready');
await expectText('body', ['FACSAT-2 was designed for five years'], 'Brief');
await shot('1-brief');
await next();
await p.waitForSelector('.xd-spot');
await p.locator('.xd-spot[aria-label*="Pointing"]').click();
await p.locator('.pd-alt', { hasText: 'Precise Pointing' }).locator('.pd-choose').click();
await p.waitForTimeout(400);
await shot('2-build');
await p.keyboard.press('Escape');
lap('2 Build: Precise Pointing chosen in the detail panel');
await next();
const slider = p.locator('.screen--orbit input[type=range]');
await slider.focus();
await p.keyboard.press('ArrowLeft');
await p.keyboard.press('ArrowLeft');
await p.waitForTimeout(1200);
if ((await slider.inputValue()) !== '480') bad.push('Orbit: slider is ' + (await slider.inputValue()));
await expectText('.screen--orbit', ['1219', '833'], 'Orbit');
await shot('3-orbit');
lap('3 Orbit: 480 km');
await next();
await p.waitForSelector('.launch-btn:not([disabled])', { timeout: 15000 });
await shot('4-launch');
lap('4 Launch: checklist done, button unlocked');
await p.click('.launch-btn');
await flyToReport('fail');
await expectText('.screen--report', ['DIED', 'Aug 25, 2025', '386', '833', '1219', '78', '4 / 5', 'LIFETIME: MISSED', 'YW5nb2xhfmNhbWVyYS1zdGFuZGFyZH5wYW5lbHMtbGFyZ2V-YmF0dGVyeS1tZWRpdW1-cmFkaW8tZmFzdH5jb21wdXRlci1zdGFuZGFyZH5wb2ludGluZy1wcmVjaXNlfmZ1ZWwtc21hbGx-NlV-U340ODB-'], 'FAIL report');
await shot('5-fail-report');
lap('5 FAIL report');
await p.evaluate(() => window.scrollTo(0, 0));
await next();
await p.waitForSelector('.refly-tweak-btn');
await shot('6-refly-before');
await p.locator('.refly-tweak-btn', { hasText: 'FACSAT-2' }).click();
await flyToReport('fix');
await expectText('.screen--report', ['LIVED', 'Aug 29, 2026', '435', '1202', '1637', '95', '5 / 5', 'LIFETIME: MET', 'meets the FCC 5-year', 'U340OTd-'], 'FIX report');
await shot('7-fix-report');
lap('7 FIX report');
await p.evaluate(() => window.scrollTo(0, 0));
await next();
await p.waitForSelector('.screen--refly');
await p.waitForTimeout(1200);
await expectText('.screen--refly', ['480', '497'], 'Re-fly');
await shot('8-refly-side-by-side');
lap('8 Re-fly side by side');
console.log(`RESULT: ${bad.length} wrong numbers, ${errs.length} console/network problems`);
for (const x of [...bad, ...errs].slice(0, 12)) console.log('  ' + x);
await b.close();
process.exit(bad.length || errs.length ? 1 : 0);
