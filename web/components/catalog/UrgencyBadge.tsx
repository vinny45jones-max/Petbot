'use client';
import { daysUntil } from '@/lib/urgency';

export function UrgencyBadge({ deadline }: { deadline?: string | null }) {
  if (!deadline) return null;
  const days = daysUntil(new Date(deadline), new Date());
  if (days > 7) return null;
  const critical = days <= 3;
  const label = days <= 0 ? 'Истекает срок' : `Осталось ${days} дн.`;
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${critical ? 'bg-red-600' : 'bg-orange-500'}`}
    >
      {critical ? 'СРОЧНО' : 'Срочно'} · {label}
    </span>
  );
}
