import { NextResponse } from 'next/server';
import { getPayload, type Where } from 'payload';
import config from '@/payload.config';
import { getCurrentUser } from '@/lib/auth/current-user';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get('targetType') ?? '';
  const targetId = searchParams.get('targetId') ?? '';
  if (!targetType || !targetId) return NextResponse.json({ comments: [] });

  const payload = await getPayload({ config });
  const user = await getCurrentUser();

  // published + reported (жалоба ставит в очередь модерации, но не прячет — иначе одна жалоба
  // скрывала бы любой чужой комментарий) + автору его собственные hidden (shadow-ban виден только ему)
  const orClauses: Where[] = [{ status: { in: ['published', 'reported'] } }];
  if (user) orClauses.push({ and: [{ author: { equals: user.id } }, { status: { equals: 'hidden' } }] });

  const res = await payload.find({
    collection: 'comments', overrideAccess: true, depth: 1, limit: 200, sort: 'createdAt',
    where: { and: [{ targetType: { equals: targetType } }, { targetId: { equals: targetId } }, { or: orClauses }] },
  });
  const comments = res.docs.map((c) => {
    const author = typeof c.author === 'object' && c.author ? c.author : null;
    return {
      id: String(c.id),
      body: c.body,
      authorName: (author && [author.firstName, author.lastName].filter(Boolean).join(' ')) || 'Пользователь',
      createdAt: c.createdAt,
    };
  });
  return NextResponse.json({ comments });
}
