import Image from 'next/image';
import { RichText } from '@/components/RichText';
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

  const cover = org.coverPhoto && typeof org.coverPhoto === 'object' ? (org.coverPhoto as any) : null;
  const coverSrc = cover?.sizes?.detail?.url ?? cover?.url ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <JsonLd data={buildOrganizationJsonLd(org, BASE)} />
      {coverSrc && (
        <div className="relative mb-6 aspect-[2/1] overflow-hidden rounded-2xl bg-gray-100 md:aspect-[5/2]">
          <Image src={coverSrc} alt="" fill sizes="(max-width: 1152px) 100vw, 1152px" className="object-cover object-[center_35%]" priority />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{org.name}</h1>
        {org.isVerified && <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">Проверено</span>}
      </div>
      {org.city && typeof org.city === 'object' && <p className="mt-1 text-gray-600">{(org.city as any).nameRu}{org.address ? `, ${org.address}` : ''}</p>}
      {org.description && (
        <div className="mt-4 max-w-3xl leading-relaxed text-gray-800 [&_p]:mb-3"><RichText content={org.description} /></div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {org.phone && <a href={`tel:${org.phone}`} className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white">Позвонить: {org.phone}</a>}
        {org.websiteUrl && <a href={org.websiteUrl} className="text-blue-700" target="_blank" rel="noopener">Сайт</a>}
      </div>
      <h2 className="mb-4 mt-8 text-xl font-semibold">Питомцы организации</h2>
      <AnimalGrid animals={animals.docs as any} />
    </main>
  );
}
