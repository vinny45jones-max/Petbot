import { describe, it, expect, vi } from 'vitest';
import { findOrCreateUserByTelegram } from '@/lib/auth/account-linking';

function mockPayload({ existing }: { existing?: any }) {
  return {
    find: vi.fn().mockResolvedValue({ docs: existing ? [existing] : [] }),
    create: vi.fn().mockResolvedValue({ id: 'new-1', email: 'tg-100@telegram.local', telegramId: '100', role: 'citizen' }),
    update: vi.fn().mockImplementation(async ({ data, id }) => ({ id, ...data })),
  } as any;
}

describe('findOrCreateUserByTelegram', () => {
  it('creates new citizen if no user found', async () => {
    const p = mockPayload({});
    const user = await findOrCreateUserByTelegram(p, { id: 100, first_name: 'Ivan', auth_date: 0, hash: '' });
    expect(p.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'users',
      data: expect.objectContaining({ telegramId: '100', role: 'citizen' }),
    }));
    expect(user.telegramId).toBe('100');
  });

  it('returns existing user when telegramId matches', async () => {
    const existing = { id: 'u-1', email: 'old@x.com', telegramId: '100', role: 'citizen' };
    const p = mockPayload({ existing });
    const user = await findOrCreateUserByTelegram(p, { id: 100, first_name: 'X', auth_date: 0, hash: '' });
    expect(p.create).not.toHaveBeenCalled();
    expect(user.id).toBe('u-1');
  });
});
