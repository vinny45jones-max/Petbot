import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import { searchAnimalIds } from '@/lib/search';
import type { Animal } from '@/payload-types';

export const metadata = { title: 'Поиск' };
export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').trim();
  let animals: Animal[] = [];
  if (q) {
    const payload = await getPayload({ config });
    const ids = await searchAnimalIds(payload, q); // из Plan 2 lib/search.ts
    if (ids.length) {
      const res = await payload.find({ collection: 'animals', depth: 1, limit: 48, where: { and: [{ id: { in: ids } }, { status: { equals: 'published' } }] } });
      animals = res.docs as Animal[];
    }
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Поиск</h1>
      <form action="/search" method="get" className="mb-6">
        <input name="q" defaultValue={q} aria-label="Поиск животных" placeholder="Кличка, город, описание…" className="w-full rounded-xl border p-3" />
      </form>
      {q && <p className="mb-4 text-gray-600">Результаты по запросу «{q}»: {animals.length}</p>}
      <AnimalGrid animals={animals} />
    </div>
  );
}
