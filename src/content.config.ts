import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/** 两种语言各一份 schema：分组名本身就是本地化的，英文文档里写英文组名 */
const base = {
  title: z.string(),
  /** 一句话说明，出现在文档头、搜索结果与首页索引里 */
  description: z.string(),
  /** 组内顺序，从 1 开始 */
  order: z.number().int().positive(),
};

const docsZh = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/docs/zh' }),
  schema: z.object({ ...base, group: z.enum(['概览', '上手', '参考', '深入']) }),
});

const docsEn = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/docs/en' }),
  schema: z.object({
    ...base,
    group: z.enum(['Overview', 'Getting started', 'Reference', 'Internals']),
  }),
});

export const collections = { docsZh, docsEn };
