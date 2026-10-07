import { getPayload } from 'payload';
import config from '@/payload.config';
import { getOrganizationBySlug } from '@/lib/org';
import { formatAnimalTitle } from '@/lib/format';
import { InquiryRow } from '@/components/account/InquiryRow';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrgInquiriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  const payload = await getPayload({ config });

  // Двухшаговый запрос (надёжнее dot-path по связи):
  // 1) id животных организации, 2) заявки по animal in ids.
  const orgAnimals = await payload.find({ collection: 'animals', where: { organization: { equals: org.id } }, limit: 1000, depth: 0, overrideAccess: true });
  const orgAnimalIds = orgAnimals.docs.map((a: any) => a.id);
  const res = orgAnimalIds.length === 0
    ? { docs: [] as any[] }
    : await payload.find({
        collection: 'adoption-inquiries',
        where: { animal: { in: orgAnimalIds } },
        sort: '-createdAt', limit: 200, depth: 2, overrideAccess: true,
      });

  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Входящие заявки</h1>
      {res.docs.length === 0 ? (
        <p className="text-gray-500">Заявок пока нет.</p>
      ) : (
        <div className="space-y-3">
          {res.docs.map((inq: any) => {
            const applicant = typeof inq.applicant === 'object' ? inq.applicant : null;
            return (
              <InquiryRow
                key={inq.id} id={String(inq.id)}
                animalTitle={typeof inq.animal === 'object' ? formatAnimalTitle(inq.animal) : 'Животное'}
                applicantName={applicant ? [applicant.firstName, applicant.lastName].filter(Boolean).join(' ') : undefined}
                phone={inq.contactPhone} telegram={inq.contactTelegram} message={inq.message} initialStatus={inq.status}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
