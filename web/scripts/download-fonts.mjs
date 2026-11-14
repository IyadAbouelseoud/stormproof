import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.resolve(__dirname, '../public/fonts');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const downloads = [
  // Big Shoulders Display (800)
  {
    url: 'https://raw.githubusercontent.com/fontsource/font-files/main/fonts/google/big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff2',
    dest: 'big-shoulders-display-latin-800.woff2',
  },
  {
    url: 'https://raw.githubusercontent.com/fontsource/font-files/main/fonts/google/big-shoulders-display/files/big-shoulders-display-latin-ext-800-normal.woff2',
    dest: 'big-shoulders-display-latin-ext-800.woff2',
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/bigshouldersdisplay/OFL.txt',
    dest: 'OFL-BigShouldersDisplay.txt',
  },


  // IBM Plex Sans
  {
    url: 'https://raw.githubusercontent.com/IBM/plex/master/packages/plex-sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2',
    dest: 'IBMPlexSans-Regular.woff2',
  },
  {
    url: 'https://raw.githubusercontent.com/IBM/plex/master/packages/plex-sans/fonts/complete/woff2/IBMPlexSans-SemiBold.woff2',
    dest: 'IBMPlexSans-SemiBold.woff2',
  },
  {
    url: 'https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt',
    dest: 'OFL-IBMPlexSans.txt',
  },

  // IBM Plex Sans Arabic
  {
    url: 'https://raw.githubusercontent.com/IBM/plex/master/packages/plex-sans-arabic/fonts/complete/woff2/IBMPlexSansArabic-Regular.woff2',
    dest: 'IBMPlexSansArabic-Regular.woff2',
  },
  {
    url: 'https://raw.githubusercontent.com/IBM/plex/master/packages/plex-sans-arabic/fonts/complete/woff2/IBMPlexSansArabic-SemiBold.woff2',
    dest: 'IBMPlexSansArabic-SemiBold.woff2',
  },
  {
    url: 'https://raw.githubusercontent.com/IBM/plex/master/packages/plex-sans-arabic/fonts/complete/woff2/IBMPlexSansArabic-Bold.woff2',
    dest: 'IBMPlexSansArabic-Bold.woff2',
  },
  {
    url: 'https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt',
    dest: 'OFL-IBMPlexSansArabic.txt',
  },

  // IBM Plex Mono
  {
    url: 'https://raw.githubusercontent.com/IBM/plex/master/packages/plex-mono/fonts/complete/woff2/IBMPlexMono-Regular.woff2',
    dest: 'IBMPlexMono-Regular.woff2',
  },
  {
    url: 'https://raw.githubusercontent.com/IBM/plex/master/packages/plex-mono/fonts/complete/woff2/IBMPlexMono-Medium.woff2',
    dest: 'IBMPlexMono-Medium.woff2',
  },
  {
    url: 'https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt',
    dest: 'OFL-IBMPlexMono.txt',
  },
];

async function downloadAll() {
  console.log(`Starting font downloads to ${fontsDir}...`);
  for (const item of downloads) {
    const destPath = path.join(fontsDir, item.dest);
    console.log(`Fetching ${item.dest} from ${item.url}...`);
    const res = await fetch(item.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) {
      throw new Error(`Failed to download ${item.url}: status ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    console.log(`  Saved ${item.dest} (${buffer.length} bytes)`);
  }
  console.log('All fonts and licenses downloaded successfully.');
}

downloadAll().catch((err) => {
  console.error('Download failed:', err);
  process.exit(1);
});
