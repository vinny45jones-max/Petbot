import Link from 'next/link';
import { formatByn } from '@/lib/payments/amounts';

export function DonationSummaryView({ total, donors, helpHref, enabled }: { total: number; donors: number; helpHref: string; enabled: boolean }) {
  if (!enabled && total <= 0) return null; // приём не подключён — не обещаем того, чего нет
  return (
    <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4">
      {total > 0 ? (
        <p className="font-medium text-green-800">Собрано {formatByn(total)} · доноров: {donors}</p>
      ) : (
        <p className="text-green-800">Станьте первым, кто поможет.</p>
      )}
      <Link href={helpHref} className="mt-3 inline-block rounded-xl bg-green-600 px-5 py-2 font-semibold text-white">Помочь рублём</Link>
    </div>
  );
}
