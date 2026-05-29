import { describe, it, expect, vi } from 'vitest';
import { recordAuditLog } from '@/lib/audit/log';

describe('recordAuditLog', () => {
  it('creates audit-log entry via payload', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'log-1' });
    const payload = { create } as any;
    await recordAuditLog(payload, {
      actorId: 'u1',
      action: 'user.role.changed',
      targetType: 'user',
      targetId: 'u2',
      meta: { from: 'citizen', to: 'moderator' },
    });
    expect(create).toHaveBeenCalledWith({
      collection: 'audit-logs',
      data: expect.objectContaining({
        actor: 'u1',
        action: 'user.role.changed',
        targetType: 'user',
        targetId: 'u2',
        meta: { from: 'citizen', to: 'moderator' },
      }),
    });
  });
});
