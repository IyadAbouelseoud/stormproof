import { chromium, open, badText } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome' });
const { page, problems } = await open(browser);
const dump = async (tag) => {
  const rows = await page.evaluate(() => [...document.querySelectorAll('main button, main a, main input, main select, main textarea, main summary, main [role=button], main [role=slider], main [tabindex="0"]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => `${e.tagName.toLowerCase()}${e.type ? '[' + e.type + ']' : ''} .${(e.className?.baseVal ?? e.className ?? '').toString().split(' ').slice(0, 2).join('.')} "${(e.getAttribute('aria-label') || e.innerText || e.value || e.placeholder || '').trim().slice(0, 40).replace(/\n/g, ' ')}"${e.disabled ? ' DISABLED' : ''}`));
  console.log(`=== ${tag} (${rows.length})`); console.log(rows.join('\n'));
  console.log('bad:', await badText(page));
};
for (let i = 0; i < 3; i++) { await page.click('.nav-controls-bar .sp-btn-nav >> nth=1'); await page.waitForTimeout(500); }
await page.click('.launch-btn'); await page.waitForSelector('.screen--flight');
await page.click('.flight-controls .sp-btn >> nth=0'); await page.waitForTimeout(600);
const html = await page.locator('.screen--flight').innerHTML();
console.log(html.match(/class="[^"]*(storm|scrub|slider|range)[^"]*"/g));
await page.click('.flight-controls .sp-btn--quiet');
for (let i=0;i<40;i++){ const s=page.locator('.storm-card .sp-btn'); if(await s.count()){ console.log('storm btns', await s.allInnerTexts()); await s.first().click(); } if(await page.locator('.reentry').count())break; await page.click('.flight-controls .sp-btn--quiet',{timeout:800}).catch(()=>{}); await page.waitForTimeout(200);}
await dump('flight-end');
await page.click('.reentry .sp-btn'); await page.waitForSelector('.screen--report'); await page.waitForTimeout(1000);
await dump('report');
await page.click('.nav-controls-bar .sp-btn-nav >> nth=1'); await page.waitForTimeout(1000);
await dump('refly');
console.log('problems', problems);
await browser.close();
