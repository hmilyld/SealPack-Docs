import type { APIRoute } from 'astro';
import { getDocs } from '~/lib/docs';
import { docPath, homePath } from '~/lib/i18n';
import { site } from '~/lib/site';

/** 每条 URL 都带上两种语言的 alternate，搜索引掣不会把两份当成重复内容 */
export const GET: APIRoute = async () => {
  const [zh, en] = await Promise.all([getDocs('zh'), getDocs('en')]);

  const entries = [
    ...zh.map((d) => ({ path: docPath('zh', d.id), alt: docPath('en', d.id) })),
    ...en.map((d) => ({ path: docPath('en', d.id), alt: docPath('zh', d.id) })),
    { path: homePath('zh'), alt: homePath('en') },
    { path: homePath('en'), alt: homePath('zh') },
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
  .map(
    ({ path, alt }) => `  <url>
    <loc>${site.url}${path}</loc>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${site.url}${path.startsWith('/en') ? alt : path}" />
    <xhtml:link rel="alternate" hreflang="en" href="${site.url}${path.startsWith('/en') ? path : alt}" />
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
