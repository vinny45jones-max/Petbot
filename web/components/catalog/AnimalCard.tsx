import Image from 'next/image';
import Link from 'next/link';
import { animalUrl } from '@/lib/animal-url';
import { formatAge, formatAnimalTitle } from '@/lib/format';
import { UrgencyBadge } from './UrgencyBadge';
import type { Animal } from '@/payload-types';

export function AnimalCard({ animal }: { animal: Animal }) {
  const firstMedia = Array.isArray(animal.media) ? animal.media[0] : null;
  const img = firstMedia && typeof firstMedia === 'object' ? firstMedia : null;
  const cardSrc = (img as any)?.sizes?.card?.url ?? (img as any)?.url ?? null;
  const cityName = animal.city && typeof animal.city === 'object' ? (animal.city as any).nameRu : '';
  const isShelter = animal.ownerType === 'organization';

  return (
    <Link href={animalUrl(animal as any)} className="group block overflow-hidden rounded-2xl border border-gray-200 transition hover:shadow-lg">
      <div className="relative aspect-[4/3] bg-gray-100">
        {cardSrc ? (
          <Image src={cardSrc} alt={(img as any)?.alt ?? 'Фото животного'} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">нет фото</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <UrgencyBadge deadline={animal.legalDeadlineDate as any} />
          {isShelter && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">Приют</span>}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900">{formatAnimalTitle(animal)}</h3>
        <p className="text-sm text-gray-600">
          {[formatAge(animal.ageYears, animal.ageMonths), cityName].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  );
}
