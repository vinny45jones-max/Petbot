import Link from 'next/link';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@/payload.config';
import type { BlogPost } from '@/payload-types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Блог — новости и советы', description: 'Новости проекта, советы по уходу и истории спасения животных.' };

export default async function BlogListPage() {
  const payload = await getPayload({ config });
  const res = await payload.find({ collection: 'blog-posts', depth: 1, limit: 24, where: { status: { equals: 'published' } }, sort: '-publishedAt' });
  const posts = res.docs as BlogPost[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Блог</h1>
      {!posts.length && <p className="text-gray-500">Пока нет публикаций.</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => {
          const cover = p.coverPhoto && typeof p.coverPhoto === 'object' ? (p.coverPhoto as any).url : null;
          return (
            <Link key={p.id} href={`/blog/${p.slug}`} className="block overflow-hidden rounded-2xl border hover:shadow-md">
              {cover && <div className="relative aspect-[16/9] bg-gray-100"><Image src={cover} alt={p.title} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover" /></div>}
              <div className="p-4">
                <h2 className="font-semibold">{p.title}</h2>
                {p.excerpt && <p className="mt-1 text-sm text-gray-600">{p.excerpt}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
