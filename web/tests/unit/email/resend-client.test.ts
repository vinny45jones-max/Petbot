import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail } from '@/lib/email/resend-client';

describe('sendEmail', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws if RESEND_API_KEY missing', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendEmail({ to: 'a@b.c', subject: 's', react: null as any })).rejects.toThrow(/RESEND_API_KEY/);
  });
});
