import { chromium, open, badText } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome' });
const { page, problems } = await open(browser);
const dump = async (tag) => {
  const rows = await page.evaluate(() => [...document.querySelectorAll('button, a, input, select, textarea, [role=button], [role=slider], [tabindex="0"]')].filter((e) => e.offsetParent !== null || e.getBoundingClientRect().width > 0).map((e) => `${e.tagName.toLowerCase()}${e.type ? '[' + e.type + ']' : ''} .${(e.className?.baseVal ?? e.className ?? '').toString().split(' ').slice(0, 2).join('.')} "${(e.getAttribute('aria-label') || e.innerText || e.value || e.placeholder || '').trim().slice(0, 40).replace(/\n/g, ' ')}"${e.disabled ? ' DISABLED' : ''}`));
  console.log(`=== ${tag} (${rows.length})`); console.log(rows.join('\n'));
  console.log('bad:', await badText(page));
};
await dump('brief');
for (const n of ['build', 'orbit', 'launch']) {
  await page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
  await page.waitForTimeout(1200);
  await dump(n);
}
console.log('problems', problems);
await browser.close();
