import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';
import { formatByn } from '@/lib/payments/amounts';
import { formatAnimalTitle } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_RU: Record<string, string> = { pending: 'Ожидает оплаты', paid: 'Оплачено', failed: 'Не прошёл', refunded: 'Возврат' };

function target(d: any): string {
  if (d.targetType === 'animal' && d.animal && typeof d.animal === 'object') return formatAnimalTitle(d.animal);
  if (d.targetType === 'organization' && d.organization && typeof d.organization === 'object') return d.organization.name;
  return 'Общий фонд';
}

export default async function MyDonationsPage() {
  const user = await requireUser();
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'donations', overrideAccess: true, depth: 1, limit: 200, sort: '-createdAt',
    where: { donorUser: { equals: user.id } },
  });

  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Мои пожертвования</h1>
      {res.docs.length === 0 ? (
        <p className="text-gray-500">Вы ещё не делали пожертвований. <Link href="/help" className="text-blue-600 underline">Помочь</Link></p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {res.docs.map((d: any) => (
            <li key={d.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{formatByn(d.amountByn)} · {target(d)}</p>
                <p className="text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString('ru-RU')}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm ${d.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{STATUS_RU[d.status] ?? d.status}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
