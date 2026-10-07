import { getPayload } from 'payload';
import config from '@/payload.config';
import { getOrganizationBySlug } from '@/lib/org';
import { AnimalWizard } from '@/components/forms/AnimalWizard';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrgNewAnimalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  const payload = await getPayload({ config });
  const citiesRes = await payload.find({ collection: 'cities', limit: 200, sort: 'nameRu', depth: 0 });
  const cities = citiesRes.docs.map((c: any) => ({ id: String(c.id), nameRu: c.nameRu }));
  const facRes = await payload.find({ collection: 'intakeFacilities', where: { isPublished: { equals: true } }, limit: 50, depth: 0 });
  const facilities = facRes.docs.map((f: any) => ({ id: String(f.id), name: f.name }));

  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">Добавить животное</h1>
      <AnimalWizard cities={cities} organizationId={String(org.id)} successRedirect={`/org/${slug}/animals`} facilities={facilities} />
    </main>
  );
}
