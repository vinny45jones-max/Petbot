import type { MetadataRoute } from 'next';
import { animalUrl } from '@/lib/animal-url';

export const SITEMAP_CHUNK = 5000;

export interface ShardId { id: string }

export function sitemapShards(counts: { animals: number; organizations: number; intakeFacilities: number }): ShardId[] {
  const shards: ShardId[] = [{ id: 'static' }];
  const add = (prefix: string, total: number) => {
    for (let i = 0; i < Math.ceil(total / SITEMAP_CHUNK); i++) shards.push({ id: `${prefix}-${i}` });
  };
  add('animals', counts.animals);
  if (counts.organizations) shards.push({ id: 'organizations-0' });
  if (counts.intakeFacilities) shards.push({ id: 'intake-0' });
  return shards;
}

export function animalSitemapEntry(a: any, base: string): MetadataRoute.Sitemap[number] {
  const images = (Array.isArray(a.media) ? a.media : [])
    .map((m: any) => (typeof m === 'object' ? m.url : null))
    .filter(Boolean) as string[];
  return {
    url: `${base}${animalUrl(a)}`,
    lastModified: a.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
    ...(images.length ? { images } : {}),
  };
}
