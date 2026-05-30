import Link from 'next/link';
import type { Organization } from '@/payload-types';

export function OrganizationCard({ org }: { org: Organization }) {
  const cityName = org.city && typeof org.city === 'object' ? (org.city as any).nameRu : '';
  return (
    <Link href={`/organizations/${org.slug}`} className="block rounded-2xl border border-gray-200 p-4 transition hover:shadow-md">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{org.name}</h3>
        {org.isVerified && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Проверено</span>}
      </div>
      {cityName && <p className="text-sm text-gray-600">{cityName}</p>}
    </Link>
  );
}
