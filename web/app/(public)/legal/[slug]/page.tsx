import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { RichText } from '@/components/RichText';
import type { LegalArticle } from '@/payload-types';

export const dynamic = 'force-dynamic';

async function getArticle(slug: string): Promise<LegalArticle | null> {
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: 'legal-articles', where: { slug: { equals: slug } }, limit: 1, depth: 0 });
  return (r.docs[0] as LegalArticle) ?? null;
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const a = await getArticle((await params).slug);
  if (!a) return { title: 'Статья не найдена' };
  return { title: a.title, description: a.excerpt ?? undefined };
}

export default async function LegalArticlePage({ params }: Params) {
  const a = await getArticle((await params).slug);
  if (!a) notFound();
  const links = Array.isArray(a.npaLinks) ? a.npaLinks : [];

  return (
    <>
      <Breadcrumbs trail={[{ label: 'Юр.раздел', href: '/legal' }, { label: a.title, href: `/legal/${a.slug}` }]} />
      <article className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-3xl font-bold">{a.title}</h1>
        <div className="prose mt-6 max-w-none"><RichText content={a.body} /></div>
        {links.length > 0 && (
          <section className="mt-8 rounded-2xl bg-gray-50 p-4">
            <h2 className="mb-2 font-semibold">Ссылки на НПА</h2>
            <ul className="list-inside list-disc space-y-1">
              {links.map((l: any, i: number) => (
                <li key={i}><a href={l.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{l.title}</a></li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}
