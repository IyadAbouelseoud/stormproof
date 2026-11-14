import { chromium } from '../../web/node_modules/@playwright/test/index.mjs';
export const BASE = 'http://localhost:4174/';
export { chromium };
export async function open(browser, { w = 1440, h = 900, lang = 'en', night = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) problems.push(`EXTERNAL: ${u}`); });
  await page.goto(BASE);
  await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 20000 });
  if (lang === 'ar') await page.click('.lang-toggle-btn');
  return { ctx, page, problems };
}
export const BAD = /undefined|NaN|\[object|Infinity|\b[a-z]+\.[a-z_]+\.[a-z_.]+\b(?=\s|$)/;
export async function badText(page) {
  const t = await page.evaluate(() => document.body.innerText);
  const hits = [];
  for (const re of [/undefined/, /NaN/, /\[object/, /Infinity/, /\b(?:brief|build|orbit|launch|flight|report|refly|screens|buttons|fit|cause|gauge|part|rocket|score|req|jeddah|sun|map|nav|segment|app|medal|team|role|storm|disposal)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*\b/]) {
    const m = t.match(re); if (m) hits.push(`${re}: "${t.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\n/g, ' ')}"`);
  }
  return hits;
}
