import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';
import { extractPlainText } from '@/lib/lexical-plain';
import { AnimalEditForm } from '@/components/forms/AnimalEditForm';
import type { AnimalDraft } from '@/lib/animal-form';

export const dynamic = 'force-dynamic';

export default async function EditMyAnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const payload = await getPayload({ config });
  const animal: any = await payload.findByID({ collection: 'animals', id, depth: 1, overrideAccess: true }).catch(() => null);
  if (!animal) notFound();
  const ownerId = typeof animal.ownerUser === 'object' ? animal.ownerUser?.id : animal.ownerUser;
  if (String(ownerId) !== String(user.id)) notFound();

  const citiesRes = await payload.find({ collection: 'cities', limit: 200, sort: 'nameRu', depth: 0 });
  const cities = citiesRes.docs.map((c: any) => ({ id: String(c.id), nameRu: c.nameRu }));

  const initial: AnimalDraft = {
    species: animal.species, sex: animal.sex, size: animal.size, name: animal.name ?? '',
    ageYears: animal.ageYears ?? undefined, ageMonths: animal.ageMonths ?? undefined,
    city: typeof animal.city === 'object' ? String(animal.city?.id) : String(animal.city ?? ''),
    description: extractPlainText(animal.description), healthStatus: animal.healthStatus,
    contactPhone: user.phone ?? '', contactTelegram: user.telegramUsername ? `@${user.telegramUsername}` : '',
    photoCount: Array.isArray(animal.media) ? animal.media.length : 1,
  };

  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">Редактировать объявление</h1>
      <AnimalEditForm id={id} initial={initial} cities={cities} backHref="/me/animals" />
    </main>
  );
}
