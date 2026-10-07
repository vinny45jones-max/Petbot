import { getPayload } from 'payload';
import config from '@/payload.config';
import { RichText } from '@/components/RichText';
import type { HelpArticle } from '@/payload-types';

export async function HelpArticleList({ category }: { category: string }) {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'help-articles', where: { category: { equals: category } }, limit: 200, sort: 'order', depth: 0 });
  const items = res.docs as HelpArticle[];
  if (!items.length) return <p className="text-gray-500">Раздел скоро наполнится.</p>;
  return (
    <div className="space-y-6">
      {items.map((a) => (
        <section key={a.id} className="rounded-2xl border p-4">
          <h2 className="font-semibold">{a.title}</h2>
          <div className="prose mt-2 max-w-none"><RichText content={a.body} /></div>
        </section>
      ))}
    </div>
  );
}
