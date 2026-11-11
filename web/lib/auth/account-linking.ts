import type { Payload } from 'payload';
import type { TelegramAuthPayload } from './telegram-validator';
import crypto from 'node:crypto';

export async function findOrCreateUserByTelegram(payload: Payload, tg: TelegramAuthPayload) {
  const tgId = String(tg.id);
  const existing = await payload.find({ collection: 'users', where: { telegramId: { equals: tgId } }, limit: 1 });
  // Telegram подтвердил личность подписью — почта (служебная tg-…@telegram.local) не проверяется,
  // а Payload при auth.verify не пускает пользователя с _verified=false (И-25).
  if (existing.docs.length) {
    const user = existing.docs[0] as any;
    if (user._verified === false) await payload.update({ collection: 'users', id: user.id, data: { _verified: true } as any });
    return user;
  }
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
      _verified: true,
    } as any,
    disableVerificationEmail: true,
  });
  return created as any;
}
