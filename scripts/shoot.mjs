/**
 * 给构建产物拍图，用来肉眼过一遍版式。
 *
 * 用法：node scripts/shoot.mjs [--only=doc-light]
 * 产物写入 shots/（该目录不进版本库）。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { launch } from './lib/cdp.mjs';
import { startServer } from './lib/serve.mjs';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'shots');

const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);

const shots = [
  { name: 'home-light', url: '/', width: 1440, height: 980, full: true },
  { name: 'home-dark', url: '/', width: 1440, height: 980, full: true, dark: true },
  { name: 'home-en', url: '/en', width: 1440, height: 980, full: true },
  { name: 'doc-light', url: '/docs/intro', width: 1440, height: 980, full: true },
  { name: 'doc-dark', url: '/docs/intro', width: 1440, height: 980, full: true, dark: true },
  { name: 'doc-en', url: '/en/docs/intro', width: 1440, height: 980, full: true },
  { name: 'doc-options', url: '/docs/encrypt-options', width: 1440, height: 980, full: true },
  { name: 'doc-narrow', url: '/docs/intro', width: 900, height: 1000, full: false },
  { name: 'doc-mobile', url: '/docs/intro', width: 390, height: 844, full: false },
];

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const server = await startServer(path.join(root, 'dist'));
  const session = await launch({ profileDir: path.join(root, '.edge-profile') });

  try {
    for (const shot of shots) {
      if (only && shot.name !== only) continue;

      await session.goto(server.origin + shot.url, {
        width: shot.width,
        height: shot.height,
        dark: shot.dark,
      });

      let clip;
      if (shot.full) {
        const { cssContentSize } = await session.page.send('Page.getLayoutMetrics');
        clip = {
          x: 0,
          y: 0,
          width: shot.width,
          height: Math.min(cssContentSize.height, 8000),
          scale: 1,
        };
      }

      const { data } = await session.page.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: Boolean(shot.full),
        ...(clip ? { clip } : {}),
      });

      await fs.writeFile(path.join(outDir, `${shot.name}.png`), Buffer.from(data, 'base64'));
      console.log(`${shot.name}.png  ${shot.width}×${clip ? Math.round(clip.height) : shot.height}`);
    }
  } finally {
    session.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
