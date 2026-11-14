import { chromium, open, badText } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome' });
const { page, problems } = await open(browser);
const dump = async (tag) => {
  const rows = await page.evaluate(() => [...document.querySelectorAll('main button, main a, main input, main select, main textarea, main [role=button], main [role=slider], main [tabindex="0"], .flight-controls *')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => `${e.tagName.toLowerCase()}${e.type ? '[' + e.type + ']' : ''} .${(e.className?.baseVal ?? e.className ?? '').toString().split(' ').slice(0, 2).join('.')} "${(e.getAttribute('aria-label') || e.innerText || e.value || e.placeholder || '').trim().slice(0, 40).replace(/\n/g, ' ')}"${e.disabled ? ' DISABLED' : ''}`));
  console.log(`=== ${tag} (${rows.length})`); console.log(rows.join('\n'));
  console.log('bad:', await badText(page));
};
for (let i = 0; i < 3; i++) { await page.click('.nav-controls-bar .sp-btn-nav >> nth=1'); await page.waitForTimeout(500); }
await page.waitForTimeout(1000);
console.log('launch disabled?', await page.locator('.launch-btn').isDisabled(), await page.locator('.screen--launch').innerText().then(t=>t.slice(0,1500)));
await page.click('.rocket-card >> nth=0'); await page.waitForTimeout(500);
console.log('after rocket pick disabled?', await page.locator('.launch-btn').isDisabled());
await page.click('.launch-btn'); await page.waitForSelector('.screen--flight'); await page.waitForTimeout(800);
await dump('flight');
await page.screenshot({ path: 'flight.png' });
console.log('problems', problems);
await browser.close();
