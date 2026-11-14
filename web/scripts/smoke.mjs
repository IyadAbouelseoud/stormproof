// Smoke walk: build output served by `vite preview`, all 7 screens + gallery, 390 and 1440 px, EN and AR.
// Collects console errors, failed and external requests, horizontal overflow; screenshots to qa/screens/.
// Usage: pnpm build && node scripts/smoke.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../qa/screens');
fs.mkdirSync(out, { recursive: true });
const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;

const server = spawn(process.execPath, [path.resolve(here, '../node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: path.resolve(here, '..'),
  stdio: 'pipe',
});
await new Promise((res, rej) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && res());
  server.on('exit', (c) => rej(new Error(`preview exited ${c}`)));
  setTimeout(() => rej(new Error('preview timeout')), 15000);
});

const problems = [];
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-precise-memory-info'] });
try {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    for (const lang of ['en', 'ar']) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: process.env.RM === '1' ? 'reduce' : 'no-preference' });
      const tag = `${w}-${lang}`;
      page.on('console', (m) => m.type() === 'error' && problems.push(`${tag} console: ${m.text()}`));
      page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
      page.on('requestfailed', (r) => problems.push(`${tag} requestfailed: ${r.url()}`));
      page.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && problems.push(`${tag} EXTERNAL: ${r.url()}`));
      const t0 = Date.now();
      await page.goto(BASE);
      await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 15000 });
      const loadMs = Date.now() - t0;
      console.log(`${tag}: engine ready in ${loadMs} ms`);
      if (lang === 'ar') await page.click('.lang-toggle-btn');
      const shot = async (name) => {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 1) problems.push(`${tag} ${name}: horizontal overflow ${overflow}px`);
        if (process.env.HEAP) console.log(tag, name, Math.round(await page.evaluate(() => performance.memory.usedJSHeapSize / 1e6)), 'MB');
        await page.screenshot({ path: path.join(out, `${tag}-${name}.png`), fullPage: process.env.FULL === '1' });
      };
      for (const name of ['brief', 'build', 'orbit', 'launch']) {
        if (name === 'orbit') await page.waitForSelector('.alt-legend-drag:not(:has-text("…"))', { timeout: 15000 }).catch(() => {});
        if (name === 'orbit') await page.waitForTimeout(1500);
        if (name === 'build') {
          // change one part to exercise the trail
          await page.locator('.part-group').first().locator('.sp-part').nth(1).click();
          await page.waitForTimeout(800);
        }
        await shot(name);
        if (name !== 'launch') await page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
      }
      await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 10000 });
      await page.click('.launch-btn');
      await page.waitForSelector('.screen--flight');
      const theme = await page.evaluate(() => document.documentElement.dataset.theme);
      if (theme !== 'night') problems.push(`${tag} flight theme is ${theme}`);
      await page.click('.flight-controls .sp-btn >> nth=0'); // play
      for (let k = 0; k < 6; k++) {
        await page.waitForTimeout(200);
        if (process.env.HEAP) console.log(tag, 'play heap', Math.round(await page.evaluate(() => performance.memory.usedJSHeapSize / 1e6)), 'MB', await page.locator('.flight-clock').innerText());
      }
      let tookStormShot = false;
      for (let i = 0; i < 40; i++) {
        const storm = page.locator('.storm-card .sp-btn').first();
        if (await storm.count()) {
          if (!tookStormShot) {
            await shot('flight-storm');
            tookStormShot = true;
          }
          await storm.click();
        }
        if (await page.locator('.reentry').count()) break;
        await page.click('.flight-controls .sp-btn--quiet', { timeout: 1000 }).catch(() => {}); // skip to end
        await page.waitForTimeout(300);
      }
      if (await page.locator('.reentry').count()) {
        await shot('reentry');
      }
      await shot('flight');
      await page.click('.reentry .sp-btn');
      await page.waitForSelector('.screen--report');
      await page.waitForTimeout(800);
      await shot('report');
      await shot('verdict');
      await page.click('.screen--report .btn-row .sp-btn >> nth=0'); // change one thing -> Build
      await page.locator('.sp-btn:has-text("3U"), .sp-btn:has-text("6U")').first().click();
      await page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
      await page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
      await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 10000 });
      await page.click('.launch-btn');
      await page.click('.flight-controls .sp-btn--quiet', { timeout: 1000 }).catch(() => {});
      for (let i = 0; i < 10 && !(await page.locator('.reentry').count()); i++) {
        const storm = page.locator('.storm-card .sp-btn').first();
        if (await storm.count()) await storm.click();
        await page.click('.flight-controls .sp-btn--quiet', { timeout: 1000 }).catch(() => {});
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.click('.nav-controls-bar .sp-btn-nav >> nth=1').catch(() => {});
      await page.click('.nav-controls-bar .sp-btn-nav >> nth=1').catch(() => {});
      await page.waitForSelector('.screen--refly');
      await shot('refly');
      await page.goto(`${BASE}#gallery`);
      await page.waitForTimeout(500);
      if (lang === 'ar') await page.click('.lang-toggle-btn');
      await shot('gallery');
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(problems.length ? `PROBLEMS (${problems.length}):\n` + [...new Set(problems)].join('\n') : 'SMOKE OK: no console errors, no external requests, no overflow');
process.exit(problems.length ? 1 : 0);
