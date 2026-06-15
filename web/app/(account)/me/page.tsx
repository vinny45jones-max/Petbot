import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireUser } from '@/lib/auth/current-user';

export const dynamic = 'force-dynamic';

export default async function MeDashboard() {
  const user = await requireUser();
  const payload = await getPayload({ config });
  const animals = await payload.find({ collection: 'animals', where: { ownerUser: { equals: user.id } }, limit: 0, overrideAccess: true });
  const inquiries = await payload.find({ collection: 'adoption-inquiries', where: { applicant: { equals: user.id } }, limit: 0, overrideAccess: true });

  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Здравствуйте{user.firstName ? `, ${user.firstName}` : ''}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/me/animals" className="rounded-2xl border p-4 hover:shadow"><p className="text-3xl font-bold">{animals.totalDocs}</p><p className="text-gray-600">Мои животные</p></Link>
        <Link href="/me/inquiries" className="rounded-2xl border p-4 hover:shadow"><p className="text-3xl font-bold">{inquiries.totalDocs}</p><p className="text-gray-600">Мои заявки</p></Link>
        <Link href="/me/animals/new" className="rounded-2xl border-2 border-blue-500 bg-blue-50 p-4 hover:shadow"><p className="text-lg font-semibold text-blue-700">+ Разместить животное</p></Link>
      </div>
    </main>
  );
}
