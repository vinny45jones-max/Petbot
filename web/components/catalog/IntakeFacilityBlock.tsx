import { UrgencyBadge } from './UrgencyBadge';

interface Facility { name: string; address?: string | null; phone?: string | null }

export function IntakeFacilityBlock({ facility, deadline }: { facility: Facility; deadline?: string | null }) {
  return (
    <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-bold text-red-700">В службе отлова</span>
        <UrgencyBadge deadline={deadline} />
      </div>
      <p className="font-medium">{facility.name}</p>
      {facility.address && <p className="text-sm text-gray-700">{facility.address}</p>}
      {facility.phone && (
        <a href={`tel:${facility.phone}`} className="mt-3 inline-block rounded-xl bg-red-600 px-5 py-2 font-semibold text-white">
          Позвонить: {facility.phone}
        </a>
      )}
    </div>
  );
}
