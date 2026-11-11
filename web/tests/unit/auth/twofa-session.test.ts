import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { twofaSatisfied, maskUnverifiedStaff } from '@/lib/auth/twofa-session';
import { signTwofaCookie } from '@/lib/auth/twofa-cookie';

const SECRET = 'unit-test-secret-key';
beforeAll(() => { process.env.PAYLOAD_SECRET = SECRET; });
const derived = () => crypto.createHash('sha256').update(SECRET).digest('hex').slice(0, 32);
const token = (id: number, sid: string) => jwt.sign({ id, sid, collection: 'users' }, derived(), { expiresIn: '1h' });
const cookies = (id: number, sid: string, twofa?: string) =>
  `payload-token=${token(id, sid)}` + (twofa ? `; twofa-ok=${twofa}` : '');

const mod = () => ({ id: 5, role: 'moderator', totpEnabled: true } as { id: number; role: string; totpEnabled: boolean; [k: string]: any });

describe('twofaSatisfied', () => {
  it('своя сессия + cookie этой сессии → да', () => {
    expect(twofaSatisfied(mod(), cookies(5, 's1', signTwofaCookie('5', 's1')))).toBe(true);
  });
  it('cookie от прошлой сессии (после выхода и нового входа) → нет', () => {
    expect(twofaSatisfied(mod(), cookies(5, 's2', signTwofaCookie('5', 's1')))).toBe(false);
  });
  it('без cookie, чужой uid, выключенная 2FA → нет', () => {
    expect(twofaSatisfied(mod(), cookies(5, 's1'))).toBe(false);
    expect(twofaSatisfied(mod(), cookies(5, 's1', signTwofaCookie('6', 's1')))).toBe(false);
    expect(twofaSatisfied({ ...mod(), totpEnabled: false }, cookies(5, 's1', signTwofaCookie('5', 's1')))).toBe(false);
  });
});

describe('maskUnverifiedStaff (Users.afterRead при входе по токену)', () => {
  it('модератор без 2FA в этой сессии становится citizen с пометкой twofaRequired', () => {
    const d = maskUnverifiedStaff(mod(), cookies(5, 's1'));
    expect(d.role).toBe('citizen');
    expect(d.twofaRequired).toBe(true);
  });
  it('модератор с 2FA остаётся модератором', () => {
    const d = maskUnverifiedStaff(mod(), cookies(5, 's1', signTwofaCookie('5', 's1')));
    expect(d.role).toBe('moderator');
    expect(d.twofaRequired).toBeUndefined();
  });
  it('чужой документ (staff читает другого модератора) не трогаем', () => {
    expect(maskUnverifiedStaff({ ...mod(), id: 8 }, cookies(5, 's1')).role).toBe('moderator');
  });
  it('без заголовка Cookie (локальный API, сиды, cron) не трогаем', () => {
    expect(maskUnverifiedStaff(mod(), null).role).toBe('moderator');
  });
  it('не-staff не трогаем', () => {
    expect(maskUnverifiedStaff({ id: 5, role: 'org_admin' }, cookies(5, 's1')).role).toBe('org_admin');
  });
});
