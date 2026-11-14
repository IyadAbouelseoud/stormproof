// Fallback check: if the data files fail to load, the app runs on the sample result ("Sample data") and must not crash.
// Usage (cwd web/, preview on BASE): node scripts/mock-mode.mjs [BASE]
import { chromium } from '@playwright/test';
const BASE = process.argv[2] ?? 'http://localhost:4172/';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message + '\n' + (e.stack ?? '').split('\n').slice(0, 4).join('\n')));
await p.route('**/data/**', (r) => r.abort());
await p.goto(BASE);
await p.waitForTimeout(2500);
console.log('header says sample data:', /sample data/i.test(await p.locator('body').innerText()));
const next = () => p.click('.nav-controls-bar .sp-btn-nav >> nth=1').catch(() => {});
for (const name of ['build', 'orbit', 'launch']) { await next(); await p.waitForTimeout(700); console.log(name, 'errors so far', errs.length); }
await p.waitForSelector('.launch-btn:not([disabled])', { timeout: 15000 }).catch(() => console.log('launch button never unlocked'));
await p.click('.launch-btn').catch(() => {});
await p.waitForSelector('.screen--flight', { timeout: 15000 }).catch(() => console.log('flight not reached'));
await p.click('.flight-controls .sp-btn >> nth=0').catch(() => {});
await p.waitForTimeout(1500);
await p.click('.flight-controls .sp-btn--quiet').catch(() => {});
await p.waitForTimeout(1500);
console.log('reentry panel:', await p.locator('.reentry').count());
if (await p.locator('.reentry .sp-btn').count()) await p.click('.reentry .sp-btn');
await p.waitForTimeout(2000);
console.log('report:', await p.locator('.screen--report').count());
await next(); await p.waitForTimeout(1000);
console.log('refly:', await p.locator('.screen--refly').count());
console.log('page errors:', errs.length); for (const e of errs.slice(0, 3)) console.log(e.slice(0, 600));
await b.close();
