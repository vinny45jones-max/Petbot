import type { MetadataRoute } from 'next';
import type { ShardId } from '@/lib/sitemap-data';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';

export function urlsetXml(entries: MetadataRoute.Sitemap): string {
  const body = entries
    .map((e) => {
      const parts = [`<loc>${esc(e.url)}</loc>`];
      if (e.lastModified) parts.push(`<lastmod>${esc(new Date(e.lastModified).toISOString())}</lastmod>`);
      if (e.changeFrequency) parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
      if (e.priority !== undefined) parts.push(`<priority>${e.priority}</priority>`);
      for (const img of e.images ?? []) parts.push(`<image:image><image:loc>${esc(img)}</image:loc></image:image>`);
      return `<url>${parts.join('')}</url>`;
    })
    .join('\n');
  return `${HEAD}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}

export function sitemapIndexXml(base: string, shards: ShardId[]): string {
  const body = shards.map((s) => `<sitemap><loc>${esc(`${base}/sitemap/${s.id}.xml`)}</loc></sitemap>`).join('\n');
  return `${HEAD}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function shardIdFromFile(file: string): string | null {
  const m = /^(static|organizations-0|intake-0|animals-\d+)\.xml$/.exec(file);
  return m ? m[1] : null;
}
