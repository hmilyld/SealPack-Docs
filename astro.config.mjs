import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./src', import.meta.url));

// 自定义代码高亮配色，与站点本身的纸白 / 朱红一致（见 src/lib/shiki-theme.ts）。
import { paperTheme, inkTheme } from './src/lib/shiki-theme.ts';

export default defineConfig({
  site: 'https://sealpack.hmilyld.com',
  integrations: [mdx()],
  redirects: {
    '/docs': '/docs/intro',
    '/en/docs': '/en/docs/intro',
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '~': root,
      },
    },
  },
  markdown: {
    shikiConfig: {
      themes: { light: paperTheme, dark: inkTheme },
      wrap: false,
    },
  },
});
