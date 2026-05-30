'use client';
import { useState } from 'react';
import Image from 'next/image';

interface Photo { url: string; alt?: string }

export function PhotoCarousel({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState(0);
  if (!photos.length) return <div className="aspect-[4/3] rounded-2xl bg-gray-100" />;
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
        <Image src={photos[active].url} alt={photos[active].alt ?? 'Фото животного'} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {photos.map((p, i) => (
            <button key={i} onClick={() => setActive(i)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? 'border-blue-600' : 'border-transparent'}`} aria-label={`Фото ${i + 1}`}>
              <Image src={p.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
