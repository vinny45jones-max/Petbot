import { getPayload } from 'payload';
import config from '@/payload.config';
import type { GlossaryTerm } from '@/payload-types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Глоссарий', description: 'Простыми словами: стерилизация, чипирование, передержка, опека.' };

export default async function GlossaryPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'glossary-terms', limit: 300, sort: 'term', depth: 0 });
  const terms = res.docs as GlossaryTerm[];
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Глоссарий</h1>
      <dl className="space-y-4">
        {terms.map((t) => (
          <div key={t.id} id={t.slug}>
            <dt className="font-semibold">{t.term}</dt>
            <dd className="text-gray-700">{t.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
