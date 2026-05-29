import type { Payload } from 'payload';
import type { TelegramAuthPayload } from './telegram-validator';
import crypto from 'node:crypto';

export async function findOrCreateUserByTelegram(payload: Payload, tg: TelegramAuthPayload) {
  const tgId = String(tg.id);
  const existing = await payload.find({ collection: 'users', where: { telegramId: { equals: tgId } }, limit: 1 });
  if (existing.docs.length) return existing.docs[0] as any;
  const password = crypto.randomBytes(32).toString('hex');
  const created = await payload.create({
    collection: 'users',
    data: {
      email: `tg-${tgId}@telegram.local`,
      password,
      firstName: tg.first_name,
      lastName: tg.last_name,
      telegramId: tgId,
      telegramUsername: tg.username,
      photoUrl: tg.photo_url,
      role: 'citizen',
      ageConfirmed: true,
      consentPersonalData: true,
    } as any,
  });
  return created as any;
}
