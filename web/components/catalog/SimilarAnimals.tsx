import { getPayload } from 'payload';
import config from '@/payload.config';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import { buildSimilarWhere, type SimilarInput } from '@/lib/similar';
import type { Animal } from '@/payload-types';

export async function SimilarAnimals({ animal }: { animal: SimilarInput }) {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'animals', depth: 1, limit: 3,
    where: buildSimilarWhere(animal) as any,
    // срочные — первыми: похожие должны в первую очередь показывать тех, у кого истекает срок
    sort: ['-urgencyRank', '-publishedAt'],
  });
  const animals = res.docs as Animal[];
  if (!animals.length) return null;
  return (
    <section className="mx-auto mt-12 max-w-5xl px-4">
      <h2 className="mb-4 text-xl font-semibold">Похожие животные</h2>
      <AnimalGrid animals={animals} />
    </section>
  );
}
