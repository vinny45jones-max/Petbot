import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyTelegramAuth, TelegramAuthPayload } from '@/lib/auth/telegram-validator';

function buildSignedPayload(botToken: string, payload: Omit<TelegramAuthPayload, 'hash'>): TelegramAuthPayload {
  const dataCheckString = Object.keys(payload)
    .filter((k) => payload[k as keyof typeof payload] !== undefined)
    .sort()
    .map((k) => `${k}=${payload[k as keyof typeof payload]}`)
    .join('\n');
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return { ...payload, hash };
}

describe('verifyTelegramAuth', () => {
  const botToken = 'test-bot-token-12345';
  const now = Math.floor(Date.now() / 1000);

  it('accepts valid payload', () => {
    const payload = buildSignedPayload(botToken, {
      id: 100, first_name: 'Иван', username: 'ivan', auth_date: now,
    });
    expect(verifyTelegramAuth(payload, botToken)).toBe(true);
  });

  it('rejects tampered payload', () => {
    const payload = buildSignedPayload(botToken, {
      id: 100, first_name: 'Иван', auth_date: now,
    });
    const tampered = { ...payload, first_name: 'Петя' };
    expect(verifyTelegramAuth(tampered, botToken)).toBe(false);
  });

  it('rejects payload older than 5 minutes', () => {
    const old = now - 600;
    const payload = buildSignedPayload(botToken, {
      id: 100, first_name: 'Иван', auth_date: old,
    });
    expect(verifyTelegramAuth(payload, botToken)).toBe(false);
  });
});
