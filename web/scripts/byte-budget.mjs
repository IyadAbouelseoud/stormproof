// Prompt H byte budget: new shipped bytes vs a baseline dist (default: the v1.0-rc2 build in ../../wt-base/web/dist).
// New bytes = files not in the baseline + growth of files that exist in both + growth of the hashed JS/CSS bundles.
// Usage: pnpm build && node scripts/byte-budget.mjs [baselineDist]   Fails above 900 KB.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const NEW = path.resolve(here, '../dist');
const OLD = path.resolve(process.argv[2] ?? path.resolve(here, '../../../wt-base/web/dist'));
const LIMIT = 900 * 1024;
const walk = (dir, base = dir, out = new Map()) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.set(path.relative(base, p).split(path.sep).join('/'), fs.statSync(p).size);
  }
  return out;
};
const a = walk(OLD);
const b = walk(NEW);
const total = (m) => [...m.values()].reduce((s, v) => s + v, 0);
const bundle = (m, ext) => [...m].filter(([k]) => k.startsWith('assets/') && k.endsWith(ext)).reduce((s, [, v]) => s + v, 0);
let added = 0;
const rows = [];
for (const [k, v] of b) {
  if (k.startsWith('assets/') && (k.endsWith('.js') || k.endsWith('.css'))) continue;
  const old = a.get(k);
  if (old === undefined) { added += v; rows.push([k, v, 'new']); }
  else if (v > old) { added += v - old; rows.push([k, v - old, 'grew']); }
}
for (const ext of ['.js', '.css']) {
  const d = bundle(b, ext) - bundle(a, ext);
  if (d > 0) { added += d; rows.push([`assets/*${ext}`, d, 'bundle growth']); }
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
rows.sort((x, y) => y[1] - x[1]).slice(0, 40).forEach(([k, v, why]) => console.log(`${kb(v).padStart(10)}  ${why.padEnd(14)} ${k}`));
console.log(`dist before ${kb(total(a))}, after ${kb(total(b))}`);
console.log(`NEW SHIPPED BYTES: ${kb(added)} (limit ${kb(LIMIT)})`);
process.exit(added > LIMIT ? 1 : 0);
