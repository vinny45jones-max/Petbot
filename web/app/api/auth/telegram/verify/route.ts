import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { verifyTelegramAuth, TelegramAuthPayload } from '@/lib/auth/telegram-validator';
import { findOrCreateUserByTelegram } from '@/lib/auth/account-linking';
import { issueSessionToken, setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as TelegramAuthPayload;
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!verifyTelegramAuth(body, botToken)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  const payload = await getPayload({ config });
  const user = await findOrCreateUserByTelegram(payload, body);
  const token = issueSessionToken(user);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, user: { id: user.id, firstName: user.firstName, role: user.role } });
}
