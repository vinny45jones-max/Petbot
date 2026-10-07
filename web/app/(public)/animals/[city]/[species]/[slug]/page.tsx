import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { formatAge, formatAnimalTitle } from '@/lib/format';
import { PhotoCarousel } from '@/components/catalog/PhotoCarousel';
import { IntakeFacilityBlock } from '@/components/catalog/IntakeFacilityBlock';
import { AdoptModal } from '@/components/adopt/AdoptModal';
import type { Animal } from '@/payload-types';
import type { Metadata } from 'next';
import { buildAnimalMeta } from '@/lib/meta';
import { buildAnimalJsonLd } from '@/lib/jsonld';
import { JsonLd } from '@/components/JsonLd';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

async function getAnimal(slug: string): Promise<Animal | null> {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'animals',
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] },
    limit: 1,
    depth: 2,
  });
  return (res.docs[0] as Animal) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ city: string; species: string; slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const animal = await getAnimal(slug);
  if (!animal) return { title: 'Не найдено' };
  return buildAnimalMeta(animal, BASE);
}

export default async function AnimalDetailPage({ params }: { params: Promise<{ city: string; species: string; slug: string }> }) {
  const { slug } = await params;
  const animal = await getAnimal(slug);
  if (!animal) notFound();

  const photos = (Array.isArray(animal.media) ? animal.media : [])
    .filter((m): m is any => m && typeof m === 'object' && (m as any).url)
    .map((m: any) => ({ url: m.sizes?.detail?.url ?? m.url, alt: m.alt }));
  const facility = animal.intakeFacility && typeof animal.intakeFacility === 'object' ? (animal.intakeFacility as any) : null;
  const cityName = animal.city && typeof animal.city === 'object' ? (animal.city as any).nameRu : '';

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-2">
      <JsonLd data={buildAnimalJsonLd(animal, BASE)} />
      <PhotoCarousel photos={photos} />
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{formatAnimalTitle(animal)}</h1>
        <p className="text-gray-600">{[formatAge(animal.ageYears, animal.ageMonths), cityName].filter(Boolean).join(' · ')}</p>

        {facility ? (
          <div className="space-y-3">
            <IntakeFacilityBlock facility={facility} deadline={animal.legalDeadlineDate as any} />
            <AdoptModal
              animalId={String(animal.id)}
              triggerLabel="Забрать из службы отлова"
              accent={animal.urgencyLevel === 'critical'}
            />
          </div>
        ) : (
          <AdoptModal animalId={String(animal.id)} />
        )}

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Стерилизация</dt><dd>{animal.isSterilized ? 'Да' : 'Нет'}</dd>
          <dt className="text-gray-500">Прививки</dt><dd>{animal.isVaccinated ? 'Да' : 'Нет'}</dd>
        </dl>
      </div>
    </main>
  );
}
