import fs from 'node:fs/promises';
import path from 'node:path';
import pngToIco from 'png-to-ico';

const root = process.cwd();

async function main() {
  const src = path.join(root, 'public', 'pwa', 'favicon-64.png');
  const out = path.join(root, 'public', 'favicon.ico');
  const icoBuf = await pngToIco(src);
  await fs.writeFile(out, icoBuf);
  console.log('Generated public/favicon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

