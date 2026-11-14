import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokensPath = path.resolve(__dirname, '../../design/tokens.json');
const outputPath = path.resolve(__dirname, '../src/styles/tokens.css');

const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

let css = `/**
 * STORMPROOF Design Tokens
 * AUTO-GENERATED from design/tokens.json. DO NOT EDIT DIRECTLY.
 * Run "pnpm tokens" in web/ to regenerate.
 */

:root {
  /* Fonts */
  --font-display: ${tokens.fonts.display};
  --font-display-ar: ${tokens.fonts['display-ar']};
  --font-text: ${tokens.fonts.text};
  --font-text-ar: ${tokens.fonts['text-ar']};
  --font-mono: ${tokens.fonts.mono};

  /* Spacing */
`;

for (const [key, val] of Object.entries(tokens.spacing)) {
  css += `  --space-${key}: ${val};\n`;
}

css += `\n  /* Radius */\n`;
for (const [key, val] of Object.entries(tokens.radius)) {
  css += `  --radius-${key}: ${val};\n`;
}

css += `\n  /* Durations */\n`;
for (const [key, val] of Object.entries(tokens.durations)) {
  css += `  --${key}: ${val};\n`;
}

css += `\n  /* Sun Stripe Scale */\n`;
tokens.sunstripe.forEach((hex, i) => {
  css += `  --sunstripe-${i}: ${hex};\n`;
});

css += `}\n\n`;

// Paper theme (default)
css += `/* Paper Theme (Default) */\n:root, [data-theme="paper"] {\n`;
for (const [key, val] of Object.entries(tokens.colors.paper)) {
  css += `  --color-${key}: ${val};\n`;
  css += `  --${key}: ${val};\n`;
}
css += `}\n\n`;

// Night theme
css += `/* Night Theme */\n[data-theme="night"] {\n`;
for (const [key, val] of Object.entries(tokens.colors.night)) {
  css += `  --color-${key}: ${val};\n`;
  css += `  --${key}: ${val};\n`;
}
css += `}\n\n`;

// Typography helper classes
css += `/* Typography Utility Classes */\n`;
for (const [styleName, rules] of Object.entries(tokens.typography)) {
  css += `.type-${styleName} {\n`;
  if (rules.fontFamily) css += `  font-family: ${rules.fontFamily};\n`;
  if (rules.fontSize) css += `  font-size: ${rules.fontSize};\n`;
  if (rules.lineHeight) css += `  line-height: ${rules.lineHeight};\n`;
  if (rules.fontWeight) css += `  font-weight: ${rules.fontWeight};\n`;
  if (rules.textTransform) css += `  text-transform: ${rules.textTransform};\n`;
  if (rules.letterSpacing) css += `  letter-spacing: ${rules.letterSpacing};\n`;
  css += `}\n\n`;
}

// Arabic font overrides
css += `/* Arabic font family fallbacks */
:lang(ar), [lang="ar"] {
  --font-display: ${tokens.fonts['display-ar']};
  --font-text: ${tokens.fonts['text-ar']};
}

:lang(ar) .type-label, [lang="ar"] .type-label {
  letter-spacing: normal;
}
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, css, 'utf8');
console.log(`Generated tokens: ${outputPath}`);
