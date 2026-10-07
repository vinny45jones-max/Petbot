import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getOrganizationBySlug } from '@/lib/org';
import { formatAnimalTitle } from '@/lib/format';
import { MyAnimalRow } from '@/components/account/MyAnimalRow';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrgAnimalsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'animals', where: { organization: { equals: org.id } }, sort: '-createdAt', limit: 200, depth: 0, overrideAccess: true });
  const base = `/org/${slug}`;

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Животные организации</h1>
        <Link href={`${base}/animals/new`} className="rounded-lg bg-blue-600 px-4 py-2 text-white">+ Добавить</Link>
      </div>
      <div className="space-y-2">
        {res.docs.map((a: any) => (
          <MyAnimalRow key={a.id} id={String(a.id)} title={formatAnimalTitle(a)} status={a.status} editHref={`${base}/animals/${a.id}/edit`} />
        ))}
      </div>
    </main>
  );
}
