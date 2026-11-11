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
import { CommentSection } from '@/components/comments/CommentSection';
import { SimilarAnimals } from '@/components/catalog/SimilarAnimals';
import { DonationSummary } from '@/components/donate/DonationSummary';
import { getCurrentUser } from '@/lib/auth/current-user';
import { RichText } from '@/components/RichText';
import { AnimalBadges } from '@/components/catalog/AnimalBadges';
import Link from 'next/link';

const SEX: Record<string, string> = { male: 'Мальчик', female: 'Девочка' };
const SIZE: Record<string, string> = { small: 'Маленький', medium: 'Средний', large: 'Крупный' };
const HEALTH: Record<string, string> = {
  healthy: 'Здоров', needs_treatment: 'Нужно лечение', chronic_condition: 'Хроническое заболевание', recovering: 'Восстанавливается',
};

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
  const viewer = await getCurrentUser();
  const org = animal.organization && typeof animal.organization === 'object' ? (animal.organization as any) : null;
  const facts = [
    ['Пол', SEX[animal.sex ?? ''] ?? null],
    ['Возраст', formatAge(animal.ageYears, animal.ageMonths) || null],
    ['Размер', SIZE[animal.size ?? ''] ?? null],
    ['Здоровье', HEALTH[animal.healthStatus ?? ''] ?? null],
    ['Стерилизация', animal.isSterilized ? 'Да' : 'Нет'],
    ['Прививки', animal.isVaccinated ? 'Да' : 'Нет'],
  ].filter((f): f is [string, string] => !!f[1]);

  return (
    <>
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-2">
      <JsonLd data={buildAnimalJsonLd(animal, BASE)} />
      <PhotoCarousel photos={photos} />
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{formatAnimalTitle(animal)}</h1>
        <p className="text-gray-600">{[formatAge(animal.ageYears, animal.ageMonths), cityName].filter(Boolean).join(' · ')}</p>
        <div className="flex flex-wrap gap-1"><AnimalBadges animal={{ ...animal, urgencyLevel: null } as any} /></div>

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

        <DonationSummary target={{ type: 'animal', id: animal.id, slug: animal.slug as string }} />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl bg-gray-50 p-4 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="contents"><dt className="text-gray-600">{label}</dt><dd className="font-medium">{value}</dd></div>
          ))}
        </dl>

        {org && (
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-600">{facility ? 'Помогает пристроить' : 'Питомца опекает'}</p>
            <Link href={`/organizations/${org.slug}`} className="font-semibold text-blue-700 underline-offset-2 hover:underline">{org.name}</Link>
            {org.isVerified && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Проверено</span>}
            {org.phone && <p className="mt-1 text-sm"><a href={`tel:${org.phone}`} className="text-blue-700">{org.phone}</a></p>}
          </div>
        )}
      </div>

      {animal.description && (
        <section className="md:col-span-2">
          <h2 className="mb-3 text-xl font-semibold">О питомце</h2>
          <div className="max-w-3xl leading-relaxed text-gray-800 [&_p]:mb-3"><RichText content={animal.description} /></div>
        </section>
      )}
    </main>
    <SimilarAnimals animal={{ id: animal.id, species: animal.species, city: animal.city as any }} />
    <CommentSection targetType="animal" targetId={String(animal.id)} isAuthed={!!viewer} />
    </>
  );
}
