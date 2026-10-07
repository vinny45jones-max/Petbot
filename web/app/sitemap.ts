import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { SITEMAP_CHUNK, sitemapShards, animalSitemapEntry } from '@/lib/sitemap-data';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function generateSitemaps() {
  const payload = await getPayload({ config });
  // Считаем шарды через протестированный sitemapShards (а не вручную) —
  // тогда unit-тест Step 1 покрывает реально исполняемую логику разбиения.
  const [animals, organizations, intakeFacilities] = await Promise.all([
    payload.count({ collection: 'animals', where: { status: { equals: 'published' } } }),
    payload.count({ collection: 'organizations', where: { isPublished: { equals: true } } }),
    payload.count({ collection: 'intakeFacilities', where: { isPublished: { equals: true } } }),
  ]);
  return sitemapShards({
    animals: animals.totalDocs,
    organizations: organizations.totalDocs,
    intakeFacilities: intakeFacilities.totalDocs,
  });
}

// Next 16: id приходит Promise
export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  const payload = await getPayload({ config });

  if (id === 'static') {
    // Только роуты, существующие в Plan 2. `/report-cruelty`, `/about`, `/contacts`
    // добавляются в Plan 4 (вместе с этими страницами) — иначе sitemap ведёт на 404.
    return ['', '/animals', '/animals/urgent', '/organizations', '/intake-facilities']
      .map((p) => ({ url: `${BASE}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.6 }));
  }

  if (id === 'organizations-0') {
    const res = await payload.find({ collection: 'organizations', where: { isPublished: { equals: true } }, limit: SITEMAP_CHUNK, depth: 0 });
    return res.docs.map((o: any) => ({ url: `${BASE}/organizations/${o.slug}`, lastModified: o.updatedAt, changeFrequency: 'weekly', priority: 0.6 }));
  }

  if (id === 'intake-0') {
    const res = await payload.find({ collection: 'intakeFacilities', where: { isPublished: { equals: true } }, limit: SITEMAP_CHUNK, depth: 0 });
    return res.docs.map((f: any) => ({ url: `${BASE}/intake-facilities/${f.slug}`, lastModified: f.updatedAt, changeFrequency: 'weekly', priority: 0.5 }));
  }

  // animals-N
  const page = parseInt(id.split('-')[1] ?? '0', 10) + 1;
  const res = await payload.find({
    collection: 'animals',
    where: { status: { equals: 'published' } },
    limit: SITEMAP_CHUNK, page, depth: 1, sort: '-updatedAt',
  });
  return res.docs.map((a: any) => animalSitemapEntry(a, BASE));
}
