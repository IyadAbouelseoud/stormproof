// Viewport (not full-page) screenshots of Build, panel closed and open. cwd web/, preview on :4178
import { chromium } from '@playwright/test';
const BASE = process.env.BASE ?? 'http://localhost:4178/';
const b = await chromium.launch({ channel: 'chrome' });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(BASE);
  await p.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 20000 });
  await p.screenshot({ path: `../qa/screens/view-${w}-brief.png` });
  await p.click('.nav-controls-bar .sp-btn-nav >> nth=1');
  await p.waitForSelector('.xd-spot');
  await p.waitForTimeout(600);
  await p.screenshot({ path: `../qa/screens/view-${w}-build-top.png` });
  await p.locator('.xd-frame').scrollIntoViewIfNeeded();
  await p.evaluate(() => document.querySelector('.build-exploded').scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(300);
  await p.screenshot({ path: `../qa/screens/view-${w}-build-exploded.png` });
  await p.locator('.xd-spot').first().click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `../qa/screens/view-${w}-build-open.png` });
  await p.close();
}
await b.close();
