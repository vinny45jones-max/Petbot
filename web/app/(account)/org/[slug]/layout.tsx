import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrgAdmin } from '@/lib/auth/current-user';
import { getOrganizationBySlug } from '@/lib/org';

export const dynamic = 'force-dynamic';

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  await requireOrgAdmin(String(org.id));
  const base = `/org/${slug}`;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <p className="mb-1 text-sm text-gray-500">Организация</p>
      <h2 className="mb-4 text-lg font-bold">{org.name}</h2>
      <nav className="mb-6 flex gap-4 border-b pb-3 text-sm">
        <Link href={base}>Обзор</Link>
        <Link href={`${base}/animals`}>Животные</Link>
        <Link href={`${base}/inquiries`}>Заявки</Link>
        <Link href={`${base}/settings`}>Настройки</Link>
      </nav>
      {children}
    </div>
  );
}
