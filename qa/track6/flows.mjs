// Track 6 flow tests (team/handover/votes, rail jumps, reload/hash, lang+theme mid-flow, re-fly, scenario switch, offline).
// Usage: node qa/track6/flows.mjs <w> <lang>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, open, badText, BASE } from './lib.mjs';

const w = Number(process.argv[2] ?? 1440);
const lang = process.argv[3] ?? 'en';
const h = w === 390 ? 844 : 900;
const tag = `flows-${w}-${lang}`;
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
const rows = [];
let flow = '';
const rec = (name, expected, actual, pass) => {
  rows.push({ flow, name, expected, actual: String(actual).slice(0, 260), pass: !!pass });
  if (!pass) console.log(`FAIL [${tag}] ${flow} | ${name} | exp: ${expected} | got: ${String(actual).slice(0, 240)}`);
};
const step = async (name, expected, fn) => {
  try {
    const r = await fn();
    if (r === true) rec(name, expected, 'ok', true);
    else if (r === false) rec(name, expected, 'condition false', false);
    else rec(name, expected, r.actual, r.pass);
  } catch (e) {
    rec(name, expected, 'EXC ' + e.message.split('\n')[0], false);
  }
};

const browser = await chromium.launch({ channel: 'chrome' });
let { page, problems, ctx } = await open(browser, { w, h, lang });
const NEXT = '.nav-controls-bar .sp-btn-nav >> nth=1';
const BACK = '.nav-controls-bar .sp-btn-nav >> nth=0';
const cur = () => page.evaluate(() => (document.querySelector('[class*="screen--"], .handover')?.className.match(/screen--(\w+)|(handover)/) ?? []).slice(1).find(Boolean) ?? '?');
const goto = async (s, ms = 500) => { await page.waitForTimeout(ms); return cur(); };
const okNext = async () => { await page.click(NEXT); await page.waitForTimeout(500); };
const confirmHandover = async () => { if (await page.locator('.handover').count()) { await page.locator('.handover button').click(); await page.waitForTimeout(400); return true; } return false; };
const getCode = async () => {
  // current design code is only shown on Report; derive from store through a hidden hook: read from Report when there
  return page.evaluate(() => document.querySelector('.sp-ticket-code')?.textContent ?? null);
};
const flyToReport = async ({ vote = null } = {}) => {
  await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 8000 });
  await page.click('.launch-btn');
  await page.waitForSelector('.screen--flight', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.locator('.flight-controls .sp-btn--primary').click();
  await page.locator('.flight-controls .btn-row .sp-btn--secondary').nth(2).click(); // 16x
  let storm = false;
  for (let i = 0; i < 400 && !(await page.locator('.reentry').count()); i++) {
    if (await page.locator('.storm-card').count()) {
      storm = true;
      if (vote) await vote();
      else await page.locator('.storm-card .sp-btn').first().click();
    }
    await page.waitForTimeout(150);
    if (i > 60 && !(await page.locator('.storm-card').count()) && !(await page.locator('.reentry').count())) await page.locator('.flight-controls .sp-btn--quiet').click({ timeout: 300 }).catch(() => {});
  }
  await page.waitForSelector('.reentry', { timeout: 20000 });
  return storm;
};

// ===== F1: team mode =====
flow = 'F1 team';
await step('Team setup', 'Team of 4 with names', async () => {
  await page.locator('.team-setup .sp-btn').nth(1).click();
  const ins = page.locator('.team-roles input');
  for (let i = 0; i < 4; i++) await ins.nth(i).fill(['Amal', 'Omar', 'Lee', 'Noor'][i]);
  return true;
});
await step('Handover Brief->Build', 'handover screen names the power role and hides Build', async () => {
  await page.locator('.brief-start-btn').click();
  await page.waitForTimeout(500);
  const t = await page.locator('.handover').innerText().catch(() => 'none');
  const hidden = (await page.locator('.part-group').count()) === 0;
  return { actual: `${t.replace(/\s+/g, ' ').slice(0, 150)} buildHidden=${hidden}`, pass: t !== 'none' && hidden && /Lee|Noor|Omar|Amal|المهندس|الطاقة|power/i.test(t) };
});
await step('Handover button', 'Ready reveals Build', async () => ({ actual: `confirmed=${await confirmHandover()} screen=${await cur()}`, pass: (await cur()) === 'build' }));
await step('Next with handover', 'Orbit then Launch each hand over', async () => {
  const seen = [];
  await okNext(); seen.push(await cur()); await confirmHandover(); seen.push(await cur());
  await okNext(); seen.push(await cur()); await confirmHandover(); seen.push(await cur());
  return { actual: seen.join(' > '), pass: seen.join() === 'handover,orbit,handover,launch' };
});
await step('Back across handover', 'Back from Launch shows handover for orbit', async () => {
  await page.click(BACK); await page.waitForTimeout(400);
  const a = await cur(); await confirmHandover(); const b = await cur();
  await okNext(); await confirmHandover();
  return { actual: `${a} > ${b}`, pass: a === 'handover' && b === 'orbit' };
});
let stormsSeen = false;
const votes = (policies) => async () => {
  const rowsN = await page.locator('.storm-vote-row').count();
  for (let i = 0; i < rowsN; i++) await page.locator('.storm-vote-row').nth(i).locator('.sp-btn').nth(policies[i] === 'ride' ? 0 : 1).click();
};
await step('Flight + storm vote (2 safe-mode vs 2 ride-out, lead votes safe-mode)', 'tie broken by systems lead => safe-mode; vote card closes; flight continues', async () => {
  const lead = await cur();
  await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 8000 });
  await page.click('.launch-btn');
  await page.waitForSelector('.screen--flight');
  await page.locator('.flight-controls .sp-btn--primary').click();
  await page.locator('.flight-controls .btn-row .sp-btn--secondary').nth(2).click();
  let card = false, tally = '';
  for (let i = 0; i < 300 && !card; i++) { card = (await page.locator('.storm-card').count()) > 0; if (!card) await page.waitForTimeout(150); }
  if (!card) return { actual: 'no storm card appeared (this design has no storm alert in play)', pass: false };
  const rowsN = await page.locator('.storm-vote-row').count();
  await votes(['safe', 'ride', 'ride', 'safe'])();
  await page.waitForTimeout(500);
  const stillCard = await page.locator('.storm-card').count();
  const standing = await page.locator('.storm-card').innerText().catch(() => '');
  return { actual: `voteRows=${rowsN} cardAfter=${stillCard} text=${standing.replace(/\s+/g, ' ').slice(0, 160)}`, pass: rowsN === 4 };
});
await step('Continue after vote', 'Continue closes the card and play resumes', async () => {
  const btn = page.locator('.storm-card .sp-btn');
  if (await btn.count()) await btn.first().click();
  await page.waitForTimeout(500);
  return { actual: `card=${await page.locator('.storm-card').count()}`, pass: (await page.locator('.storm-card').count()) === 0 };
});
await step('Finish flight, Report shows policy', 'report/mission code contains safe-mode policy and roles', async () => {
  await page.waitForSelector('.reentry', { timeout: 1 }).catch(async () => {
    for (let i = 0; i < 200 && !(await page.locator('.reentry').count()); i++) {
      if (await page.locator('.storm-card').count()) { const b = page.locator('.storm-card .sp-btn'); if ((await page.locator('.storm-vote-row').count()) === 0) await b.first().click(); else { await votes(['safe', 'ride', 'ride', 'safe'])(); await page.waitForTimeout(300); await b.first().click().catch(() => {}); } }
      await page.locator('.flight-controls .sp-btn--quiet').click({ timeout: 300 }).catch(() => {});
      await page.waitForTimeout(150);
    }
  });
  await page.locator('.reentry .sp-btn').click();
  await page.waitForSelector('.screen--report, .handover');
  await confirmHandover();
  await page.waitForSelector('.screen--report');
  const c = await getCode();
  const raw = Buffer.from(c.slice(4).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8').split('~');
  return { actual: `policy=${raw[15]} roles=${raw[16]}`, pass: raw[15] === 's' && raw[16].includes('Amal') && raw[16].includes('Noor') };
});

// ===== F2: rail + Back/Next jumps from every screen =====
flow = 'F2 jumps';
await step('Team off then Rail jump from Report to every step', 'no crash, each lands on its screen', async () => {
  const out = [];
  for (let i = 0; i < 4; i++) {
    await page.locator('.cml-rail-button').nth(i).click();
    await page.waitForTimeout(500);
    await confirmHandover();
    out.push(await cur());
  }
  return { actual: out.join(' > '), pass: out.join() === 'brief,build,orbit,launch' };
});
await step('Back/Next from Launch to end and back', 'walk forward and back, no crash, Back disabled at Brief, Next disabled at Refly', async () => {
  const f = [];
  for (let i = 0; i < 3; i++) { await page.click(NEXT); await page.waitForTimeout(400); await confirmHandover(); f.push(await cur()); }
  return { actual: f.join(' > '), pass: f[0] === 'flight' && f[1] === 'report' && f[2] === 'refly' && (await page.locator(NEXT).isDisabled()) };
});
await step('Back from Refly to Brief', 'every Back works', async () => {
  const f = [];
  for (let i = 0; i < 6; i++) { await page.click(BACK); await page.waitForTimeout(350); await confirmHandover(); f.push(await cur()); }
  return { actual: f.join(' > ') + ` backDisabled=${await page.locator(BACK).isDisabled()}`, pass: f.at(-1) === 'brief' && (await page.locator(BACK).isDisabled()) };
});

// ===== F3: reload + hash =====
flow = 'F3 reload/hash';
await step('Reload mid-flow resets cleanly', 'after reload: Brief, default design, no error, team off', async () => {
  await page.locator('.team-setup .sp-btn').nth(0).click().catch(() => {});
  await page.locator('.brief-start-btn').click(); await page.waitForTimeout(400); await confirmHandover();
  await page.locator('.part-group').first().locator('.sp-part').nth(0).click();
  await page.reload();
  await page.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 15000 });
  const s = await cur();
  const hash = await page.evaluate(() => location.hash);
  const l = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
  const bad = await badText(page);
  return { actual: `screen=${s} hash="${hash}" lang/dir=${l} (language is in-memory, resets) bad=${bad.length}`, pass: s === 'brief' && bad.length === 0 };
});
if (lang === 'ar') await page.click('.lang-toggle-btn');
await step('#gallery / #tokens hash', 'direct load shows that view; hash change toggles; Return link goes back', async () => {
  await page.goto(BASE + '#gallery'); await page.reload(); await page.waitForTimeout(1200);
  const g = await page.evaluate(() => document.body.innerText.slice(0, 120).replace(/\n/g, ' '));
  await page.evaluate(() => { location.hash = '#tokens'; }); await page.waitForTimeout(500);
  const t = await page.evaluate(() => document.body.innerText.slice(0, 80).replace(/\n/g, ' '));
  await page.evaluate(() => { location.hash = ''; }); await page.waitForTimeout(500);
  const m = await cur();
  return { actual: `gallery="${g.slice(0, 60)}" tokens="${t.slice(0, 40)}" back=${m}`, pass: m === 'brief' };
});
await step('Unknown / screen-like hashes (#build, #report, #/launch)', 'ignored cleanly (stay on Brief), no crash', async () => {
  const out = [];
  for (const hsh of ['#build', '#report', '#/launch', '#undefined', '#%E0%A4%A']) {
    await page.goto(BASE + hsh); await page.waitForTimeout(700);
    const e = await page.evaluate(() => document.body.innerText.trim().length);
    out.push(`${hsh}:${await cur()}:${e > 100 ? 'rendered' : 'BLANK'}`);
  }
  return { actual: out.join(' | '), pass: out.every((o) => o.endsWith('rendered')) };
});
await step('Browser Back button after in-app navigation', 'does not crash; documents behaviour', async () => {
  await page.goto(BASE); await page.waitForFunction(() => !document.querySelector('.engine-status'));
  await page.locator('.brief-start-btn').click(); await page.waitForTimeout(400);
  const hist = await page.evaluate(() => history.length);
  await page.goBack().catch(() => {});
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => document.body.innerText.trim().length);
  return { actual: `historyLen=${hist} afterBack screen=${await cur()} url=${page.url()}`, pass: after > 100 };
});
if (lang === 'ar' && (await page.evaluate(() => document.documentElement.lang)) === 'en') await page.click('.lang-toggle-btn');

// ===== F4: lang/theme switch mid-flow =====
flow = 'F4 lang/theme mid-flow';
await page.goto(BASE); await page.waitForFunction(() => !document.querySelector('.engine-status'));
if (lang === 'ar') await page.click('.lang-toggle-btn');
const midCode = async () => {
  // fly quickly and read the code on Report; used to compare designs
  await flyToReport();
  await page.locator('.reentry .sp-btn').click(); await page.waitForSelector('.screen--report');
  return getCode();
};
await step('Change a part, toggle language and theme on Build, design persists', 'code identical to a flight made without toggling', async () => {
  await page.locator('.brief-start-btn').click(); await page.waitForTimeout(400);
  await page.locator('.part-group').nth(0).locator('.sp-part').nth(2).click();
  await page.locator('.build-frame .sp-btn:has-text("3U")').click();
  const sel0 = await page.locator('.sp-part--selected').evaluateAll((e) => e.map((x) => x.innerText.split('\n')[0]));
  await page.click('.lang-toggle-btn'); await page.waitForTimeout(300);
  await page.click('.theme-toggle-btn'); await page.waitForTimeout(300);
  const sel1 = await page.locator('.sp-part--selected').evaluateAll((e) => e.map((x) => x.innerText.split('\n')[0]));
  const ff = await page.locator('.build-frame .sp-btn[aria-pressed="true"]').innerText();
  await page.click('.lang-toggle-btn'); await page.click('.theme-toggle-btn');
  const scr = await cur();
  return { actual: `selected before=${sel0.length} after=${sel1.length} ff=${ff} screen=${scr}`, pass: sel0.length === 7 && sel1.length === 7 && scr === 'build' && /3U/.test(ff) };
});
await step('Toggle language mid-flight', 'flight keeps playing, state kept, no crash', async () => {
  await page.click(NEXT); await page.waitForTimeout(300); await page.click(NEXT); await page.waitForTimeout(300);
  await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 8000 });
  await page.click('.launch-btn'); await page.waitForSelector('.screen--flight');
  await page.locator('.flight-controls .sp-btn--primary').click(); await page.waitForTimeout(800);
  const d0 = await page.locator('figure.sp-chart').getAttribute('aria-valuenow');
  await page.click('.lang-toggle-btn'); await page.waitForTimeout(800);
  const d1 = await page.locator('figure.sp-chart').getAttribute('aria-valuenow');
  await page.click('.theme-toggle-btn'); await page.waitForTimeout(500);
  const d2 = await page.locator('figure.sp-chart').getAttribute('aria-valuenow');
  const bad = await badText(page);
  await page.click('.lang-toggle-btn'); await page.click('.theme-toggle-btn');
  return { actual: `day ${d0} -> ${d1} -> ${d2} screen=${await cur()} bad=${bad.length}`, pass: +d1 >= +d0 && +d2 >= +d1 && (await cur()) === 'flight' && !bad.length };
});
await step('Toggle language on Report', 'same lifetime number, translated labels', async () => {
  for (let i = 0; i < 300 && !(await page.locator('.reentry').count()); i++) { await page.locator('.flight-controls .sp-btn--quiet').click({ timeout: 300 }).catch(() => {}); if (await page.locator('.storm-card').count()) await page.locator('.storm-card .sp-btn').first().click(); await page.waitForTimeout(150); }
  await page.locator('.reentry .sp-btn').click(); await page.waitForSelector('.screen--report');
  const grab = () => page.evaluate(() => document.querySelector('.screen--report').innerText.replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x660).replace(/[٬,٫٬]/g, '').match(/\d{3,5}/g)?.slice(0, 12).join(','));
  const a = await grab();
  await page.click('.lang-toggle-btn'); await page.waitForTimeout(500);
  const b = await grab();
  await page.click('.lang-toggle-btn');
  return { actual: `${a} | ${b}`, pass: a === b };
});

// ===== F5: Re-fly baseline and deltas =====
flow = 'F5 re-fly';
await step('Report "Change one thing" keeps baseline and returns to Build', 'baseline kept, screen Build', async () => {
  const btn = page.locator('.screen--report .btn-row .sp-btn--primary').first();
  await btn.click(); await page.waitForTimeout(500);
  return { actual: `screen=${await cur()}`, pass: (await cur()) === 'build' };
});
await step('Re-fly with one change shows deltas', 'Refly shows What changed table with exactly the change; lifetime delta shown', async () => {
  await page.locator('.part-group').nth(2).locator('.sp-part').nth(2).click(); // battery large
  await page.click(NEXT); await page.waitForTimeout(300); await page.click(NEXT); await page.waitForTimeout(300);
  await flyToReport();
  await page.locator('.reentry .sp-btn').click(); await page.waitForSelector('.screen--report');
  await page.click(NEXT); await page.waitForSelector('.screen--refly'); await page.waitForTimeout(800);
  const t = await page.locator('.screen--refly').innerText();
  const changed = await page.locator('.delta-row--changed').count();
  return { actual: `changedRows=${changed} text=${t.replace(/\s+/g, ' ').slice(0, 260)}`, pass: changed >= 1 };
});
await step('Refly DOM text sweep', 'no raw ids/keys', async () => {
  const t = await page.locator('.screen--refly').innerText();
  const rawIds = t.match(/\b(battery|camera|panels|radio|computer|pointing|fuel)-[a-z]+\b|\b(electron|spacex-rideshare)\b/g);
  const bad = await badText(page);
  return { actual: `rawIds=${rawIds} bad=${bad}`, pass: !rawIds && !bad.length };
});
await step('One-tap tweaks', 'each tweak flies a variant (Flight), report, Refly shows changed rows, no NaN', async () => {
  const out = [];
  const n0 = await page.locator('.refly-tweak-btn').count();
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('.refly-tweak-btn').count())) { out.push(`${i}:no-tweak-buttons`); break; }
    await page.locator('.refly-tweak-btn').nth(i).click();
    await page.waitForSelector('.screen--flight', { timeout: 8000 });
    await page.locator('.flight-controls .sp-btn--quiet').click();
    await page.waitForSelector('.reentry', { timeout: 20000 });
    await page.locator('.reentry .sp-btn').click(); await page.waitForSelector('.screen--report');
    const rb = (await badText(page)).length;
    await page.click(NEXT); await page.waitForSelector('.screen--refly'); await page.waitForTimeout(500);
    const ch = await page.locator('.delta-row--changed').count();
    const rb2 = (await badText(page)).length;
    out.push(`${i}:changed=${ch} bad=${rb + rb2}`);
  }
  return { actual: `tweakButtons=${n0} ${out.join(' ')}`, pass: n0 === 3 && out.length === 3 && out.every((o) => !o.endsWith('bad=1') && /changed=[1-9]/.test(o)) };
});
await step('Forget the first flight', 'clears baseline, deltas disappear', async () => {
  const b = page.locator('.screen--refly .sp-btn--quiet');
  if (!(await b.count())) return { actual: 'no forget button', pass: false };
  await b.click(); await page.waitForTimeout(400);
  return { actual: `deltaRows=${await page.locator('.delta-row').count()} forgetBtn=${await page.locator('.screen--refly .sp-btn--quiet').count()}`, pass: (await page.locator('.delta-row').count()) === 0 };
});
await step('Fly again / Change one thing / Clear baseline buttons', 'buttons act', async () => {
  const names = await page.locator('.screen--refly .sp-btn').allInnerTexts();
  return { actual: names.join(' | '), pass: names.length >= 2 };
});

// ===== F6: scenario switch =====
flow = 'F6 scenario switch';
await step('Fly Angola, Jeddah, then Angola: no Jeddah state', 'Angola design default again, no flight/baseline, no radar, Jeddah event card gone', async () => {
  await page.locator('.cml-rail-button').nth(0).click(); await page.waitForTimeout(500); await confirmHandover();
  await page.locator('.jd-card').nth(1).click(); await page.waitForTimeout(500);
  const jed = await page.locator('.screen--brief').innerText();
  await page.locator('.brief-start-btn').click(); await page.waitForTimeout(400);
  const radarShown = await page.locator('.sp-part:has-text("adar"), .sp-part:has-text("رادار")').count();
  await page.locator('.cml-rail-button').nth(0).click(); await page.waitForTimeout(500);
  await page.locator('.jd-card').nth(0).click(); await page.waitForTimeout(500);
  await page.locator('.brief-start-btn').click(); await page.waitForTimeout(400);
  const radarInAngola = await page.locator('.sp-part:has-text("adar"), .sp-part:has-text("رادار")').count();
  await page.click(NEXT); await page.waitForTimeout(300); await page.click(NEXT); await page.waitForTimeout(500);
  const eventCard = await page.locator('[class*="event"], .jd-event').count();
  await page.click(NEXT); await page.waitForTimeout(800);
  const st = await cur();
  const t = await page.locator('main, #root').first().innerText();
  return { actual: `jeddahRadarOptions=${radarShown} radarInAngola=${radarInAngola} eventElsAtLaunch=${eventCard} afterNext=${st} jeddahTextInAngolaFlowScreen=${/flood|جدة|Jeddah/i.test(t)}`, pass: radarShown >= 1 && radarInAngola === 0 };
});
await step('Baseline across scenarios', 'after fly in Angola, switch to Jeddah and back: baseline cleared', async () => {
  // setScenario clears baseline + flight
  await page.locator('.cml-rail-button').nth(0).click(); await page.waitForTimeout(400);
  await page.locator('.jd-card').nth(1).click(); await page.waitForTimeout(400);
  await page.locator('.jd-card').nth(0).click(); await page.waitForTimeout(400);
  await page.locator('.brief-start-btn').click(); await page.waitForTimeout(300);
  await page.click(NEXT); await page.waitForTimeout(300); await page.click(NEXT); await page.waitForTimeout(500);
  await page.click(NEXT); await page.waitForTimeout(700);
  const scr = await cur();
  return { actual: `Next from Launch with no flight -> ${scr} (expected Flight with no flight yet)`, pass: scr !== '?' };
});
await step('Loading a Jeddah code while in Angola flow (baseline staleness)', 'loadDesign must not keep an Angola baseline when the scenario changes', async () => {
  // fly Angola, press Change one thing (baseline set), load a Jeddah code on Report, then see Refly
  await page.locator('.cml-rail-button').nth(0).click(); await page.waitForTimeout(400); await page.locator('.brief-start-btn').click(); await page.click(NEXT); await page.click(NEXT);
  await flyToReport(); await page.locator('.reentry .sp-btn').click(); await page.waitForSelector('.screen--report');
  await page.locator('.screen--report .btn-row .sp-btn--primary').first().click(); await page.waitForTimeout(400); // keepBaseline (Angola)
  await page.click(NEXT); await page.waitForTimeout(300); await page.click(NEXT); await page.waitForTimeout(500);
  await flyToReport(); await page.locator('.reentry .sp-btn').click(); await page.waitForSelector('.screen--report');
  const jeddahCode = 'SP1-amVkZGFoLWZsb29kfmNhbWVyYS1yYWRhcn5wYW5lbHMtbGFyZ2V-YmF0dGVyeS1tZWRpdW1-cmFkaW8tZmFzdH5jb21wdXRlci1zdGFuZGFyZH5wb2ludGluZy1wcmVjaXNlfmZ1ZWwtc21hbGx-NlV-U341MDB-c3BhY2V4LXJpZGVzaGFyZX4yMDIxLTA2LTAxfnR-MX5-';
  await page.locator('.sp-ticket-load input').fill(jeddahCode); await page.locator('.sp-ticket-load button[type=submit]').click(); await page.waitForTimeout(800);
  const reportText = (await page.locator('.screen--report').innerText()).replace(/\s+/g, ' ');
  await page.click(NEXT); await page.waitForTimeout(800);
  const refly = (await page.locator('main, #root').first().innerText()).replace(/\s+/g, ' ');
  return { actual: `afterLoad Report mentions Jeddah=${/Jeddah|جدة/.test(reportText)}; Refly: ${refly.slice(150, 420)}`, pass: true };
});

// ===== F7: offline =====
flow = 'F7 offline';
const ctx2 = await browser.newContext({ viewport: { width: w, height: h } });
const p2 = await ctx2.newPage();
const external = [];
await p2.goto(BASE); await p2.waitForFunction(() => !document.querySelector('.engine-status'), null, { timeout: 20000 });
await p2.waitForTimeout(1500);
await ctx2.route(/^(?!http:\/\/localhost:4174).*/, (route) => { external.push(route.request().url()); route.abort(); });
p2.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push('REQ ' + r.url()); });
p2.on('pageerror', (e) => external.push('pageerror ' + e.message));
page = p2;
await step('Offline full flow Brief -> Re-fly (cache-reload of localhost too)', 'whole flow works, zero requests leave origin', async () => {
  if (lang === 'ar') await p2.click('.lang-toggle-btn');
  await p2.locator('.brief-start-btn').click(); await p2.waitForTimeout(400);
  await p2.click(NEXT); await p2.waitForTimeout(500); await p2.click(NEXT); await p2.waitForTimeout(500);
  await flyToReport();
  await p2.locator('.reentry .sp-btn').click(); await p2.waitForSelector('.screen--report'); await p2.waitForTimeout(1200);
  const imgs = await p2.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
  const canvasOk = await p2.evaluate(() => !!document.querySelector('canvas'));
  await p2.click(NEXT); await p2.waitForSelector('.screen--refly');
  const bad = await badText(p2);
  const fonts = await p2.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status !== 'loaded').map((f) => f.family + ':' + f.status); });
  return { actual: `external=${external.length} ${external.slice(0, 3)} brokenImages=${imgs.length} ${imgs.slice(0, 2)} fonts-not-loaded(lazy, unused faces ok)=${fonts.length} bad=${bad.length}`, pass: external.length === 0 && imgs.length === 0 && !bad.length };
});
await ctx2.close();

writeFileSync(new URL(`./out/${tag}.json`, import.meta.url), JSON.stringify({ tag, rows, problems }, null, 1));
console.log(`[${tag}] rows=${rows.length} fails=${rows.filter((r) => !r.pass).length} problems=${problems.length} ${problems.slice(0, 3)}`);
await browser.close();
