import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { RichText } from '@/components/RichText';
import type { BlogPost } from '@/payload-types';

export const dynamic = 'force-dynamic';

async function getPost(slug: string): Promise<BlogPost | null> {
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: 'blog-posts', where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] }, limit: 1, depth: 1 });
  return (r.docs[0] as BlogPost) ?? null;
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const post = await getPost((await params).slug);
  if (!post) return { title: 'Пост не найден' };
  return { title: post.title, description: post.excerpt ?? undefined, openGraph: { title: post.title, description: post.excerpt ?? undefined } };
}

export default async function BlogPostPage({ params }: Params) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const cover = post.coverPhoto && typeof post.coverPhoto === 'object' ? (post.coverPhoto as any).url : null;

  return (
    <>
      <Breadcrumbs trail={[{ label: 'Блог', href: '/blog' }, { label: post.title, href: `/blog/${post.slug}` }]} />
      <article className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        {cover && <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl bg-gray-100"><Image src={cover} alt={post.title} fill sizes="(max-width:768px) 100vw, 768px" className="object-cover" priority /></div>}
        <div className="prose mt-6 max-w-none"><RichText content={post.body} /></div>
      </article>
    </>
  );
}
