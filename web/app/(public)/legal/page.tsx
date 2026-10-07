import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { LegalArticle } from '@/payload-types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Юридический раздел', description: 'Права владельцев животных, ответственность за жестокость, что делать с потерянными питомцами.' };

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'general', label: 'Общее' },
  { value: 'cruelty', label: 'Жестокое обращение' },
  { value: 'lost_pet', label: 'Потерянные питомцы' },
  { value: 'adoption_rights', label: 'Права при усыновлении' },
];

export default async function LegalHubPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'legal-articles', limit: 200, depth: 0, sort: 'title' });
  const articles = res.docs as LegalArticle[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Юридический раздел</h1>
      <p className="mb-8 text-gray-600">Понятные инструкции и ссылки на законы Республики Беларусь.</p>
      <div className="space-y-8">
        {CATEGORIES.map((c) => {
          const items = articles.filter((a) => a.category === c.value);
          if (!items.length) return null;
          return (
            <section key={c.value}>
              <h2 className="mb-3 text-xl font-semibold">{c.label}</h2>
              <ul className="space-y-2">
                {items.map((a) => (
                  <li key={a.id}>
                    <Link href={`/legal/${a.slug}`} className="font-medium text-blue-600 hover:underline">{a.title}</Link>
                    {a.excerpt && <p className="text-sm text-gray-600">{a.excerpt}</p>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
