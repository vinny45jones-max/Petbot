import { getOrganizationBySlug } from '@/lib/org';
import { extractPlainText } from '@/lib/lexical-plain';
import { OrgSettingsForm } from '@/components/forms/OrgSettingsForm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrgSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org: any = await getOrganizationBySlug(slug);
  if (!org) notFound();
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">Настройки организации</h1>
      <OrgSettingsForm orgId={String(org.id)} initial={{
        description: extractPlainText(org.description), address: org.address ?? '', phone: org.phone ?? '',
        email: org.email ?? '', websiteUrl: org.websiteUrl ?? '', tgUrl: org.tgUrl ?? '', viberUrl: org.viberUrl ?? '', instagramUrl: org.instagramUrl ?? '',
      }} />
    </main>
  );
}
