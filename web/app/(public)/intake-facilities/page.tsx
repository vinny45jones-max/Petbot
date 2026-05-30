import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';

export const dynamic = 'force-dynamic';

export default async function IntakeFacilitiesPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'intakeFacilities',
    where: { isPublished: { equals: true } },
    sort: 'name', limit: 100, depth: 1,
  });
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Службы отлова</h1>
      <p className="mb-6 text-gray-600">Животные здесь содержатся ограниченный срок по законодательству (Закон 361-З). Чем быстрее найдётся дом — тем больше шансов.</p>
      <ul className="space-y-3">
        {res.docs.map((f: any) => (
          <li key={f.id}>
            <Link href={`/intake-facilities/${f.slug}`} className="block rounded-2xl border p-4 hover:shadow-md">
              <p className="font-semibold">{f.name}</p>
              {f.city && typeof f.city === 'object' && <p className="text-sm text-gray-600">{f.city.nameRu}</p>}
              <p className="text-sm text-gray-500">Срок содержания: {f.legalHoldDays} дн.</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
