import Link from 'next/link';
import { getPayload, type Where } from 'payload';
import config from '@/payload.config';
import { AnimalGrid } from '@/components/catalog/AnimalGrid';
import type { Animal } from '@/payload-types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Потеряны и найдены', description: 'Объявления о потерянных и найденных животных в Беларуси.' };

export default async function LostFoundPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type: rawType } = await searchParams;
  const type = rawType === 'found' ? 'found' : rawType === 'lost' ? 'lost' : null;
  const payload = await getPayload({ config });
  const where: Where = { and: [{ status: { equals: 'published' } }, type ? { lostOrFound: { equals: type } } : { lostOrFound: { in: ['lost', 'found'] } }] };
  const res = await payload.find({ collection: 'animals', depth: 1, limit: 48, where, sort: '-publishedAt' });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Потеряны и найдены</h1>
      <nav className="mb-6 flex gap-3 text-sm">
        <Link href="/lost-and-found" className="underline">Все</Link>
        <Link href="/lost-and-found?type=lost" className="underline">Потеряны</Link>
        <Link href="/lost-and-found?type=found" className="underline">Найдены</Link>
      </nav>
      <AnimalGrid animals={res.docs as Animal[]} />
    </div>
  );
}
