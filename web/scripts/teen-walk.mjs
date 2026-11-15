// Prompt H teen walk: a first-time player in Cadet mode with the default design reads the goal tracker, follows the
// red chip's hint (pointing up a tier), launches and checks that the score beats 79 with revisit met.
// Screenshots to qa/screens/teen/ (git-ignored). Usage: pnpm build && node scripts/teen-walk.mjs  (env W, LANG=ar)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../qa/screens/teen');
fs.mkdirSync(out, { recursive: true });
const PORT = 4183;
const BASE = `http://localhost:${PORT}/`;
const W = Number(process.env.W ?? 1440);
const server = spawn(process.execPath, [path.resolve(here, '../node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: path.resolve(here, '..'), stdio: 'pipe' });
await new Promise((res, rej) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && res());
  setTimeout(() => rej(new Error('preview timeout')), 15000);
});
const fails = [];
const log = (s) => console.log(s);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  page.on('pageerror', (e) => fails.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && fails.push(`console: ${m.text()}`));
  await page.goto(BASE);
  await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 15000 });
  if (process.env.LANG === 'ar') await page.click('.lang-toggle-btn');
  const shot = (n) => page.screenshot({ path: `${out}/${W}-${process.env.LANG ?? 'en'}-${n}.png`, fullPage: true });
  if ((await page.getAttribute('html', 'data-mode')) !== 'cadet') fails.push('not in Cadet mode by default');
  const cta = await page.locator('[data-testid="brief-cta-line"]').innerText().catch(() => '');
  log(`Brief CTA: ${cta}`);
  if (!cta) fails.push('Brief does not say the first draft misses a goal');
  await shot('1-brief');
  await page.click('.brief-start-btn');
  await page.waitForSelector('#screen-heading-build');
  const chip = page.locator('.tracker-chip[data-req="revisit"]');
  log(`Build tracker revisit chip: ${(await chip.innerText()).replace(/\s+/g, ' ')}`);
  const before = Number(await page.locator('[data-testid="projected-score"]').innerText());
  await shot('2-build');
  await chip.click();
  await page.waitForSelector('.tracker-pop');
  await page.click('.tracker-mover[data-mover="pointing"]');
  await page.waitForTimeout(300);
  await page.click('.sp-part[data-part="pointing-precise"]');
  await page.waitForTimeout(300);
  const chipCls = await chip.getAttribute('class');
  const after = Number(await page.locator('[data-testid="projected-score"]').innerText());
  log(`after the fix: revisit ${chipCls.includes('ok') ? 'met' : 'missed'}, projected ${before} -> ${after}`);
  if (!chipCls.includes('ok')) fails.push('revisit still missed after following the hint');
  await shot('3-build-fixed');
  await page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
  await page.waitForSelector('#screen-heading-orbit');
  await page.waitForSelector('[data-testid="green-zone"], .alt-green-text', { timeout: 10000 });
  log(`Orbit: ${await page.locator('.alt-green-text').innerText()}`);
  await shot('4-orbit');
  await page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
  await page.waitForSelector('#screen-heading-launch');
  await shot('5-launch');
  await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 10000 });
  await page.click('.launch-btn');
  await page.waitForSelector('#screen-heading-flight');
  await page.waitForTimeout(1200);
  await shot('6-flight');
  for (let i = 0; i < 60 && !(await page.locator('.reentry').count()); i++) {
    const storm = page.locator('.storm-card .sp-btn').first();
    if (await storm.count()) await storm.click();
    await page.click('.flight-controls .sp-btn--quiet', { timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  await page.click('.reentry .sp-btn');
  await page.waitForSelector('#screen-heading-report');
  await page.waitForTimeout(1500);
  const score = Number((await page.locator('.report-score-value').innerText()).match(/\d+/)[0]);
  const revisitMet = await page.locator('.req-grid .sp-stamp--ok', { hasText: /every|revisit|يعود/i }).count();
  log(`Report: score ${score}, revisit stamp met: ${revisitMet > 0}`);
  if (!(score > 79)) fails.push(`score ${score} is not above 79`);
  if (!revisitMet) fails.push('revisit not met on the Report');
  await shot('7-report');
} finally {
  await browser.close();
  server.kill();
}
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'RESULT: teen walk passed');
process.exit(fails.length ? 1 : 0);
