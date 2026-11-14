// Prompt E gate: pick Jeddah, build, simulate, open Report, see the event verdict, in EN and AR, 390 and 1440 px.
// Same checks as smoke.mjs (console errors, failed/external requests, horizontal overflow). Screenshots to qa/screens/.
// Usage: pnpm build && node scripts/smoke-jeddah.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../qa/screens');
fs.mkdirSync(out, { recursive: true });
const PORT = 4181;
const BASE = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, [path.resolve(here, '../node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: path.resolve(here, '..'), stdio: 'pipe' });
await new Promise((res, rej) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && res());
  server.on('exit', (c) => rej(new Error(`preview exited ${c}`)));
  setTimeout(() => rej(new Error('preview timeout')), 15000);
});

const problems = [];
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    for (const lang of ['en', 'ar']) {
      const tag = `jeddah-${w}-${lang}`;
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      page.on('console', (m) => m.type() === 'error' && problems.push(`${tag} console: ${m.text()}`));
      page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
      page.on('requestfailed', (r) => problems.push(`${tag} requestfailed: ${r.url()}`));
      page.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && problems.push(`${tag} EXTERNAL: ${r.url()}`));
      const shot = async (name) => {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (overflow > 1) problems.push(`${tag} ${name}: horizontal overflow ${overflow}px`);
        await page.screenshot({ path: path.join(out, `${tag}-${name}.png`), fullPage: true });
      };
      await page.goto(BASE);
      await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 15000 });
      if (lang === 'ar') await page.click('.lang-toggle-btn');
      await page.locator('.jd-card').nth(1).click(); // Jeddah flood watch
      await page.waitForSelector('.jd-event');
      await shot('brief');
      const next = () => page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
      await next();
      await page.waitForSelector('.jd-trade');
      await shot('build');
      await next();
      await page.waitForSelector('.jd-alive');
      await shot('orbit');
      await next();
      await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 10000 });
      await page.click('.launch-btn');
      await page.waitForSelector('.screen--flight');
      for (let i = 0; i < 40 && !(await page.locator('.reentry').count()); i++) {
        const storm = page.locator('.storm-card .sp-btn').first();
        if (await storm.count()) await storm.click();
        await page.click('.flight-controls .sp-btn >> nth=4').catch(() => {});
        await page.waitForTimeout(200);
      }
      if (!(await page.locator('.sp-chart-event-line').count())) problems.push(`${tag}: no event line on the flight chart`);
      await shot('flight');
      await page.click('.reentry .sp-btn');
      await page.waitForSelector('.screen--report .jd-report');
      const verdict = await page.locator('.jd-report .sp-stamp-title').first().innerText();
      console.log(`${tag}: event verdict = ${verdict}`);
      if (!verdict.trim()) problems.push(`${tag}: empty event verdict`);
      await page.waitForTimeout(500);
      await shot('report');
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(problems.length ? `PROBLEMS (${problems.length}):\n` + [...new Set(problems)].join('\n') : 'JEDDAH SMOKE OK');
process.exit(problems.length ? 1 : 0);
