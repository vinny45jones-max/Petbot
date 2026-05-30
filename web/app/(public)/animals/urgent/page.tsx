import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalCard } from '@/components/catalog/AnimalCard';
import type { Animal } from '@/payload-types';

export const dynamic = 'force-dynamic';

export default async function UrgentAnimalsPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'animals',
    where: { and: [{ status: { equals: 'published' } }, { urgencyLevel: { in: ['critical', 'high'] } }] },
    sort: ['-urgencyRank', 'legalDeadlineDate'], limit: 100, depth: 1,
  });

  // группировка по городу
  const byCity = new Map<string, Animal[]>();
  for (const a of res.docs as Animal[]) {
    const city = a.city && typeof a.city === 'object' ? (a.city as any).nameRu : 'Другое';
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city)!.push(a);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-red-700">Срочно нужен дом</h1>
      <p className="mb-6 text-gray-600">Этим животным осталось мало времени по срокам содержания. Поделитесь страницей — это спасает жизни.</p>
      {res.totalDocs === 0 && <p className="text-gray-500">Сейчас нет срочных животных. Это хорошая новость.</p>}
      {[...byCity.entries()].map(([city, animals]) => (
        <section key={city} className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">{city}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {animals.map((a) => <AnimalCard key={a.id} animal={a} />)}
          </div>
        </section>
      ))}
    </main>
  );
}
