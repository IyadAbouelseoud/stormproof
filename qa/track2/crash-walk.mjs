// Usage (cwd web/): node ../qa/track2/crash-walk.mjs [N=20] [BASE=http://localhost:4172/] ; env HEADED=1, CHANNEL=chrome
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/');
const { chromium } = require('@playwright/test');
const N = Number(process.argv[2] ?? 20);
const BASE = process.argv[3] ?? 'http://localhost:4172/';
const combos = [];
for (const vp of [[1440, 900], [390, 844]]) for (const lang of ['en', 'ar']) combos.push({ vp, lang });
let pass = 0; const fails = [];
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? 'chrome', headless: process.env.HEADED !== '1' });
for (let i = 0; i < N; i++) {
  const { vp, lang } = combos[i % 4];
  const jeddah = i % 5 === 4;
  const tag = `#${i + 1} ${vp[0]}x${vp[1]} ${lang}${jeddah ? ' jeddah' : ''}`;
  const errs = [];
  const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] }, reducedMotion: 'no-preference' });
  page.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text()));
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('crash', () => errs.push('PAGE CRASH'));
  page.on('close', () => {});
  const t0 = Date.now();
  try {
    await page.goto(BASE);
    await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 20000 });
    if (lang === 'ar') await page.click('.lang-toggle-btn');
    if (jeddah) { await page.locator('.jd-card').nth(1).click(); await page.waitForSelector('.jd-event'); }
    const next = () => page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
    await next(); await page.waitForTimeout(300);          // Build
    await next(); await page.waitForTimeout(1200);         // Orbit
    await next();                                          // Launch
    await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 15000 });
    await page.click('.launch-btn');
    await page.waitForSelector('.screen--flight', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.locator('.flight-controls .btn-row .sp-btn').nth(2).click(); // 16x
    await page.locator('.flight-controls > .sp-btn').first().click();       // play
    const deadline = Date.now() + 150000;
    while (Date.now() < deadline && !(await page.locator('.reentry').count())) {
      if (await page.locator('.storm-card').count()) {
        for (let k = 0; k < 3 && (await page.locator('.storm-card').count()); k++) { await page.locator('.storm-card .sp-btn').first().click().catch(() => {}); await page.waitForTimeout(300); }
      }
      const h1 = await page.locator('.flight-hud-readout').innerText().catch(() => '');
      await page.waitForTimeout(400);
      const h2 = await page.locator('.flight-hud-readout').innerText().catch(() => '');
      if (h1 === h2 && !(await page.locator('.reentry').count()) && !(await page.locator('.storm-card').count())) await page.locator('.flight-controls > .sp-btn').first().click().catch(() => {});
      await page.waitForTimeout(250);
      if (page.isClosed()) throw new Error('page closed');
    }
    if (!(await page.locator('.reentry').count())) throw new Error('never reached reentry panel');
    await page.waitForTimeout(500);
    await page.click('.reentry .sp-btn');
    await page.waitForSelector('.screen--report', { timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.click('.report-nav-actions .sp-btn >> nth=1'); // Refly
    await page.waitForSelector('.screen--refly', { timeout: 10000 });
    await page.waitForTimeout(600);
  } catch (e) { errs.push('walk: ' + e.message.split('\n')[0]); }
  if (errs.length) { fails.push(tag + ' :: ' + errs.join(' | ')); console.log('FAIL', tag, errs.join(' | ')); }
  else { pass++; console.log('PASS', tag, ((Date.now() - t0) / 1000).toFixed(1) + 's'); }
  await page.close().catch(() => {});
}
await browser.close();
console.log(`RESULT ${pass}/${N} clean${process.env.HEADED === '1' ? ' (headed)' : ''}`);
if (fails.length) console.log(fails.join('\n'));
process.exit(fails.length ? 1 : 0);
