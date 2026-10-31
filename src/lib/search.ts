import { render } from 'astro:content';
import { docUrl, getDocs } from './docs';
import type { Locale } from './i18n';

export type SearchItem = {
  url: string;
  title: string;
  group: string;
  kind: 'page' | 'heading';
  text: string;
};

/** 把 MDX 源码压成可以搜索的纯文本：去掉代码块、JSX 标签与 Markdown 记号 */
function plain(mdx: string): string {
  return mdx
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[>*_`|]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function buildIndex(locale: Locale): Promise<SearchItem[]> {
  const docs = await getDocs(locale);
  const items: SearchItem[] = [];

  for (const entry of docs) {
    const { headings } = await render(entry as never);
    const body = plain(entry.body ?? '');
    const base = { group: entry.data.group, url: docUrl(entry, locale) };

    items.push({
      ...base,
      title: entry.data.title,
      kind: 'page',
      text: `${entry.data.description} ${body}`,
    });

    for (const heading of headings) {
      if (heading.depth !== 2) continue;
      items.push({
        ...base,
        url: `${base.url}#${heading.slug}`,
        title: heading.text,
        kind: 'heading',
        text: `${entry.data.title} ${entry.data.description}`,
      });
    }
  }

  return items;
}

export function jsonResponse(items: SearchItem[]): Response {
  return new Response(JSON.stringify(items), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
