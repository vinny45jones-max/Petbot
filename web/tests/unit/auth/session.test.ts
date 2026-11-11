// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { jwtVerify } from 'jose';
import { JWT_AUTH_VERSION } from 'payload';
import { issueSessionToken } from '@/lib/auth/session';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

function fakePayload() {
  const user: Record<string, any> = { id: 7, email: 'a@b.by', role: 'citizen', sessions: [] };
  return {
    user,
    payload: {
      secret: 'derived-secret-0123456789abcdef',
      collections: {
        users: {
          config: {
            slug: 'users',
            auth: { useSessions: true, tokenExpiration: 3600 },
            fields: [{ name: 'role', type: 'select', saveToJWT: true }],
          },
        },
      },
      db: {
        findOne: vi.fn(async () => ({ ...user })),
        updateOne: vi.fn(async ({ data }) => Object.assign(user, data)),
      },
    } as any,
  };
}

// И-25: токен должен проходить проверку Payload (strategies/jwt): payload.secret, authVersion, sid из users.sessions.
describe('issueSessionToken', () => {
  it('выпускает токен формата Payload с sid сохранённой сессии', async () => {
    const { payload, user } = fakePayload();
    const { token, maxAge } = await issueSessionToken(payload, 7);
    const { payload: claims, protectedHeader } = await jwtVerify(token, new TextEncoder().encode(payload.secret));
    expect(protectedHeader.authVersion).toBe(JWT_AUTH_VERSION);
    expect(claims).toMatchObject({ id: 7, collection: 'users', email: 'a@b.by', role: 'citizen' });
    expect(user.sessions.map((s: any) => s.id)).toContain(claims.sid);
    expect(maxAge).toBe(3600);
  });

  it('падает, если пользователя нет', async () => {
    const { payload } = fakePayload();
    payload.db.findOne.mockResolvedValueOnce(null);
    await expect(issueSessionToken(payload, 99)).rejects.toThrow();
  });
});
