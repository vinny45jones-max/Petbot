import { getPayload } from 'payload';
import config from '@/payload.config';
import { Hero } from '@/components/home/Hero';
import { UrgentHero } from '@/components/home/UrgentHero';
import { HomeSection } from '@/components/home/HomeSection';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import { OrganizationCard } from '@/components/org/OrganizationCard';
import type { Animal, Organization } from '@/payload-types';

// Как каталог: рендер на запрос (ISR пререндерил бы главную на build и требовал БД при сборке)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const payload = await getPayload({ config });

  const [critical, fresh, orgs] = await Promise.all([
    payload.find({
      collection: 'animals', depth: 1, limit: 3,
      where: { and: [{ status: { equals: 'published' } }, { urgencyLevel: { equals: 'critical' } }] },
      sort: 'legalDeadlineDate',
    }),
    payload.find({
      collection: 'animals', depth: 1, limit: 6,
      where: { status: { equals: 'published' } }, sort: '-publishedAt',
    }),
    payload.find({
      collection: 'organizations', depth: 1, limit: 4,
      where: { isPublished: { equals: true } }, sort: '-createdAt',
    }),
  ]);

  return (
    <>
      <Hero />
      <UrgentHero animals={critical.docs as Animal[]} />
      <HomeSection title="Свежие объявления" moreHref="/animals">
        <AnimalGrid animals={fresh.docs as Animal[]} emptyText="Пока нет объявлений. Станьте первым — разместите животное." />
      </HomeSection>
      <HomeSection title="Приюты и волонтёры" moreHref="/organizations">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(orgs.docs as Organization[]).map((o) => <OrganizationCard key={o.id} org={o as any} />)}
        </div>
      </HomeSection>
    </>
  );
}
