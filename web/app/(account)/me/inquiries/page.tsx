import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';
import { animalUrl } from '@/lib/animal-url';
import { formatAnimalTitle } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = { new: 'Новая', contacted: 'На связи', closed: 'Закрыта' };

export default async function MyInquiriesPage() {
  const user = await requireUser();
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'adoption-inquiries',
    where: { applicant: { equals: user.id } },
    sort: '-createdAt', limit: 100, depth: 2,
  });

  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Мои заявки</h1>
      {res.docs.length === 0 ? (
        <p className="text-gray-500">Вы ещё не отправляли заявок.</p>
      ) : (
        <ul className="space-y-2">
          {res.docs.map((inq: any) => {
            const animal = inq.animal;
            const isObj = animal && typeof animal === 'object';
            return (
              <li key={inq.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  {isObj ? <Link href={animalUrl(animal)} className="font-medium text-blue-600">{formatAnimalTitle(animal)}</Link> : <span>Животное</span>}
                  <p className="text-sm text-gray-500">{STATUS_LABEL[inq.status] ?? inq.status}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
