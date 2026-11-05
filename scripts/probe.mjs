/**
 * 版式与交互探针。
 *
 * 没有前端单元测试的站点，安全网只能是「量出来的断言」而不是「看起来对」。
 * 这里跑两组：
 *
 *   A. 静态检查 —— 直接读 dist/ 的 HTML，核对内部链接与锚点是否都存在；
 *   B. 浏览器检查 —— 用 CDP 量计算样式与几何，核对版式、字体、主题、搜索。
 *
 * 用法：node scripts/probe.mjs      （退出码 0 通过 / 1 失败）
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { launch } from './lib/cdp.mjs';
import { startServer } from './lib/serve.mjs';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const root = path.resolve(here, '..');
const dist = path.join(root, 'dist');

const failures = [];
let passed = 0;

function check(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function contrast(rgb1, rgb2) {
  const lum = ([r, g, b]) => {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const a = lum(rgb1);
  const b = lum(rgb2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function parseColor(value) {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  return m[1].split(/[,\s/]+/).slice(0, 3).map(Number);
}

/* ------------------------------------------------------------------ A. 静态 */

async function staticChecks() {
  console.log('\nA. 内部链接与锚点');
  const files = (await walk(dist)).filter((f) => f.endsWith('.html'));
  const ids = new Map();

  for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }

  const missingPages = [];
  const missingAnchors = [];
  let linkCount = 0;

  for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    for (const m of html.matchAll(/href="(\/[^"#?]*)(#[^"]*)?"/g)) {
      const href = m[1];
      if (
        !href.startsWith('/docs') &&
        !href.startsWith('/en') &&
        href !== '/' &&
        !href.startsWith('/shots')
      ) {
        continue;
      }
      linkCount++;

      let target = href === '/' ? path.join(dist, 'index.html') : path.join(dist, href);
      let stat = await fs.stat(target).catch(() => null);
      if (stat?.isDirectory() || !stat) {
        target = path.join(target, 'index.html');
        stat = await fs.stat(target).catch(() => null);
      }
      if (!stat) {
        missingPages.push(`${path.relative(dist, file)} → ${href}`);
        continue;
      }

      const anchor = m[2]?.slice(1);
      if (anchor && ids.has(target) && !ids.get(target).has(anchor)) {
        missingAnchors.push(`${path.relative(dist, file)} → ${href}#${anchor}`);
      }
    }
  }

  check(`内部链接 ${linkCount} 条均可解析`, missingPages.length === 0, missingPages.slice(0, 4).join('; '));
  check('锚点均存在', missingAnchors.length === 0, missingAnchors.slice(0, 4).join('; '));

  const docFiles = files.filter(
    (f) => f.includes(`${path.sep}docs${path.sep}`) && !f.endsWith('docs/index.html'),
  );
  const zhDocs = docFiles.filter((f) => !f.includes(`${path.sep}en${path.sep}`));
  const enDocs = docFiles.filter((f) => f.includes(`${path.sep}en${path.sep}`));
  check(`中文文档 ${zhDocs.length} 篇`, zhDocs.length >= 12, `只有 ${zhDocs.length} 篇`);
  check(`英文文档 ${enDocs.length} 篇`, enDocs.length >= 12, `只有 ${enDocs.length} 篇`);

  const slug = (f) => path.basename(path.dirname(f));
  const zhSlugs = new Set(zhDocs.map(slug));
  const enSlugs = new Set(enDocs.map(slug));
  const missingEn = [...zhSlugs].filter((s) => !enSlugs.has(s));
  const missingZh = [...enSlugs].filter((s) => !zhSlugs.has(s));
  check('中英文篇目一一对应', missingEn.length === 0 && missingZh.length === 0, `缺英文: ${missingEn.join(',')} 缺中文: ${missingZh.join(',')}`);

  const badH1 = [];
  for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    if (html.includes('http-equiv="refresh"')) continue; // 重定向页
    const count = (html.match(/<h1[\s>]/g) ?? []).length;
    if (count !== 1) badH1.push(`${path.relative(dist, file)}=${count}`);
  }
  check('每页恰好一个 h1', badH1.length === 0, badH1.slice(0, 4).join(', '));

  const sitemap = await fs.readFile(path.join(dist, 'sitemap.xml'), 'utf8').catch(() => '');
  check(
    'sitemap 含两种语言与 hreflang',
    sitemap.includes('/en/docs/intro') && sitemap.includes('hreflang="en"') && sitemap.includes('/docs/intro'),
    `${sitemap.length} 字节`,
  );

  const missingImgs = [];
  const usedImgs = new Set();
  for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    for (const m of html.matchAll(/<img[^>]+src="(\/[^"]+)"/g)) {
      usedImgs.add(m[1]);
      if (!(await fs.stat(path.join(dist, m[1])).catch(() => null))) {
        missingImgs.push(`${path.relative(dist, file)} → ${m[1]}`);
      }
    }
  }
  check(
    `图片引用全部存在（${usedImgs.size} 张）`,
    missingImgs.length === 0,
    missingImgs.slice(0, 4).join('; '),
  );
  check('截图至少用上 10 张', usedImgs.size >= 10, `${usedImgs.size}`);

  return files;
}

/* -------------------------------------------------------------- B. 浏览器 */

async function browserChecks(origin) {
  const session = await launch({ profileDir: path.join(root, '.edge-profile') });
  const page = session.page;

  const metrics = async (url, { width = 1440, height = 980, dark = false } = {}) => {
    await session.goto(origin + url, { width, height, dark });
    return page.evaluate(`(() => {
      const cs = (el, p) => getComputedStyle(el).getPropertyValue(p);
      // DOMRect 的属性挂在原型上，returnByValue 会序列化成 {} —— 必须摊平成普通对象
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, left: r.left, right: r.right, top: r.top, width: r.width, height: r.height };
      };
      const h2 = document.querySelector('.prose h2');
      let textLeft = null;
      if (h2) {
        const walker = document.createTreeWalker(h2, NodeFilter.SHOW_TEXT);
        const node = walker.nextNode();
        if (node) {
          const range = document.createRange();
          range.selectNodeContents(node);
          textLeft = range.getBoundingClientRect().left;
        }
      }
      const canvas = document.createElement('canvas').getContext('2d');
      canvas.font = '400 40px "Instrument Sans"';
      const w400 = canvas.measureText('Hamburgefonstiv').width;
      canvas.font = '600 40px "Instrument Sans"';
      const w600 = canvas.measureText('Hamburgefonstiv').width;

      return {
        innerWidth,
        lang: document.documentElement.lang,
        alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [
          l.getAttribute('hreflang'),
          l.getAttribute('href'),
        ]),
        railHrefs: [...document.querySelectorAll('.rail__link')].map((a) => a.getAttribute('href')),
        metaText: document.querySelector('.doc-meta')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
        scrollWidth: document.documentElement.scrollWidth,
        theme: document.documentElement.dataset.theme,
        themeMode: document.documentElement.dataset.themeMode,
        headerH: box(document.querySelector('.site-header'))?.height ?? 0,
        rail: box(document.querySelector('.rail')),
        toc: box(document.querySelector('.toc')),
        article: box(document.querySelector('.article')),
        h2: h2 ? { left: box(h2).left, paddingLeft: cs(h2, 'padding-left'), textLeft } : null,
        imgs: [...document.images].map((i) => ({ src: i.currentSrc, w: i.naturalWidth })),
        tables: [...document.querySelectorAll('.prose table')].map((t) => ({
          scrollWidth: t.scrollWidth,
          clientWidth: t.parentElement.clientWidth,
        })),
        fontFamily: cs(document.body, 'font-family'),
        monoFamily: cs(document.querySelector('.doc-kicker') ?? document.body, 'font-family'),
        w400, w600,
        bodyColor: cs(document.body, 'color'),
        bodyBg: cs(document.body, 'background-color'),
        mutedColor: cs(document.querySelector('.doc-lede') ?? document.body, 'color'),
        h1Weight: cs(document.querySelector('.doc-title') ?? document.body, 'font-weight'),
        h2Count: document.querySelectorAll('.prose h2').length,
        h1Count: document.querySelectorAll('h1').length,
      };
    })()`);
  };

  console.log('\nB. 版式（1440 宽）');
  const light = await metrics('/docs/intro');
  check('无横向溢出', light.scrollWidth <= light.innerWidth + 1, `${light.scrollWidth} > ${light.innerWidth}`);
  check('顶栏高度 60px', light.headerH === 60, `${light.headerH}`);
  check('左栏 258px', Math.round(light.rail?.width ?? 0) === 258, `${light.rail?.width}`);
  check('右栏 196px', Math.round(light.toc?.width ?? 0) === 196, `${light.toc?.width}`);
  check('正文不压到右栏', (light.article?.right ?? 0) <= (light.toc?.left ?? 0) + 1);
  check('正文不压到左栏', (light.article?.left ?? 0) >= (light.rail?.right ?? 0) - 1);
  check('图片全部加载', light.imgs.every((i) => i.w > 0), light.imgs.filter((i) => i.w === 0).map((i) => i.src).join(','));
  check('表格不溢出容器', light.tables.every((t) => t.scrollWidth <= t.clientWidth + 1), JSON.stringify(light.tables));
  check('h2 编号不压正文', light.h2 ? light.h2.textLeft >= light.h2.left + 40 : true, JSON.stringify(light.h2));
  check(
    'h2 编号栏不越过正文左边界',
    light.h2 ? light.h2.left >= (light.rail?.right ?? 0) - 1 : true,
    `h2.left=${Math.round(light.h2?.left ?? 0)} rail.right=${Math.round(light.rail?.right ?? 0)}`,
  );
  check(
    'h2 编号栏宽度 40–60px',
    light.h2 ? light.h2.textLeft - light.h2.left <= 60 : true,
    `${Math.round((light.h2?.textLeft ?? 0) - (light.h2?.left ?? 0))}px`,
  );
  check('每页恰好一个 h1', light.h1Count === 1, `${light.h1Count}`);
  check('文档有 h2 分节', light.h2Count >= 2, `${light.h2Count}`);

  const forumUrl = 'https://forum.hmilyld.com/c/sealpack';
  const forum = await page.evaluate(`(() => {
    const rail = document.querySelector('.rail__ext');
    const r = rail?.getBoundingClientRect();
    const footer = document.querySelector('.site-footer__links a[href="${forumUrl}"]');
    return {
      railHref: rail?.getAttribute('href') ?? null,
      railTarget: rail?.getAttribute('target') ?? null,
      railRel: rail?.getAttribute('rel') ?? null,
      railVisible: Boolean(r && r.width > 0 && r.height > 0),
      railText: rail?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
      footerHref: footer?.getAttribute('href') ?? null,
    };
  })()`);
  check('侧栏有论坛入口且指向正确地址', forum.railHref === forumUrl, String(forum.railHref));
  check('侧栏论坛入口可见', forum.railVisible === true);
  check('论坛入口在新标签页打开且带 noopener', forum.railTarget === '_blank' && /noopener/.test(forum.railRel ?? ''), `${forum.railTarget} / ${forum.railRel}`);
  check('论坛入口标注了站外域名', forum.railText.includes('forum.hmilyld.com'), forum.railText);
  check('页脚也有论坛入口', forum.footerHref === forumUrl, String(forum.footerHref));

  console.log('\nC. 字体');
  check('正文字体是 Instrument Sans', light.fontFamily.includes('Instrument Sans'), light.fontFamily);
  check('等宽字体是 JetBrains Mono', light.monoFamily.includes('JetBrains Mono'), light.monoFamily);
  check('Instrument Sans 已加载', await page.evaluate(`document.fonts.check('16px "Instrument Sans"')`));
  check(
    '可变字重生效（600 比 400 宽）',
    light.w600 > light.w400 + 0.5,
    `400=${light.w400.toFixed(1)} 600=${light.w600.toFixed(1)}`,
  );
  check('h1 字重 600', light.h1Weight === '600', light.h1Weight);

  console.log('\nD. 对比度（浅色）');
  const bodyContrast = contrast(parseColor(light.bodyColor), parseColor(light.bodyBg));
  const mutedContrast = contrast(parseColor(light.mutedColor), parseColor(light.bodyBg));
  check('正文对比度 ≥ 7', bodyContrast >= 7, bodyContrast.toFixed(2));
  check('次级文字对比度 ≥ 4.5', mutedContrast >= 4.5, mutedContrast.toFixed(2));

  console.log('\nE. 暗色');
  const dark = await metrics('/docs/intro', { dark: true });
  check('跟随系统进入暗色', dark.theme === 'dark', dark.theme);
  const darkContrast = contrast(parseColor(dark.bodyColor), parseColor(dark.bodyBg));
  const darkMuted = contrast(parseColor(dark.mutedColor), parseColor(dark.bodyBg));
  check('暗色正文对比度 ≥ 7', darkContrast >= 7, darkContrast.toFixed(2));
  check('暗色次级文字对比度 ≥ 4.5', darkMuted >= 4.5, darkMuted.toFixed(2));
  check('暗色背景不是纯黑', dark.bodyBg !== 'rgb(0, 0, 0)', dark.bodyBg);

  console.log('\nF. 交互');
  await session.goto(origin + '/docs/intro');
  const toggle = await page.evaluate(`(() => {
    const btn = document.querySelector('[data-theme-toggle]');
    const root = document.documentElement;
    const seen = [];
    btn.click(); seen.push([root.dataset.themeMode, root.dataset.theme, localStorage.getItem('sealpack-docs:theme')]);
    btn.click(); seen.push([root.dataset.themeMode, root.dataset.theme, localStorage.getItem('sealpack-docs:theme')]);
    btn.click(); seen.push([root.dataset.themeMode, root.dataset.theme, localStorage.getItem('sealpack-docs:theme')]);
    return { seen, label: document.querySelector('[data-theme-label]').textContent };
  })()`);
  check(
    '主题按钮循环 自动→浅色→深色→自动',
    toggle.seen[0][0] === 'light' && toggle.seen[1][0] === 'dark' && toggle.seen[2][0] === 'auto',
    JSON.stringify(toggle.seen),
  );
  check('手动选择写入 localStorage', toggle.seen[0][2] === 'light', String(toggle.seen[0][2]));
  check('按钮文字跟随模式', toggle.label === '自动', toggle.label);

  const search = await page.evaluate(`(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    const dialog = document.getElementById('search-dialog');
    const opened = dialog.open;
    const input = document.querySelector('[data-search-input]');
    input.value = 'LZMA';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));
    const items = [...document.querySelectorAll('.search-item')].map((a) => a.getAttribute('href'));
    dialog.close();
    await new Promise((r) => setTimeout(r, 60));
    return { opened, count: items.length, first: items[0] ?? null, afterClose: document.getElementById('search-dialog').open, cleared: input.value };
  })()`);
  check('Ctrl+K 打开搜索', search.opened === true);
  check('搜索 LZMA 有结果', search.count > 0, `${search.count}`);
  check('搜索结果显示链接', Boolean(search.first), String(search.first));
  check('关闭后清空输入', search.cleared === '', `"${search.cleared}"`);

  const toc = await page.evaluate(`(async () => {
    window.scrollTo(0, 1600);
    await new Promise((r) => setTimeout(r, 250));
    const active = document.querySelector('.toc__link.is-active');
    return { active: active?.getAttribute('data-toc-link') ?? null, count: document.querySelectorAll('.toc__link').length };
  })()`);
  check('本页目录滚动高亮', Boolean(toc.active), `${toc.count} 项`);
  check('本页目录不为空', toc.count >= 2, `${toc.count}`);

  console.log('\nG. 窄屏');
  const narrow = await metrics('/docs/intro', { width: 900, height: 1000 });
  check('900px 下隐藏右栏', narrow.toc === null || narrow.toc.width === 0);
  check('900px 下无横向溢出', narrow.scrollWidth <= narrow.innerWidth + 1, `${narrow.scrollWidth}`);

  const mobile = await metrics('/docs/intro', { width: 390, height: 844 });
  check('390px 下隐藏左栏', mobile.rail === null || mobile.rail.width === 0);
  check('390px 下无横向溢出', mobile.scrollWidth <= mobile.innerWidth + 1, `${mobile.scrollWidth}`);
  check('390px 下正文占满', (mobile.article?.width ?? 0) > 300, `${mobile.article?.width}`);

  const home = await metrics('/', { width: 1440, height: 980 });
  check('首页无横向溢出', home.scrollWidth <= home.innerWidth + 1, `${home.scrollWidth}`);
  check('首页图片全部加载', home.imgs.every((i) => i.w > 0));

  const homeMobile = await metrics('/', { width: 390, height: 844 });
  check('首页窄屏无横向溢出', homeMobile.scrollWidth <= homeMobile.innerWidth + 1, `${homeMobile.scrollWidth}`);

  console.log('\nH. 中英双语');
  check('中文页 html lang 为 zh-CN', light.lang === 'zh-CN', light.lang);
  check(
    '中文页声明了 en 与 x-default',
    light.alternates.some(([l]) => l === 'en') && light.alternates.some(([l]) => l === 'x-default'),
    JSON.stringify(light.alternates),
  );
  check(
    'hreflang 指向对应的英文页',
    light.alternates.find(([l]) => l === 'en')?.[1]?.endsWith('/en/docs/intro') === true,
    String(light.alternates.find(([l]) => l === 'en')?.[1]),
  );

  const en = await metrics('/en/docs/intro');
  check('英文页 html lang 为 en', en.lang === 'en', en.lang);
  check('英文页无横向溢出', en.scrollWidth <= en.innerWidth + 1, `${en.scrollWidth}`);
  check('英文页正文字体一致', en.fontFamily.includes('Instrument Sans'), en.fontFamily);
  check('英文页 h1 字重 600', en.h1Weight === '600', en.h1Weight);
  check(
    '英文页侧栏链接全部在 /en 下',
    en.railHrefs.length > 0 && en.railHrefs.every((h) => h?.startsWith('/en/docs/')),
    en.railHrefs.slice(0, 3).join(','),
  );
  check('英文页元信息是英文', en.metaText.includes('min read'), en.metaText);
  check(
    '英文页 hreflang 指回中文',
    en.alternates.find(([l]) => l === 'zh-CN')?.[1]?.endsWith('/docs/intro') === true,
    String(en.alternates.find(([l]) => l === 'zh-CN')?.[1]),
  );
  check('英文页 h2 编号栏同样生效', en.h2 ? en.h2.textLeft >= en.h2.left + 40 : true, JSON.stringify(en.h2));

  const switchLink = await page.evaluate(`(() => {
    const a = document.querySelector('.hbtn--lang');
    return { href: a?.getAttribute('href') ?? null, text: a?.textContent?.trim() ?? null };
  })()`);
  check('英文页的语言切换指向中文', switchLink.href === '/docs/intro', String(switchLink.href));
  check('语言切换按钮文案是中文', switchLink.text === '中文', String(switchLink.text));

  const enSearch = await page.evaluate(`(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    const input = document.querySelector('[data-search-input]');
    input.value = 'LZMA';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));
    const items = [...document.querySelectorAll('.search-item')].map((a) => a.getAttribute('href'));
    document.getElementById('search-dialog').close();
    return { count: items.length, first: items[0] ?? null };
  })()`);
  check('英文搜索有结果', enSearch.count > 0, `${enSearch.count}`);
  check('英文搜索结果是 /en 链接', enSearch.first?.startsWith('/en/docs/') === true, String(enSearch.first));

  check('无控制台错误', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 3).join(' | '));

  session.close();
}

async function main() {
  const server = await startServer(dist);
  try {
    await staticChecks();
    await browserChecks(server.origin);
  } finally {
    await server.close();
  }

  console.log(`\n${failures.length === 0 ? 'PASS' : 'FAIL'}  ${passed} 项通过，${failures.length} 项失败`);
  if (failures.length > 0) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
