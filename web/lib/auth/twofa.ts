// Сценарии 2FA (§16.2): enroll → activate, гейт админки, выключение. Роуты — тонкие обёртки.
import type { Payload } from 'payload';
import { sql } from '@payloadcms/db-postgres';
import { buildOtpauthUrl, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, verifyTotp } from './totp.ts';
import { decryptSecret, encryptSecret } from './totp-crypto.ts';
import { checkRateLimit } from '../security/rate-limit.ts';
import { recordAuditLog } from '../audit/log.ts';

type Db = Pick<Payload, 'findByID' | 'update' | 'create'> & { db?: unknown };
type UserRef = { id: number | string; email: string };
type Fail<E extends string> = { ok: false; error: E };
export type Allow = (key: string) => boolean;

// 5 попыток ввода кода за 15 минут на пользователя — перебор 6 цифр бессмыслен.
const defaultAllow: Allow = (key) => checkRateLimit(key, 5, 15 * 60 * 1000);

interface TwofaRow {
  role?: string | null;
  totpEnabled?: boolean | null;
  totpSecretEnc?: string | null;
  totpRecoveryHashes?: string[] | null;
  totpLastStep?: number | null;
}

const STAFF = new Set(['moderator', 'superadmin']);

/** Атомарное «списание» второго фактора: два параллельных запроса с одним кодом не пройдут оба. */
export interface TwofaClaims {
  /** Запомнить шаг TOTP, если он новее сохранённого; false — код уже использован. */
  totpStep(userId: number | string, step: number): Promise<boolean>;
  /** Убрать recovery-код, если он ещё есть; false — уже списан. */
  recoveryCode(userId: number | string, hash: string): Promise<boolean>;
}

export function sqlClaims(payload: Db): TwofaClaims {
  const run = async (q: ReturnType<typeof sql>) => ((await (payload.db as any).drizzle.execute(q)) as { rows: unknown[] }).rows.length > 0;
  return {
    totpStep: (id, step) => run(sql`UPDATE users SET totp_last_step = ${step}
      WHERE id = ${Number(id)} AND (totp_last_step IS NULL OR totp_last_step < ${step}) RETURNING id`),
    recoveryCode: (id, hash) => run(sql`UPDATE users SET totp_recovery_hashes = totp_recovery_hashes - ${hash}::text
      WHERE id = ${Number(id)} AND totp_recovery_hashes @> jsonb_build_array(${hash}::text) RETURNING id`),
  };
}

async function load(payload: Db, user: UserRef): Promise<TwofaRow> {
  return (await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true, showHiddenFields: true, depth: 0 })) as TwofaRow;
}

async function save(payload: Db, user: UserRef, data: TwofaRow): Promise<void> {
  await payload.update({ collection: 'users', id: user.id, data: data as never, overrideAccess: true, depth: 0 });
}

async function audit(payload: Db, user: UserRef, action: string): Promise<void> {
  await recordAuditLog(payload as Payload, { actorId: Number(user.id), action, targetType: 'users', targetId: String(user.id) });
}

async function totpStep(row: TwofaRow, code: string): Promise<number | null> {
  if (!row.totpSecretEnc) return null;
  try {
    return await verifyTotp(decryptSecret(row.totpSecretEnc), code, row.totpLastStep == null ? null : Number(row.totpLastStep));
  } catch {
    return null;
  }
}

export async function enrollTwofa(payload: Db, user: UserRef): Promise<{ ok: true; secret: string; otpauth: string } | Fail<'already_enabled' | 'not_staff'>> {
  const row = await load(payload, user);
  if (row.totpEnabled) return { ok: false, error: 'already_enabled' };
  // роль из БД: в сессии staff без 2FA выглядит как citizen (twofa-session)
  if (!STAFF.has(row.role ?? '')) return { ok: false, error: 'not_staff' };
  const secret = generateTotpSecret();
  await save(payload, user, { totpSecretEnc: encryptSecret(secret) });
  return { ok: true, secret, otpauth: buildOtpauthUrl(user.email, secret) };
}

export async function activateTwofa(
  payload: Db, user: UserRef, code: string, allow: Allow = defaultAllow, claims: TwofaClaims = sqlClaims(payload),
): Promise<{ ok: true; recoveryCodes: string[] } | Fail<'rate_limited' | 'already_enabled' | 'not_enrolled' | 'invalid_code'>> {
  if (!allow(`2fa:${user.id}`)) return { ok: false, error: 'rate_limited' };
  const row = await load(payload, user);
  if (row.totpEnabled) return { ok: false, error: 'already_enabled' };
  if (!row.totpSecretEnc) return { ok: false, error: 'not_enrolled' };
  const step = await totpStep(row, code);
  if (step === null || !(await claims.totpStep(user.id, step))) return { ok: false, error: 'invalid_code' };
  const recoveryCodes = generateRecoveryCodes();
  await save(payload, user, { totpEnabled: true, totpRecoveryHashes: recoveryCodes.map(hashRecoveryCode) });
  await audit(payload, user, '2fa.enabled');
  return { ok: true, recoveryCodes };
}

/** Проверяет TOTP (каждый код — один раз) или одноразовый recovery-код; списание атомарное. */
async function checkSecondFactor(claims: TwofaClaims, user: UserRef, row: TwofaRow, code: string): Promise<boolean> {
  const step = await totpStep(row, code);
  if (step !== null) return claims.totpStep(user.id, step);
  const h = hashRecoveryCode(code);
  if (!(row.totpRecoveryHashes ?? []).includes(h)) return false;
  return claims.recoveryCode(user.id, h);
}

export async function passTwofaGate(
  payload: Db, user: UserRef, code: string, allow: Allow = defaultAllow, claims: TwofaClaims = sqlClaims(payload),
): Promise<{ ok: true } | Fail<'rate_limited' | 'not_enrolled' | 'invalid_code'>> {
  if (!allow(`2fa:${user.id}`)) return { ok: false, error: 'rate_limited' };
  const row = await load(payload, user);
  if (!row.totpEnabled || !row.totpSecretEnc) return { ok: false, error: 'not_enrolled' };
  if (!(await checkSecondFactor(claims, user, row, code))) return { ok: false, error: 'invalid_code' };
  await audit(payload, user, '2fa.passed');
  return { ok: true };
}

export async function disableTwofa(
  payload: Db, user: UserRef, code: string, allow: Allow = defaultAllow, claims: TwofaClaims = sqlClaims(payload),
): Promise<{ ok: true } | Fail<'rate_limited' | 'not_enrolled' | 'invalid_code'>> {
  if (!allow(`2fa:${user.id}`)) return { ok: false, error: 'rate_limited' };
  const row = await load(payload, user);
  if (!row.totpEnabled) return { ok: false, error: 'not_enrolled' };
  if (!(await checkSecondFactor(claims, user, row, code))) return { ok: false, error: 'invalid_code' };
  await save(payload, user, { totpEnabled: false, totpSecretEnc: null, totpRecoveryHashes: null });
  await audit(payload, user, '2fa.disabled');
  return { ok: true };
}

/** Сброс 2FA владельцем (потерян телефон и резервные коды): `npm run staff:reset-2fa -- <email>`. */
export async function resetTwofa(payload: Db, userId: number | string): Promise<void> {
  await payload.update({
    collection: 'users', id: userId, overrideAccess: true, depth: 0,
    data: { totpEnabled: false, totpSecretEnc: null, totpRecoveryHashes: null, totpLastStep: null } as never,
  });
  await recordAuditLog(payload as Payload, { action: '2fa.reset', targetType: 'users', targetId: String(userId), meta: { via: 'cli' } });
}
