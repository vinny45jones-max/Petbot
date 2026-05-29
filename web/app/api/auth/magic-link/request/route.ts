import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { generateMagicToken, hashToken } from '@/lib/auth/magic-link';
import { sendEmail } from '@/lib/email/resend-client';
import MagicLink from '@/lib/email/templates/magic-link';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== 'string') return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const payload = await getPayload({ config });
  const found = await payload.find({ collection: 'users', where: { email: { equals: email.toLowerCase() } }, limit: 1 });
  // Ответ всегда одинаков — не раскрываем регистрацию
  if (found.docs.length) {
    const user = found.docs[0];
    const token = generateMagicToken();
    await payload.create({ collection: 'magic-link-tokens', data: { tokenHash: hashToken(token), user: user.id } });
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/magic-link/consume?token=${token}`;
    await sendEmail({ to: email, subject: 'Вход на Pet Aggregator BY', react: MagicLink({ loginUrl: url }) });
  }
  return NextResponse.json({ ok: true });
}
