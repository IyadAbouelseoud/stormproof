// Prompt H1/H2 acceptance: Cadet Build hides the jargon, Engineer shows it; the tracker shows Revisit missed 14.1 / 10
// and the projected score equals the Report score of the same design. Usage: pnpm build && node scripts/mode-check.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4181;
const BASE = `http://localhost:${PORT}/`;
const server = spawn(process.execPath, [path.resolve(here, '../node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: path.resolve(here, '..'), stdio: 'pipe' });
await new Promise((res, rej) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && res());
  setTimeout(() => rej(new Error('preview timeout')), 15000);
});
const JARGON = ['Delta-v', 'Swath', 'sfu', 'e-1', 'Cocktail'];
const fails = [];
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => fails.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && fails.push(`console: ${m.text()}`));
  await page.goto(BASE);
  await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 15000 });
  const toBuild = async () => {
    await page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
    await page.waitForSelector('#screen-heading-build');
  };
  const text = () => page.evaluate(() => document.body.innerText.toLowerCase());
  // default is Cadet
  if ((await page.getAttribute('html', 'data-mode')) !== 'cadet') fails.push('default mode is not cadet');
  await toBuild();
  let body = await text();
  for (const j of JARGON) if (body.includes(j.toLowerCase())) fails.push(`Cadet Build shows "${j}"`);
  const chip = page.locator('.tracker-chip[data-req="revisit"]');
  const chipText = await chip.innerText();
  if (!/14\.1/.test(chipText) || !/10/.test(chipText) || !(await chip.getAttribute('class')).includes('fail')) fails.push(`revisit chip wrong: ${chipText}`);
  const projected = Number(await page.locator('[data-testid="projected-score"]').innerText());
  // Engineer
  await page.click('.mode-toggle-btn[data-mode="engineer"]');
  body = await text();
  for (const j of ['Delta-v', 'Swath', 'Cocktail']) if (!body.includes(j.toLowerCase())) fails.push(`Engineer Build misses "${j}"`);
  await page.click('.mode-toggle-btn[data-mode="cadet"]');
  // fly the same design and read the Report score
  for (let k = 0; k < 2; k++) await page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
  await page.waitForSelector('#screen-heading-launch');
  await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 10000 });
  await page.click('.launch-btn');
  await page.waitForSelector('#screen-heading-flight');
  await page.click('.flight-controls .sp-btn--quiet');
  await page.click('.reentry .sp-btn');
  await page.waitForSelector('#screen-heading-report');
  const report = Number((await page.locator('.report-score-value').innerText()).match(/\d+/)[0]);
  await page.waitForTimeout(800);
  const report2 = Number((await page.locator('.report-score-value').innerText()).match(/\d+/)[0]);
  if (report2 !== projected) fails.push(`projected ${projected} != report ${report2} (${report})`);
  console.log(`projected ${projected}, report ${report2}`);
} finally {
  await browser.close();
  server.kill();
}
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'RESULT: mode check passed');
process.exit(fails.length ? 1 : 0);
