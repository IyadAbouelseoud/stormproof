// Track 7 gate: Build exploded-view hotspots + part detail panel. Run with cwd web/:
//   node ../qa/track7/hotspots.mjs   (needs `vite preview` on http://localhost:4177)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
// resolve @playwright/test from the cwd (web/), not from qa/
const pw = await import(pathToFileURL(createRequire(path.join(process.cwd(), 'x.js')).resolve('@playwright/test')).href);
const chromium = pw.chromium ?? pw.default.chromium;

const here = path.dirname(fileURLToPath(import.meta.url));
const shots = path.resolve(here, '../screens');
fs.mkdirSync(shots, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4177/';
const SLOTS = ['camera', 'panels', 'battery', 'radio', 'computer', 'pointing', 'fuel'];
const SCEN = [['angola', 0], ['jeddah', 1]];
const FFS = ['1U', '3U', '6U'];
const VIEWS = process.env.VIEWS ? process.env.VIEWS.split(',').map(Number) : [390, 768, 1440];
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); };

const browser = await chromium.launch({ channel: 'chrome' });

async function goBuild(page, lang, scenIdx) {
  await page.goto(BASE);
  await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 20000 });
  if (lang === 'ar') await page.click('.lang-toggle-btn');
  await page.locator('.jd-card').nth(scenIdx).click();
  await page.click('.nav-controls-bar .sp-btn-nav >> nth=1');
  await page.waitForSelector('.xd-spot', { timeout: 10000 });
}

const group = (page, slot) => page.locator(`#slot-${slot}`).locator('xpath=..');
const selectedName = (page, slot) => group(page, slot).locator('.sp-part--selected .sp-part-name').innerText().then((s) => s.trim());
const cardByName = (page, slot, name) => group(page, slot).locator('.sp-part', { has: page.locator('.sp-part-name', { hasText: name }) }).first();
const gaugeText = (page) => page.locator('.gauge-row').innerText();

async function fontAndOverflow(page, tag) {
  const r = await page.evaluate(() => {
    const roots = [document.querySelector('.screen--build'), document.querySelector('.pd')].filter(Boolean);
    const small = new Map();
    const wide = [];
    for (const root of roots) {
      const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.pd-sr')) continue;
        const fs = parseFloat(cs.fontSize);
        if (fs < 13) small.set(`${el.tagName}.${el.className}`, fs);
      }
      for (const el of root.querySelectorAll('*')) {
        if (el instanceof SVGElement || el.closest('.pd-sr') || el.classList.contains('xd-dot') || el.classList.contains('xd-spot')) continue;
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) wide.push(`${el.tagName}.${el.className}`);
      }
    }
    return { small: [...small.entries()], wide };
  });
  ok(r.small.length === 0, `${tag}: font < 13px: ${JSON.stringify(r.small)}`);
  ok(r.wide.length === 0, `${tag}: scrollWidth > clientWidth: ${[...new Set(r.wide)].join(', ')}`);
  const doc = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(doc <= 1, `${tag}: horizontal page overflow ${doc}px`);
}

for (const w of VIEWS) {
  for (const lang of ['en', 'ar']) {
    for (const [scen, sidx] of SCEN) {
      const tag = `${w}-${lang}-${scen}`;
      const page = await browser.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
      page.on('console', (m) => m.type() === 'error' && problems.push(`${tag} console: ${m.text()}`));
      page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
      await goBuild(page, lang, sidx);
      for (const ff of FFS) {
        await page.locator('.build-frame .sp-btn', { hasText: ff }).click();
        await page.waitForTimeout(150);
        const fullSet = w === 1440 || ff === '6U';
        for (const slot of fullSet ? SLOTS : ['camera', 'fuel']) {
          const t2 = `${tag}-${ff}-${slot}`;
          const spots = page.locator(`.xd-spot[data-slot="${slot}"]`);
          const n = await spots.count();
          ok(n === (slot === 'panels' ? 2 : 1), `${t2}: hotspot count ${n}`);
          await spots.first().click();
          await page.waitForSelector('.pd');
          await page.waitForTimeout(350); // let the entry animation and layout settle
          const title = (await page.locator('.pd-title').innerText()).trim();
          const expected = await selectedName(page, slot);
          ok(title === expected, `${t2}: panel title "${title}" != selected part "${expected}"`);
          if (slot === 'panels') ok((await page.locator('.pd').getAttribute('data-slot')) === 'panels', `${t2}: panel is not Solar panels`);
          const ov = await page.evaluate((s) => {
            const rings = [...document.querySelectorAll('.xd-ring')].map((e) => e.getBoundingClientRect());
            const sp = [...document.querySelectorAll(`.xd-spot[data-slot="${s}"]`)].map((e) => e.getBoundingClientRect());
            const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
            return { rings: rings.length, ok: sp.every((x) => rings.some((r) => hit(r, x))) };
          }, slot);
          ok(ov.rings === (slot === 'panels' ? 2 : 1) && ov.ok, `${t2}: spotlight ring does not overlap hotspot (${JSON.stringify(ov)})`);
          if (w === 390) {
            ok((await page.locator('.pd').getAttribute('role')) === 'dialog' && (await page.locator('.pd').getAttribute('aria-modal')) === 'true', `${t2}: sheet is not a modal dialog`);
            const cb = await page.locator('.pd-close').boundingBox();
            ok(!!cb && cb.width >= 44 && cb.height >= 44, `${t2}: close target < 44px`);
          }
          const live = await page.locator('[role=status]').first().innerText();
          ok(live.includes(title), `${t2}: aria-live "${live}" lacks "${title}"`);
          if (slot === 'camera' && ff === '6U') {
            await fontAndOverflow(page, `${tag}-open`);
            await page.screenshot({ path: path.join(shots, `build-${tag}-open.png`), fullPage: true });
          }
          // choose an alternative in the panel == clicking the same card in the list
          if (fullSet && ff === '6U' && (await page.locator('.pd-choose').count()) > 0) {
            const altName = (await page.locator('.pd-alt-name').first().innerText()).trim();
            await page.locator('.pd-choose').first().click();
            await page.waitForTimeout(300);
            const viaPanel = { g: await gaugeText(page), n: await selectedName(page, slot), title: (await page.locator('.pd-title').innerText()).trim(), code: await page.evaluate(() => document.body.innerText.match(/[A-Z0-9]{3,}(?:-[A-Z0-9]{2,})+/)?.[0] ?? '') };
            ok(viaPanel.n === altName && viaPanel.title === altName, `${t2}: after choose, list "${viaPanel.n}" panel "${viaPanel.title}" != "${altName}"`);
            await page.keyboard.press('Escape');
            await cardByName(page, slot, expected).click();
            await page.waitForTimeout(300);
            await cardByName(page, slot, altName).click();
            await page.waitForTimeout(300);
            const viaList = { g: await gaugeText(page), n: await selectedName(page, slot) };
            ok(viaList.g === viaPanel.g && viaList.n === viaPanel.n, `${t2}: panel-choose and list-choose differ`);
            await cardByName(page, slot, expected).click();
            await page.waitForTimeout(200);
            continue;
          }
          await page.keyboard.press('Escape');
          ok((await page.locator('.pd').count()) === 0, `${t2}: Esc did not close`);
        }
      }
      await page.mouse.move(0, 0);
      await page.locator('.build-frame .sp-btn', { hasText: '6U' }).click();
      await page.waitForTimeout(200);
      await fontAndOverflow(page, `${tag}-closed`);
      await page.screenshot({ path: path.join(shots, `build-${tag}-closed.png`), fullPage: true });
      if (w === 1440) {
        const g = await page.evaluate(() => {
          const grid = document.querySelector('.part-grid');
          const gr = grid.getBoundingClientRect();
          const maxRight = Math.max(...[...grid.children].map((c) => c.getBoundingClientRect().right));
          return { gridRight: gr.right, maxRight };
        });
        ok(g.gridRight - g.maxRight < 4, `${tag}: dead column in the card grid ${JSON.stringify(g)}`);
      }
      if (w === 390) {
        const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.part-grid')).gridTemplateColumns.split(' ').length);
        ok(cols === 1, `${tag}: expected 1 column at 390, got ${cols}`);
      }
      // keyboard path: Tab to a hotspot, Enter opens, Esc closes and returns focus, Space opens, click outside closes
      await page.locator('.xd-frame').scrollIntoViewIfNeeded();
      await page.locator('#exploded-h').evaluate((el) => { el.setAttribute('tabindex', '-1'); el.focus(); });
      let found = null;
      for (let i = 0; i < 12 && !found; i++) {
        await page.keyboard.press('Tab');
        found = await page.evaluate(() => (document.activeElement?.classList.contains('xd-spot') ? document.activeElement.dataset.slot : null));
      }
      ok(!!found, `${tag}: Tab never reached a hotspot`);
      if (found) {
        await page.keyboard.press('Enter');
        await page.waitForSelector('.pd');
        ok(await page.evaluate(() => !!document.activeElement?.closest('.pd')), `${tag}: focus did not move into the panel`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        const back = await page.evaluate(() => (document.activeElement?.classList.contains('xd-spot') ? document.activeElement.dataset.slot : null));
        ok((await page.locator('.pd').count()) === 0 && back === found, `${tag}: Esc/focus return failed (focus ${back}, opener ${found})`);
        await page.keyboard.press('Space');
        await page.waitForTimeout(100);
        ok((await page.locator('.pd').count()) === 1, `${tag}: Space did not open`);
        await page.keyboard.press('Escape');
        await page.locator('.xd-spot').first().click();
        await page.waitForSelector('.pd');
        if (w > 600) {
          await page.locator('.build-frame h3').click();
          ok((await page.locator('.pd').count()) === 0, `${tag}: click outside did not close`);
        } else {
          await page.mouse.click(10, 10);
          ok((await page.locator('.pd').count()) === 0, `${tag}: backdrop click did not close`);
        }
      }
      await page.close();
    }
  }
}
await browser.close();
console.log(`checks: ${checks}, problems: ${problems.length}`);
for (const p of problems) console.log('PROBLEM', p);
process.exit(problems.length ? 1 : 0);
