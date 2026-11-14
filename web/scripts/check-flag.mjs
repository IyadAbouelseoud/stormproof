// Prompt E gate: with VITE_JEDDAH=0 the app is Angola only (no scenario picker, no Jeddah card). Usage: VITE_JEDDAH=0 pnpm build && node scripts/check-flag.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4183;
const server = spawn(process.execPath, [path.resolve(here, '../node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: path.resolve(here, '..'), stdio: 'pipe' });
await new Promise((res, rej) => { server.stdout.on('data', (d) => String(d).includes(String(PORT)) && res()); setTimeout(() => rej(new Error('timeout')), 15000); });
const browser = await chromium.launch({ channel: 'chrome' });
let ok = false;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 15000 });
  const cards = await page.locator('.jd-card').count();
  const picker = await page.locator('.jd-picker').count();
  const text = await page.locator('body').innerText();
  console.log(`jd-card ${cards}, picker ${picker}, mentions Jeddah ${/Jeddah/i.test(text)}, errors ${errors.length}`);
  ok = cards === 0 && picker === 0 && !/Jeddah/i.test(text) && errors.length === 0;
} finally { await browser.close(); server.kill(); }
console.log(ok ? 'FLAG OFF OK: Angola only' : 'FLAG OFF FAILED');
process.exit(ok ? 0 : 1);
