import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';
import { AnimalWizard } from '@/components/forms/AnimalWizard';

export const dynamic = 'force-dynamic';

export default async function NewAnimalPage() {
  await requireUser();
  const payload = await getPayload({ config });
  const citiesRes = await payload.find({ collection: 'cities', limit: 200, sort: 'nameRu', depth: 0 });
  const cities = citiesRes.docs.map((c: any) => ({ id: String(c.id), nameRu: c.nameRu }));
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">Разместить животное</h1>
      <AnimalWizard cities={cities} successRedirect="/me/animals" />
    </main>
  );
}
