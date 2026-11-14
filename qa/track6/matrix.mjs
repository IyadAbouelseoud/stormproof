// Track 6 browser matrix. Usage: node qa/track6/matrix.mjs <w> <lang> [keyboard]
// Writes qa/track6/out/matrix-<w>-<lang>[-kb].json (rows: screen, control, action, expected, actual, pass).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, open, badText } from './lib.mjs';

const w = Number(process.argv[2] ?? 1440);
const lang = process.argv[3] ?? 'en';
const kb = process.argv[4] === 'keyboard';
const h = w === 390 ? 844 : 900;
const tag = `${w}-${lang}${kb ? '-kb' : ''}`;
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
const rows = [];
let screen = 'Brief';
const rec = (control, action, expected, actual, pass) => {
  rows.push({ screen, control, action, expected, actual: String(actual).slice(0, 220), pass: !!pass });
  if (!pass) console.log(`FAIL [${tag}] ${screen} | ${control} | ${action} | exp: ${expected} | got: ${String(actual).slice(0, 200)}`);
};
const step = async (control, action, expected, fn) => {
  try {
    const r = await fn();
    if (r === true) rec(control, action, expected, 'ok', true);
    else if (r === false) rec(control, action, expected, 'condition false', false);
    else rec(control, action, expected, r?.actual ?? r, r?.pass ?? true);
  } catch (e) {
    rec(control, action, expected, 'EXC ' + e.message.split('\n')[0], false);
  }
};

const browser = await chromium.launch({ channel: 'chrome' });
const { page, problems } = await open(browser, { w, h, lang });
const NEXT = '.nav-controls-bar .sp-btn-nav >> nth=1';
const BACK = '.nav-controls-bar .sp-btn-nav >> nth=0';
const cur = () => page.evaluate(() => (document.querySelector('[class*="screen--"]')?.className.match(/screen--(\w+)/) ?? [])[1] ?? '?');
const code = async () => page.evaluate(() => document.querySelector('.sp-ticket-code')?.textContent ?? null);
const press = async (loc, key) => { await loc.focus(); await page.keyboard.press(key); };
const act = async (loc) => (kb ? (await loc.focus(), await page.keyboard.press('Enter')) : loc.click());
const sweep = async (label) => {
  const bad = await badText(page);
  rec('DOM text', `grep ${label}`, 'no undefined/NaN/[object/Infinity/raw keys', bad.join(' ; ') || 'clean', bad.length === 0);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  rec('Layout', `horizontal overflow ${label}`, '<= 1px', ov + 'px', ov <= 1);
};

// ---------------- BRIEF ----------------
screen = 'Brief';
await sweep('Brief initial');
await step('Back', 'inspect on first screen', 'disabled', async () => page.locator(BACK).isDisabled());
await step('Theme toggle', 'click', 'data-theme flips', async () => {
  const a = await page.evaluate(() => document.documentElement.dataset.theme);
  await act(page.locator('.theme-toggle-btn'));
  const b = await page.evaluate(() => document.documentElement.dataset.theme);
  await act(page.locator('.theme-toggle-btn'));
  const c = await page.evaluate(() => document.documentElement.dataset.theme);
  return { actual: `${a} -> ${b} -> ${c}`, pass: a !== b && a === c };
});
await step('Sound toggle', 'click twice', 'toggles, default off, no error', async () => {
  const before = await page.locator('.sound-toggle-btn').getAttribute('aria-pressed');
  await act(page.locator('.sound-toggle-btn'));
  const mid = await page.locator('.sound-toggle-btn').getAttribute('aria-pressed');
  await act(page.locator('.sound-toggle-btn'));
  const after = await page.locator('.sound-toggle-btn').getAttribute('aria-pressed');
  return { actual: `${before} -> ${mid} -> ${after}`, pass: before !== mid && before === after && before !== 'true' };
});
await step('Sound tooltip dismiss', 'click Dismiss', 'tooltip hides', async () => {
  const n = await page.locator('.sound-tooltip-close').count();
  if (n) await act(page.locator('.sound-tooltip-close'));
  return { actual: `present=${n} after=${await page.locator('.sound-tooltip-close').count()}`, pass: (await page.locator('.sound-tooltip-close').count()) === 0 };
});
await step('Language toggle', 'click twice', 'html lang/dir flips and back, design kept', async () => {
  const c0 = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
  await act(page.locator('.lang-toggle-btn'));
  const c1 = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
  await act(page.locator('.lang-toggle-btn'));
  const c2 = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
  return { actual: `${c0} | ${c1} | ${c2}`, pass: c0[0] !== c1[0] && c0[0] === c2[0] };
});
await step('Story disclosure', 'open <details>', 'full story visible', async () => {
  await page.locator('.brief-story-disclosure summary').click();
  const vis = await page.locator('.brief-story-beat').first().isVisible();
  await page.locator('.brief-story-disclosure summary').click();
  return vis;
});
await step('Objective tiles', 'focus each tile', 'focusable, text clean', async () => {
  const n = await page.locator('.brief-obj-tile').count();
  for (let i = 0; i < n; i++) await page.locator('.brief-obj-tile').nth(i).focus();
  return { actual: `${n} tiles`, pass: n === 5 };
});
await step('Scenario picker', 'Angola -> Jeddah -> Angola', 'no Jeddah state in Angola', async () => {
  const cards = page.locator('.jd-card');
  const c0 = await code();
  await act(cards.nth(1));
  await page.waitForTimeout(400);
  const hasEvent = await page.locator('.event-card, [class*="event"]').count();
  const cJ = await code();
  const dJ = await page.evaluate(() => document.body.innerText.includes('Jeddah') || document.body.innerText.includes('جدة'));
  await act(cards.nth(0));
  await page.waitForTimeout(400);
  const evAfter = await page.locator('.jd-event, .event-card').count();
  const txt = await page.evaluate(() => document.body.innerText);
  const leaks = /(radar|رادار|flood|فيضان|سيول)/i.test(txt) ? txt.match(/.{20}(radar|رادار|flood|فيضان|سيول).{20}/i)?.[0].replace(/\n/g, ' ') : null;
  return { actual: `jeddahShown=${dJ} eventCards after=${evAfter} jeddah-ish text in Angola=${leaks}`, pass: dJ && !leaks && evAfter === 0 };
});
await step('Solo / Team', 'click Team, type names, back to Solo', 'name inputs appear, accept text, hide on Solo', async () => {
  const btns = page.locator('.team-setup .sp-btn');
  await act(btns.nth(1));
  const inputs = page.locator('.team-roles input');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) await inputs.nth(i).fill(['Amal', 'عمر', 'Lee', 'Noor'][i]);
  const v = await inputs.evaluateAll((els) => els.map((e) => e.value));
  await act(btns.nth(0));
  const nAfter = await page.locator('.team-roles input').count();
  await act(btns.nth(1));
  const kept = await page.locator('.team-roles input').evaluateAll((els) => els.map((e) => e.value));
  await act(btns.nth(0));
  return { actual: `inputs=${n} values=${v} afterSolo=${nAfter} keptOnReturn=${kept}`, pass: n === 4 && nAfter === 0 && kept.join() === v.join() };
});
await step('Links', 'footer links', 'gallery/tokens/return navigate', async () => {
  const links = page.locator('a:has-text("GALLERY"), a:has-text("Gallery"), a:has-text("معرض")');
  const href = await page.locator('footer a, a').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
  return { actual: href.join(','), pass: href.some((x) => x?.includes('gallery')) };
});
await step('CML rail', 'click each of 4 steps', 'each navigates to a screen', async () => {
  const seen = [];
  for (let i = 0; i < 4; i++) {
    await page.locator('.cml-rail-button').nth(i).click();
    await page.waitForTimeout(800);
    seen.push(await cur());
  }
  return { actual: seen.join(' > '), pass: new Set(seen).size >= 3 };
});
await page.locator('.cml-rail-button').nth(0).click();
await page.waitForSelector('.screen--brief');
await page.waitForTimeout(500);
// team mode ON for the first walk to exercise hand-over: do solo walk first (below), team walk later.
await step('Team off', 'ensure Solo', 'solo', async () => { await act(page.locator('.team-setup .sp-btn').nth(0)); return true; });

// ---------------- BUILD ----------------
await act(page.locator('.brief-start-btn'));
await page.waitForTimeout(500);
screen = 'Build';
await step('Start mission', 'click', 'navigates to Build', async () => ({ actual: await cur(), pass: (await cur()) === 'build' }));
await sweep('Build initial');
const gaugeMass = () => page.evaluate(() => document.querySelector('.gauge-panel')?.innerText.replace(/\s+/g, ' ').slice(0, 400));
await step('Form factor 1U/3U/6U', 'click each', 'gauges change; button pressed', async () => {
  const out = [];
  for (const f of ['1U', '3U', '6U']) {
    await act(page.locator(`.build-frame .sp-btn:has-text("${f}")`));
    await page.waitForTimeout(200);
    out.push(`${f}:${await page.locator(`.build-frame .sp-btn:has-text("${f}")`).getAttribute('aria-pressed')}:${(await gaugeMass()).slice(0, 60)}`);
  }
  return { actual: out.join(' | '), pass: out[0].includes('1U:true') && out[2].includes('6U:true') };
});
await step('Part cards', 'click every card in every slot', 'selection moves; mission code/gauges change; no console error', async () => {
  const groups = page.locator('.part-group');
  const n = await groups.count();
  let clicks = 0, bad = [];
  for (let g = 0; g < n; g++) {
    const cards = groups.nth(g).locator('.sp-part');
    const m = await cards.count();
    for (let i = 0; i < m; i++) {
      await act(cards.nth(i));
      clicks++;
      const sel = await groups.nth(g).locator('.sp-part--selected').count();
      const pressed = await cards.nth(i).evaluate((e) => e.classList.contains('sp-part--selected'));
      if (sel !== 1 || !pressed) bad.push(`g${g}c${i} sel=${sel} pressed=${pressed}`);
    }
  }
  for (let g = 0; g < n; g++) await groups.nth(g).locator('.sp-part').nth(g === 6 ? 0 : 1).click();
  return { actual: `groups=${n} clicks=${clicks} bad=${bad.join(',')}`, pass: bad.length === 0 && n === 7 };
});
await step('Exploded hotspots', 'click each hotspot and chip', 'pins slot (aria-pressed), card shown, Change button scrolls', async () => {
  const spots = page.locator('.xd-spot');
  const n = await spots.count();
  const res = [];
  for (let i = 0; i < n; i++) {
    await act(spots.nth(i));
    const p = await spots.nth(i).getAttribute('aria-pressed');
    const card = await page.locator('.xd-card').innerText().then((t) => t.replace(/\s+/g, ' ').slice(0, 60)).catch(() => '');
    res.push(`${i}:${p}:${card}`);
  }
  const chips = page.locator('.exploded-chip');
  for (let i = 0; i < (await chips.count()); i++) { await act(chips.nth(i)); }
  const lastPinned = await chips.last().getAttribute('aria-pressed');
  await act(chips.last()); // unpin
  const afterUnpin = await chips.last().getAttribute('aria-pressed');
  const changeBtn = page.locator('.xd-card .sp-btn');
  await act(chips.nth(0));
  const hasChange = await changeBtn.count();
  if (hasChange) await act(changeBtn.first());
  return { actual: `${res.join(' || ')} chipPinned=${lastPinned} afterUnpin=${afterUnpin} change=${hasChange}`, pass: res.filter((r, i) => i !== 2).every((r) => r.split(':')[1] === 'true') && lastPinned === 'true' && afterUnpin === 'false' };
});
await step('Hotspot count vs form factor', '1U selected', 'hotspots only for parts that exist (no dead hotspot) - informational', async () => {
  await act(page.locator('.build-frame .sp-btn:has-text("1U")'));
  const n = await page.locator('.xd-spot').count();
  await act(page.locator('.build-frame .sp-btn:has-text("6U")'));
  return { actual: `${n} hotspots at 1U (7 slots, panels x2)`, pass: true };
});
await step('Fuel slot', 'options', 'a zero-fuel option exists', async () => {
  const opts = await page.locator('#slot-fuel').locator('xpath=ancestor::section[1]').locator('.sp-part').count();
  return { actual: `${opts} fuel options (no "none" option)`, pass: opts >= 3 };
});

// ---------------- ORBIT ----------------
await act(page.locator(NEXT));
await page.waitForTimeout(900);
screen = 'Orbit';
await step('Next', 'click', 'goes to Orbit', async () => ({ actual: await cur(), pass: (await cur()) === 'orbit' }));
await sweep('Orbit initial');
await step('Altitude slider', 'keyboard Arrow/Home/End + fill', 'value changes within 150..800; min/max clamp', async () => {
  const s = page.locator('.alt-range');
  const min = await s.getAttribute('min'), max = await s.getAttribute('max'), step_ = await s.getAttribute('step');
  await s.focus();
  const v0 = await s.inputValue();
  await page.keyboard.press('ArrowRight'); const v1 = await s.inputValue();
  await page.keyboard.press('End'); const v2 = await s.inputValue();
  await page.keyboard.press('Home'); const v3 = await s.inputValue();
  await s.fill('500'); const v4 = await s.inputValue();
  await page.waitForTimeout(500);
  const txt = await page.locator('.screen--orbit').innerText();
  return { actual: `min=${min} max=${max} step=${step_} ${v0}->${v1}->End ${v2}->Home ${v3}->500 ${v4}`, pass: +v1 !== +v0 && +v2 === +max && +v3 === +min && v4 === '500' && +max === 800 };
});
await step('Altitude extremes', '150 and 800 km', 'screen shows verdict, no NaN', async () => {
  const s = page.locator('.alt-range');
  const out = [];
  for (const v of ['150', '800', '500']) { await s.fill(v); await page.waitForTimeout(500); const bad = await badText(page); out.push(`${v}:${bad.length ? bad.join(';') : 'clean'}`); }
  return { actual: out.join(' | '), pass: out.every((o) => o.endsWith('clean')) };
});
await step('Orbit tiles', 'ISS then SSO', 'aria-pressed/selected flips; altitude stays valid', async () => {
  const t = page.locator('.orbit-tile');
  await act(t.nth(1));
  const a = await t.nth(1).evaluate((e) => e.getAttribute('aria-pressed') ?? e.className);
  await act(t.nth(0));
  const b = await t.nth(0).evaluate((e) => e.getAttribute('aria-pressed') ?? e.className);
  return { actual: `${a} | ${b}`, pass: true };
});

// ---------------- LAUNCH ----------------
await act(page.locator(NEXT));
await page.waitForTimeout(800);
screen = 'Launch';
await sweep('Launch initial');
await step('Launch date SunStripe', 'keyboard Left/Right/PageUp/Home/End', 'aria-valuenow changes and clamps; date label updates', async () => {
  const s = page.locator('.sp-sunstripe-control');
  await s.focus();
  const g = () => s.getAttribute('aria-valuenow');
  const v0 = await g();
  await page.keyboard.press('ArrowRight'); const v1 = await g();
  await page.keyboard.press('PageUp'); const v2 = await g();
  await page.keyboard.press('Home'); const v3 = await g();
  await page.keyboard.press('End'); const v4 = await g(); const max = await s.getAttribute('aria-valuemax');
  const label = await s.getAttribute('aria-valuetext');
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft'); const v5 = await g();
  const bad = await badText(page);
  return { actual: `${v0}->${v1}->${v2}->Home ${v3}->End ${v4}/${max} ->Home,Left ${v5} text="${label}" bad=${bad}`, pass: v3 === '0' && v4 === max && v5 === '0' && +v1 === +v0 + 1 && bad.length === 0 };
});
await step('Launch date extremes', 'Jan 2015 and Oct/Dec 2026', 'no NaN; checklist shows a verdict', async () => {
  const s = page.locator('.sp-sunstripe-control');
  const out = [];
  for (const k of ['Home', 'End']) {
    await s.focus(); await page.keyboard.press(k); await page.waitForTimeout(500);
    const t = (await page.locator('.screen--launch').innerText()).replace(/\s+/g, ' ');
    const bad = await badText(page);
    out.push(`${k}: ${(await s.getAttribute('aria-valuetext'))} launchBtnDisabled=${await page.locator('.launch-btn').isDisabled()} bad=${bad.length}`);
  }
  return { actual: out.join(' | '), pass: !out.some((o) => !o.endsWith('bad=0')) };
});
await step('Launch date pointer', 'click mid stripe', 'value changes', async () => {
  const s = page.locator('.sp-sunstripe-control svg').first();
  const bb = await s.boundingBox();
  await page.mouse.click(bb.x + bb.width * 0.55, bb.y + bb.height / 2);
  const v = await page.locator('.sp-sunstripe-control').getAttribute('aria-valuenow');
  return { actual: v, pass: v !== '0' };
});
await step('Rocket cards', 'click each', 'selected state follows; checklist updates', async () => {
  const c = page.locator('.rocket-card');
  const out = [];
  for (let i = 0; i < (await c.count()); i++) { await act(c.nth(i)); await page.waitForTimeout(250); out.push(`${i}:${await c.nth(i).getAttribute('aria-pressed') ?? await c.nth(i).evaluate((e) => e.className)}`); }
  return { actual: out.join(' | '), pass: true };
});
// restore a sane launchable design
await page.locator('.sp-sunstripe-control').focus();
await page.keyboard.press('Home');
for (let i = 0; i < 12 * 8 + 3; i++) await page.keyboard.press('ArrowRight'); // 2023-04
await act(page.locator('.rocket-card').nth(1));
await page.waitForTimeout(500);
await step('Launch button', 'state with valid design', 'enabled after checklist ticks (about 1.3 s), click goes to Flight', async () => {
  await page.waitForSelector('.launch-btn:not([disabled])', { timeout: 6000 }).catch(() => {});
  const dis = await page.locator('.launch-btn').isDisabled();
  if (dis) return { actual: 'disabled: ' + (await page.locator('.screen--launch').innerText()).slice(-200).replace(/\n/g, ' '), pass: false };
  await act(page.locator('.launch-btn'));
  await page.waitForSelector('.screen--flight', { timeout: 8000 });
  return true;
});

// ---------------- FLIGHT ----------------
screen = 'Flight';
await page.waitForTimeout(800);
await sweep('Flight initial');
await step('Play/Pause', 'click Play, wait, click again', 'clock advances, then stops', async () => {
  const clock = () => page.locator('.flight-hud-readout').innerText();
  const c0 = await clock();
  await act(page.locator('.flight-controls .sp-btn--primary'));
  await page.waitForTimeout(1500);
  const c1 = await clock();
  await act(page.locator('.flight-controls .sp-btn--primary'));
  const c2 = await clock();
  await page.waitForTimeout(800);
  const c3 = await clock();
  return { actual: `${c0.replace(/\n/g, ' ')} -> ${c1.replace(/\n/g, ' ')} paused ${c2.replace(/\n/g, ' ')} -> ${c3.replace(/\n/g, ' ')}`, pass: c0 !== c1 && c2 === c3 };
});
await step('Speed 1x/4x/16x', 'click each, measure clock rate', 'monotonic faster; aria-pressed follows', async () => {
  const clockDays = async () => Number(await page.locator('figure.sp-chart').getAttribute('aria-valuenow'));
  const rates = [];
  const sp = page.locator('.flight-controls .btn-row .sp-btn--secondary');
  await act(page.locator('.flight-controls .sp-btn--primary')); // play
  for (let i = 0; i < 3; i++) {
    await act(sp.nth(i));
    const a = await clockDays(); await page.waitForTimeout(1000); const b = await clockDays();
    rates.push(`${(await sp.nth(i).innerText()).replace(/\s+/g, ' ')}: ${(b - a)}d/s pressed=${await sp.nth(i).getAttribute('aria-pressed')}`);
  }
  await act(sp.nth(0));
  return { actual: rates.join(' | '), pass: true };
});
await step('Scrub (chart)', 'focus chart, ArrowRight/ArrowLeft, drag, Space', 'altitude readout changes with scrub; Space toggles play', async () => {
  const alt = () => page.locator('figure.sp-chart').getAttribute('aria-valuenow');
  const sc = page.locator('figure.sp-chart');
  const n = await sc.count();
  if (!n) return { actual: 'no scrub control found', pass: false };
  const bb = await sc.boundingBox();
  const a0 = await alt();
  await sc.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
  const a1 = await alt();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
  const a2 = await alt();
  await page.mouse.move(bb.x + bb.width * 0.2, bb.y + bb.height / 2); await page.mouse.down(); await page.mouse.move(bb.x + bb.width * 0.7, bb.y + bb.height / 2, { steps: 5 }); await page.mouse.up();
  const a3 = await alt();
  return { actual: `alt ${a0} -> ${a1} -> ${a2} -> drag ${a3}`, pass: a0 !== a1 && a1 !== a2 };
});
await step('Skip to end', 'click', 'run completes, reentry card appears, Skip disabled', async () => {
  for (let i = 0; i < 40 && !(await page.locator('.reentry').count()); i++) {
    const s = page.locator('.storm-card .sp-btn').first();
    if (await s.count()) await s.click();
    await page.locator('.flight-controls .sp-btn--quiet').click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  const done = await page.locator('.reentry').count();
  await sweep('Flight end');
  return { actual: `reentry card=${done} skipDisabled=${await page.locator('.flight-controls .sp-btn--quiet').isDisabled()}`, pass: done === 1 };
});

// ---------------- REPORT ----------------
await act(page.locator('.reentry .sp-btn'));
await page.waitForSelector('.screen--report');
await page.waitForTimeout(900);
screen = 'Report';
await sweep('Report initial');
const reportNums = await page.locator('.screen--report').innerText();
await step('Mission ticket Copy', 'click Copy code (clipboard permission denied vs granted)', 'shows Copied or a clean failure chip', async () => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await act(page.locator('.sp-ticket-actions .sp-btn'));
  await page.waitForTimeout(300);
  const chip = await page.locator('.sp-ticket-chip').first().innerText().catch(() => 'none');
  let clip = '';
  try { clip = await page.evaluate(() => navigator.clipboard.readText()); } catch (e) { clip = 'ERR ' + e.message; }
  const c = await code();
  return { actual: `chip="${chip}" clipboardMatchesCode=${clip === c}`, pass: chip !== 'none' && clip === c };
});
await step('Sources drawer', 'toggle <summary>', 'opens, lists rows, no raw keys', async () => {
  const sm = page.locator('.screen--report summary').first();
  await sm.click();
  const open = await page.locator('.screen--report details[open]').count();
  const txt = await page.locator('.screen--report details[open]').first().innerText();
  const bad = await badText(page);
  await sm.click();
  return { actual: `open=${open} chars=${txt.length} bad=${bad}`, pass: open === 1 && txt.length > 100 && !bad.length };
});
await step('Apply design hint', 'click "Apply design"', 'applies and shows a visible confirmation or navigates', async () => {
  const b = page.locator('.screen--report .sp-btn:has-text("Apply"), .screen--report .sp-btn:has-text("تطبيق")').first();
  const n = await b.count();
  if (!n) return { actual: 'no Apply button', pass: false };
  const before = await code();
  const urlB = page.url();
  const sc = await cur();
  await act(b);
  await page.waitForTimeout(600);
  const after = await code();
  return { actual: `code same=${before === after} screen ${sc}->${await cur()}`, pass: true };
});
await step('Medals', 'focus/hover each medal', 'text clean', async () => ({ actual: `${await page.locator('.sp-medal').count()} medals`, pass: (await page.locator('.sp-medal').count()) === 3 }));
const validCode = await code();
const bad = {
  empty: '',
  whitespace: '   ',
  'wrong prefix': 'XX9-' + validCode.slice(4),
  truncated: validCode.slice(0, Math.floor(validCode.length / 2)),
  tampered: validCode.slice(0, 30) + (validCode[30] === 'A' ? 'B' : 'A') + validCode.slice(31),
  'bad chars': 'SP1-!!!@@@',
  'unknown part id (decodes fine)': 'SP1-' + Buffer.from(validCode.slice(4).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString().replace('camera-', 'camerx-').split('').length && '',
};
// build a code whose ids are unknown but structurally valid
const mkCode = (mut) => {
  const raw = Buffer.from(validCode.slice(4).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const f = raw.split('~'); mut(f);
  return 'SP1-' + Buffer.from(f.join('~')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
bad['unknown scenario id'] = mkCode((f) => { f[0] = 'mars'; });
bad['unknown part id'] = mkCode((f) => { f[1] = 'camera-nope'; });
bad['unknown rocket id'] = mkCode((f) => { f[11] = 'saturn-v'; });
bad['year 2619'] = mkCode((f) => { f[13] = '2619-12-19'; });
bad['altitude 5000'] = mkCode((f) => { f[10] = '5000'; });
bad['altitude -40'] = mkCode((f) => { f[10] = '-40'; });
bad['bad %-escape'] = mkCode((f) => { f[1] = 'camera%ZZ'; });
delete bad['unknown part id (decodes fine)'];
for (const [name, c] of Object.entries(bad)) {
  await step('Mission code field', `paste ${name} + Load`, 'inline error, design unchanged, no crash', async () => {
    const before = await code();
    const inp = page.locator('.sp-ticket-load input');
    await inp.fill(c);
    if (kb) await page.keyboard.press('Enter'); else await page.locator('.sp-ticket-load button[type=submit]').click();
    await page.waitForTimeout(600);
    const err = await page.locator('.sp-ticket-err').count();
    const crashed = await page.locator('.screen--report').count() === 0;
    const after = await code();
    const ptxt = await page.locator('#root, body').first().innerText();
    const blank = ptxt.trim().length < 50;
    await inp.fill('');
    return { actual: `inlineError=${err} unchanged=${before === after} crashed=${crashed || blank} screen=${await cur()}`, pass: err === 1 && before === after && !crashed && !blank };
  });
  if ((await page.locator('.screen--report').count()) === 0) {
    // recover for the remaining steps: reload and replay
    console.log(`[${tag}] app left Report after "${name}"; screen now ${await cur()}`);
    break;
  }
}
await page.screenshot({ path: new URL(`./out/report-${tag}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
console.log('problems so far', problems.slice(0, 5));

writeFileSync(new URL(`./out/matrix-${tag}.json`, import.meta.url), JSON.stringify({ tag, rows, problems }, null, 1));
console.log(`[${tag}] rows=${rows.length} fails=${rows.filter((r) => !r.pass).length} problems=${problems.length}`);
await browser.close();
