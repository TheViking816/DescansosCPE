import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
// Prefer the app icon if present, fallback to other brand images.
const srcPng =
  (await fs.stat(path.join(root, 'assets', 'icono_pwa.png')).then(() => path.join(root, 'assets', 'icono_pwa.png')).catch(() => null))
  ?? (await fs.stat(path.join(root, 'assets', 'descansoscpe.png')).then(() => path.join(root, 'assets', 'descansoscpe.png')).catch(() => null))
  ?? path.join(root, 'assets', 'logo.png');
const outDir = path.join(root, 'public', 'pwa');

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function baseCanvas(size, bg) {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  });
}

async function makeIcon({ size, filename, paddingRatio, bg }) {
  const padding = Math.round(size * paddingRatio);
  const content = size - padding * 2;

  const logo = await sharp(srcPng)
    .ensureAlpha()
    .resize(content, content, { fit: 'contain' })
    .png()
    .toBuffer();

  const outPath = path.join(outDir, filename);
  await baseCanvas(size, bg)
    .composite([{ input: logo, left: padding, top: padding }])
    .png()
    .toFile(outPath);
}

async function main() {
  await ensureDir(outDir);

  // Dark maritime base similar to current UI
  const bg = '#0a0f1a';

  // Standard icons (tight)
  await makeIcon({ size: 192, filename: 'icon-192.png', paddingRatio: 0.12, bg });
  await makeIcon({ size: 512, filename: 'icon-512.png', paddingRatio: 0.12, bg });

  // Maskable icons (more padding so it doesn't get clipped)
  await makeIcon({ size: 192, filename: 'maskable-192.png', paddingRatio: 0.22, bg });
  await makeIcon({ size: 512, filename: 'maskable-512.png', paddingRatio: 0.22, bg });

  // Apple touch icon (slightly tighter)
  await makeIcon({ size: 180, filename: 'apple-touch-icon.png', paddingRatio: 0.12, bg });

  // Simple favicon base from 64 -> will be used to generate ICO in the next step (if desired)
  await makeIcon({ size: 64, filename: 'favicon-64.png', paddingRatio: 0.18, bg });

  console.log('Generated PWA icons in public/pwa');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
