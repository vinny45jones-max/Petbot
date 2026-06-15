import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getOrganizationBySlug } from '@/lib/org';
import { extractPlainText } from '@/lib/lexical-plain';
import { AnimalEditForm } from '@/components/forms/AnimalEditForm';
import type { AnimalDraft } from '@/lib/animal-form';

export const dynamic = 'force-dynamic';

export default async function OrgEditAnimalPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  const payload = await getPayload({ config });
  const animal: any = await payload.findByID({ collection: 'animals', id, depth: 1, overrideAccess: true }).catch(() => null);
  if (!animal) notFound();
  const orgId = typeof animal.organization === 'object' ? animal.organization?.id : animal.organization;
  if (String(orgId) !== String(org.id)) notFound();

  const citiesRes = await payload.find({ collection: 'cities', limit: 200, sort: 'nameRu', depth: 0 });
  const cities = citiesRes.docs.map((c: any) => ({ id: String(c.id), nameRu: c.nameRu }));

  const initial: AnimalDraft = {
    species: animal.species, sex: animal.sex, size: animal.size, name: animal.name ?? '',
    ageYears: animal.ageYears ?? undefined, ageMonths: animal.ageMonths ?? undefined,
    city: typeof animal.city === 'object' ? String(animal.city?.id) : String(animal.city ?? ''),
    description: extractPlainText(animal.description), healthStatus: animal.healthStatus,
    contactPhone: org.phone ?? '+375000000000', contactTelegram: org.tgUrl ?? '',
    photoCount: Array.isArray(animal.media) ? animal.media.length : 1,
  };

  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">Редактировать животное</h1>
      <AnimalEditForm id={id} initial={initial} cities={cities} backHref={`/org/${slug}/animals`} />
    </main>
  );
}
