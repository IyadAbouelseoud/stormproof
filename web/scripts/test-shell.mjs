import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enPath = path.resolve(__dirname, '../src/i18n/en.json');
const arPath = path.resolve(__dirname, '../src/i18n/ar.json');
const cssPath = path.resolve(__dirname, '../src/styles/app.css');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const css = fs.readFileSync(cssPath, 'utf8');

console.log('--- Testing Shell, Routing and CML Rail ---');

// 1. Verify 7 screens in i18n
const screens = ['brief', 'build', 'orbit', 'launch', 'flight', 'report', 'refly'];
for (const s of screens) {
  assert.ok(en[`screens.${s}`], `en missing screens.${s}`);
  assert.ok(ar[`screens.${s}`], `ar missing screens.${s}`);
}
console.log('✓ All 7 screens present in en.json and ar.json');

// 2. Verify CML steps in i18n
const cmlSteps = [
  'cml.cocktail_napkin',
  'cml.initial_feasibility',
  'cml.trade_space',
  'cml.point_design',
];
for (const step of cmlSteps) {
  assert.ok(en[step], `en missing ${step}`);
  assert.ok(ar[step], `ar missing ${step}`);
  console.log(`✓ CML step "${step}": ${en[step]} | ${ar[step]}`);
}

// 3. Verify segment tags
const segments = ['segment.user', 'segment.space', 'segment.ground', 'segment.launch'];
for (const seg of segments) {
  assert.ok(en[seg], `en missing ${seg}`);
  assert.ok(ar[seg], `ar missing ${seg}`);
  console.log(`✓ Segment "${seg}": ${en[seg]} | ${ar[seg]}`);
}

// 4. Verify CSS rules
// Buttons use lapis, NEVER sol
assert.ok(css.includes('--color-lapis'), 'app.css must use lapis for buttons');
assert.ok(css.includes('--color-on-lapis'), 'app.css must use on-lapis for button text');

// Ensure no button uses var(--color-sol) or var(--sol)
const buttonRules = css.match(/button[^{]*\{[^}]*\}/g) || [];
for (const rule of buttonRules) {
  assert.ok(!rule.includes('--color-sol') && !rule.includes('--sol'), `Button rule must not use sol: ${rule}`);
}
console.log('✓ Buttons use lapis, never sol.');

// Brass ticks in CML rail
assert.ok(css.includes('--color-brass'), 'app.css must use brass for CML ticks');
assert.ok(css.includes('.cml-brass-tick'), 'app.css must contain .cml-brass-tick styling');
console.log('✓ Brass ticks present in CML rail.');

// Check for CSS logical properties
const forbiddenPhysicalProps = ['margin-left', 'margin-right', 'padding-left', 'padding-right'];
for (const prop of forbiddenPhysicalProps) {
  assert.ok(!css.includes(prop + ':'), `Found physical property "${prop}" in app.css! Use logical properties only.`);
}
console.log('✓ Only CSS logical properties used (no physical margins/paddings).');

console.log('ALL SHELL & CML RAIL VERIFICATIONS PASSED.');
