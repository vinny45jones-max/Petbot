import Link from 'next/link';
import { AnimalCard } from '@/components/catalog/AnimalCard';
import type { Animal } from '@/payload-types';

export function UrgentHero({ animals }: { animals: Animal[] }) {
  if (!animals.length) return null; // не показываем, если критических нет
  return (
    <section className="border-y-2 border-red-200 bg-red-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="text-2xl font-bold text-red-700">Срочно нужна помощь — осталось менее 3 дней</h2>
        <p className="mt-1 text-red-700">Этим животным грозит усыпление по срокам содержания. Заберите или поделитесь.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {animals.map((a) => <AnimalCard key={a.id} animal={a as any} />)}
        </div>
        <Link href="/animals/urgent" className="mt-6 inline-block font-semibold text-red-700 underline">Все срочные →</Link>
      </div>
    </section>
  );
}
