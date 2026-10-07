import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { validateComment } from '@/lib/content/validate';
import { scoreCommentSpam } from '@/lib/comments/spam';
import { getCurrentUser } from '@/lib/auth/current-user';

const TARGET_COLLECTION = { animal: 'animals', blog_post: 'blog-posts' } as const;
type TargetType = keyof typeof TARGET_COLLECTION;

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`comment:${ip}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком часто. Подождите немного.' }, { status: 429 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Войдите, чтобы комментировать.' }, { status: 401 });

  const form = await req.formData();
  if (!(await verifyTurnstile(form.get('cf-turnstile-response') as string | null, ip))) {
    return NextResponse.json({ error: 'Проверка не пройдена.' }, { status: 400 });
  }

  const body = (form.get('body') as string) ?? '';
  const targetType = form.get('targetType') as string;
  const targetId = form.get('targetId') as string;
  if (!(targetType in TARGET_COLLECTION) || !targetId) {
    return NextResponse.json({ error: 'Некорректная цель комментария.' }, { status: 422 });
  }
  const v = validateComment({ body });
  if (!v.ok) return NextResponse.json({ error: v.errors.join('. ') }, { status: 422 });

  const payload = await getPayload({ config });
  // комментировать можно только существующее опубликованное животное/пост
  const target = await payload.find({
    collection: TARGET_COLLECTION[targetType as TargetType], overrideAccess: true, depth: 0, limit: 1,
    where: { and: [{ id: { equals: targetId } }, { status: { equals: 'published' } }] },
  });
  if (!target.docs.length) return NextResponse.json({ error: 'Материал не найден.' }, { status: 404 });

  const recent = await payload.find({
    collection: 'comments', overrideAccess: true, depth: 0, limit: 5,
    where: { author: { equals: user.id } }, sort: '-createdAt',
  });
  const spam = scoreCommentSpam({ body, recentByAuthor: recent.docs.map((d) => d.body ?? '') });

  await payload.create({
    collection: 'comments', overrideAccess: true,
    data: {
      author: user.id, targetType: targetType as TargetType, targetId, body: body.trim(),
      status: spam.shadowBan ? 'hidden' : 'published', spamScore: spam.score,
    },
  });

  // shadow-ban: автору отвечаем «успешно», даже если коммент скрыт
  return NextResponse.json({ ok: true });
}
