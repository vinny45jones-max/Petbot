import { describe, it, expect } from 'vitest';
import { urlsetXml, sitemapIndexXml, shardIdFromFile } from '@/lib/sitemap-xml';

describe('urlsetXml', () => {
  it('сериализует url, lastmod, changefreq, priority и экранирует спецсимволы', () => {
    const xml = urlsetXml([
      { url: 'https://x.by/animals/a?b=1&c=2', lastModified: '2026-10-07T00:00:00.000Z', changeFrequency: 'daily', priority: 0.8 },
    ]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<loc>https://x.by/animals/a?b=1&amp;c=2</loc>');
    expect(xml).toContain('<lastmod>2026-10-07T00:00:00.000Z</lastmod>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('<priority>0.8</priority>');
  });

  it('добавляет image-namespace и image:loc для картинок', () => {
    const xml = urlsetXml([{ url: 'https://x.by/a', images: ['https://cdn/x.webp'] }]);
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(xml).toContain('<image:image><image:loc>https://cdn/x.webp</image:loc></image:image>');
  });
});

describe('sitemapIndexXml', () => {
  it('перечисляет шарды как /sitemap/<id>.xml', () => {
    const xml = sitemapIndexXml('https://x.by', [{ id: 'static' }, { id: 'animals-0' }]);
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('<loc>https://x.by/sitemap/static.xml</loc>');
    expect(xml).toContain('<loc>https://x.by/sitemap/animals-0.xml</loc>');
  });
});

describe('shardIdFromFile', () => {
  it('принимает только известные шарды с .xml', () => {
    expect(shardIdFromFile('animals-3.xml')).toBe('animals-3');
    expect(shardIdFromFile('static.xml')).toBe('static');
    expect(shardIdFromFile('organizations-0.xml')).toBe('organizations-0');
    expect(shardIdFromFile('intake-0.xml')).toBe('intake-0');
    expect(shardIdFromFile('animals-3')).toBeNull();
    expect(shardIdFromFile('evil.xml')).toBeNull();
  });
});
