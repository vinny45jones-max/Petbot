import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { DonationForm } from '@/components/donate/DonationForm';
import { isDonationsEnabled } from '@/lib/payments/expresspay';
import { formatAnimalTitle } from '@/lib/format';

export const metadata = { title: 'Помочь животному', robots: { index: false } };

export default async function HelpAnimalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: 'animals', where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] }, limit: 1, depth: 0 });
  const animal = r.docs[0];
  if (!animal) notFound();
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Помочь животному</h1>
      <DonationForm targetType="animal" targetSlug={animal.slug as string} targetTitle={formatAnimalTitle(animal)} enabled={isDonationsEnabled()} />
    </main>
  );
}
