import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';
import { formatAnimalTitle } from '@/lib/format';
import { MyAnimalRow } from '@/components/account/MyAnimalRow';

export const dynamic = 'force-dynamic';

export default async function MyAnimalsPage() {
  const user = await requireUser();
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'animals',
    where: { ownerUser: { equals: user.id } },
    sort: '-createdAt', limit: 100, depth: 0, overrideAccess: true,
  });

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои животные</h1>
        <Link href="/me/animals/new" className="rounded-lg bg-blue-600 px-4 py-2 text-white">+ Разместить</Link>
      </div>
      {res.docs.length === 0 ? (
        <p className="text-gray-500">Пока нет объявлений. Разместите первое.</p>
      ) : (
        <div className="space-y-2">
          {res.docs.map((a: any) => (
            <MyAnimalRow key={a.id} id={String(a.id)} title={formatAnimalTitle(a)} status={a.status} editHref={`/me/animals/${a.id}/edit`} />
          ))}
        </div>
      )}
    </main>
  );
}
