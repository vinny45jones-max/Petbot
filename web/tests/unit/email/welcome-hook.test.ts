import { describe, it, expect, vi } from 'vitest';
import { sendWelcomeOnCreate } from '@/lib/email/welcome-hook';

describe('sendWelcomeOnCreate', () => {
  it('шлёт welcome при создании пользователя с настоящим email', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await sendWelcomeOnCreate({ doc: { email: 'a@b.by', firstName: 'Имя' }, operation: 'create' }, send);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toMatchObject({ to: 'a@b.by', subject: expect.stringContaining('Добро пожаловать') });
  });
  it('не шлёт при update', async () => {
    const send = vi.fn();
    await sendWelcomeOnCreate({ doc: { email: 'a@b.by' }, operation: 'update' }, send);
    expect(send).not.toHaveBeenCalled();
  });
  it('не шлёт на служебный адрес TG-пользователя и без email', async () => {
    const send = vi.fn();
    await sendWelcomeOnCreate({ doc: { email: 'tg-123@telegram.local' }, operation: 'create' }, send);
    await sendWelcomeOnCreate({ doc: { email: '' }, operation: 'create' }, send);
    expect(send).not.toHaveBeenCalled();
  });
  it('не валит создание пользователя, если почта упала', async () => {
    const send = vi.fn().mockRejectedValue(new Error('RESEND_API_KEY missing'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(sendWelcomeOnCreate({ doc: { email: 'a@b.by' }, operation: 'create' }, send)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
