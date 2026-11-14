// VITE_JEDDAH=0 gate against an already running preview (default http://localhost:4183/): Angola only, no Jeddah entry point.
import { chromium } from '@playwright/test';
const BASE = process.argv[2] ?? 'http://localhost:4183/';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(BASE);
await p.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 15000 });
const cards = await p.locator('.jd-card').count();
const picker = await p.locator('.jd-picker').count();
const text = await p.locator('body').innerText();
// A Jeddah mission code must be refused (unknown scenario), not loaded.
for (let i = 0; i < 3; i++) await p.click('.nav-controls-bar .sp-btn-nav >> nth=1');
await p.waitForSelector('.launch-btn:not([disabled])', { timeout: 15000 });
await p.click('.launch-btn');
await p.waitForSelector('.screen--flight');
for (let i = 0; i < 40 && !(await p.locator('.reentry').count()); i++) { await p.click('.flight-controls .sp-btn--quiet', { timeout: 1000 }).catch(() => {}); await p.waitForTimeout(250); }
await p.click('.reentry .sp-btn');
await p.waitForSelector('.screen--report');
await p.fill('.sp-ticket-load input', 'SP1-amVkZGFoLWZsb29kfmNhbWVyYS1idWRnZXR-cGFuZWxzLWxhcmdlfmJhdHRlcnktbWVkaXVtfnJhZGlvLWZhc3R-Y29tcHV0ZXItc3RhbmRhcmR-cG9pbnRpbmctcHJlY2lzZX5mdWVsLXNtYWxsfjZVflN-NTAwfnNwYWNleC1yaWRlc2hhcmV-MjAyMS0wNi0wMX50fjF-fg');
await p.click('.sp-ticket-load button');
await p.waitForTimeout(600);
const after = await p.locator('body').innerText();
const refused = /invalid|not valid|unknown/i.test(await p.locator('.sp-ticket').innerText()) && !/Jeddah/i.test(after);
console.log(`jd-card ${cards}, picker ${picker}, mentions Jeddah ${/Jeddah/i.test(text)}, Jeddah code refused ${refused}, errors ${errors.length}`);
const ok = cards === 0 && picker === 0 && !/Jeddah/i.test(text) && refused && errors.length === 0;
console.log(ok ? 'FLAG OFF OK: Angola only' : 'FLAG OFF FAILED');
await b.close();
process.exit(ok ? 0 : 1);
