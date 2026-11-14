import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/');
const { chromium } = require('@playwright/test');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => console.log('PE', e.message)); p.on('crash', () => console.log('CRASH'));
await p.goto('http://localhost:4172/');
await p.waitForFunction(() => !document.querySelector('.engine-status'));
for (let i = 0; i < 3; i++) { await p.click('.nav-controls-bar .sp-btn-nav >> nth=1'); await p.waitForTimeout(800); }
await p.click('.launch-btn'); await p.waitForSelector('.screen--flight'); await p.waitForTimeout(800);
await p.locator('.flight-controls .btn-row .sp-btn').nth(2).click();
await p.locator('.flight-controls > .sp-btn').first().click();
for (let i = 0; i < 20; i++) { await p.waitForTimeout(1000); console.log(i, await p.locator('.flight-hud-readout').innerText().then(t=>t.replace(/\n/g,' ')), 'storm', await p.locator('.storm-card').count(), 'reentry', await p.locator('.reentry').count()); }
await p.screenshot({ path: '../qa/screens/t2-dbg.png' });
await b.close();
