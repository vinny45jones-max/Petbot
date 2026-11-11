import { describe, it, expect, vi, afterEach } from 'vitest';

const sendEmail = vi.fn().mockResolvedValue({});
vi.mock('@/lib/email/resend-client', () => ({ sendEmail }));

const { Users } = await import('@/collections/Users');
const hook = Users.hooks!.afterChange![0] as (a: any) => Promise<void>;

afterEach(() => { sendEmail.mockClear(); delete process.env.RESEND_API_KEY; });

describe('Users.afterChange: welcome', () => {
  it('с ключом Resend — шлёт при создании', async () => {
    process.env.RESEND_API_KEY = 're_test';
    await hook({ doc: { email: 'new@b.by' }, operation: 'create' });
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail.mock.calls[0][0].to).toBe('new@b.by');
  });
  it('без ключа и при update — не шлёт', async () => {
    await hook({ doc: { email: 'new@b.by' }, operation: 'create' });
    process.env.RESEND_API_KEY = 're_test';
    await hook({ doc: { email: 'new@b.by' }, operation: 'update' });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
