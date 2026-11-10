import Image from 'next/image';
import Link from 'next/link';
import type { Organization } from '@/payload-types';

export function OrganizationCard({ org }: { org: Organization }) {
  const cityName = org.city && typeof org.city === 'object' ? (org.city as any).nameRu : '';
  const cover = org.coverPhoto && typeof org.coverPhoto === 'object' ? (org.coverPhoto as any) : null;
  const coverSrc = cover?.sizes?.card?.url ?? cover?.url ?? null;
  return (
    <Link href={`/organizations/${org.slug}`} className="group block overflow-hidden rounded-2xl border border-gray-200 transition hover:shadow-md">
      {coverSrc && (
        <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
          <Image src={coverSrc} alt="" fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
        </div>
      )}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{org.name}</h3>
          {org.isVerified && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Проверено</span>}
        </div>
        {cityName && <p className="text-sm text-gray-600">{cityName}</p>}
      </div>
    </Link>
  );
}
