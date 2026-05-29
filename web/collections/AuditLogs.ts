import type { CollectionConfig } from 'payload';
import { canModerateContent } from '../lib/auth/rbac.ts';

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: { useAsTitle: 'action', defaultColumns: ['action', 'targetType', 'targetId', 'createdAt'] },
  access: {
    read: ({ req: { user } }) => canModerateContent(user as any),
    create: () => false, // записи только через recordAuditLog (Local API обходит access); публичный REST-create закрыт
    update: () => false,
    delete: ({ req: { user } }) => user?.role === 'superadmin',
  },
  fields: [
    { name: 'actor', type: 'relationship', relationTo: 'users', required: false }, // системные действия (вебхуки/cron) — без actor
    { name: 'action', type: 'text', required: true, index: true },
    { name: 'targetType', type: 'text', required: true, index: true },
    { name: 'targetId', type: 'text', required: true, index: true },
    { name: 'meta', type: 'json' },
  ],
  timestamps: true,
};
