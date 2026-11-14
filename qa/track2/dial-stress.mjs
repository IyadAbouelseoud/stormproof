// Dial gauge stress: pick the LAST option in every part group (max-out), then 1U with big parts. cwd web/.
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/');
const { chromium } = require('@playwright/test');
const b = await chromium.launch({ channel: 'chrome' });
const bad = []; let total = 0; const samples = [];
for (const [w, h] of [[390, 844], [1440, 900]]) for (const lang of ['en', 'ar']) for (const pick of ['last', 'first']) for (const ff of ['6U', '1U']) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4172/');
  await p.waitForFunction(() => !document.querySelector('.engine-status'));
  if (lang === 'ar') await p.click('.lang-toggle-btn');
  await p.click('.nav-controls-bar .sp-btn-nav >> nth=1');
  await p.waitForTimeout(600);
  const ffBtn = p.locator(`.sp-btn:has-text("${ff}")`).first();
  if (await ffBtn.count()) await ffBtn.click().catch(() => {});
  const groups = p.locator('.part-group');
  const n = await groups.count();
  for (let i = 0; i < n; i++) {
    const parts = groups.nth(i).locator('.sp-part:not([disabled])');
    const c = await parts.count();
    if (c) await (pick === 'last' ? parts.nth(c - 1) : parts.nth(0)).click({ force: true }).catch(() => {});
  }
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => [...document.querySelectorAll('.sp-dial-container')].map((d) => {
    const dr = d.getBoundingClientRect();
    return [...d.querySelectorAll('.sp-dial-num, .sp-dial-unit')].map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, sw: e.scrollWidth, cw: e.clientWidth, inside: r.left >= dr.left - 1 && r.right <= dr.right + 1 && r.top >= dr.top - 1 && r.bottom <= dr.bottom + 1, w: Math.round(r.width), dw: Math.round(dr.width) }; });
  }).flat());
  const fails = await p.locator('.sp-gauge--fail').count();
  total += r.length;
  const tag = `${w}-${lang}-${pick}-${ff} (failing gauges ${fails}, parts groups ${n})`;
  samples.push(tag + ' ' + r.filter((_, i) => i % 2 === 0).map((x) => x.t).join(' | '));
  for (const x of r) if (x.sw > x.cw || !x.inside) bad.push(tag + ' ' + JSON.stringify(x));
  await ctx.close();
}
await b.close();
console.log(samples.join('\n'));
console.log('dial elements checked', total, 'bad', bad.length); console.log(bad.join('\n'));
