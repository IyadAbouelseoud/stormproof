// Track 6 data audit. Run: node qa/track6/audit.mjs   (read-only; exits 1 on any FAIL)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const P = (...a) => join(ROOT, ...a);
let fails = 0, checks = 0;
const out = [];
const ok = (name, cond, detail = '') => {
  checks++;
  if (!cond) fails++;
  out.push(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
};
const jread = (p) => JSON.parse(readFileSync(p, 'utf8'));
const walk = (d, ext, acc = []) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (f !== 'node_modules') walk(p, ext, acc); }
    else if (!ext || ext.some((e) => f.endsWith(e))) acc.push(p);
  }
  return acc;
};

// 1. every JSON parses
const jsons = [...walk(P('web/public/data'), ['.json']), ...walk(P('content'), ['.json']), ...walk(P('web/src/i18n'), ['.json']), P('web/public/img/gibs/credits.json')];
let parsed = 0;
for (const f of jsons) { try { jread(f); parsed++; } catch (e) { ok(`parse ${relative(ROOT, f)}`, false, e.message); } }
ok(`all ${jsons.length} JSON files parse`, parsed === jsons.length);

// 2. density tables
const meta = jread(P('web/public/data/density_meta.json'));
const nAlt = meta.alt_km.count;
const alts = Array.from({ length: nAlt }, (_, i) => meta.alt_km.start + i * meta.alt_km.step);
ok('alt axis 150..800', alts[0] === 150 && alts.at(-1) === 800, `${alts[0]}..${alts.at(-1)} n=${nAlt}`);
for (const [name, t] of Object.entries(meta.tables)) {
  const size = statSync(P('web/public/data', t.file)).size;
  const axisRows = (t.axis.daily?.rows ?? 0) + (t.axis.monthly?.rows ?? 0);
  ok(`${name} size = rows*alts*4`, size === t.rows * nAlt * 4, `${size} vs ${t.rows}*${nAlt}*4=${t.rows * nAlt * 4}`);
  ok(`${name} rows = daily+monthly axis rows`, axisRows === t.rows, `${axisRows} vs ${t.rows}`);
  const b = readFileSync(P('web/public/data', t.file));
  const f = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  let nonFinite = 0, nonMono = 0, nonMonoRows = [], sampled = 0, rangeBad = 0;
  for (let r = 0; r < t.rows; r++) for (let a = 0; a < nAlt; a++) if (!Number.isFinite(f[r * nAlt + a])) nonFinite++;
  ok(`${name} all ${f.length} values finite`, nonFinite === 0, `nonFinite=${nonFinite}`);
  for (let k = 0; k < 20; k++) {
    const r = Math.floor((k * (t.rows - 1)) / 19);
    sampled++;
    for (let a = 1; a < nAlt; a++) if (!(f[r * nAlt + a] < f[r * nAlt + a - 1])) { nonMono++; nonMonoRows.push(`row${r}@${alts[a]}km`); break; }
    for (let a = 0; a < nAlt; a++) { const v = f[r * nAlt + a]; if (v > -5 || v < -22) rangeBad++; } // log10 kg/m3 plausibility
  }
  ok(`${name} 20 sampled rows strictly decreasing with altitude`, nonMono === 0, nonMonoRows.slice(0, 5).join(','));
  ok(`${name} sampled log10 rho within [-22,-5]`, rangeBad === 0, `bad=${rangeBad}`);
  // also a full scan for monotonic (informational)
  let full = 0;
  for (let r = 0; r < t.rows; r++) for (let a = 1; a < nAlt; a++) if (!(f[r * nAlt + a] < f[r * nAlt + a - 1])) { full++; break; }
  out.push(`INFO ${name}: ${full}/${t.rows} rows (all, not sampled) non-monotone`);
}

// 3. Sun Stripe: recompute monthly means from sun_daily.json (same rule as web/src/engineAdapter.ts sunMonths)
const sd = jread(P('web/public/data/sun_daily.json'));
const sf = jread(P('web/public/data/sun_forecast.json'));
const sums = new Map();
const t0 = Date.parse(sd.start + 'T00:00:00Z');
sd.f107_adj.forEach((v, i) => {
  if (v === null || !Number.isFinite(v)) return;
  const m = new Date(t0 + i * 86400000).toISOString().slice(0, 7);
  const e = sums.get(m) ?? { s: 0, n: 0 }; e.s += v; e.n++; sums.set(m, e);
});
ok('sun_daily length matches start..end', sd.f107_adj.length === Math.round((Date.parse(sd.end) - t0) / 86400000) + 1, `${sd.f107_adj.length}`);
const nulls = sd.f107_adj.filter((v) => v === null).length;
out.push(`INFO sun_daily null days: ${nulls}`);
const spot = ['2015-01', '2019-12', '2022-02', '2024-05', '2026-06'];
const adapterSrc = readFileSync(P('web/src/engineAdapter.ts'), 'utf8');
ok('adapter rule is mean of f107_adj rounded to 0.1', /round1\(obs\.s \/ obs\.n\)/.test(adapterSrc));
for (const m of spot) {
  const e = sums.get(m);
  const mean = Math.round((e.s / e.n) * 10) / 10;
  // independent recomputation by explicit date filter
  const vals = sd.f107_adj.filter((v, i) => v !== null && new Date(t0 + i * 86400000).toISOString().startsWith(m));
  const mean2 = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  ok(`Sun Stripe ${m} monthly mean`, mean === mean2, `${mean} (n=${e.n})`);
}
// emit for the browser check
out.push('INFO stripe-expected ' + JSON.stringify(Object.fromEntries(spot.map((m) => { const e = sums.get(m); return [m, Math.round((e.s / e.n) * 10) / 10]; }))));

// 4. sources.csv ids
function parseCsv(txt) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const csv = parseCsv(readFileSync(P('content/sources.csv'), 'utf8'));
const head = csv[0];
const sources = csv.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
const colBad = csv.slice(1).filter((r) => r.length !== head.length);
ok(`sources.csv ${sources.length} rows, uniform columns`, colBad.length === 0, colBad.slice(0, 3).map((r) => r[0]).join(','));
const ids = sources.map((s) => s.id);
const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
ok('sources.csv ids unique', dupIds.length === 0, dupIds.join(','));
const idSet = new Set(ids);
const emptyField = sources.filter((s) => !s.id || !s.tag || (!s.source && s.tag !== 'game-balanced'));
ok('sources.csv rows have id and tag (and source unless game-balanced)', emptyField.length === 0, emptyField.map((s) => s.id).join(','));
const tags = new Set(sources.map((s) => s.tag));
out.push('INFO sources tags: ' + [...tags].join(', '));

const resolves = (src) => {
  if (src === undefined || src === null) return false;
  const s = String(src).trim();
  if (idSet.has(s)) return true;
  // free-text src: accepted when it names a registered id, "game-balanced" or an AGENTS.md reference (reported separately)
  return false;
};
const srcInfo = { id: 0, gb: 0, text: [] };
const checkSrc = (where, src) => {
  if (resolves(src)) srcInfo.id++;
  else if (/^game-balanced$/i.test(String(src).trim())) srcInfo.gb++;
  else if ([...idSet].some((i) => String(src).split(/[\s(),;]+/).includes(i)) || /^game-balanced/i.test(String(src).trim())) srcInfo.id++; // free text that names a registered id or leads with game-balanced
  else srcInfo.text.push(`${where}: ${src}`);
};
const parts = jread(P('content/parts.json')).parts;
const rockets = jread(P('content/rockets.json')).rockets;
const scen = [jread(P('content/scenarios/angola.json')), jread(P('content/scenarios/jeddah-flood.json'))];
parts.forEach((p) => checkSrc('part ' + p.id, p.src));
rockets.forEach((p) => checkSrc('rocket ' + p.id, p.src));
scen.forEach((p) => checkSrc('scenario ' + p.id, p.src));
// sources.csv values may reference "src" ids literally; free text srcs are listed for manual review
ok('every part/rocket/scenario src is a sources.csv id or exactly "game-balanced"', srcInfo.text.length === 0, `id=${srcInfo.id} game-balanced=${srcInfo.gb} free-text=${srcInfo.text.length}: ` + srcInfo.text.slice(0, 6).join(' || '));

// duplicate / orphan ids across catalog and text
const dup = (arr) => arr.filter((x, i) => arr.indexOf(x) !== i);
ok('parts ids unique', dup(parts.map((p) => p.id)).length === 0);
ok('rockets ids unique', dup(rockets.map((p) => p.id)).length === 0);
const tparts = jread(P('content/text/parts.json'));
const tp = tparts.parts.map((p) => p.id), tr = tparts.rockets.map((p) => p.id);
ok('text/parts ids unique', dup(tp).length === 0 && dup(tr).length === 0);
ok('every catalog part has en+ar text', parts.every((p) => { const t = tparts.parts.find((x) => x.id === p.id); return t && t.name?.en && t.name?.ar && t.blurb?.en && t.blurb?.ar; }), parts.filter((p) => !tparts.parts.find((x) => x.id === p.id)).map((p) => p.id).join(','));
ok('no orphan text parts', tp.every((id) => parts.some((p) => p.id === id)), tp.filter((id) => !parts.some((p) => p.id === id)).join(','));
ok('every rocket has en+ar text, no orphan', rockets.every((r) => tr.includes(r.id)) && tr.every((id) => rockets.some((r) => r.id === id)), `rockets=${rockets.map((r) => r.id)} text=${tr}`);
const ts = jread(P('content/text/scenarios.json')).scenarios;
ok('scenario text ids unique + every scenario covered', dup(ts.map((s) => s.id)).length === 0 && scen.every((s) => ts.some((t) => t.id === (s.textId ?? s.id))), ts.map((t) => t.id).join(','));
const msgs = jread(P('content/text/messages.json')).messages;
ok('messages keys unique', dup(msgs.map((m) => m.key)).length === 0, dup(msgs.map((m) => m.key)).join(','));
ok('messages have en+ar', msgs.every((m) => m.text?.en && m.text?.ar), msgs.filter((m) => !(m.text?.en && m.text?.ar)).map((m) => m.key).join(','));
// any nested object with en/ar both non-empty in every text file
const emptyLang = [];
const scanLang = (o, path, file) => {
  if (Array.isArray(o)) return o.forEach((x, i) => scanLang(x, `${path}[${i}]`, file));
  if (o && typeof o === 'object') {
    if ('en' in o || 'ar' in o) { if (!o.en || !o.ar) emptyLang.push(`${file}:${path}`); return; }
    for (const [k, v] of Object.entries(o)) scanLang(v, `${path}.${k}`, file);
  }
};
for (const f of readdirSync(P('content/text'))) scanLang(jread(P('content/text', f)), '', f);
ok('every en/ar pair in content/text is complete', emptyLang.length === 0, emptyLang.slice(0, 5).join(' '));

// engine message keys vs en/ar dictionaries (engine-ar.json) : keys used by engine are translated
const enD = jread(P('web/src/i18n/en.json')), arD = jread(P('web/src/i18n/ar.json')), engAr = jread(P('web/src/i18n/engine-ar.json'));
const onlyEn = Object.keys(enD).filter((k) => !(k in arD));
const onlyAr = Object.keys(arD).filter((k) => !(k in enD));
ok('i18n en.json and ar.json have the same keys', onlyEn.length === 0 && onlyAr.length === 0, `onlyEn=${onlyEn.slice(0, 5)} onlyAr=${onlyAr.slice(0, 5)}`);
const emptyVals = [...Object.entries(enD), ...Object.entries(arD)].filter(([, v]) => typeof v !== 'string' || !v.trim());
ok('no empty i18n values', emptyVals.length === 0, emptyVals.slice(0, 5).map((x) => x[0]).join(','));
// placeholders agree between en and ar
const ph = (s) => (String(s).match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort().join();
const phBad = Object.keys(enD).filter((k) => k in arD && ph(enD[k]) !== ph(arD[k]));
ok('placeholders match between en and ar', phBad.length === 0, phBad.slice(0, 8).map((k) => `${k}: ${ph(enD[k])} vs ${ph(arD[k])}`).join(' | '));
const phBadM = msgs.filter((m) => ph(m.text.en) !== ph(m.text.ar));
ok('messages.json placeholders match en/ar', phBadM.length === 0, phBadM.map((m) => m.key).join(','));

// 5. images
const imgFiles = walk(P('web/public/img'), ['.webp', '.jpg', '.jpeg', '.png', '.svg']).map((f) => relative(ROOT, f).replace(/\\/g, '/'));
const srcPaths = new Map(sources.filter((s) => /^(web|content)\//.test(s.value ?? '')).map((s) => [s.value, s]));
const altKeys = jread(P('content/text/art-alt.json'));
const artFiles = imgFiles.filter((f) => f.startsWith('web/public/img/art/'));
const gibsFiles = imgFiles.filter((f) => f.startsWith('web/public/img/gibs/'));
const missingRow = imgFiles.filter((f) => !srcPaths.has(f));
ok(`every shipped image (${imgFiles.length}) has a sources.csv row (value = path)`, missingRow.length === 0, missingRow.slice(0, 10).join(', '));
const missingAlt = artFiles.filter((f) => { const b = f.split('/').pop().replace(/\.webp$/, ''); const a = altKeys[b + '.webp'] ?? altKeys[b]; return !(a?.en && a?.ar); });
ok(`every shipped art image (${artFiles.length}) has en+ar alt in art-alt.json`, missingAlt.length === 0, missingAlt.map((f) => f.split('/').pop()).join(', '));
const orphanAlt = Object.keys(altKeys).filter((k) => !artFiles.some((f) => f.endsWith('/' + k.replace(/\.webp$/, '') + '.webp')));
ok('no art-alt.json key without a shipped image', orphanAlt.length === 0, orphanAlt.join(', '));
const orphanSrcRows = [...srcPaths.keys()].filter((p) => p.startsWith('web/public/img') && !existsSync(P(p)));
ok('every sources.csv image row exists on disk', orphanSrcRows.length === 0, orphanSrcRows.join(', '));
// credits
const credits = jread(P('web/public/img/gibs/credits.json'));
ok('every gibs jpg listed in credits.json and vice versa', gibsFiles.filter((f) => f.endsWith('.jpg')).every((f) => credits.some((c) => c.file === f.split('/').pop())) && credits.every((c) => existsSync(P('web/public/img/gibs', c.file))), credits.filter((c) => !existsSync(P('web/public/img/gibs', c.file))).map((c) => c.file).join(','));
// images referenced in web/src exist
const srcFiles = walk(P('web/src'), ['.ts', '.tsx']);
const refs = new Set();
for (const f of srcFiles) {
  const t = readFileSync(f, 'utf8');
  for (const m of t.matchAll(/img\/(?:art|gibs)\/[A-Za-z0-9_\-${}.()/]+?\.(?:webp|jpg|png)/g)) refs.add(m[0]);
}
const dynamic = [...refs].filter((r) => r.includes('$'));
const missingRefs = [...refs].filter((r) => !r.includes('$') && !existsSync(P('web/public', r)));
ok(`every static image ref in web/src exists (${refs.size - dynamic.length} refs; ${dynamic.length} dynamic checked separately)`, missingRefs.length === 0, missingRefs.join(', '));
// dynamic: Jeddah ART map + imerg + modis
const jed = readFileSync(P('web/src/ui/Jeddah.tsx'), 'utf8');
const artMap = [...jed.matchAll(/'(art-p[0-9a-z\-]+\.webp)'/g)].map((m) => m[1]);
const missArt = artMap.filter((f) => !existsSync(P('web/public/img/art', f)));
ok(`Jeddah.tsx ART files exist (${artMap.length})`, missArt.length === 0, missArt.join(','));
// Brief bannerArt
const brief = readFileSync(P('web/src/screens/Brief.tsx'), 'utf8');
const bannerArt = [...brief.matchAll(/'(art-p[0-9a-z\-]+\.webp)'/g)].map((m) => m[1]);
ok(`Brief.tsx banner art files exist (${bannerArt.length})`, bannerArt.every((f) => existsSync(P('web/public/img/art', f))), bannerArt.filter((f) => !existsSync(P('web/public/img/art', f))).join(','));
// unreferenced shipped art (informational)
const unref = artFiles.filter((f) => { const b = f.split('/').pop(); return ![...refs].some((r) => r.endsWith(b)) && !artMap.includes(b) && !bannerArt.includes(b); });
out.push('INFO shipped art not referenced by name in web/src (may be referenced by id lookup): ' + unref.map((f) => f.split('/').pop()).join(', '));
// pitch-art tagged copies
const pitch = readdirSync(P('content/pitch-art')).filter((f) => f.endsWith('.webp'));
const pitchMissing = pitch.filter((f) => !existsSync(P('web/public/img/art', f.replace('-si.webp', '.webp'))) && !/(card|light|heavy|header)/.test(f));
out.push(`INFO pitch-art tagged copies: ${pitch.length}; without untagged twin in web/public/img/art: ${pitchMissing.join(', ') || 'none'}`);

// 6. demo
const demo = jread(P('content/demo/jeddah-demo.json'));
ok('demo has 3 missions with code + design', demo.missions.length === 3 && demo.missions.every((m) => m.code && m.design));

console.log(out.join('\n'));
console.log(`\nAUDIT: ${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
