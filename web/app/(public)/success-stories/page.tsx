import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { BlogPost } from '@/payload-types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Истории успеха', description: 'Животные, которые нашли дом благодаря неравнодушным людям.' };

export default async function SuccessStoriesPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'blog-posts', limit: 24, where: { and: [{ status: { equals: 'published' } }, { category: { equals: 'success_story' } }] }, sort: '-publishedAt' });
  const posts = res.docs as BlogPost[];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Истории успеха</h1>
      {!posts.length && <p className="text-gray-500">Скоро здесь появятся первые истории.</p>}
      <ul className="space-y-3">
        {posts.map((p) => <li key={p.id}><Link href={`/blog/${p.slug}`} className="font-semibold text-blue-600 hover:underline">{p.title}</Link></li>)}
      </ul>
    </div>
  );
}
