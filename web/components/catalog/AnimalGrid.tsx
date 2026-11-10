import { AnimalCard } from './AnimalCard';
import type { Animal } from '@/payload-types';

export function AnimalGrid({ animals, emptyText = 'Ничего не найдено. Попробуйте изменить фильтры.' }: { animals: Animal[]; emptyText?: string }) {
  if (!animals.length) {
    return <p className="py-12 text-center text-gray-500">{emptyText}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {animals.map((a) => <AnimalCard key={a.id} animal={a} />)}
    </div>
  );
}
