import { describe, it, expect } from 'vitest';
import { SITEMAP_CHUNK, sitemapShards, animalSitemapEntry } from '@/lib/sitemap-data';

describe('sitemapShards', () => {
  it('returns one shard per collection chunk plus static', () => {
    const shards = sitemapShards({ animals: 100, organizations: 5, intakeFacilities: 8 });
    expect(shards).toContainEqual({ id: 'static' });
    expect(shards.filter((s) => s.id.startsWith('animals')).length).toBe(Math.ceil(100 / SITEMAP_CHUNK));
  });
  it('splits large animal counts into multiple shards', () => {
    const shards = sitemapShards({ animals: SITEMAP_CHUNK * 2 + 1, organizations: 0, intakeFacilities: 0 });
    expect(shards.filter((s) => s.id.startsWith('animals')).length).toBe(3);
  });
});

describe('animalSitemapEntry', () => {
  it('builds url + lastModified + image', () => {
    const e = animalSitemapEntry({ slug: '1-reks', species: 'dog', updatedAt: '2026-05-01T00:00:00Z', city: { slug: 'minsk' }, media: [{ url: 'https://cdn/1.jpg' }] } as any, 'https://b');
    expect(e.url).toBe('https://b/animals/minsk/dog/1-reks');
    expect(e.lastModified).toBe('2026-05-01T00:00:00Z');
    expect((e as any).images).toEqual(['https://cdn/1.jpg']);
  });
});
