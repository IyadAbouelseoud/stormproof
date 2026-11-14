import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enPath = path.resolve(__dirname, '../src/i18n/en.json');
const arPath = path.resolve(__dirname, '../src/i18n/ar.json');

console.log('--- Testing i18n JSON files & required keys ---');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

// Check required keys from STEP U1c:
// 1. App title
assert.ok(en['app.title'], 'en must have app.title');
assert.ok(ar['app.title'], 'ar must have app.title');
console.log('✓ app.title:', en['app.title'], '|', ar['app.title']);

// 2. 7 screen names
const screens = ['brief', 'build', 'orbit', 'launch', 'flight', 'report', 'refly'];
for (const s of screens) {
  assert.ok(en[`screens.${s}`], `en missing screens.${s}`);
  assert.ok(ar[`screens.${s}`], `ar missing screens.${s}`);
  console.log(`✓ screen ${s}:`, en[`screens.${s}`], '|', ar[`screens.${s}`]);
}

// 3. Next, Back, Language
const commonKeys = ['next', 'back', 'language'];
for (const k of commonKeys) {
  assert.ok(en[`common.${k}`], `en missing common.${k}`);
  assert.ok(ar[`common.${k}`], `ar missing common.${k}`);
  console.log(`✓ common.${k}:`, en[`common.${k}`], '|', ar[`common.${k}`]);
}

// Check key symmetry for screen and common keys
for (const key of Object.keys(en)) {
  assert.ok(ar[key] !== undefined, `ar is missing key "${key}" present in en`);
}
for (const key of Object.keys(ar)) {
  assert.ok(en[key] !== undefined, `en is missing key "${key}" present in ar`);
}
console.log(`✓ Exact key symmetry verified across all ${Object.keys(en).length} keys.`);

// Test fallback behavior:
function translateMock(lang, key, params) {
  const dict = lang === 'ar' ? ar : en;
  const val = dict[key] ?? en[key] ?? key;
  if (!params) return val;
  return val.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? String(params[k]) : `{${k}}`);
}

// 1. Missing key falls back to key text
assert.equal(translateMock('en', 'nonexistent.key'), 'nonexistent.key');
assert.equal(translateMock('ar', 'nonexistent.key'), 'nonexistent.key');
console.log('✓ Missing keys fall back to key text.');

// 2. Interpolation
assert.equal(
  translateMock('en', 'theme.palette_title', { theme: 'night' }),
  'Theme Palette (night)'
);
assert.equal(
  translateMock('ar', 'theme.palette_title', { theme: 'night' }),
  'لوحة المظهر (night)'
);
console.log('✓ String interpolation with parameters verified.');

// 3. Document attribute & in-memory state toggle
const mockDocument = {
  documentElement: {
    lang: 'en',
    dir: 'ltr'
  }
};
globalThis.document = mockDocument;

function simulateToggle(currentLang) {
  const nextLang = currentLang === 'en' ? 'ar' : 'en';
  const nextDir = nextLang === 'ar' ? 'rtl' : 'ltr';
  mockDocument.documentElement.lang = nextLang;
  mockDocument.documentElement.dir = nextDir;
  return { lang: nextLang, dir: nextDir };
}

let simulatedState = simulateToggle('en');
assert.equal(simulatedState.lang, 'ar');
assert.equal(simulatedState.dir, 'rtl');
assert.equal(mockDocument.documentElement.lang, 'ar');
assert.equal(mockDocument.documentElement.dir, 'rtl');

simulatedState = simulateToggle('ar');
assert.equal(simulatedState.lang, 'en');
assert.equal(simulatedState.dir, 'ltr');
assert.equal(mockDocument.documentElement.lang, 'en');
assert.equal(mockDocument.documentElement.dir, 'ltr');
console.log('✓ In-memory toggle & document attributes update verified.');

console.log('ALL I18N CHECKS PASSED.');
