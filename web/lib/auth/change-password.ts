// Смена пароля из кабинета. Текущий пароль проверяет payload.login (у него счётчик неудачных попыток и блокировка).
// После смены остаётся только текущая сессия: украденный пароль больше не держит чужие входы.
import type { Payload } from 'payload';
import { checkRateLimit } from '../security/rate-limit.ts';
import { recordAuditLog } from '../audit/log.ts';

export const MIN_PASSWORD_LENGTH = 8;
type Db = Pick<Payload, 'login' | 'update' | 'create'>;
type Fail = { ok: false; error: 'rate_limited' | 'weak_password' | 'same_password' | 'wrong_password' };

export async function changePassword(
  payload: Db,
  user: { id: number | string; email: string },
  input: { current: string; next: string; sid?: string },
  allow: (key: string) => boolean = (k) => checkRateLimit(k, 5, 15 * 60 * 1000),
): Promise<{ ok: true } | Fail> {
  if (!allow(`password:${user.id}`)) return { ok: false, error: 'rate_limited' };
  if (input.next.length < MIN_PASSWORD_LENGTH) return { ok: false, error: 'weak_password' };
  if (input.next === input.current) return { ok: false, error: 'same_password' };
  try {
    await payload.login({ collection: 'users', data: { email: user.email, password: input.current } });
  } catch {
    return { ok: false, error: 'wrong_password' };
  }
  // Payload сам оставляет при смене пароля только сессию req.user._sid — передаём текущего пользователя с sid.
  await payload.update({
    collection: 'users', id: user.id, overrideAccess: true, data: { password: input.next } as never,
    user: { ...user, collection: 'users', _sid: input.sid } as never,
  });
  await recordAuditLog(payload as Payload, { actorId: Number(user.id), action: 'password.changed', targetType: 'users', targetId: String(user.id) });
  return { ok: true };
}
