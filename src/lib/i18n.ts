/**
 * 双语文案与路径。
 *
 * 中文是默认语言，挂在根路径上（`/docs/intro`）；英文挂在 `/en` 下
 * （`/en/docs/intro`）。这样中文站的 URL 保持原样，英文站也不用二级域名。
 */

export const LOCALES = ['zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'zh';

/** 侧栏分组顺序 —— 同时决定首页「文档」索引的顺序 */
export const GROUP_ORDER: Record<Locale, readonly string[]> = {
  zh: ['概览', '上手', '参考', '深入'],
  en: ['Overview', 'Getting started', 'Reference', 'Internals'],
};

export function groupIndex(locale: Locale, group: string): number {
  const i = GROUP_ORDER[locale].indexOf(group);
  return i === -1 ? GROUP_ORDER[locale].length : i;
}

export const ui = {
  zh: {
    htmlLang: 'zh-CN',
    langLabel: '中文',
    switchTo: 'EN',
    switchAria: 'Switch to English',
    skip: '跳到正文',
    crumbRoot: '文档',
    brandSuffix: 'DOCS',
    search: '搜索',
    searchAria: '搜索文档',
    searchPlaceholder: 'AppId、LZMA、不变量、语言包…',
    searchHint: '↑ ↓ 选择 · Enter 打开 · 中英文都能搜',
    searchEmpty: '没有匹配的条目。换个更短的关键词试试。',
    toc: '本页',
    tocEmpty: '—',
    prev: '← 上一篇',
    next: '下一篇 →',
    version: '适用于 v',
    minutes: (n: number) => `约 ${n} 分钟`,
    headingSuffix: '小节',
    themeAria: (label: string) => `主题：${label}，点击切换`,
    theme: { auto: '自动', light: '浅色', dark: '深色' },
    navAria: '文档目录',
    tocAria: '本页目录',
    pagerAria: '文档翻页',
    community: '社区',
    forum: '论坛',
    forumHost: 'forum.hmilyld.com',
    footerNote:
      '本手册对应 SealPack 的最新版本。文档里的命令行输出、路径与截图都来自真实构建；涉及外部工具行为的结论，以各工具官方文档为准。',
    notFound: {
      kicker: 'HTTP 404',
      title: '这一页不存在',
      lede: '链接可能来自旧版本，或者标题改过。左边目录是全量的，也可以从下面这几篇开始。',
      home: '回到文档开头',
      root: '站点首页',
      recent: '可以试试这几篇',
    },
  },
  en: {
    htmlLang: 'en',
    langLabel: 'English',
    switchTo: '中文',
    switchAria: '切换到中文',
    skip: 'Skip to content',
    crumbRoot: 'Docs',
    brandSuffix: 'DOCS',
    search: 'Search',
    searchAria: 'Search the docs',
    searchPlaceholder: 'AppId, LZMA, invariant, language pack…',
    searchHint: '↑ ↓ to select · Enter to open · both languages are indexed',
    searchEmpty: 'No matches. Try a shorter keyword.',
    toc: 'On this page',
    tocEmpty: '—',
    prev: '← Previous',
    next: 'Next →',
    version: 'For v',
    minutes: (n: number) => `${n} min read`,
    headingSuffix: 'section',
    themeAria: (label: string) => `Theme: ${label}. Click to switch`,
    theme: { auto: 'Auto', light: 'Light', dark: 'Dark' },
    navAria: 'Documentation',
    tocAria: 'On this page',
    pagerAria: 'Pagination',
    community: 'Community',
    forum: 'Forum',
    forumHost: 'forum.hmilyld.com',
    footerNote:
      'This manual tracks the latest SealPack release. Command output, paths and screenshots come from real builds; where external tools are involved, their own documentation is authoritative.',
    notFound: {
      kicker: 'HTTP 404',
      title: 'This page does not exist',
      lede: 'The link may be from an older version, or the title changed. The sidebar lists everything; these are a good place to restart.',
      home: 'Start from the intro',
      root: 'Site home',
      recent: 'Try one of these',
    },
  },
} as const;

export type Dict = (typeof ui)[Locale];

export function docPath(locale: Locale, slug: string): string {
  return locale === 'zh' ? `/docs/${slug}` : `/en/docs/${slug}`;
}

export function homePath(locale: Locale): string {
  return locale === 'zh' ? '/' : '/en';
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'zh' ? 'en' : 'zh';
}

/** 同一个页面在另一种语言下的地址（用于语言切换与 hreflang） */
export function alternate(pathname: string, locale: Locale): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (locale === 'en') {
    return clean === '/' ? '/en' : `/en${clean}`;
  }
  const stripped = clean.replace(/^\/en(?=\/|$)/, '');
  return stripped === '' ? '/' : stripped;
}
