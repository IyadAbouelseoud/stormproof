// Phone-width close-ups for the two overflow findings: Launch rocket cards and the opened Report sources drawer.
import { chromium } from '@playwright/test';
const BASE = process.argv[2] ?? 'http://localhost:4172/';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto(BASE);
await p.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 20000 });
const next = () => p.click('.nav-controls-bar .sp-btn-nav >> nth=1');
await next(); await next(); await next();
await p.waitForSelector('.rocket-card');
await p.locator('.rocket-card-grid').scrollIntoViewIfNeeded();
await p.waitForTimeout(500);
await p.locator('.rocket-card-grid').screenshot({ path: '../qa/screens/close-390-rockets.png' });
console.log(await p.evaluate(() => [...document.querySelectorAll('.rocket-card-grid, .rocket-card, .rocket-card-body, .rocket-card-head, .rocket-card-head > *')].map((e) => `${e.className.slice(0, 40)} sw${e.scrollWidth} cw${e.clientWidth}`).join('\n')));
await p.waitForSelector('.launch-btn:not([disabled])', { timeout: 15000 });
await p.click('.launch-btn');
await p.waitForSelector('.screen--flight');
for (let i = 0; i < 40 && !(await p.locator('.reentry').count()); i++) { await p.click('.flight-controls .sp-btn--quiet', { timeout: 1000 }).catch(() => {}); await p.waitForTimeout(250); }
await p.click('.reentry .sp-btn');
await p.waitForSelector('.screen--report');
await p.click('.sources summary');
await p.waitForTimeout(500);
await p.locator('.sources-card').scrollIntoViewIfNeeded();
const r = await p.evaluate(() => { const c = document.querySelector('.sources-card').getBoundingClientRect(); const t = document.querySelector('.sources-table').getBoundingClientRect(); const n = document.querySelector('.nav-controls-bar').getBoundingClientRect(); return { card: [c.top, c.bottom], table: [t.top, t.bottom], nav: [n.top, n.bottom], scrollY }; });
console.log(JSON.stringify(r));
await p.screenshot({ path: '../qa/screens/close-390-sources.png', fullPage: true });
await b.close();
