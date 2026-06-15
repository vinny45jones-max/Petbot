import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { getOrganizationBySlug } from '@/lib/org';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrgDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  const payload = await getPayload({ config });
  const animals = await payload.find({ collection: 'animals', where: { organization: { equals: org.id } }, limit: 0, overrideAccess: true });

  // Заявки считаем двухшаговым запросом (надёжнее dot-path по связи):
  // 1) id животных организации, 2) заявки по animal in ids.
  const orgAnimals = await payload.find({ collection: 'animals', where: { organization: { equals: org.id } }, limit: 1000, depth: 0, overrideAccess: true });
  const orgAnimalIds = orgAnimals.docs.map((a: any) => a.id);
  const inquiries = orgAnimalIds.length === 0
    ? { totalDocs: 0 }
    : await payload.find({ collection: 'adoption-inquiries', where: { animal: { in: orgAnimalIds } }, limit: 0, overrideAccess: true });
  const base = `/org/${slug}`;

  return (
    <main className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Link href={`${base}/animals`} className="rounded-2xl border p-4 hover:shadow"><p className="text-3xl font-bold">{animals.totalDocs}</p><p className="text-gray-600">Животных</p></Link>
      <Link href={`${base}/inquiries`} className="rounded-2xl border p-4 hover:shadow"><p className="text-3xl font-bold">{inquiries.totalDocs}</p><p className="text-gray-600">Заявок</p></Link>
      <Link href={`${base}/animals/new`} className="rounded-2xl border-2 border-blue-500 bg-blue-50 p-4 hover:shadow"><p className="text-lg font-semibold text-blue-700">+ Добавить животное</p></Link>
    </main>
  );
}
