import { getCollection } from 'astro:content';
import { docPath, groupIndex, type Locale } from './i18n';

/** 两种语言的条目结构一致，这里只保留渲染真正用到的字段 */
export type Doc = {
  id: string;
  body?: string;
  data: {
    title: string;
    description: string;
    group: string;
    order: number;
  };
};

/** 全部文档，按「分组顺序 → 组内序号」排好 */
export async function getDocs(locale: Locale): Promise<Doc[]> {
  const entries =
    locale === 'en' ? await getCollection('docsEn') : await getCollection('docsZh');

  return (entries as unknown as Doc[]).sort((a, b) => {
    const g = groupIndex(locale, a.data.group) - groupIndex(locale, b.data.group);
    return g !== 0 ? g : a.data.order - b.data.order;
  });
}

export function docUrl(entry: Doc, locale: Locale): string {
  return docPath(locale, entry.id);
}

/**
 * 粗估阅读时长：中文按 340 字/分钟，英文按 200 词/分钟。
 * 只用来在文档头给一个量级，不追求精确。
 */
export function readingTime(body: string | undefined, locale: Locale = 'zh'): number {
  const text = body ?? '';
  if (locale === 'en') {
    const words = (text.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) ?? []).length;
    return Math.max(1, Math.round(words / 200));
  }
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const words = (text.match(/[A-Za-z0-9_]+/g) ?? []).length;
  return Math.max(1, Math.round(cjk / 340 + words / 180));
}

/** 文档在本组里的序号，用于「参考 · 03」这类标号 */
export function docIndexLabel(entry: Doc, all: Doc[]): string {
  const same = all.filter((d) => d.data.group === entry.data.group);
  const i = same.findIndex((d) => d.id === entry.id);
  return String(i + 1).padStart(2, '0');
}
