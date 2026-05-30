import { getPayload } from 'payload';
import config from '@/payload.config';
import { OrganizationCard } from '@/components/org/OrganizationCard';

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'organizations',
    where: { isPublished: { equals: true } },
    sort: 'name',
    limit: 100,
    depth: 1,
  });
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Приюты и организации</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {res.docs.map((o: any) => <OrganizationCard key={o.id} org={o} />)}
      </div>
    </main>
  );
}
