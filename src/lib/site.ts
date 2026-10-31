/**
 * 站点常量。与语言无关的部分放这里；需要翻译的文案在 lib/i18n.ts。
 */

export const site = {
  name: 'SealPack',
  tagline: {
    zh: '程序合并 / 加密 / 打包工作台',
    en: 'Merge, encrypt and package — one workbench',
  },
  url: 'https://sealpack.hmilyld.com',
  version: '0.2.0',
  license: 'MIT',
  repo: 'https://github.com/hmilyld/SealPack',
  releases: 'https://github.com/hmilyld/SealPack/releases',
  forum: 'https://forum.hmilyld.com/c/sealpack',
  author: 'hmilyld.com',
  authorUrl: 'https://hmilyld.com/',
} as const;
