import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import type { Organization } from '@/payload-types';
import type { Metadata } from 'next';
import { buildOrgMeta } from '@/lib/meta';
import { buildOrganizationJsonLd } from '@/lib/jsonld';
import { JsonLd } from '@/components/JsonLd';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

async function getOrg(slug: string): Promise<Organization | null> {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'organizations',
    where: { and: [{ slug: { equals: slug } }, { isPublished: { equals: true } }] },
    limit: 1, depth: 1,
  });
  return (res.docs[0] as Organization) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return { title: 'Не найдено' };
  return buildOrgMeta(org, BASE);
}

export default async function OrganizationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) notFound();
  const payload = await getPayload({ config });
  const animals = await payload.find({
    collection: 'animals',
    where: { and: [{ organization: { equals: org.id } }, { status: { equals: 'published' } }] },
    sort: ['-urgencyRank', '-publishedAt'], limit: 24, depth: 1,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <JsonLd data={buildOrganizationJsonLd(org, BASE)} />
      <h1 className="text-3xl font-bold">{org.name}</h1>
      {org.city && typeof org.city === 'object' && <p className="text-gray-600">{(org.city as any).nameRu}{org.address ? `, ${org.address}` : ''}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {org.phone && <a href={`tel:${org.phone}`} className="text-blue-600">{org.phone}</a>}
        {org.websiteUrl && <a href={org.websiteUrl} className="text-blue-600" target="_blank" rel="noopener">Сайт</a>}
      </div>
      <h2 className="mb-4 mt-8 text-xl font-semibold">Питомцы организации</h2>
      <AnimalGrid animals={animals.docs as any} />
    </main>
  );
}
