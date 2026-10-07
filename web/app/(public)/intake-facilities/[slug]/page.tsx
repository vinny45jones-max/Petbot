import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';

export default async function IntakeFacilityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'intakeFacilities',
    where: { and: [{ slug: { equals: slug } }, { isPublished: { equals: true } }] },
    limit: 1, depth: 1,
  });
  const facility = res.docs[0] as any;
  if (!facility) notFound();

  const animals = await payload.find({
    collection: 'animals',
    where: { and: [{ intakeFacility: { equals: facility.id } }, { status: { equals: 'published' } }] },
    sort: ['-urgencyRank', 'legalDeadlineDate'], limit: 48, depth: 1,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">{facility.name}</h1>
      {facility.address && <p className="text-gray-600">{facility.address}</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {facility.phone && <a href={`tel:${facility.phone}`} className="text-blue-600">{facility.phone}</a>}
      </div>
      <div className="mt-4 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4 text-sm">
        Срок содержания по закону: <strong>{facility.legalHoldDays} дней</strong>. Подробнее о правах — в разделе{' '}
        <Link href="/legal/municipal-intake-rights" className="text-blue-600 underline">«Если животное попало в службу отлова»</Link>.
      </div>
      <h2 className="mb-4 mt-8 text-xl font-semibold">Животные в этой службе</h2>
      <AnimalGrid animals={animals.docs as any} />
    </main>
  );
}
