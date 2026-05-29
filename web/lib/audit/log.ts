import type { Payload } from 'payload';

export interface AuditEntry {
  actorId?: string | number; // optional: системные действия (вебхуки платежей, cron) пишутся без юзера; Postgres user.id = number, string для мок/совместимости
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
}

export async function recordAuditLog(payload: Payload, entry: AuditEntry): Promise<void> {
  await payload.create({
    collection: 'audit-logs',
    data: {
      actor: entry.actorId as number | undefined,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      meta: entry.meta || {},
    },
  });
}
