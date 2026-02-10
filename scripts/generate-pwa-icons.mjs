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

  // Trim transparent/solid margins so the icon fills the canvas better.
  const logo = await sharp(srcPng)
    .ensureAlpha()
    .trim()
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

  // White base so launcher icons don't look like a small logo inside a dark blob.
  const bg = '#ffffff';

  // Standard icons (very tight)
  await makeIcon({ size: 192, filename: 'icon-192.png', paddingRatio: 0.03, bg });
  await makeIcon({ size: 512, filename: 'icon-512.png', paddingRatio: 0.03, bg });

  // Maskable icons (some padding so it doesn't get clipped by masks)
  await makeIcon({ size: 192, filename: 'maskable-192.png', paddingRatio: 0.12, bg });
  await makeIcon({ size: 512, filename: 'maskable-512.png', paddingRatio: 0.12, bg });

  // Apple touch icon (tight)
  await makeIcon({ size: 180, filename: 'apple-touch-icon.png', paddingRatio: 0.03, bg });

  // Simple favicon base from 64 -> will be used to generate ICO in the next step (if desired)
  await makeIcon({ size: 64, filename: 'favicon-64.png', paddingRatio: 0.02, bg });

  console.log('Generated PWA icons in public/pwa');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
